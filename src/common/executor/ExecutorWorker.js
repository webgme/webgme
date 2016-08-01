/*globals define, File, alert*/
/*jshint node:true*/

/**
 * @author lattmann / https://github.com/lattmann
 * @author ksmyth / https://github.com/ksmyth
 */

// eb.executorClient.createJob('1092dd2b135af5d164b9d157b5360391246064db',
//  function (err, res) { console.log(require('util').inspect(res)); })

// eb.executorClient.getInfoByStatus('CREATED',
// function(err, res) { console.log('xxx ' + require('util').inspect(res)); })

define([
    'blob/BlobClient',
    'blob/BlobMetadata',
    'fs',
    'util',
    'events',
    'path',
    'child_process',
    'minimatch',
    'executor/ExecutorClient',
    'executor/WorkerInfo',
    'executor/JobInfo',
    'executor/OutputInfo',
    'executor/ExecutorOutputQueue',
    'superagent',
    'rimraf'
], function (BlobClient,
             BlobMetadata,
             fs,
             util,
             events,
             path,
             childProcess,
             minimatch,
             ExecutorClient,
             WorkerInfo,
             JobInfo,
             OutputInfo,
             ExecutorOutputQueue,
             superagent,
             rimraf) {
    'use strict';

    var UNZIP_EXE,
        UNZIP_ARGS;
    if (process.platform === 'win32') {
        UNZIP_EXE = 'c:\\Program Files\\7-Zip\\7z.exe';
        UNZIP_ARGS = ['x', '-y'];
    } else if (process.platform === 'linux' || process.platform === 'darwin') {
        UNZIP_EXE = '/usr/bin/unzip';
        UNZIP_ARGS = ['-o'];
    } else {
        UNZIP_EXE = 'unknown';
    }

    var walk = function (dir, done) {
        var results = [];
        fs.readdir(dir, function (err, list) {
            if (err) {
                done(err);
                return;
            }
            var i = 0;
            (function next() {
                var file = list[i++];
                if (!file) {
                    done(null, results);
                    return;
                }
                file = dir + '/' + file;
                fs.stat(file, function (err, stat) {
                    if (stat && stat.isDirectory()) {
                        walk(file, function (err, res) {
                            results = results.concat(res);
                            next();
                        });
                    } else {
                        results.push(file);
                        next();
                    }
                });
            })();
        });
    };

    var ExecutorWorker = function (parameters) {
        this.logger = parameters.logger;

        this.blobClient = new BlobClient({
            server: parameters.server,
            serverPort: parameters.serverPort,
            httpsecure: parameters.httpsecure,
            logger: parameters.logger
        });

        this.executorClient = new ExecutorClient({
            server: parameters.server,
            serverPort: parameters.serverPort,
            httpsecure: parameters.httpsecure,
            logger: parameters.logger
        });

        if (parameters.executorNonce) {
            this.executorClient.executorNonce = parameters.executorNonce;
        }

        process.env.ORIGIN_URL = (parameters.httpsecure ? 'https' : 'http') + '://' +
            parameters.server + ':' + parameters.serverPort;

        this.jobList = {};
        this.runningJobs = {};

        this.sourceFilename = 'source.zip';
        this.resultFilename = 'execution_results';
        this.executorConfigFilename = 'executor_config.json';

        this.workingDirectory = parameters.workingDirectory || 'executor-temp';

        if (!fs.existsSync(this.workingDirectory)) {
            fs.mkdirSync(this.workingDirectory);
        }
        this.availableProcessesContainer = parameters.availableProcessesContainer || {availableProcesses: 1};
        this.clientRequest = new WorkerInfo.ClientRequest({clientId: null});
        this.labelJobs = {};
    };
    util.inherits(ExecutorWorker, events.EventEmitter);

    ExecutorWorker.prototype.startJob = function (jobInfo, errorCallback, successCallback) {
        var self = this;

        // TODO: create job
        // TODO: what if job is already running?

        // get metadata for hash
        self.blobClient.getMetadata(jobInfo.hash, function (err/*, metadata*/) {
            if (err) {
                jobInfo.status = 'FAILED_TO_GET_SOURCE_METADATA';
                errorCallback(err);
                return;
            }

            // download artifacts
            self.blobClient.getObject(jobInfo.hash, function (err, content) {
                if (err) {
                    jobInfo.status = 'FAILED_SOURCE_COULD_NOT_BE_OBTAINED';
                    errorCallback('Failed obtaining job source content, err: ' + err.toString());
                    return;
                }

                var jobDir = path.normalize(path.join(self.workingDirectory, jobInfo.hash));

                if (!fs.existsSync(jobDir)) {
                    fs.mkdirSync(jobDir);
                }

                var zipPath = path.join(jobDir, self.sourceFilename);

                //content = new Uint8Array(content);
                content = new Buffer(new Uint8Array(content));
                fs.writeFile(zipPath, content, function (err) {
                    if (err) {
                        jobInfo.status = 'FAILED_CREATING_SOURCE_ZIP';
                        errorCallback('Failed creating source zip-file, err: ' + err.toString());
                        return;
                    }

                    // unzip downloaded file

                    var args = [path.basename(zipPath)];
                    args.unshift.apply(args, UNZIP_ARGS);
                    childProcess.execFile(UNZIP_EXE, args, {cwd: jobDir},
                        function (err, stdout, stderr) {
                            if (err) {
                                jobInfo.status = 'FAILED_UNZIP';
                                jobInfo.finishTime = new Date().toISOString();
                                self.logger.error(stderr);
                                errorCallback(err);
                                return;
                            }

                            // delete downloaded file
                            fs.unlinkSync(zipPath);

                            jobInfo.startTime = new Date().toISOString();

                            // get cmd file dynamically from the this.executorConfigFilename file
                            fs.readFile(path.join(jobDir, self.executorConfigFilename), 'utf8', function (err, data) {
                                if (err) {
                                    jobInfo.status = 'FAILED_EXECUTOR_CONFIG';
                                    jobInfo.finishTime = new Date().toISOString();
                                    errorCallback('Could not read ' + self.executorConfigFilename + ' err:' + err);
                                    return;
                                }
                                var executorConfig;
                                try {
                                    executorConfig = JSON.parse(data);
                                } catch (e) {
                                }

                                self.logger.debug('executorConfig', executorConfig);
                                if (typeof executorConfig !== 'object' ||
                                    typeof executorConfig.cmd !== 'string' ||
                                    typeof executorConfig.resultArtifacts !== 'object') {

                                    jobInfo.status = 'FAILED_EXECUTOR_CONFIG';
                                    jobInfo.finishTime = new Date().toISOString();
                                    errorCallback(self.executorConfigFilename +
                                        ' is missing or wrong type for cmd and/or resultArtifacts.');
                                    return;
                                }

                                var cmd = executorConfig.cmd;
                                var args = executorConfig.args || [];
                                self.logger.debug('working directory: ' + jobDir + ' executing: ' + cmd +
                                    ' with args: ' + args.toString());
                                var outputSegmentSize = executorConfig.outputSegmentSize || -1;
                                var outputInterval = executorConfig.outputInterval || -1;
                                var outputQueue;
                                var child = childProcess.spawn(cmd, args, {
                                    cwd: jobDir,
                                    stdio: ['ignore', 'pipe', 'pipe']
                                });
                                var childExit = function (err, signal) {

                                    childExit = function () {
                                    }; // "Note that the exit-event may or may not fire after an error has occurred"

                                    jobInfo.finishTime = new Date().toISOString();

                                    if (signal === 'SIGINT') {
                                        jobInfo.status = 'CANCELED';
                                    } else if (err) {
                                        self.logger.error(jobInfo.hash + ' exec error: ' + util.inspect(err));
                                        jobInfo.status = 'FAILED_TO_EXECUTE';
                                    }

                                    // TODO: save stderr and stdout to files.
                                    if (outputQueue) {
                                        outputQueue.sendAllOutputs(function (/*err*/) {
                                            successCallback(jobInfo, jobDir, executorConfig);
                                        });
                                    } else {
                                        successCallback(jobInfo, jobDir, executorConfig);
                                    }
                                    // normally self.saveJobResults(jobInfo, jobDir, executorConfig);
                                };

                                self.runningJobs[jobInfo.hash] = {
                                    process: child,
                                    terminated: false
                                };

                                var outlog = fs.createWriteStream(path.join(jobDir, 'job_stdout.txt'));
                                child.stdout.pipe(outlog);
                                child.stdout.pipe(fs.createWriteStream(path.join(self.workingDirectory,
                                    jobInfo.hash.substr(0, 6) + '_stdout.txt')));
                                // TODO: maybe put in the same file as stdout
                                child.stderr.pipe(fs.createWriteStream(path.join(jobDir, 'job_stderr.txt')));

                                // Need to use logger here since node webkit does not have process.stdout/err.
                                child.stdout.on('data', function (data) {
                                    self.logger.info(data.toString());
                                });
                                child.stderr.on('data', function (data) {
                                    self.logger.error(data.toString());
                                });

                                // FIXME can it happen that the close event arrives before error?
                                child.on('error', childExit);
                                child.on('close', childExit);

                                if (outputInterval > - 1 || outputSegmentSize > -1) {
                                    outputQueue = new ExecutorOutputQueue(self, jobInfo,
                                        outputInterval, outputSegmentSize);
                                    child.stdout.on('data', function (data) {
                                        outputQueue.addOutput(data.toString());
                                    });
                                }
                            });
                        });

                });
            });
        });
    };

    ExecutorWorker.prototype.saveJobResults = function (jobInfo, directory, executorConfig) {
        var self = this,
            i,
            jointArtifact = self.blobClient.createArtifact('jobInfo_resultSuperSetHash'),
            resultsArtifacts = [],
            afterWalk,
            archiveFile,
            afterAllFilesArchived,
            addObjectHashesAndSaveArtifact;

        jobInfo.resultHashes = {};

        for (i = 0; i < executorConfig.resultArtifacts.length; i += 1) {
            resultsArtifacts.push(
                {
                    name: executorConfig.resultArtifacts[i].name,
                    artifact: self.blobClient.createArtifact(executorConfig.resultArtifacts[i].name),
                    patterns: executorConfig.resultArtifacts[i].resultPatterns instanceof Array ?
                        executorConfig.resultArtifacts[i].resultPatterns : [],
                    files: {}
                }
            );
        }

        afterWalk = function (filesToArchive) {
            var counter,
                pendingStatus,
                i,
                counterCallback = function (err) {
                    if (err) {
                        pendingStatus = err;
                    }
                    counter -= 1;
                    if (counter <= 0) {
                        if (pendingStatus) {
                            jobInfo.status = pendingStatus;
                        } else {
                            afterAllFilesArchived();
                        }

                    }
                };
            counter = filesToArchive.length;
            if (filesToArchive.length === 0) {
                self.logger.info(jobInfo.hash + ' There were no files to archive..');
                counterCallback(null);
            }
            for (i = 0; i < filesToArchive.length; i += 1) {
                archiveFile(filesToArchive[i].filename, filesToArchive[i].filePath, counterCallback);
            }
        };

        archiveFile = function (filename, filePath, callback) {
            var archiveData = function (err, data) {
                jointArtifact.addFileAsSoftLink(filename, data, function (err, hash) {
                    var j;
                    if (err) {
                        self.logger.error(jobInfo.hash + ' Failed to archive as "' + filename + '" from "' +
                            filePath + '", err: ' + err);
                        self.logger.error(err);
                        callback('FAILED_TO_ARCHIVE_FILE');
                    } else {
                        // Add the file-hash to the results artifacts containing the filename.
                        //console.log('Filename added : ' + filename);
                        for (j = 0; j < resultsArtifacts.length; j += 1) {
                            if (resultsArtifacts[j].files[filename] === true) {
                                resultsArtifacts[j].files[filename] = hash;
                                //console.log('Replaced! filename: "' + filename + '", artifact "'
                                // + resultsArtifacts[j].name + '" with hash: ' + hash);
                            }
                        }
                        callback(null);
                    }
                });
            };
            if (typeof File === 'undefined') { // nodejs doesn't have File
                fs.readFile(filePath, function (err, data) {
                    if (err) {
                        self.logger.error(jobInfo.hash + ' Failed to archive as "' + filename + '" from "' + filePath +
                            '", err: ' + err);
                        return callback('FAILED_TO_ARCHIVE_FILE');
                    }
                    archiveData(null, data);
                });
            } else {
                archiveData(null, new File(filePath, filename));
            }
        };

        afterAllFilesArchived = function () {
            jointArtifact.save(function (err, resultHash) {
                var counter,
                    pendingStatus,
                    i,
                    counterCallback;
                if (err) {
                    self.logger.error(jobInfo.hash + ' ' + err);
                    jobInfo.status = 'FAILED_TO_SAVE_JOINT_ARTIFACT';
                    self.sendJobUpdate(jobInfo);
                } else {
                    counterCallback = function (err) {
                        if (err) {
                            pendingStatus = err;
                        }
                        counter -= 1;
                        if (counter <= 0) {
                            if (JobInfo.isFailedFinishedStatus(jobInfo.status)) {
                                // Keep the previous error status
                            } else if (pendingStatus) {
                                jobInfo.status = pendingStatus;
                            } else {
                                jobInfo.status = 'SUCCESS';
                            }
                            self.sendJobUpdate(jobInfo);
                        }
                    };
                    counter = resultsArtifacts.length;
                    if (counter === 0) {
                        counterCallback(null);
                    }
                    rimraf(directory, function (err) {
                        if (err) {
                            self.logger.error('Could not delete executor-temp file, err: ' + err);
                        }
                        jobInfo.resultSuperSetHash = resultHash;
                        for (i = 0; i < resultsArtifacts.length; i += 1) {
                            addObjectHashesAndSaveArtifact(resultsArtifacts[i], counterCallback);
                        }
                    });
                }
            });
        };

        addObjectHashesAndSaveArtifact = function (resultArtifact, callback) {
            resultArtifact.artifact.addMetadataHashes(resultArtifact.files, function (err/*, hashes*/) {
                if (err) {
                    self.logger.error(jobInfo.hash + ' ' + err);
                    return callback('FAILED_TO_ADD_OBJECT_HASHES');
                }
                resultArtifact.artifact.save(function (err, resultHash) {
                    if (err) {
                        self.logger.error(jobInfo.hash + ' ' + err);
                        return callback('FAILED_TO_SAVE_ARTIFACT');
                    }
                    jobInfo.resultHashes[resultArtifact.name] = resultHash;
                    callback(null);
                });
            });
        };

        walk(directory, function (err, results) {
            var i, j, a,
                filesToArchive = [],
                archive,
                filename,
                matched;
            //console.log('Walking the walk..');
            for (i = 0; i < results.length; i += 1) {
                filename = path.relative(directory, results[i]).replace(/\\/g, '/');
                archive = false;
                for (a = 0; a < resultsArtifacts.length; a += 1) {
                    if (resultsArtifacts[a].patterns.length === 0) {
                        //console.log('Matched! filename: "' + filename + '", artifact "' +
                        // resultsArtifacts[a].name + '"');
                        resultsArtifacts[a].files[filename] = true;
                        archive = true;
                    } else {
                        for (j = 0; j < resultsArtifacts[a].patterns.length; j += 1) {
                            matched = minimatch(filename, resultsArtifacts[a].patterns[j]);
                            if (matched) {
                                //console.log('Matched! filename: "' + filename + '", artifact "' +
                                // resultsArtifacts[a].name + '"');
                                resultsArtifacts[a].files[filename] = true;
                                archive = true;
                                break;
                            }
                        }
                    }
                }
                if (archive) {
                    filesToArchive.push({filename: filename, filePath: results[i]});
                }
            }
            afterWalk(filesToArchive);
        });
    };

    ExecutorWorker.prototype.sendJobUpdate = function (jobInfo) {
        var self = this;
        if (JobInfo.isFinishedStatus(jobInfo.status)) {
            this.availableProcessesContainer.availableProcesses += 1;
            delete this.runningJobs[jobInfo.hash];
        }

        this.executorClient.updateJob(jobInfo)
            .catch(function (err) {
                self.logger.error(err); // TODO
            });

        this.emit('jobUpdate', jobInfo);
    };

    ExecutorWorker.prototype.cancelJob = function (hash) {
        if (this.runningJobs[hash] && this.runningJobs[hash].terminated === false) {
            this.runningJobs[hash].terminated = true;
            this.runningJobs[hash].process.kill('SIGINT');
        }
    };

    ExecutorWorker.prototype.checkForUnzipExe = function () {
        this.checkForUnzipExe = function () {
        };
        fs.exists(UNZIP_EXE, function (exists) {
            if (exists) {
            } else {
                alert('Unzip exe "' + UNZIP_EXE + '" does not exist. Please install it.');
            }
        });
    };

    ExecutorWorker.prototype.queryWorkerAPI = function (callback) {
        var self = this;
        self.checkForUnzipExe();

        var _queryWorkerAPI = function () {

            self.clientRequest.availableProcesses = Math.max(0, self.availableProcessesContainer.availableProcesses);
            self.clientRequest.runningJobs = Object.keys(self.runningJobs);

            var req = superagent.post(self.executorClient.executorUrl + 'worker');
            if (self.executorClient.executorNonce) {
                req.set('x-executor-nonce', self.executorClient.executorNonce);
            }
            req
                //.set('Content-Type', 'application/json')
                //oReq.timeout = 25 * 1000;

                .send(self.clientRequest)
                .end(function (err, res) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    if (res.status > 399) {
                        callback('Server returned ' + res.status);
                    } else {
                        var response = JSON.parse(res.text);
                        response.jobsToCancel.forEach(function (cHash) {
                            self.cancelJob(cHash);
                        });

                        var jobsToStart = response.jobsToStart;
                        for (var i = 0; i < jobsToStart.length; i++) {
                            self.executorClient.getInfo(jobsToStart[i], function (err, info) {
                                if (err) {
                                    info.status = 'FAILED_SOURCE_COULD_NOT_BE_OBTAINED';
                                    self.sendJobUpdate(info);
                                    return;
                                }
                                self.jobList[info.hash] = info;
                                self.availableProcessesContainer.availableProcesses -= 1;
                                self.emit('jobUpdate', info);
                                self.startJob(info, function (err) {
                                    self.logger.error(info.hash + ' failed to run: ' + err + '. Status: ' + info.status);
                                    self.sendJobUpdate(info);
                                }, function (jobInfo, jobDir, executorConfig) {
                                    self.saveJobResults(jobInfo, jobDir, executorConfig);
                                });
                            });
                        }
                        for (var label in response.labelJobs) {
                            if (self.availableProcessesContainer.availableProcesses) {
                                if (response.labelJobs.hasOwnProperty(label) && !self.labelJobs.hasOwnProperty(label)) {
                                    self.labelJobs[label] = response.labelJobs[label];
                                    self.availableProcessesContainer.availableProcesses -= 1;
                                    (function (label) {
                                        var info = {hash: response.labelJobs[label]};
                                        self.startJob(info, function (err) {
                                            this.availableProcessesContainer.availableProcesses += 1;
                                            self.logger.error('Label job ' + label + '(' + info.hash + ') failed to run: ' +
                                                err + '. Status: ' + info.status);
                                        }, function (jobInfo/*, jobDir, executorConfig*/) {
                                            this.availableProcessesContainer.availableProcesses += 1;
                                            if (jobInfo.status !== 'FAILED_TO_EXECUTE') {
                                                self.clientRequest.labels.push(label);
                                                self.logger.info('Label job ' + label + ' succeeded. Labels are ' +
                                                    JSON.stringify(self.clientRequest.labels));
                                            } else {
                                                self.logger.error('Label job ' + label + '(' + info.hash +
                                                    ') run failed: ' + err + '. Status: ' + info.status);
                                            }
                                        });
                                    })(label);
                                }
                            }
                        }

                        callback(null, response);
                    }

                });
        };
        if (self.clientRequest.clientId) {
            _queryWorkerAPI.call(self);
        } else {
            childProcess.execFile('hostname', [], {}, function (err, stdout/*, stderr*/) {
                self.clientRequest.clientId = (stdout.trim() || 'unknown') + '_' + process.pid;
                _queryWorkerAPI.call(self);
            });
        }
    };

    ExecutorWorker.prototype.sendOutput = function (jobInfo, output, callback) {
        var outputInfo;

        jobInfo.outputNumber = typeof jobInfo.outputNumber === 'number' ?
        jobInfo.outputNumber + 1 : 0;

        outputInfo = new OutputInfo(jobInfo.hash, {
            output: output,
            outputNumber: jobInfo.outputNumber
        });

        this.logger.debug('sending output', outputInfo);
        this.executorClient.sendOutput(outputInfo, callback);
    };

    return ExecutorWorker;
});
