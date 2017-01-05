/*globals requireJS*/
/*jshint node: true, expr: true*/

/**
 * @author lattmann / https://github.com/lattmann
 * @author ksmyth / https://github.com/ksmyth
 * @author pmeijer / https://github.com/pmeijer
 *
 curl http://localhost:8855/rest/executor/info/77704f10a36aa4214f5b0095ba8099e729a10f46
 curl -X POST -H "Content-Type: application/json"
 -d {} http://localhost:8855/rest/executor/create/77704f10a36aa4214f5b0095ba8099e729a10f46
 curl -X POST -H "Content-Type: application/json"
 -d {\"status\":\"CREATED\"} http://localhost:8855/rest/executor/update/77704f10a36aa4214f5b0095ba8099e729a10f46
 */

'use strict';

var express = require('express'),
    Q = require('q'),
    Chance = require('chance'),
// Mongo collections
    JOB_LIST = '_executorJobList',
    WORKER_LIST = '_executorWorkerList',
    OUTPUT_LIST = '_executorOutput';

/**
 *
 * @param {object} options - middlewareOptions
 * @param {GmeLogger} options.logger - logger to fork off from
 * @param {GmeConfig} options.gmeConfig - gmeConfig
 * @param {function} options.ensureAuthenticated
 * @constructor
 * @ignore
 */
function ExecutorServer(options) {
    var self = this,
        fs = require('fs'),
        bufferEqual = require('buffer-equal-constant-time'),
        router = express.Router(),
        chance = new Chance(),
        JobInfo = requireJS('common/executor/JobInfo'),
        WorkerInfo = requireJS('common/executor/WorkerInfo'),
        OutputInfo = requireJS('common/executor/OutputInfo'),
        workerTimeoutIntervalId,
        updateLabelsTimeoutId,
        watchLabelsTimeout,
        workerRefreshInterval;

    self.logger = options.logger.fork('middleware:ExecutorServer');
    self.logger.debug('ctor');
    self.gmeConfig = options.gmeConfig;
    self.ensureAuthenticated = options.ensureAuthenticated;
    self.jobList = null;
    self.workerList = null;
    self.outputList = null;
    self.running = false;
    self.clearOutputsTimers = {
        // <jobHash>: {
        //   timeoutObj: <timeoutObject>
        //   jobInfo: <JobInfo>
        // }
    };

    self.router = router;

    workerRefreshInterval = self.gmeConfig.executor.workerRefreshInterval;

    self.logger.debug('label-jobs config file', self.gmeConfig.labelJobs);
    self.labelJobs = {}; // map from label to blob hash
    self.labelJobsFilename = self.gmeConfig.executor.labelJobs;

    function executorAuthenticate(req, res, next) {
        var isAuth = true,
            workerNonce;

        if (self.gmeConfig.executor.nonce) {
            workerNonce = req.headers['x-executor-nonce'];
            if (workerNonce) {
                isAuth = bufferEqual(new Buffer(workerNonce), new Buffer(self.gmeConfig.executor.nonce));
            } else {
                isAuth = false;
            }
        }

        if (isAuth) {
            next();
        } else {
            res.sendStatus(403);
        }
    }

    function workerTimeout() {
        var query;
        if (process.uptime() < workerRefreshInterval / 1000 * 5) {
            return;
        }
        query = {
            lastSeen: {
                $lt: (new Date()).getTime() / 1000 - workerRefreshInterval / 1000 * 5
            }
        };

        function callback(err) {
            if (err) {
                self.logger.error(err);
            }
        }

        self.workerList.find(query).toArray(function (err, docs) {
            if (!self.running) {
                self.logger.debug('ExecutorServer had been stopped.');
                return;
            }
            for (var i = 0; i < docs.length; i += 1) {
                // reset unfinished jobs assigned to worker to CREATED, so they'll be executed by someone else
                self.logger.debug('worker "' + docs[i].clientId + '" is gone');

                self.workerList.deleteOne({_id: docs[i]._id}, callback);
                self.jobList.updateMany({worker: docs[i].clientId, status: {$nin: JobInfo.finishedStatuses}}, {
                    $set: {
                        worker: null,
                        status: 'CREATED',
                        startTime: null
                    }
                }, callback);
            }
        });
    }

    function updateLabelJobs(callback) {
        fs.readFile(self.labelJobsFilename, {encoding: 'utf-8'}, function (err, data) {
            self.logger.debug('Reading ' + self.labelJobsFilename);
            self.labelJobs = JSON.parse(data);
            if (callback) {
                callback(err);
            }
        });
    }

    function watchLabelJobs(callback) {
        fs.exists(self.labelJobsFilename, function (exists) {
            if (exists) {
                updateLabelJobs(callback);
                fs.watch(self.labelJobsFilename, {persistent: false}, function () {
                    updateLabelsTimeoutId = setTimeout(updateLabelJobs, 200);
                });
            } else {
                watchLabelsTimeout = setTimeout(watchLabelJobs, 10 * 1000);
                if (callback) {
                    callback();
                }
            }
        });
    }

    function clearOutput(jobInfo, callback) {
        var deferred = Q.defer(),
            query = {
                $set: {
                    outputNumber: null
                }
            };

        if (self.running === true) {

            self.jobList.updateOne({hash: jobInfo.hash}, query, function (err) {
                if (err) {
                    self.logger.error('Error clearing outputNumber in job', err);
                    deferred.reject(err);
                    return;
                }

                if (self.running === false) {
                    self.logger.error('Cleared job\'s outputNumber, but was shutdown before actual output was removed.',
                        jobInfo.hash);
                    deferred.resolve();
                    return;
                }

                query = {
                    _id: {
                        $regex: '^' + jobInfo.hash
                    }
                };

                self.outputList.deleteMany(query, function (err, res) {
                    if (err) {
                        deferred.reject(err);
                        self.logger.error('Failed to remove output for job', err);
                        return;
                    }

                    if (res.deletedCount !== jobInfo.outputNumber + 1) {
                        self.logger.warn('Did not remove all output for job', res.deletedCount,
                            {metadata: jobInfo});
                    }

                    self.logger.debug('Cleared output for job', res.deletedCount, jobInfo.hash);
                    deferred.resolve();
                });
            });
        } else {
            deferred.resolve();
        }

        return deferred.promise.nodeify(callback);
    }

    function startClearOutputTimer(jobInfo) {
        var timeoutObj;

        timeoutObj = setTimeout(function () {

            delete self.clearOutputsTimers[jobInfo.hash];

            clearOutput(jobInfo);

        }, self.gmeConfig.executor.clearOutputTimeout);

        self.clearOutputsTimers[jobInfo.hash] = {
            jobInfo: jobInfo,
            timeoutObj: timeoutObj
        };

        self.logger.debug('Timeout', self.gmeConfig.executor.clearOutputTimeout,
            '[ms] to clear output for job set (id)', jobInfo.hash);
    }

    function getCanceledJobs(hashes, callback) {
        var deferred = Q.defer(),
            query = {
                hash: {
                    $in: hashes
                },
                cancelRequested: true
            };
        if (hashes.length === 0) {
            deferred.resolve([]);
        } else {
            self.jobList.find(query).toArray(function (err, docs) {
                if (err) {
                    deferred.reject(err);
                } else {
                    deferred.resolve(docs.map(function (jobInfo) {
                        return jobInfo.hash;
                    }));
                }
            });
        }

        return deferred.promise.nodeify(callback);
    }

    function restartCanceledJob(oldJobInfo, newInfo, callback) {
        function insertNewInfo() {
            var deferred = Q.defer();

            self.jobList.updateOne({hash: oldJobInfo.hash}, newInfo, {upsert: true}, function (err) {
                if (err) {
                    deferred.reject(err);
                } else {
                    deferred.resolve(newInfo);
                }
            });

            return deferred.promise;
        }

        if (self.clearOutputsTimers[oldJobInfo.hash] || oldJobInfo.outputNumber !== null) {
            delete self.clearOutputsTimers[oldJobInfo.hash];

            return clearOutput(oldJobInfo)
                .then(function () {
                    return insertNewInfo();
                })
                .nodeify(callback);
        } else {
            return insertNewInfo().nodeify(callback);
        }

    }

    // ensure authenticated can be used only after this rule
    router.use('*', function (req, res, next) {
        // TODO: set all headers, check rate limit, etc.
        res.setHeader('X-WebGME-Media-Type', 'webgme.v1');
        next();
    });

    // all endpoints require authentication
    router.use('*', self.ensureAuthenticated);
    router.use('*', executorAuthenticate);

    router.get('/', function (req, res/*, next*/) {
        var query = {};
        if (req.query.status) { // req.query.hasOwnProperty raises TypeError on node 0.11.16 [!]
            query.status = req.query.status;
        }
        self.logger.debug('get by status:', query.status);
        self.jobList.find(query).toArray(function (err, docs) {
            if (err) {
                self.logger.error(err);
                res.sendStatus(500);
                return;
            }
            var jobList = {};
            for (var i = 0; i < docs.length; i += 1) {
                jobList[docs[i].hash] = docs[i];
                delete docs[i]._id;
                delete docs[i].secret;
            }
            self.logger.debug('Found number of jobs matching status', docs.length, query.status);
            res.send(jobList);
        });
    });

    router.get('/info/:hash', function (req, res/*, next*/) {
        self.jobList.findOne({hash: req.params.hash}, function (err, jobInfo) {
            if (err) {
                self.logger.error(err);
                res.sendStatus(500);
            } else if (jobInfo) {
                delete jobInfo._id;
                delete jobInfo.secret;
                res.send(jobInfo);
            } else {
                res.sendStatus(404);
            }
        });
    });

    router.post('/create/:hash', function (req, res/*, next*/) {
        var jobInfo,
            info = req.body;

        info.hash = req.params.hash;
        info.createTime = new Date().toISOString();
        info.status = info.status || 'CREATED'; // TODO: define a constant for this

        jobInfo = new JobInfo(info);
        jobInfo.secret = chance.guid();

        self.logger.debug('job creation info:', {metadata: info});
        self.jobList.findOne({hash: req.params.hash}, function (err, doc) {
            if (err) {
                self.logger.error(err);
                res.sendStatus(500);
            } else if (!doc) {
                self.jobList.insertOne(jobInfo, function (err) {
                    if (err) {
                        // TODO: Deal with error when it already existed.
                        self.logger.error(err);
                        res.sendStatus(500);
                    } else {
                        delete jobInfo._id;
                        res.send(jobInfo);
                    }
                });
            } else if (doc.status === 'CANCELED') {
                restartCanceledJob(doc, jobInfo)
                    .then(function (newInfo) {
                        res.send(newInfo);
                    })
                    .catch(function (err) {
                        self.logger.error(err);
                        res.sendStatus(500);
                    });
            } else {
                delete doc._id;
                delete doc.secret;
                res.send(doc);
            }
        });

        // TODO: get job description

    });

    router.post('/update/:hash', function (req, res/*, next*/) {

        self.jobList.findOne({hash: req.params.hash}, function (err, doc) {
            if (err) {
                self.logger.error(err);
                res.sendStatus(500);
            } else if (doc) {
                var jobInfo = new JobInfo(doc);
                var jobInfoUpdate = new JobInfo(req.body);
                jobInfoUpdate.hash = req.params.hash;
                for (var i in jobInfoUpdate) {
                    if (jobInfoUpdate[i] !== null && (!(jobInfoUpdate[i] instanceof Array) ||
                        jobInfoUpdate[i].length !== 0)) {

                        jobInfo[i] = jobInfoUpdate[i];
                    }
                }

                jobInfo.secret = doc.secret;
                self.jobList.updateOne({hash: req.params.hash}, jobInfo, function (err, result) {
                    if (err) {
                        self.logger.error(err);
                        res.sendStatus(500);
                    } else if (result.matchedCount === 0) {
                        res.sendStatus(404);
                    } else {
                        if (JobInfo.isFinishedStatus(jobInfo.status)) {
                            if (jobInfo.outputNumber !== null && self.gmeConfig.executor.clearOutputTimeout > -1) {
                                // The job has finished and there is stored output - set timeout to clear it.
                                startClearOutputTimer(jobInfo);
                            }
                        }

                        res.sendStatus(200);
                    }
                });
            } else {
                res.sendStatus(404);
            }
        });
    });

    router.post('/cancel/:hash', function (req, res/*, next*/) {
        self.jobList.findOne({hash: req.params.hash}, function (err, doc) {
            if (err) {
                self.logger.error(err);
                res.sendStatus(500);
            } else if (doc) {
                if (req.body.secret !== doc.secret) {
                    res.sendStatus(403);
                } else if (JobInfo.isFinishedStatus(doc.status) === false) {
                    // Only bother to update the cancelRequested if job hasn't finished.
                    self.jobList.updateOne({hash: req.params.hash}, {
                        $set: {
                            cancelRequested: true
                        }
                    }, function (err) {
                        if (err) {
                            self.logger.error(err);
                            res.sendStatus(500);
                        } else {
                            res.sendStatus(200);
                        }
                    });
                } else {
                    res.sendStatus(200);
                }
            } else {
                res.sendStatus(404);
            }
        });
    });

    router.get('/output/:hash', function (req, res/*, next*/) {
        var query = {
            hash: req.params.hash
        };

        if (parseInt(req.query.start, 10)) {
            query.outputNumber = {
                $gte: parseInt(req.query.start, 10)
            };
        }

        if (parseInt(req.query.end, 10)) {
            if (query.hasOwnProperty('outputNumber')) {
                query.outputNumber.$lt = parseInt(req.query.end, 10);
            } else {
                query.outputNumber = {
                    $lt: parseInt(req.query.end, 10)
                };
            }
        }

        self.logger.debug('ouput requested', query);
        self.outputList.find(query)
            .sort({outputNumber: 1})
            .toArray(function (err, docs) {
                if (err) {
                    self.logger.error('get output', err);
                    res.sendStatus(500);
                    return;
                }

                self.logger.debug('got outputs, nbr', docs.length);
                if (docs.length > 0) {
                    res.send(docs);
                } else {
                    // No output found, could it be that job does not even exist?
                    self.jobList.findOne({hash: req.params.hash}, function (err, jobInfo) {
                        if (err) {
                            self.logger.error(err);
                            res.sendStatus(500);
                        } else if (jobInfo) {
                            res.send(docs);
                        } else {
                            res.sendStatus(404);
                        }
                    });
                }
            });
    });

    router.post('/output/:hash', function (req, res/*, next*/) {
        var outputInfo = new OutputInfo(req.params.hash, req.body);

        self.logger.debug('output posted', outputInfo._id);

        self.outputList.updateOne({_id: outputInfo._id}, outputInfo, {upsert: true}, function (err) {
            if (err) {
                self.logger.error('post output', err);
                res.sendStatus(500);
                return;
            }

            self.jobList.updateOne({hash: req.params.hash}, {
                $set: {
                    outputNumber: outputInfo.outputNumber
                }
            }, function (err, result) {
                if (err) {
                    self.logger.error('post output', err);
                    res.sendStatus(500);
                } else if (result.matchedCount === 0) {
                    self.logger.warn('posted output to job that did not exist');
                    res.sendStatus(404);
                } else {
                    res.sendStatus(200);
                }
            });
        });
    });

    // worker API
    router.get('/worker', function (req, res/*, next*/) {
        var response = {};
        self.workerList.find({}).toArray(function (err, workers) {
            var jobQuery = function (i) {
                if (i === workers.length) {
                    res.send(JSON.stringify(response));
                    return;
                }
                var worker = workers[i];
                self.jobList.find({
                    status: 'RUNNING',
                    worker: worker.clientId
                }).sort({createTime: 1}).toArray(function (err, jobs) {
                    // FIXME: index self.jobList on status?
                    for (var j = 0; j < jobs.length; j += 1) {
                        delete jobs[j]._id;
                        delete jobs[j].secret;
                    }
                    delete worker._id;
                    response[worker.clientId] = worker;
                    response[worker.clientId].jobs = jobs;

                    jobQuery(i + 1);
                });
            };
            jobQuery(0);
        });
    });

    router.post('/worker', function (req, res/*, next*/) {
        var clientRequest = new WorkerInfo.ClientRequest(req.body),
            serverResponse = new WorkerInfo.ServerResponse({refreshPeriod: workerRefreshInterval});

        serverResponse.labelJobs = self.labelJobs;

        function checkForCanceledJobs() {
            getCanceledJobs(clientRequest.runningJobs)
                .then(function (jobsToCancel) {
                    serverResponse.jobsToCancel = jobsToCancel;
                    res.send(JSON.stringify(serverResponse));
                })
                .catch(function (err) {
                    self.logger.error(err);
                    res.send(JSON.stringify(serverResponse));
                });
        }

        self.workerList.updateOne({clientId: clientRequest.clientId}, {
            $set: {
                lastSeen: (new Date()).getTime() / 1000,
                labels: clientRequest.labels
            }
        }, {upsert: true}, function () {
            if (!self.running) {
                self.logger.debug('ExecutorServer had been stopped.');
                res.sendStatus(404);
            } else if (clientRequest.availableProcesses) {
                self.jobList.find({
                    status: 'CREATED',
                    labels: {
                        $not: {
                            $elemMatch: {
                                $nin: clientRequest.labels
                            }
                        }
                    }
                }).limit(clientRequest.availableProcesses).toArray(function (err, docs) {
                    if (err) {
                        self.logger.error(err);
                        res.sendStatus(500);
                        return; // FIXME need to return 2x
                    }

                    var callback = function (i) {
                        if (i === docs.length) {
                            checkForCanceledJobs();
                            return;
                        }
                        self.jobList.updateOne({_id: docs[i]._id, status: 'CREATED'}, {
                            $set: {
                                status: 'RUNNING',
                                worker: clientRequest.clientId
                            }
                        }, function (err, numReplaced) {
                            if (err) {
                                self.logger.error(err);
                                res.sendStatus(500);
                                return;
                            } else if (numReplaced) {
                                serverResponse.jobsToStart.push(docs[i].hash);
                            }
                            callback(i + 1);
                        });
                    };
                    callback(0);
                });
            } else {
                checkForCanceledJobs();
            }
        });
    });

    /**
     *
     * @param {object} params
     * @param {object} mongoClient - open connection to mongodb
     * @param callback
     * @returns {*}
     */
    this.start = function (params, callback) {
        var mongo = params.mongoClient;
        self.logger.debug('Starting executor');
        return Q.all([
            Q.ninvoke(mongo, 'collection', JOB_LIST),
            Q.ninvoke(mongo, 'collection', WORKER_LIST),
            Q.ninvoke(mongo, 'collection', OUTPUT_LIST)
        ])
            .then(function (res) {
                self.jobList = res[0];
                self.workerList = res[1];
                self.outputList = res[2];
                if (self.gmeConfig.executor.clearOldDataAtStartUp === true) {
                    return Q.allSettled([
                        Q.ninvoke(mongo, 'dropCollection', JOB_LIST),
                        Q.ninvoke(mongo, 'dropCollection', WORKER_LIST),
                        Q.ninvoke(mongo, 'dropCollection', OUTPUT_LIST)
                    ]);
                }
            })
            .then(function () {
                watchLabelJobs();
                workerTimeoutIntervalId = setInterval(workerTimeout, 10 * 1000);
                self.running = true;
                return Q.ninvoke(self.jobList, 'createIndex', {hash: 1}, {unique: true});
            })
            .nodeify(callback);
    };

    /**
     * Clears the opened intervals and timeouts.
     * This does not close the connection to mongo.
     */
    this.stop = function () {
        var timerIds = Object.keys(self.clearOutputsTimers);
        timerIds.forEach(function (timerId) {
            clearTimeout(self.clearOutputsTimers[timerId].timeoutObj);
            self.logger.warn('Outputs will not be cleared for job', timerId,
                self.clearOutputsTimers[timerId].jobInfo.outputNumber);
        });

        clearInterval(workerTimeoutIntervalId);
        clearTimeout(updateLabelsTimeoutId);
        clearTimeout(watchLabelsTimeout);
        self.jobList = null;
        self.workerList = null;
        self.outputList = null;
        self.running = false;
        self.logger.debug('Executor was stopped');
    };
}

module.exports = ExecutorServer;