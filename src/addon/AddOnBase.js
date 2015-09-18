/*globals define*/
/*jshint node:true*/

/**
 * @author kecso / https://github.com/kecso
 */

define(['common/storage/constants'], function (CONSTANTS) {
    'use strict';

    /**
     *
     * @param core
     * @param project
     * @param branchName
     * @param gmeConfig
     * @constructor
     */
    var AddOnBase = function (core, project, branchName, blobClient, logger, gmeConfig) {
        this.gmeConfig = gmeConfig;
        this.core = core;
        this.project = project;
        this.branchName = branchName;
        this.logger = logger;
        this.blobClient = blobClient;

        this.commitHash = '';
        this.rootHash = '';
        this.rootNode = null;

        this.initialized = false;

        this.logger.debug('ctor');
    };

    /**
     * Structure of query parameters with names, descriptions, minimum, maximum values, default values and
     * type definitions.
     * @returns {object[]}
     */
    AddOnBase.prototype.getQueryParametersStructure = function () {
        return [];
    };

    /**
     * Queries are typically invoked by users from a client. The addOn is not suppose to make any changes to
     * either the model's or the addOns state. (Since users can share a running instance of an addOn).
     * @param {string} commitHash - State of the invoker.
     * @param {object} queryParams - Values based on the 'getQueryParametersStructure'.
     * @param {function} callback - resolves with PluginResult.
     */
    AddOnBase.prototype.query = function (commitHash, queryParams, callback) {
        callback(new Error('The function is the main function of the addOn so it must be overwritten.'));
    };

    /**
     *
     * @param {object} rootNode
     * @param {function} callback
     */
    AddOnBase.prototype.onUpdate = function (rootNode, commitObj, callback) {
        callback(new Error('The update function is a main point of an addOn\'s functionality so it must be ' +
            'overwritten.'));
    };

    /**
     *
     * @param {object} rootNode
     * @param {function} callback
     */
    AddOnBase.prototype.initialize = function (rootNode, commitObj, callback) {
        this.initialized = true;
        this.onUpdate(rootNode, commitObj, callback);
    };

    /**
     * Readable name of this addOn that can contain spaces.
     *
     * @returns {string}
     */
    AddOnBase.prototype.getName = function () {
        throw new Error('implement this function in the derived class - getting type automatically is a bad idea,' +
            'when the js scripts are minified names are useless.');
    };

    /**
     * Current version of this addOn using semantic versioning.
     * @returns {string}
     */
    AddOnBase.prototype.getVersion = function () {
        return '0.1.0';
    };

    /**
     * A detailed description of this addOn and its purpose. It can be one or more sentences.
     *
     * @returns {string}
     */
    AddOnBase.prototype.getDescription = function () {
        return '';
    };

    // Methods used by the addOn manager(s).
    AddOnBase.prototype.init = function (parameters, callback) {
        var self = this,
            hashUpdateHandler = function (data, commitQueue, updateQueue, handlerCallback) {
                function loadNewRoot(rootLoaded) {
                    self.rootHash = data.commitData.commitObject.root;
                    self.commit = data.commitData.commitObject[CONSTANTS.MONGO_ID];
                    self.core.loadRoot(self.rootHash, function (err, root) {
                        if (err) {
                            self.logger.error('failed to load new root', err);
                            rootLoaded(err);
                            return;
                        }

                        self.root = root;
                        rootLoaded(null);
                    });
                }

                if (self.running) {
                    loadNewRoot(function (err) {
                        if (err) {
                            handlerCallback(err, false); // proceed: false
                            return;
                        }
                        self.update(self.root, function (err) {
                            var proceed = !err;

                            handlerCallback(err, proceed);
                        });
                    });
                } else if (self.initializing === true) {
                    loadNewRoot(function (err) {
                        if (err) {
                            handlerCallback(err, false); // proceed: false
                            return;
                        }
                        self.intializing = false;
                        self.running = true;
                        handlerCallback(null, true);
                    });
                }
            },
            branchStatusHandler = function (branchStatus /*, commitQueue, updateQueue*/) {
                //TODO check how it should work
                self.logger.debug('New branchStatus', branchStatus);
            };

        // This is the part of the start process which should always be done,
        // so this function should be always called from the start.
        self.logger.debug('Initializing');
        if (!(parameters.projectId && parameters.branchName)) {
            callback(new Error('Failed to initialize'));
            return;
        }

        self.projectId = parameters.projectId;
        self.branchName = parameters.branchName;
        //we should open the project and the branch
        this._storage.openProject(self.projectId, function (err, project, branches) {
            if (err) {
                callback(err);
                return;
            }

            if (branches.hasOwnProperty(self.branchName) === false) {
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

            self._storage.openBranch(self.projectId, self.branchName, hashUpdateHandler, branchStatusHandler,
                function (err /*, latestCommit*/) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    callback(null);
                }
            );
        });

    };

    AddOnBase.prototype.start = function (parameters, callback) {
        var self = this;
        //this is the initialization function it could be overwritten or use as it is
        //this.logger = parameters.logger;
        if (self.running || self.initializing) {
            callback(new Error('AddOn is already running or starting up.'));
            return;
        }

        self.initializing = true;

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

    return AddOnBase;
});