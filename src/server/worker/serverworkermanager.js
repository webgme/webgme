/*jshint node: true*/
/**
 * @module Server:ServerWorkerManager
 * @author kecso / https://github.com/kecso
 */
'use strict';

var Child = require('child_process'),
    Q = require('q'),
    path = require('path'),
    CONSTANTS = require('./constants'),
    WorkerManagerBase = require('./WorkerManagerBase'),
    SIMPLE_WORKER_JS = path.join(__dirname, 'simpleworker.js');


function ServerWorkerManager(parameters) {
    var _managerId = null,
        _workers = {},
        _idToPid = {},
        _waitingRequests = [],
        debugPort = 5859,
        gmeConfig = parameters.gmeConfig,
        logger = parameters.logger.fork('serverworkermanager');

    WorkerManagerBase.call(this, parameters);
    logger.debug('SIMPLE_WORKER_JS:', SIMPLE_WORKER_JS);

    //helping functions
    function reserveWorker(workerType, callback) {
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
            var childProcess = Child.fork(SIMPLE_WORKER_JS, [], {execArgv: execArgv});

            _workers[childProcess.pid] = {
                childProcess: childProcess,
                state: CONSTANTS.workerStates.initializing,
                type: workerType,
                cb: null
            };

            logger.debug('workerPid forked ' + childProcess.pid);
            childProcess.on('message', function (msg) {
                messageHandling(msg);

                // FIXME: Do we really need the "initialize" in addition to "initialized"?
                // FIXME: Why couldn't the worker start the initializing at spawn? (It can load the gmeConfig itself)
                if (msg.type === CONSTANTS.msgTypes.initialized && typeof callback === 'function') {
                    callback();
                    callback = null;
                }
            });

            childProcess.on('exit', function (code, signal) {
                logger.debug('worker has exited: ' + childProcess.pid);
                // When killing child-process the code is undefined and the signal SIGINT.
                if (code !== 0 && signal !== 'SIGINT') {
                    logger.warn('worker ' + childProcess.pid + ' has exited abnormally with code ' + code +
                        ', signal', signal);
                    if (typeof callback === 'function') {
                        callback(new Error('worker ' + childProcess.pid + ' exited abnormally with code ' + code));
                    }
                } else {
                    logger.debug('worker ' + childProcess.pid + ' was terminated.');
                }

                delete _workers[childProcess.pid];
                reserveWorkerIfNecessary(workerType);
            });
        } else if (typeof callback === 'function') {
            callback();
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
                case CONSTANTS.msgTypes.result:
                    // Response to result request, so worker can be freed
                    cFunction = worker.cb;
                    worker.cb = null;
                    if (worker.type === CONSTANTS.workerTypes.simple) {
                        worker.state = CONSTANTS.workerStates.free;
                        if (worker.resid) {
                            delete _idToPid[worker.resid];
                        }
                        worker.resid = null;
                    } else {
                        logger.error('ConnectedWorker returned result!');
                        freeWorker(msg.pid);
                    }

                    if (cFunction) {
                        cFunction(msg.error ? new Error(msg.error) : null, msg.result);
                    } else {
                        logger.warn('No callback associated with', worker.resid);
                    }
                    break;
                case CONSTANTS.msgTypes.initialize:
                    // This arrives when the worker is ready for initialization.
                    worker.childProcess.send({
                        command: CONSTANTS.workerCommands.initialize,
                        gmeConfig: gmeConfig
                    });
                    break;
                case CONSTANTS.msgTypes.initialized:
                    // The worker has been initialized and is free to received requests.
                    if (worker.type === CONSTANTS.workerTypes.simple) {
                        worker.state = CONSTANTS.workerStates.free;
                    }
                    break;
                default:
                    logger.error(new Error('Unexpected worker msg ' + msg.type));
            }
        }
    }

    function reserveWorkerIfNecessary(workerType, callback) {
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
            reserveWorker(workerType, callback);
        } else if (typeof callback === 'function') {
            callback();
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

    this.request = function (parameters, callback) {
        logger.debug('Incoming request', {metadata: parameters});
        _waitingRequests.push({request: parameters, cb: callback});
        reserveWorkerIfNecessary(CONSTANTS.workerTypes.simple);
    };

    this.start = function (callback) {
        if (_managerId === null) {
            _managerId = setInterval(queueManager, 10);
        }

        return Q.nfcall(reserveWorkerIfNecessary, CONSTANTS.workerTypes.simple)
            .nodeify(callback);
    };

    this.stop = function (callback) {
        clearInterval(_managerId);
        _managerId = null;

        return Q.nfcall(freeAllWorkers).nodeify(callback);
    };

    this.CONSTANTS = CONSTANTS;
}

ServerWorkerManager.prototype = Object.create(WorkerManagerBase.prototype);
ServerWorkerManager.prototype.constructor = ServerWorkerManager;

module.exports = ServerWorkerManager;

