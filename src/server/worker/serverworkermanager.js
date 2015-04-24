/*globals requireJS*/
/*jshint node: true*/
/**
 * @author kecso / https://github.com/kecso
 */
'use strict';

var Child = require('child_process'),
    process = require('process'),
    CONSTANTS = require('./constants'),

    ASSERT = requireJS('common/util/assert'),

    Logger = require('../logger');


function ServerWorkerManager(_parameters) {
    var _managerId = null,
        _workers = {},
        _idToPid = {},
        _waitingRequests = [],
        gmeConfig = _parameters.globConf,
        logger = Logger.create('gme:server:worker:serverworkermanager', gmeConfig.server.log);

    //helping functions
    //TODO always check if this works properly
    function getBaseDir() {
        return requireJS.s.contexts._.config.baseUrl;
    }

    function reserveWorker() {
        if (Object.keys(_workers || {}).length < gmeConfig.server.maxWorkers) {
            var worker = Child.fork(getBaseDir() + '/server/worker/simpleworker.js', [],
                {
                    execArgv: process.execArgv.filter(function (arg) {
                        return arg.indexOf('--debug-brk') !== 0;
                    })
                });
            _workers[worker.pid] = {worker: worker, state: CONSTANTS.workerStates.initializing, type: null, cb: null};
            logger.debug('workerPid forked ' + worker.pid);
            worker.on('message', messageHandling);
        }
    }

    function freeWorker(workerPid) {
        //FIXME it would be better if we would have a global function that listens to all close events of the children
        //because that way we could be able to get child-freeze and reuse the slot
        if (_workers[workerPid]) {
            _workers[workerPid].worker.on('close', function (/*code, signal*/) {
                logger.debug('worker have been freed: ' + workerPid);
                delete _workers[workerPid];
            });
            _workers[workerPid].worker.kill('SIGINT');
        }
    }

    function freeAllWorkers(callback) {
        logger.debug('closing all workers');
        var len = Object.keys(_workers).length;
        logger.debug('there are ' + len + ' worker to close');
        Object.keys(_workers).forEach(function (workerPid) {
            _workers[workerPid].worker.on('close', function (/*code, signal*/) {
                logger.debug('workerPid closed: ' + workerPid);
                delete _workers[workerPid];
                len -= 1;
                if (len === 0) {
                    callback(null);
                }
            });
            _workers[workerPid].worker.kill('SIGINT');
            logger.debug('request closing workerPid: ' + workerPid);
        });

        if (len === 0) {
            callback(null);
        }
    }

    function stop(callback) {
        clearInterval(_managerId);
        _managerId = null;
        freeAllWorkers(callback);
    }

    function assignRequest(workerPid) {
        if (_waitingRequests.length > 0) {
            if (_workers[workerPid].state === CONSTANTS.workerStates.free) {
                var request = _waitingRequests.shift();
                _workers[workerPid].state = CONSTANTS.workerStates.working;
                _workers[workerPid].cb = request.cb;
                _workers[workerPid].resid = null;
                if (request.request.command === CONSTANTS.workerCommands.connectedWorkerStart) {
                    _workers[workerPid].type = CONSTANTS.workerTypes.connected;
                } else {
                    _workers[workerPid].type = CONSTANTS.workerTypes.simple;
                }
                _workers[workerPid].worker.send(request.request);
            }
        }
    }

    function messageHandling(msg) {
        var worker = _workers[msg.pid],
            cFunction = null;
        if (worker) {
            switch (msg.type) {
                case CONSTANTS.msgTypes.request:
                    //this is the first response to the request
                    //here we can store the id and
                    cFunction = worker.cb;
                    worker.cb = null;
                    worker.state = CONSTANTS.workerStates.waiting;
                    worker.resid = msg.resid || null;
                    if (msg.resid) {
                        _idToPid[msg.resid] = msg.pid;
                    } else {
                        //something happened during request handling so we can free the worker
                        if (worker.type === CONSTANTS.workerTypes.simple) {
                            worker.state = CONSTANTS.workerStates.free;
                            //assignRequest(msg.pid);
                        } else {
                            freeWorker(msg.pid);
                        }
                    }
                    if (cFunction) {
                        cFunction(msg.error, msg.resid);
                    }
                    break;
                case CONSTANTS.msgTypes.result:
                    //response to result request, so worker can be freed
                    cFunction = worker.cb;
                    worker.cb = null;
                    if (worker.type === CONSTANTS.workerTypes.simple) {
                        worker.state = CONSTANTS.workerStates.free;
                        if (worker.resid) {
                            delete _idToPid[worker.resid];
                        }
                        worker.resid = null;
                        //assignRequest(msg.pid);
                    } else {
                        freeWorker(msg.pid);
                    }

                    if (cFunction) {
                        cFunction(msg.error, msg.result);
                    }
                    break;
                case CONSTANTS.msgTypes.initialize:
                    //this arrives when the worker seems ready for initialization
                    worker.worker.send({
                        command: CONSTANTS.workerCommands.initialize,
                        gmeConfig: gmeConfig
                    });
                    break;
                case CONSTANTS.msgTypes.initialized:
                    //the worker have been initialized so we have to try to assign it right away
                    worker.state = CONSTANTS.workerStates.free;
                    //assignRequest(msg.pid);
                    break;
                case CONSTANTS.msgTypes.info:
                    logger.debug(msg.info);
                    break;
                case CONSTANTS.msgTypes.query:
                    cFunction = worker.cb;
                    worker.cb = null;
                    if (cFunction) {
                        cFunction(msg.error, msg.result);
                    }
                    break;
            }
        }
    }

    function request(parameters, callback) {
        _waitingRequests.push({request: parameters, cb: callback});
        var workerIds = Object.keys(_workers || {}),
            i, initializingWorkers = 0,
            freeWorkers = 0;

        for (i = 0; i < workerIds.length; i++) {
            if (_workers[workerIds[i]].state === CONSTANTS.workerStates.initializing) {
                initializingWorkers += 1;
            } else if (_workers[workerIds[i]].state === CONSTANTS.workerStates.free) {
                freeWorkers += 1;
            }
        }

        if (_waitingRequests.length > initializingWorkers + freeWorkers &&
            workerIds.length < gmeConfig.server.maxWorkers) {
            reserveWorker();
        }
    }

    function result(id, callback) {
        var worker, message = null;
        if (_idToPid[id]) {
            worker = _workers[_idToPid[id]];
            if (worker) {
                ASSERT(worker.state === CONSTANTS.workerStates.waiting);
                worker.state = CONSTANTS.workerStates.working;
                worker.cb = callback;
                worker.resid = null;
                if (worker.type === CONSTANTS.workerTypes.connected) {
                    message = {command: CONSTANTS.workerCommands.connectedWorkerStop};
                }
                worker.worker.send(message);
            } else {
                delete _idToPid[id];
                callback('request handler cannot be found');
            }
        } else {
            callback('wrong request identification');
        }
    }

    function query(id, parameters, callback) {
        var worker;
        if (_idToPid[id]) {
            worker = _workers[_idToPid[id]];
            if (worker) {
                worker.cb = callback;
                parameters.command = CONSTANTS.workerCommands.connectedWorkerQuery;
                worker.worker.send(parameters);
            } else {
                delete _idToPid[id];
                callback('request handler cannot be found');
            }
        } else {
            callback('wrong request identification');
        }
    }

    function queueManager() {
        var i, workerPids, initializingWorkers = 0,
            firstIdleWorker;
        if (_waitingRequests.length > 0) {

            workerPids = Object.keys(_workers);
            i = 0;
            while (i < workerPids.length && _workers[workerPids[i]].state !== CONSTANTS.workerStates.free) {
                if (_workers[workerPids[i]].state === CONSTANTS.workerStates.initializing) {
                    initializingWorkers += 1;
                }
                i += 1;
            }

            if (i < workerPids.length) {
                assignRequest(workerPids[i]);
            } else if (_waitingRequests.length > initializingWorkers &&
                Object.keys(_workers || {}).length < gmeConfig.server.maxWorkers) {
                reserveWorker();
            }
        } else {
            Object.getOwnPropertyNames(_workers).forEach(function (pid) {
                if (_workers[pid].state === CONSTANTS.workerStates.free) {
                    if (firstIdleWorker === undefined) {
                        firstIdleWorker = _workers[pid];
                    } else {
                        freeWorker(pid);
                    }
                }
            });
        }
    }

    function start() {
        if (_managerId === null) {
            _managerId = setInterval(queueManager, 10);
        }
        reserveWorker();
    }

    return {
        request: request,
        result: result,
        query: query,
        stop: stop,
        start: start
    };
}

module.exports = ServerWorkerManager;

