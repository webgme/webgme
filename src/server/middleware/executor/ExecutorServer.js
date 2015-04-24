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

var fs = require('fs'),
    path = require('path'),
    bufferEqual = require('buffer-equal-constant-time'),
    DataStore = require('nedb'),
    mkdirp = require('mkdirp'),

    JobInfo = requireJS('common/executor/JobInfo'),
    WorkerInfo = requireJS('common/executor/WorkerInfo'),
    ASSERT = requireJS('common/util/assert');

var jobListDBFile,
    workerListDBFile,
    gmeConfig,
    jobList,
    workerList,
    workerRefreshInterval,
    labelJobs,
    labelJobsFilename,
    logger;

function executorRESTCreate(req, res/*, next*/) {
    if (req.method !== 'POST') {
        res.sendStatus(405);
    }
    var url = req.url.split('/');

    if (url.length < 3 || !url[2]) {
        res.sendStatus(404);
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
            logger.error('err');
            res.sendStatus(500);
        } else if (docs.length === 0) {
            jobList.update({hash: hash}, jobInfo, {upsert: true}, function (err) {
                if (err) {
                    logger.error(err);
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
}

function executorRESTUpdate(req, res/*, next*/) {
    if (req.method !== 'POST') {
        res.sendStatus(405);
    }
    var url = req.url.split('/');

    if (url.length < 3 || !url[2]) {
        res.sendStatus(404);
        return;
    }
    var hash = url[2];

    if (hash) {
    } else {
        logger.error('no hash given');
        res.sendStatus(500);
        return;
    }

    jobList.find({hash: hash}, function (err, docs) {
        if (err) {
            logger.error(err);
            res.sendStatus(500);
        } else if (docs.length) {
            var jobInfo = new JobInfo(docs[0]);
            var jobInfoUpdate = new JobInfo(req.body);
            jobInfoUpdate.hash = hash;
            for (var i in jobInfoUpdate) {
                if (jobInfoUpdate[i] !== null && (!(jobInfoUpdate[i] instanceof Array) ||
                    jobInfoUpdate[i].length !== 0)) {

                    jobInfo[i] = jobInfoUpdate[i];
                }
            }
            jobList.update({hash: hash}, jobInfo, function (err, numReplaced) {
                if (err) {
                    logger.error(err);
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

}

function executorRESTWorkerGET(req, res/*, next*/) {
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
}

function executorRESTWorkerAPI(req, res, next) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        res.sendStatus(405);
        return;
    }
    if (req.method === 'GET') {
        return executorRESTWorkerGET(req, res, next);
    }

    var url = require('url').parse(req.url);
    var pathParts = url.pathname.split('/');

    if (pathParts.length < 2) {
        res.sendStatus(404);
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
                    logger.error(err);
                    res.sendStatus(500);
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
                            logger.error(err);
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
}

function executorRESTCancel(req, res/*, next*/) {
    if (req.method !== 'POST') {
        res.sendStatus(405);
        return;
    }

    var url = req.url.split('/');

    if (url.length < 3 || !url[2]) {
        logger.error('ExecutorRESTCancel wrong format of url', url);
        res.sendStatus(500);
        return;
    }

    var hash = url[2];

    if (false) {
        // TODO
        executorBackend.cancelJob(hash);

        res.sendStatus(200);
    } else {
        res.sendStatus(500);
    }

}

function executorRESTInfo(req, res/*, next*/) {
    if (req.method !== 'GET') {
        res.sendStatus(405);
        return;
    }

    var url = req.url.split('/');

    if (url.length < 3 || !url[2]) {
        logger.error('ExecutorRESTInfo wrong format of url', url);
        res.sendStatus(500);
        return;
    }

    var hash = url[2];

    if (hash) {
        jobList.find({hash: hash}, function (err, docs) {
            if (err) {
                logger.error(err);
                res.sendStatus(500);
            } else if (docs.length) {
                res.send(docs[0]);
            } else {
                res.sendStatus(404);
            }
        });
    } else {
        logger.error('hash not given');
        res.sendStatus(500);
    }
}

function executorREST(req, res, next) {

    var authenticate = function () {
        var isAuth = true,
            workerNonce;
        if (gmeConfig.executor.nonce) {
            workerNonce = req.headers['x-executor-nonce'];
            if (workerNonce) {
                isAuth = bufferEqual(new Buffer(workerNonce), new Buffer(gmeConfig.executor.nonce));
            } else {
                isAuth = false;
            }
            if (isAuth === false) {
                res.sendStatus(403);
            }
        }

        return isAuth;
    };

    var url = require('url').parse(req.url);
    var pathParts = url.pathname.split('/');

    if (pathParts.length < 2) {
        res.sendStatus(404);
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
                logger.error(err);
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
//            res.sendfile(path.join('src', 'rest', 'executor', 'index2.html'), function (err) {
//                if (err) {
//                    logger.error(err);
//                    res.sendStatus(500);
//                }
//            });

    } else {

        switch (pathParts[1]) {
            case 'create':
                authenticate() && executorRESTCreate(req, res, next);
                break;
            case 'worker':
                (req.method !== 'POST' || authenticate()) && executorRESTWorkerAPI(req, res, next);
                break;
            case 'cancel':
                authenticate() && executorRESTCancel(req, res, next);
                break;
            case 'info':
                executorRESTInfo(req, res, next);
                break;
            case 'update':
                authenticate() && executorRESTUpdate(req, res, next);
                break;
            default:
                res.sendStatus(404);
                break;
        }
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
    workerList.find(query, function (err, docs) {
        for (var i = 0; i < docs.length; i += 1) {
            // reset unfinished jobs assigned to worker to CREATED, so they'll be executed by someone else
            logger.debug('worker "' + docs[i].clientId + '" is gone');
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
}

function updateLabelJobs() {
    fs.readFile(labelJobsFilename, {encoding: 'utf-8'}, function (err, data) {
        logger.debug('Reading ' + labelJobsFilename);
        labelJobs = JSON.parse(data);
    });
}

function watchLabelJobs() {
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

function createExpressExecutor(__app, baseUrl, options) {
    ASSERT(typeof baseUrl === 'string', 'baseUrl must be given');
    ASSERT(typeof options.gmeConfig !== 'undefined', 'gmeConfig must be provided to ExecutorServer');
    ASSERT(typeof options.logger !== 'undefined', 'logger must be provided to ExecutorServer');

    gmeConfig = options.gmeConfig;

    logger = options.logger.fork('middleware:ExecutorServer');
    logger.debug('output directory', gmeConfig.executor.outputDir);
    mkdirp.sync(gmeConfig.executor.outputDir);

    jobListDBFile = path.join(gmeConfig.executor.outputDir, 'jobList.nedb');
    workerListDBFile = path.join(gmeConfig.executor.outputDir, 'workerList.nedb');
    jobList = new DataStore({filename: jobListDBFile, autoload: true});
    workerList = new DataStore({filename: workerListDBFile, autoload: true});
    workerRefreshInterval = gmeConfig.executor.workerRefreshInterval;

    logger.debug('label-jobs config file', gmeConfig.labelJobs);
    labelJobs = {}; // map from label to blob hash
    labelJobsFilename = gmeConfig.executor.labelJobs;
    watchLabelJobs();
    setInterval(workerTimeout, 10 * 1000);
    jobList.ensureIndex({fieldName: 'hash', unique: true}, function (err) {
        if (err) {
            logger.error('Failure in ExecutorRest');
            throw new Error(err);
        }
    });

    __app.use(baseUrl, executorREST); //TODO: This can be nicer integrated (see BlobServer).
}

module.exports.createExpressExecutor = createExpressExecutor;