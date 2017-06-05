/*globals requireJS*/
/*jshint node: true*/
/**
 * TODO: This is more or less copied from serverworkermanager...
 * TODO: It can be simplified and merged with AddOnEventPropagator..
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var Child = require('child_process'),
    Q = require('q'),
    path = require('path'),
    CONSTANTS = require('../server/worker/constants'),
    GUID = requireJS('common/util/guid'),
    CONNECTED_WORKER_JS = path.join(__dirname, 'connectedworker.js');


function AddOnWorkerManager(_parameters) {
    var self = this,
        _managerId = null,
        _workers = {},
        _idToPid = {},
        debugPort = 5857,
        gmeConfig = _parameters.gmeConfig,
        logger = _parameters.logger.fork('AddOnWorkerManager');

    logger.debug('CONNECTED_WORKER_JS:', CONNECTED_WORKER_JS);

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
            }),
            childProcess;

        // http://stackoverflow.com/questions/16840623/how-to-debug-node-js-child-forked-process
        // For some reason --debug-brk is given here..
        if (debug) {
            execArgv.push(debug + '=' + debugPort.toString());
            logger.info('Child debug port: ' + debugPort.toString());
            debugPort -= 1;
        }

        logger.debug('execArgv for main process', process.execArgv);
        logger.debug('execArgv for new child process', execArgv);

        childProcess = Child.fork(CONNECTED_WORKER_JS, [], {execArgv: execArgv});

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

            if (workerType === CONSTANTS.workerTypes.connected) {
                self.connectedWorkerId = null;
            }

            delete _workers[childProcess.pid];
            reserveWorker(workerType);
        });
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
                        cFunction(msg.error ? new Error(msg.error) : null, msg.result);
                    } else {
                        logger.warn('No callback associated with', msg.resid);
                    }
                    break;
                case CONSTANTS.msgTypes.result:
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
                    worker.childProcess.send({
                        command: CONSTANTS.workerCommands.initialize,
                        gmeConfig: gmeConfig
                    });
                    break;
                case CONSTANTS.msgTypes.initialized:
                    if (worker.type === CONSTANTS.workerTypes.simple) {
                        worker.state = CONSTANTS.workerStates.free;
                    } else if (worker.type === CONSTANTS.workerTypes.connected) {
                        // Connected worker is always waiting for now..
                        worker.state = CONSTANTS.workerStates.waiting;
                        self.connectedWorkerId = msg.pid;
                    }
                    break;
            }
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
        var connectedRequest,
            guid;

        if (self.connectedWorkerRequests.length > 0 && self.connectedWorkerId !== null &&
            _workers[self.connectedWorkerId].state === CONSTANTS.workerStates.waiting) {

            guid = GUID();
            connectedRequest = self.connectedWorkerRequests.shift();
            _workers[self.connectedWorkerId].state = CONSTANTS.workerStates.waiting;
            self.connectedWorkerCallbacks[guid] = connectedRequest.cb;
            connectedRequest.request.resid = guid;
            logger.debug('connectedRequest', connectedRequest);
            _workers[self.connectedWorkerId].childProcess.send(connectedRequest.request);
        }
    }

    this.connectedWorkerId = null;
    this.connectedWorkerRequests = [];
    this.connectedWorkerCallbacks = {
        //resid: callback
    };

    this.start = function (callback) {
        if (_managerId === null) {
            _managerId = setInterval(queueManager, 10);
        }

        return Q.nfcall(reserveWorker, CONSTANTS.workerTypes.connected)
            .nodeify(callback);
    };

    this.stop = function (callback) {
        clearInterval(_managerId);
        _managerId = null;

        return Q.nfcall(freeAllWorkers).nodeify(callback);
    };

    this.CONSTANTS = CONSTANTS;
}

module.exports = AddOnWorkerManager;

