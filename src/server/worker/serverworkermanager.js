/*globals requireJS*/
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
    GUID = requireJS('common/util/guid'),
    SIMPLE_WORKER_JS = path.join(__dirname, 'simpleworker.js'),
    CONNECTED_WORKER_JS = path.join(__dirname, 'connectedworker.js');


function ServerWorkerManager(_parameters) {
    var self = this,
        _managerId = null,
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
            var childProcess;

            if (workerType === CONSTANTS.workerTypes.connected) {
                childProcess = Child.fork(CONNECTED_WORKER_JS, [], {execArgv: execArgv});
            } else {
                childProcess = Child.fork(SIMPLE_WORKER_JS, [], {execArgv: execArgv});
            }

            _workers[childProcess.pid] = {
                childProcess: childProcess,
                state: CONSTANTS.workerStates.initializing,
                type: workerType,
                cb: null
            };

            logger.debug('workerPid forked ' + childProcess.pid);
            childProcess.on('message', messageHandling);
            childProcess.on('exit', function (code, signal) {
                logger.debug('worker has exited: ' + childProcess.pid);
                // When killing child-process the code is undefined and the signal SIGINT.
                if (code !== 0 && signal !== 'SIGINT') {
                    logger.warn('worker ' + childProcess.pid + ' has exited abnormally with code ' + code +
                        ', signal', signal);
                } else {
                    logger.debug('worker ' + childProcess.pid + ' was terminated.');
                }

                if (workerType === CONSTANTS.workerTypes.connected) {
                    self.connectedWorkerId = null;
                }

                delete _workers[childProcess.pid];
                reserveWorkerIfNecessary(workerType);
            });
        }
    }

    function freeWorker(workerPid) {
        logger.debug('freeWorker', workerPid);
        if (_workers[workerPid]) {
            _workers[workerPid].childProcess.kill('SIGINT');
            delete _workers[workerPid];
        } else {
            logger.warn('freeWorker - worker did not exist', workerPid);
        }
    }

    function freeAllWorkers(callback) {
        logger.debug('closing all workers');
        var len = Object.keys(_workers).length,
            closeHandlers = {};
        logger.debug('there are ' + len + ' workers to close');
        Object.keys(_workers).forEach(function (workerPid) {
            // Clear the previously assigned handlers for the child process.
            _workers[workerPid].childProcess.removeAllListeners('exit');
            _workers[workerPid].childProcess.removeAllListeners('message');

            // Define and store a close-handler.
            closeHandlers[workerPid] = function (err) {
                if (err) {
                    logger.error(err);
                }
                logger.debug('workerPid closed: ' + workerPid + ', nbr left', len - 1);
                // Reset the handler since both error and close may be triggered.
                closeHandlers[workerPid].closeHandler = function () {};

                if (_workers[workerPid].type === CONSTANTS.workerTypes.connected) {
                    self.connectedWorkerId = null;
                }

                delete _workers[workerPid];
                len -= 1;
                if (len === 0) {
                    callback(null);
                }
            };

            // Assign the close handler to both error and close event.
            _workers[workerPid].childProcess.on('error', closeHandlers[workerPid]);
            _workers[workerPid].childProcess.on('close', closeHandlers[workerPid]);
            // Send kill to child process.
            _workers[workerPid].childProcess.kill('SIGINT');
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
                worker.childProcess.send(request.request);
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
                    cFunction = self.connectedWorkerCallbacks[msg.resid];
                    delete self.connectedWorkerCallbacks[msg.resid];

                    if (cFunction) {
                        cFunction(msg.error, msg.result);
                    } else {
                        logger.warn('No callback associated with', msg.resid);
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
                        logger.error('ConnectedWorker returned result!');
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
                    worker.childProcess.send({
                        command: CONSTANTS.workerCommands.initialize,
                        gmeConfig: gmeConfig
                    });
                    break;
                case CONSTANTS.msgTypes.initialized:
                    //the worker have been initialized so we have to try to assign it right away
                    if (worker.type === CONSTANTS.workerTypes.simple) {
                        worker.state = CONSTANTS.workerStates.free;
                    } else if (worker.type === CONSTANTS.workerTypes.connected) {
                        // Connected worker is always waiting for now..
                        worker.state = CONSTANTS.workerStates.waiting;
                        self.connectedWorkerId = msg.pid;
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

    this.request = function (parameters, callback) {
        logger.debug('Incoming request', {metadata: parameters});
        _waitingRequests.push({request: parameters, cb: callback});
        reserveWorkerIfNecessary(CONSTANTS.workerTypes.simple);
    };

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

    this.query = function (id, parameters, callback) {
        var worker;
        logger.debug('Incoming query', id, {metadata: parameters});
        if (_idToPid[id]) {
            worker = _workers[_idToPid[id]];
            if (worker) {
                worker.cb = callback;
                if (!parameters.command) {
                    parameters.command = CONSTANTS.workerCommands.connectedWorkerQuery;
                }
                worker.childProcess.send(parameters);
            } else {
                delete _idToPid[id];
                callback('request handler cannot be found');
            }
        } else {
            callback('wrong request identification');
        }
    };

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

        var connectedRequest,
            guid;
        if (self.connectedWorkerRequests.length > 0 && gmeConfig.addOn.enable === true &&
            self.connectedWorkerId !== null &&
            _workers[self.connectedWorkerId].state === CONSTANTS.workerStates.waiting) {
            guid = GUID();
            connectedRequest = self.connectedWorkerRequests.shift();
            _workers[self.connectedWorkerId].state = CONSTANTS.workerStates.waiting;
            self.connectedWorkerCallbacks[guid] = connectedRequest.cb;
            connectedRequest.request.resid = guid;
            _workers[self.connectedWorkerId].childProcess.send(connectedRequest.request);
        }
    }


    // TODO: This should be an object based on projectIds or list of such.
    // TODO: For now we just keep one dedicated worker for the addOns.
    this.connectedWorkerId = null;
    this.connectedWorkerRequests = [];
    this.connectedWorkerCallbacks = {
        //resid: callback
    };

    /**
     *
     * @param {object} parameters
     * @param {string} parameters.webgmeToken
     * @param {string} parameters.projectId
     * @param {string} parameters.branchName
     * @param {boolean} parameters.join
     * @param {function} callback
     */
    this.socketRoomChange = function (parameters, callback) {
        if (gmeConfig.addOn.enable === true) {
            if (parameters.join === true) {
                logger.info('socket joined room');
                parameters.command = CONSTANTS.workerCommands.connectedWorkerStart;
                self.connectedWorkerRequests.push({
                    request: parameters,
                    cb: callback
                });
            } else {
                parameters.command = CONSTANTS.workerCommands.connectedWorkerStop;
                logger.info('socket left room');
                self.connectedWorkerRequests.push({
                    request: parameters,
                    cb: callback
                });
            }
        } else {
            callback(null);
        }
    };

    this.start = function () {
        if (_managerId === null) {
            _managerId = setInterval(queueManager, 10);
        }
        reserveWorkerIfNecessary(CONSTANTS.workerTypes.simple);
        if (gmeConfig.addOn.enable === true) {
            logger.info('AddOns enabled will reserve a connectedWorker');
            reserveWorker(CONSTANTS.workerTypes.connected);
        }
    };

    this.stop = function (callback) {
        clearInterval(_managerId);
        _managerId = null;
        freeAllWorkers(callback);
    };

    this.CONSTANTS = CONSTANTS;
}

module.exports = ServerWorkerManager;

