/*globals*/
/*jshint node: true*/
/**
 * @module Server:ServerWorkerManager
 * @author kecso / https://github.com/kecso
 */
'use strict';

var Child = require('child_process'),
    process = require('process'),
    path = require('path'),
    CONSTANTS = require('./constants'),
    SIMPLE_WORKER_JS = path.join(__dirname, 'simpleworker.js'),
    CONNECTED_WORKER_JS = path.join(__dirname, 'connectedworker.js');


function ServerWorkerManager(_parameters) {
    var _managerId = null,
        _workers = {},
        _idToPid = {},
        _waitingRequests = [],
        debugPort = 5859,
        gmeConfig = _parameters.globConf,
        logger = _parameters.logger.fork('serverworkermanager');

    logger.debug('SIMPLE_WORKER_JS:', SIMPLE_WORKER_JS);
    logger.debug('CONNECTED_WORKER_JS:', CONNECTED_WORKER_JS);

    //helping functions
    function reserveWorker(workerType) {
        var debug = false,
            execArgv = process.execArgv.filter(function (arg) {
                if (arg.indexOf('--debug-brk') === 0) {
                    logger.info('Main process is in debug mode', arg);
                    debug = '--debug-brk';
                    return false;
                } else if (arg.indexOf('--debug') === 0) {
                    logger.info('Main process is in debug mode', arg);
                    debug = '--debug';
                    return false;
                }
                return true;
            });
        // http://stackoverflow.com/questions/16840623/how-to-debug-node-js-child-forked-process
        // For some reason --debug-brk is given here..
        if (debug) {
            execArgv.push(debug + '=' + debugPort.toString());
            logger.info('Child debug port: ' + debugPort.toString());
            debugPort += 1;
        }

        logger.debug('execArgv for main process', process.execArgv);
        logger.debug('execArgv for new child process', execArgv);

        if (Object.keys(_workers || {}).length < gmeConfig.server.maxWorkers) {
            var worker;

            if (workerType === CONSTANTS.workerTypes.connected) {
                Child.fork(CONNECTED_WORKER_JS, [], {execArgv: execArgv});
            } else {
                Child.fork(SIMPLE_WORKER_JS, [], {execArgv: execArgv});
            }

            _workers[worker.pid] = {
                worker: worker,
                state: CONSTANTS.workerStates.initializing,
                type: workerType,
                cb: null
            };

            logger.debug('workerPid forked ' + worker.pid);
            worker.on('message', messageHandling);
            worker.on('exit', function (code, signal) {
                logger.debug('worker has exited: ' + worker.pid);
                if (code !== null && !signal) {
                    logger.warn('worker ' + worker.pid + ' has exited abnormally with code ' + code);
                }
                delete _workers[worker.pid];
                reserveWorkerIfNecessary(workerType);
            });
        }
    }

    function freeWorker(workerPid) {
        logger.debug('freeWorker', workerPid);
        if (_workers[workerPid]) {
            _workers[workerPid].worker.kill('SIGINT');
            delete _workers[workerPid];
        } else {
            logger.warn('freeWorker - worker did not exist', workerPid);
        }
    }

    function freeAllWorkers(callback) {
        logger.debug('closing all workers');
        var len = Object.keys(_workers).length;
        logger.debug('there are ' + len + ' worker to close');
        Object.keys(_workers).forEach(function (workerPid) {
            _workers[workerPid].worker.removeAllListeners('exit');
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

    function assignRequest(workerPid) {
        var worker;
        if (_waitingRequests.length > 0) {
            worker = _workers[workerPid];
            if (worker.state === CONSTANTS.workerStates.free && worker.type === CONSTANTS.workerTypes.simple) {
                var request = _waitingRequests.shift();
                logger.debug('Request will be handled, request left in queue: ', _waitingRequests.length);
                logger.debug('Worker "' + workerPid + '" will handle request: ', {metadata: request});
                worker.state = CONSTANTS.workerStates.working;
                worker.cb = request.cb;
                worker.resid = null;
                //if (request.request.command === CONSTANTS.workerCommands.connectedWorkerStart) {
                //    worker.type = CONSTANTS.workerTypes.connected;
                //} else {
                //    worker.type = CONSTANTS.workerTypes.simple;
                //}
                worker.worker.send(request.request);
            }
        }
    }

    function messageHandling(msg) {
        var worker = _workers[msg.pid],
            cFunction = null;
        logger.debug('Message received from worker', {metadata: msg});

        if (worker) {
            logger.debug('Worker will handle message', {metadata: worker});
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
                    } else {
                        logger.warn('No callback associated with', worker.resid);
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
                    } else {
                        logger.warn('No callback associated with', worker.resid);
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
                    if (worker.type === CONSTANTS.workerTypes.simple) {
                        worker.state = CONSTANTS.workerStates.free;
                    }
                    //assignRequest(msg.pid);
                    break;
                case CONSTANTS.msgTypes.query:
                    cFunction = worker.cb;
                    worker.cb = null;
                    if (cFunction) {
                        cFunction(msg.error, msg.result);
                    } else {
                        logger.warn('No callback associated with', worker.resid);
                    }
                    break;
            }
        }
    }

    function request(parameters, callback) {
        logger.debug('Incoming request', {metadata: parameters});
        _waitingRequests.push({request: parameters, cb: callback});
        reserveWorkerIfNecessary(CONSTANTS.workerTypes.simple);
    }

    function reserveWorkerIfNecessary(workerType) {
        var workerIds = Object.keys(_workers || {}),
            i,
            initializingWorkers = 0,
            freeWorkers = 0;

        for (i = 0; i < workerIds.length; i++) {
            if (_workers[workerIds[i]].state === CONSTANTS.workerStates.initializing) {
                initializingWorkers += 1;
            } else if (_workers[workerIds[i]].state === CONSTANTS.workerStates.free) {
                freeWorkers += 1;
            }
        }

        if (_waitingRequests.length + 1 /* keep a spare */ > initializingWorkers + freeWorkers &&
            workerIds.length < gmeConfig.server.maxWorkers) {
            reserveWorker(workerType);
        }
    }

    function query(id, parameters, callback) {
        var worker;
        logger.debug('Incoming query', id, {metadata: parameters});
        if (_idToPid[id]) {
            worker = _workers[_idToPid[id]];
            if (worker) {
                worker.cb = callback;
                if (!parameters.command) {
                    parameters.command = CONSTANTS.workerCommands.connectedWorkerQuery;
                }
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
        var i,
            workerPids,
            initializingWorkers = 0,
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
            } else if (_waitingRequests.length + 1 /* keep a spare */ > initializingWorkers &&
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

    // AddOn workers
    // TODO: For now it's just one connected worker.
    var connectedWorkerId;

    function socketRoomChange(projectId, branchName, joined) {
        if (joined) {
            logger.info('A client joined ', projectId, branchName);
        } else {
            logger.info('A client left ', projectId, branchName);
        }
    }

    function start() {
        if (_managerId === null) {
            _managerId = setInterval(queueManager, 10);
        }
        reserveWorkerIfNecessary(CONSTANTS.workerTypes.simple);
        if (gmeConfig.addOn.enable === true) {
            logger.info('AddOns enabled will reserve a connectedWorker');
            reserveWorker(CONSTANTS.workerTypes.connected);
        }
    }

    function stop(callback) {
        clearInterval(_managerId);
        _managerId = null;
        freeAllWorkers(callback);
    }

    return {
        // Workers related
        request: request,

        // AddOn related
        socketRoomChange: socketRoomChange,
        query: query,

        // Manager related
        stop: stop,
        start: start,
        CONSTANTS: CONSTANTS
    };
}

module.exports = ServerWorkerManager;

