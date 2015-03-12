/*globals require, console, define, setTimeout, WebGMEGlobal*/
/*jshint node:true*/
/**
 * @author lattmann / https://github.com/lattmann
 * @author ksmyth / https://github.com/ksmyth
 *
 curl http://localhost:8855/rest/executor/info/77704f10a36aa4214f5b0095ba8099e729a10f46
 curl -X POST -H "Content-Type: application/json" -d {} http://localhost:8855/rest/executor/create/77704f10a36aa4214f5b0095ba8099e729a10f46
 curl -X POST -H "Content-Type: application/json" -d {\"status\":\"CREATED\"} http://localhost:8855/rest/executor/update/77704f10a36aa4214f5b0095ba8099e729a10f46
 */

define(['logManager',
        'fs',
        'path',
        'child_process',
        'buffer-equal-constant-time',
        'nedb',
        'mkdirp',
        'executor/JobInfo',
        'executor/WorkerInfo'
    ],
    function (logManager, fs, path, child_process, bufferEqual, DataStore, mkdirp, JobInfo, WorkerInfo) {
        'use strict';
        var jobListDBFile,
            workerListDBFile,
            gmeConfig,
            jobList,
            workerList,
            workerRefreshInterval,
            logger = logManager.create('REST-Executor'); //TODO: how to define your own logger which will use the global settings

        var workerTimeout = function () {
            if (process.uptime() < workerRefreshInterval / 1000 * 5) {
                return;
            }
            workerList.find({lastSeen: {$lt: (new Date()).getTime() / 1000 - workerRefreshInterval / 1000 * 5}}, function (err, docs) {
                for (var i = 0; i < docs.length; i += 1) {
                    // reset unfinished jobs assigned to worker to CREATED, so they'll be executed by someone else
                    logger.info('worker "' + docs[i].clientId + '" is gone');
                    workerList.remove({_id: docs[i]._id});
                    // FIXME: race after assigning finishTime between this and uploading to blob
                    jobList.update({worker: docs[i].clientId, finishTime: null}, {
                        $set: {
                            worker: null,
                            status: 'CREATED',
                            startTime: null
                        }
                    }, function () {
                    });
                }
            });
        };
        setInterval(workerTimeout, 10 * 1000);

        var labelJobs = {}; // map from label to blob hash
        var labelJobsFilename = 'labelJobs.json'; // TODO put somewhere that makes sense

        function updateLabelJobs() {
            var fs = require('fs');
            fs.readFile(labelJobsFilename, {encoding: 'utf-8'}, function (err, data) {
                logger.info('Reading ' + labelJobsFilename);
                labelJobs = JSON.parse(data);
            });
        }

        function watchLabelJobs() {
            var fs = require('fs');
            fs.exists(labelJobsFilename, function (exists) {
                if (exists) {
                    updateLabelJobs();
                    fs.watch(labelJobsFilename, {persistent: false}, function () {
                        setTimeout(updateLabelJobs, 200);
                    });
                } else {
                    setTimeout(watchLabelJobs, 10 * 1000);
                }
            });
        }
        watchLabelJobs();

        var ExecutorREST = function (req, res, next) {

            var authenticate = function () {
                if (gmeConfig.executor.nonce) {
                    if (!req.headers['x-executor-nonce'] || bufferEqual(new Buffer(req.headers['x-executor-nonce']), new Buffer(gmeConfig.executor.nonce)) !== true) {
                        res.send(403);
                        return false;
                    }
                }
                return true;
            };

            var url = require('url').parse(req.url);
            var pathParts = url.pathname.split('/');

            if (pathParts.length < 2) {
                res.send(404);
                return;
            }

            if (pathParts.length === 2 && pathParts[1] === '') {
                //next should be always called / the response should be sent otherwise this thread will stop without and end

                var query = {};
                if (req.query.status) { // req.query.hasOwnProperty raises TypeError on node 0.11.16 [!]
                    query.status = req.query.status;
                }
                jobList.find(query, function (err, docs) {
                    if (err) {
                        res.send(500);
                        return;
                    }
                    var jobList = {};
                    for (var i = 0; i < docs.length; i += 1) {
                        jobList[docs[i].hash] = docs[i];
                        delete docs[i]._id;
                    }
                    res.send(jobList);
                });

                // TODO: send status
                // FIXME: this path will not be safe
//            res.sendfile(path.join('src', 'rest', 'executor', 'index2.html'), function (err) {
//                if (err) {
//                    logger.error(err);
//                    res.send(500);
//                }
//            });

            } else {

                switch (pathParts[1]) {
                    case 'create':
                        authenticate() && ExecutorRESTCreate(req, res, next);
                        break;
                    case 'worker':
                        (req.method !== 'POST' || authenticate()) && ExecutorRESTWorkerAPI(req, res, next);
                        break;
                    case 'cancel':
                        authenticate() && ExecutorRESTCancel(req, res, next);
                        break;
                    case 'info':
                        ExecutorRESTInfo(req, res, next);
                        break;
                    case 'update':
                        authenticate() && ExecutorRESTUpdate(req, res, next);
                        break;
                    default:
                        res.send(404);
                        break;
                }

            }

        };

        var ExecutorRESTCreate = function (req, res, next) {
            if (req.method !== 'POST') {
                res.send(405);
            }
            var url = req.url.split('/');

            if (url.length < 3 || !url[2]) {
                res.send(404);
                return;
            }
            var hash = url[2];

            var info = req.body;
            info.hash = hash;
            info.createTime = new Date().toISOString();
            info.status = info.status || 'CREATED'; // TODO: define a constant for this
            var jobInfo = new JobInfo(info);
            // TODO: check if hash ok
            jobList.find({hash: hash}, function (err, docs) {
                if (err) {
                    res.send(500);
                } else if (docs.length === 0) {
                    jobList.update({hash: hash}, jobInfo, {upsert: true}, function (err) {
                        if (err) {
                            res.send(500);
                        } else {
                            delete jobInfo._id;
                            res.send(jobInfo);
                        }
                    });
                } else {
                    delete docs[0]._id;
                    res.send(docs[0]);
                }
            });

            // TODO: get job description
        };

        var ExecutorRESTUpdate = function (req, res, next) {
            if (req.method !== 'POST') {
                res.send(405);
            }
            var url = req.url.split('/');

            if (url.length < 3 || !url[2]) {
                res.send(404);
                return;
            }
            var hash = url[2];

            if (hash) {
            } else {
                res.send(500);
                return;
            }

            jobList.find({hash: hash}, function (err, docs) {
                if (err) {
                    res.send(500);
                } else if (docs.length) {
                    var jobInfo = new JobInfo(docs[0]);
                    var jobInfoUpdate = new JobInfo(req.body);
                    jobInfoUpdate.hash = hash;
                    for (var i in jobInfoUpdate) {
                        if (jobInfoUpdate[i] !== null && (!(jobInfoUpdate[i] instanceof Array) || jobInfoUpdate[i].length !== 0)) {
                            jobInfo[i] = jobInfoUpdate[i];
                        }
                    }
                    jobList.update({hash: hash}, jobInfo, function (err, numReplaced) {
                        if (err) {
                            res.send(500);
                        } else if (numReplaced !== 1) {
                            res.send(404);
                        } else {
                            res.send(200);
                        }
                    });
                } else {
                    res.send(404);
                }
            });

        };

        var ExecutorRESTWorkerGET = function (req, res, next) {
            var response = {};
            workerList.find({}, function (err, workers) {
                var jobQuery = function (i) {
                    if (i === workers.length) {
                        res.send(JSON.stringify(response));
                        return;
                    }
                    var worker = workers[i];
                    jobList.find({
                        status: 'RUNNING',
                        worker: worker.clientId
                    }).sort({createTime: 1}).exec(function (err, jobs) {
                        // FIXME: index jobList on status?
                        for (var j = 0; j < jobs.length; j += 1) {
                            delete jobs[j]._id;
                        }
                        delete worker._id;
                        response[worker.clientId] = worker;
                        response[worker.clientId].jobs = jobs;

                        jobQuery(i + 1);
                    });
                };
                jobQuery(0);
            });
        };

        var ExecutorRESTWorkerAPI = function (req, res, next) {
            if (req.method !== 'POST' && req.method !== 'GET') {
                res.send(405);
                return;
            }
            if (req.method === 'GET') {
                return ExecutorRESTWorkerGET(req, res, next);
            }

            var url = require('url').parse(req.url);
            var pathParts = url.pathname.split('/');

            if (pathParts.length < 2) {
                res.send(404);
                return;
            }

            var serverResponse = new WorkerInfo.ServerResponse({refreshPeriod: workerRefreshInterval});
            serverResponse.labelJobs = labelJobs;
            var clientRequest = new WorkerInfo.ClientRequest(req.body);

            workerList.update({clientId: clientRequest.clientId}, {
                $set: {
                    lastSeen: (new Date()).getTime() / 1000,
                    labels: clientRequest.labels
                }
            }, {upsert: true}, function () {
                if (clientRequest.availableProcesses) {
                    jobList.find({
                        status: 'CREATED',
                        $not: {labels: {$nin: clientRequest.labels}}
                    }).limit(clientRequest.availableProcesses).exec(function (err, docs) {
                        if (err) {
                            res.send(500);
                            return; // FIXME need to return 2x
                        }

                        var callback = function (i) {
                            if (i === docs.length) {
                                res.send(JSON.stringify(serverResponse));
                                return;
                            }
                            jobList.update({_id: docs[i]._id, status: 'CREATED'}, {
                                $set: {
                                    status: 'RUNNING',
                                    worker: clientRequest.clientId
                                }
                            }, function (err, numReplaced) {
                                if (err) {
                                    res.send(500);
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
                    res.send(JSON.stringify(serverResponse));
                }
            });
        };


        var ExecutorRESTCancel = function (req, res, next) {
            if (req.method !== 'POST') {
                res.send(405);
                return;
            }

            var url = req.url.split('/');

            if (url.length < 3 || !url[2]) {
                res.send(500);
                return;
            }

            var hash = url[2];

            if (false) {
                // TODO
                executorBackend.cancelJob(hash);

                res.send(200);
            } else {
                res.send(500);
            }

        };


        var ExecutorRESTInfo = function (req, res, next) {
            if (req.method !== 'GET') {
                res.send(405);
                return;
            }

            var url = req.url.split('/');

            if (url.length < 3 || !url[2]) {
                res.send(500);
                return;
            }

            var hash = url[2];

            if (hash) {
                jobList.find({hash: hash}, function (err, docs) {
                    if (err) {
                        res.send(500);
                    } else if (docs.length) {
                        res.send(docs[0]);
                    } else {
                        res.send(404);
                    }
                });
            } else {
                res.send(500);
            }
        };

        var setup = function (_gmeConfig) {
            gmeConfig = _gmeConfig;
            mkdirp.sync(gmeConfig.executor.outputDir);
            jobListDBFile = path.join(gmeConfig.executor.outputDir, 'jobList.nedb');
            workerListDBFile = path.join(gmeConfig.executor.outputDir, 'workerList.nedb');
            jobList = new DataStore({filename: jobListDBFile, autoload: true});
            workerList = new DataStore({filename: workerListDBFile, autoload: true});
            workerRefreshInterval = gmeConfig.executor.workerRefreshInterval;

            jobList.ensureIndex({fieldName: 'hash', unique: true}, function (err) {
                if (err) {
                    logger.error('Failure in ExecutorRest');
                    throw new Error(err);
                }
            });
            return ExecutorREST;
        };

        return setup;
    });