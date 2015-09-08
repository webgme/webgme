/*globals requireJS, executorBackend*/
/*jshint node: true, expr: true*/

/**
 * @author lattmann / https://github.com/lattmann
 * @author ksmyth / https://github.com/ksmyth
 *
 curl http://localhost:8855/rest/executor/info/77704f10a36aa4214f5b0095ba8099e729a10f46
 curl -X POST -H "Content-Type: application/json"
 -d {} http://localhost:8855/rest/executor/create/77704f10a36aa4214f5b0095ba8099e729a10f46
 curl -X POST -H "Content-Type: application/json"
 -d {\"status\":\"CREATED\"} http://localhost:8855/rest/executor/update/77704f10a36aa4214f5b0095ba8099e729a10f46
 */

'use strict';

var express = require('express'),
    router = express.Router();

//function getUserId(req) {
//    return req.session.udmId;
//}

function initialize(middlewareOpts) {
    var self = this, // Will be the module.exports, i.e. have keys initialize and router - consider instances.
        fs = require('fs'),
        path = require('path'),
        bufferEqual = require('buffer-equal-constant-time'),
        DataStore = require('nedb'),
        mkdirp = require('mkdirp'),

        JobInfo = requireJS('common/executor/JobInfo'),
        WorkerInfo = requireJS('common/executor/WorkerInfo'),

        workerRefreshInterval;

    self.logger = middlewareOpts.logger.fork('middleware:ExecutorServer');
    self.gmeConfig = middlewareOpts.gmeConfig;
    self.ensureAuthenticated = middlewareOpts.ensureAuthenticated;

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
        self.workerList.find(query, function (err, docs) {
            for (var i = 0; i < docs.length; i += 1) {
                // reset unfinished jobs assigned to worker to CREATED, so they'll be executed by someone else
                self.logger.debug('worker "' + docs[i].clientId + '" is gone');
                self.workerList.remove({_id: docs[i]._id});
                // FIXME: race after assigning finishTime between this and uploading to blob
                self.jobList.update({worker: docs[i].clientId, finishTime: null}, {
                    $set: {
                        worker: null,
                        status: 'CREATED',
                        startTime: null
                    }
                }, function () {
                });
            }
        });
    }

    function updateLabelJobs() {
        fs.readFile(self.labelJobsFilename, {encoding: 'utf-8'}, function (err, data) {
            self.logger.debug('Reading ' + self.labelJobsFilename);
            self.labelJobs = JSON.parse(data);
        });
    }

    function watchLabelJobs() {
        fs.exists(self.labelJobsFilename, function (exists) {
            if (exists) {
                updateLabelJobs();
                fs.watch(self.labelJobsFilename, {persistent: false}, function () {
                    setTimeout(updateLabelJobs, 200);
                });
            } else {
                setTimeout(watchLabelJobs, 10 * 1000);
            }
        });
    }

    self.logger.debug('initializing ...');

    self.logger.debug('output directory', self.gmeConfig.executor.outputDir);
    mkdirp.sync(self.gmeConfig.executor.outputDir);

    self.jobListDBFile = path.join(self.gmeConfig.executor.outputDir, 'jobList.nedb');
    self.workerListDBFile = path.join(self.gmeConfig.executor.outputDir, 'workerList.nedb');
    self.jobList = new DataStore({filename: self.jobListDBFile, autoload: true});
    self.workerList = new DataStore({filename: self.workerListDBFile, autoload: true});
    workerRefreshInterval = self.gmeConfig.executor.workerRefreshInterval;

    self.logger.debug('label-jobs config file', self.gmeConfig.labelJobs);
    self.labelJobs = {}; // map from label to blob hash
    self.labelJobsFilename = self.gmeConfig.executor.labelJobs;
    watchLabelJobs();
    setInterval(workerTimeout, 10 * 1000);
    self.jobList.ensureIndex({fieldName: 'hash', unique: true}, function (err) {
        if (err) {
            self.logger.error('Failure in ExecutorRest');
            throw new Error(err);
        }
    });


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
        self.jobList.find(query, function (err, docs) {
            if (err) {
                self.logger.error(err);
                res.sendStatus(500);
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
        //res.sendfile(path.join('src', 'rest', 'executor', 'index2.html'), function (err) {
        //    if (err) {
        //        logger.error(err);
        //        res.sendStatus(500);
        //    }
        //});
    });

    router.get('/info/:hash', function (req, res/*, next*/) {
        self.jobList.find({hash: req.params.hash}, function (err, docs) {
            if (err) {
                self.logger.error(err);
                res.sendStatus(500);
            } else if (docs.length) {
                res.send(docs[0]);
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
        // TODO: check if hash ok
        self.jobList.find({hash: req.params.hash}, function (err, docs) {
            if (err) {
                self.logger.error('err');
                res.sendStatus(500);
            } else if (docs.length === 0) {
                self.jobList.update({hash: req.params.hash}, jobInfo, {upsert: true}, function (err) {
                    if (err) {
                        self.logger.error(err);
                        res.sendStatus(500);
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

    });


    router.post('/update/:hash', function (req, res/*, next*/) {

        self.jobList.find({hash: req.params.hash}, function (err, docs) {
            if (err) {
                self.logger.error(err);
                res.sendStatus(500);
            } else if (docs.length) {
                var jobInfo = new JobInfo(docs[0]);
                var jobInfoUpdate = new JobInfo(req.body);
                jobInfoUpdate.hash = req.params.hash;
                for (var i in jobInfoUpdate) {
                    if (jobInfoUpdate[i] !== null && (!(jobInfoUpdate[i] instanceof Array) ||
                        jobInfoUpdate[i].length !== 0)) {

                        jobInfo[i] = jobInfoUpdate[i];
                    }
                }
                self.jobList.update({hash: req.params.hash}, jobInfo, function (err, numReplaced) {
                    if (err) {
                        self.logger.error(err);
                        res.sendStatus(500);
                    } else if (numReplaced !== 1) {
                        res.sendStatus(404);
                    } else {
                        res.sendStatus(200);
                    }
                });
            } else {
                res.sendStatus(404);
            }
        });
    });

    router.post('/cancel/:hash', function (req, res, next) {
        next(new Error('Not implemented yet.'));
    });

    // worker API
    router.get('/worker', function (req, res/*, next*/) {
        var response = {};
        self.workerList.find({}, function (err, workers) {
            var jobQuery = function (i) {
                if (i === workers.length) {
                    res.send(JSON.stringify(response));
                    return;
                }
                var worker = workers[i];
                self.jobList.find({
                    status: 'RUNNING',
                    worker: worker.clientId
                }).sort({createTime: 1}).exec(function (err, jobs) {
                    // FIXME: index self.jobList on status?
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
    });

    router.post('/worker', function (req, res/*, next*/) {
        var clientRequest = new WorkerInfo.ClientRequest(req.body),
            serverResponse = new WorkerInfo.ServerResponse({refreshPeriod: workerRefreshInterval});

        serverResponse.labelJobs = self.labelJobs;

        self.workerList.update({clientId: clientRequest.clientId}, {
            $set: {
                lastSeen: (new Date()).getTime() / 1000,
                labels: clientRequest.labels
            }
        }, {upsert: true}, function () {
            if (clientRequest.availableProcesses) {
                self.jobList.find({
                    status: 'CREATED',
                    $not: {labels: {$nin: clientRequest.labels}}
                }).limit(clientRequest.availableProcesses).exec(function (err, docs) {
                    if (err) {
                        self.logger.error(err);
                        res.sendStatus(500);
                        return; // FIXME need to return 2x
                    }

                    var callback = function (i) {
                        if (i === docs.length) {
                            res.send(JSON.stringify(serverResponse));
                            return;
                        }
                        self.jobList.update({_id: docs[i]._id, status: 'CREATED'}, {
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
                res.send(JSON.stringify(serverResponse));
            }
        });
    });

    self.logger.debug('ready');
}



module.exports = {
    initialize: initialize,
    router: router
};