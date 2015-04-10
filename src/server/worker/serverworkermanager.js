/*globals requireJS*/
/*jshint node: true*/

'use strict';

var path = require('path'),
    Child = require('child_process'),
    process = require('process'),
    CONSTANTS = require('./constants'),

    ASSERT = requireJS('common/util/assert'),

    Logger = require('../logger');


function ServerWorkerManager(_parameters) {
    var _workers = [],
        _workerCount = 0,
        _myWorkers = {},
        _idToPid = {},
        _waitingRequests = [],
        gmeConfig = _parameters.globConf,
    //Logger = require(require('path').join(requirejs.s.contexts._.config.baseUrl, 'server/logger')),
        logger = Logger.create('gme:server:worker:serverworkermanager', gmeConfig.server.log);

    //helping functions
    //TODO always check if this works properly
    function getBaseDir() {
        return requireJS.s.contexts._.config.baseUrl;
    }

    function reserveWorker() {
        if (_workerCount < gmeConfig.server.maxWorkers) {
            var worker = Child.fork(getBaseDir() + '/server/worker/simpleworker.js', [],
                {
                    execArgv: process.execArgv.filter(function (arg) {
                        return arg.indexOf('--debug-brk') !== 0
                    })
                });
            _myWorkers[worker.pid] = {worker: worker, state: CONSTANTS.workerStates.initializing, type: null, cb: null};
            logger.debug('workerPid forked ' + worker.pid);
            worker.on('message', messageHandling);
            _workerCount++;

        }
    }

    function freeWorker(workerPid) {
        if (_myWorkers[workerPid]) {
            _myWorkers[workerPid].worker.kill();
            delete _myWorkers[workerPid];
            _workerCount--;
            if (_waitingRequests.length > 0) {
                //there are waiting requests, so we have to reserveWorker for them
                reserveWorker();
            }
        }
    }

    function freeAllWorkers() {
        Object.keys(_myWorkers).forEach(function (workerPid) {
            // FIXME: we need to send to the worker
            _myWorkers[workerPid].worker.kill();
            logger.debug('workerPid killed: ' + workerPid);
        });
    }

    function stop() {
        freeAllWorkers();
    }

    function assignRequest(workerPid) {
        if (_waitingRequests.length > 0) {
            if (_myWorkers[workerPid].state === CONSTANTS.workerStates.free) {
                var request = _waitingRequests.shift();
                _myWorkers[workerPid].state = CONSTANTS.workerStates.working;
                _myWorkers[workerPid].cb = request.cb;
                _myWorkers[workerPid].resid = null;
                if (request.request.command === CONSTANTS.workerCommands.connectedWorkerStart) {
                    _myWorkers[workerPid].type = CONSTANTS.workerTypes.connected;
                } else {
                    _myWorkers[workerPid].type = CONSTANTS.workerTypes.simple;
                }
                _myWorkers[workerPid].worker.send(request.request);
            }
        } else {
            //there is no need for the worker so we simply kill it
            var firstIdleWorker = undefined;
            var idleWorkerCount = 0;
            Object.getOwnPropertyNames(_myWorkers).forEach(function (pid) {
                if (_myWorkers[pid].state === CONSTANTS.workerStates.free) {
                    if (firstIdleWorker === undefined) {
                        firstIdleWorker = _myWorkers[pid];
                    } else {
                        freeWorker(pid);
                    }
                }
            });
        }
    }

    function messageHandling(msg) {
        var worker = _myWorkers[msg.pid],
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
                            assignRequest(msg.pid);
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
                        assignRequest(msg.pid);
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
                    assignRequest(msg.pid);
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
        if (_workerCount < gmeConfig.server.maxWorkers) {
            //there is resource for worker
            reserveWorker();
        }
        _waitingRequests.push({request: parameters, cb: callback});
        Object.getOwnPropertyNames(_myWorkers).forEach(function (pid) {
            if (_myWorkers[pid].state === CONSTANTS.workerStates.free) {
                assignRequest(pid);
            }
        });
    }

    function result(id, callback) {
        var worker, message = null;
        if (_idToPid[id]) {
            worker = _myWorkers[_idToPid[id]];
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
            worker = _myWorkers[_idToPid[id]];
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

    reserveWorker();

    return {
        request: request,
        result: result,
        query: query,
        stop: stop
    };
}

module.exports = ServerWorkerManager;

