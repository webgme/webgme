/*globals define*/
/*jshint node:true*/

/**
 * @author kecso / https://github.com/kecso
 */

define(['common/storage/constants'], function (CONSTANTS) {
    'use strict';
    var AddOnBase = function (Core, storage, gmeConfig, logger__, userId) {
        this._Core = Core;
        this._storage = storage;
        this.gmeConfig = gmeConfig;
        this.core = null;
        this.logger = logger__;
        this.project = null;
        this.branchName = '';
        this.projectName = '';
        this.branch = null;
        this.commit = null;
        this.root = null;
        this.rootHash = '';
        this.userId = userId;

    };
    AddOnBase.prototype.getName = function () {
        throw new Error('implement this function in the derived class - getting type automatically is a bad idea,' +
            'when the js scripts are minified names are useless.');
    };

    AddOnBase.prototype._eventer = function (ready) {
        var lastGuid = '',
            self = this,
            isReady = false,
            nextServerEvent = function (err, guid, parameters) {
                lastGuid = guid || lastGuid;
                self.logger.debug('next server event');
                if (self.running === false) {
                    self.logger.debug('event will not be processed; addon has already stopped', {metadata: arguments});
                    return;
                }
                if (isReady === false) {
                    self.logger.debug('eventer is ready');
                    isReady = true;
                    ready();
                }
                self.logger.debug('eventer', {metadata: arguments});
                if (!err && parameters) {
                    self.pendingEvents += 1;
                    switch (parameters.type) { // FIXME use if else
                        case 'PROJECT_CREATED':
                        case 'PROJECT_DELETED':
                        case 'BRANCH_CREATED':
                        case 'BRANCH_DELETED':
                            //TODO can be handled later
                            self.pendingEvents -= 1;
                            return self._storage.getNextServerEvent(lastGuid, nextServerEvent);
                        case 'BRANCH_UPDATED':
                            if (self.projectName === parameters.project && self.branchName === parameters.branch) {
                                //setTimeout(function () {

                                self.project.loadObject(parameters.commit, function (err, commit) {
                                    if (err || !commit) {
                                        // FIXME: we should do something with the error.
                                        self.pendingEvents -= 1;
                                        return self._storage.getNextServerEvent(lastGuid, nextServerEvent);
                                    }

                                    self.commit = parameters.commit;
                                    self.core.loadRoot(commit.root, function (err, root) {
                                        if (err) {
                                            // FIXME: we should do something with the error.
                                            self.pendingEvents -= 1;
                                            return self._storage.getNextServerEvent(lastGuid, nextServerEvent);
                                        }
                                        if (self.stopped) {
                                            // do not call update if addon has stopped.
                                            self.pendingEvents -= 1;
                                            //return;
                                        } else {
                                            self.update(root, function (/*err*/) {
                                                //TODO: error handling here?
                                                self.pendingEvents -= 1;
                                                return self._storage.getNextServerEvent(lastGuid, nextServerEvent);
                                            });
                                        }
                                    });
                                });
                                //}, 400); // Intentional delay to test code,
                                // for testing use 400 (success) and 1800 (failure)
                            } else {
                                return self._storage.getNextServerEvent(lastGuid, nextServerEvent);
                            }
                    }
                } else {
                    // FIXME: log error if any
                    if (self.running) {
                        setTimeout(function () {
                            return self._storage.getNextServerEvent(lastGuid, nextServerEvent);
                        }, 1000);
                    }
                }
            };

        //setTimeout(function () {
        self._storage.getNextServerEvent(lastGuid, nextServerEvent);
        //}, 100); // for testing purposes only
    };

    AddOnBase.prototype.updateHandler = function (updateQueue, updateData, aborting) {
        var self = this;

        self.rootHash = updateData.commitObject.root;
        self.commit = updateData.commitObject[CONSTANTS.MONGO_ID];
        self.core.loadRoot(self.rootHash, function (err, root) {
            if (err) {
                self.logger.error('failed to load new root', err);
                aborting(true);
                return;
            }

            self.root = root;
            self.update(root, function (err) {
                aborting(err !== null);
            });
        });
    };

    AddOnBase.prototype.commitHandler = function (commitQueue, result, pushing) {
        //TODO check how it should work
        pushing(true);
    };

    AddOnBase.prototype.init = function (parameters, callback) {
        var self = this;
        // This is the part of the start process which should always be done,
        // so this function should be always called from the start.
        this.logger.debug('Initializing');
        if (!(parameters.projectName && parameters.branchName)) {
            callback(new Error('Failed to initialize'));
            return;
        }

        self.projectName = parameters.projectName;
        self.branchName = parameters.branchName;
        //we should open the project and the branch
        this._storage.openProject(self.projectName, function (err, project, branches) {
            if (err) {
                callback(err);
                return;
            }

            if (!branches[self.branchName]) {
                callback(new Error('no such branch [' + self.branchName + ']'));
                return;
            }

            self.project = project;
            self.commit = branches[self.branchName];
            self.core = new self._Core(project, {globConf: self.gmeConfig, logger: self.logger.fork('core')});
            self.running = false; // indicates if the start is called and the stop is not called yet.
            self.stopped = false; // indicates when the addon stop function was called and it returned.
            self.pendingEvents = 0;
            // time to wait in ms for this amount after stop is called and before we kill the addon
            self.waitTimeForPendingEvents = parameters.waitTimeForPendingEvents || 1500;

            self._storage.openBranch(self.projectName, self.branchName, self.updateHandler, self.commitHandler, function (err, branch) {
                if (err) {
                    callback(err);
                    return;
                }

                self.branch = branch;
                self.project.loadObject(self.commit, function (err, commitObject) {
                    if (err) {
                        callback(err);
                    }

                    self.rootHash = commitObject.root;
                    self.core.loadRoot(self.rootHash, function (err, root) {
                        if (err) {
                            callback(err);
                            return;
                        }
                        self.root = root;
                        self.running = true;
                        callback(null);
                    });
                });
            });
        });

    };

    AddOnBase.prototype.start = function (parameters, callback) {
        var self = this;
        //this is the initialization function it could be overwritten or use as it is
        //this.logger = parameters.logger;

        self.init(parameters, function (err) {
            if (err) {
                self.running = false;
                callback(err);
                return;
            }
            if (self.running) {
                callback(null);
            } else {
                callback(new Error('basic initialization failed, check parameters!'));
            }
        });

    };

    AddOnBase.prototype.stop = function (callback) {
        var timeout = this.waitTimeForPendingEvents,
            intervalLength = 100,
            numInterval = Math.floor(timeout / intervalLength),
            intervalId,
            self = this;
        this.running = false;

        function stoppedOk(done) {
            self.logger.debug('Stopped');
            self.stopped = true;
            done(null);
        }

        function stoppedErrorPendingRequests(err, done) {
            self.logger.error('Stopped but there were still pending events.');
            self.stopped = true;
            done(err || new Error('Did not stop correctly'));
        }

        if (numInterval > 0) {
            intervalId = setInterval(function () {
                numInterval -= 1;
                if (numInterval < 0) {
                    clearInterval(intervalId);
                    if (self.pendingEvents > 0) {
                        stoppedErrorPendingRequests(null, callback);
                    } else {
                        stoppedOk(callback);
                    }
                } else {
                    if (self.pendingEvents > 0) {
                        // waiting
                        self.logger.debug('Waiting for pending events', {
                            metadata: {
                                pendingEvents: self.pendingEvents,
                                timeLeft: numInterval * intervalLength
                            }
                        });
                    } else {
                        // we are ok
                        clearInterval(intervalId);

                        stoppedOk(callback);
                    }
                }
            }, intervalLength);
        } else {
            if (self.pendingEvents > 0) {
                // waiting
                stoppedErrorPendingRequests(null, callback);
            } else {
                // we are ok
                stoppedOk(callback);
            }
        }
    };

    AddOnBase.prototype.update = function (root, callback) {
        callback(new Error('The update function is a main point of an addOn\'s functionality so it must be' +
            'overwritten.'));
    };

    AddOnBase.prototype.query = function (parameters, callback) {
        callback(new Error('The function is the main function of the addOn so it must be overwritten.'));
    };

    return AddOnBase;
});