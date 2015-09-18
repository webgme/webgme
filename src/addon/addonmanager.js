/*globals requireJS*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var Q = require('q'),
    Core = requireJS('common/core/core'),
    STORAGE_CONSTANTS = requireJS('common/storage/constants'),
    Storage = requireJS('common/storage/nodestorage');

function BranchMonitor(project, branchName, gmeConfig, mainLogger) {
    var self = this;

    this.runningAddOns = [
        //{id: {string}, addOn: {AddOnBase}}
    ];
    this.logger = mainLogger.fork('BranchMonitor:' + branchName);
    this.core = new Core(project, {globConf: gmeConfig, logger: this.logger.fork('core')});

    this.commitHash = '';
    this.rootHash = '';
    this.rootNode = null;


    function getAddOn(name) {
        var addOnPath = 'addon/' + name + '/' + name + '/' + name,
            AddOn,
            error,
            addOn;

        self.logger.debug('requireJS addOn from path: ' + addOnPath);
        try {
            AddOn = requireJS(addOnPath);
        } catch (err) {
            error = err;
        }

        // This is weird, the second time requirejs simply returns with undefined.
        if (AddOn) {
            addOn = new AddOn(self.core, project, branchName, self.logger.fork(name), gmeConfig);
            return addOn;
        } else {
            return error || new Error('AddOn is not available from: ' + addOnPath);
        }
    }

    function loadNewRoot(commitData, callback) {
        var deferred = Q.defer();
        self.rootHash = commitData.commitData.commitObject.root;
        self.commitHash = commitData.commitData.commitObject._id;

        self.core.loadRoot(self.rootHash, function (err, root) {
            if (err) {
                deferred.reject(new Error(err));
            }

            self.rootNode = root;
            deferred.resolve(root);
        });

        return deferred.promise.nodeify(callback);
    }

    function updateRunningAddOns(callback) {
        var deferred = new Q.defer(),
            counter = self.runningAddOns.length;

        if (counter === 0) {
            deferred.resolve()
        }

        return deferred.promise.nodeify(callback);
    }

    function onUpdate(commitData, commitQueue, updateQueue, handlerCallback) {
        loadNewRoot(commitData)
            .then(function () {
                var i,
                    j,
                    wasRunning,
                    runningAddOnsNew = [],
                    requiredAddOns = self.core.getRegistry(self.root, 'usedAddOns').split(' ');

                self.logger.debug('requiredAddOns', requiredAddOns);

                for (i = 0; requiredAddOns.length; i += 1) {
                    wasRunning = false;
                    for (j = 0; self.runningAddOns.length; j += 1) {
                        if (self.runningAddOns[j].id === requiredAddOns[i]) {
                            runningAddOnsNew.push(self.runningAddOns[j]);
                            wasRunning = true;
                            break;
                        }
                    }
                    if (wasRunning === false) {
                        runningAddOnsNew.push(getAddOn(requiredAddOns[i]));
                    }
                }

                self.runningAddOns = runningAddOnsNew;

            })
            .catch(function (err) {

            });
    }

    function branchStatusHandler(branchStatus /*, commitQueue, updateQueue*/) {
        //TODO check how it should work
        self.logger.debug('New branchStatus', branchStatus);
    }

    this.initialize = function (callback) {
        var deferred = Q.defer();

        project.openBranch(project.projectId, branchName, this.onUpdate, this.branchStatusHandler,
            function (err/*, latestCommitData*/) {
                if (err) {
                    deferred.reject(err);
                    return;
                }
                deferred.resolve();
            }
        );

        return deferred.promise.nodeify(callback);
    };
}

function AddOnManager(webGMESessionId, projectId, mainLogger, gmeConfig) {
    var host = '127.0.0.1',
        self = this,
        logger = mainLogger.fork('AddOnManager'),
        storage = Storage.createStorage(host, webGMESessionId, logger, gmeConfig),
        branchMonitors = {}; //:branchName/:addOnId

    this.project = null;

    /**
     * Opens up the storage based on the webGMESessionId and opens and sets the project.
     *
     * @param callback
     */
    this.initialize = function (callback) {
        var deferred = Q.defer();
        storage.open(function (networkStatus) {
            if (networkStatus === STORAGE_CONSTANTS.CONNECTED) {
                storage.openProject(projectId, function (err, project, branches, rights) {
                    if (err) {
                        deferred.reject(err);
                        return;
                    }

                    self.project = project;

                    if (rights.write === false) {
                        logger.warn('AddOnManager for project [' + projectId + '] initialized without write access.');
                    }

                    deferred.resolve(null);
                });
                callback(null);
            } else {
                //FIXME: How to handle disconnect/reconnect for addOns???
                deferred.reject(new Error('Problems connecting to the webgme server, network state: ' + networkStatus));
            }
        });

        return deferred.promise.nodeify(callback);
    };

    function getBranchMonitor(branchName, callback) {


        if (mointor[branchName]) {
            deferred.resolve(monitor[branchName]);
        } else {
            self.project.openBranch()
        }

        return deferred.promise.nodeify(callback);
    }

    this.monitorAddOnsInBranch = function (branchName, callback) {
        var monitor = branchMonitors[branchName];
        if (monitor) {

        }
    };

    this.startAddOn = function (addOnName, branchName, callback) {
        var deferred = Q.defer(),
            AddOn,
            addOn,
            branch,
            startParams;


        AddOn = getAddOn(addOnName);

        addOn = new AddOn(project, branch, logger.fork('addOn_' + addOnName), gmeConfig);

        startParams = {
            projectId: projectId,
            branchName: branchName,
            logger: logger.fork(addOnName)
        };

        addOn.start(startParams, function (err) {
            if (err) {
                deferred.reject(err instanceof Error ? err : new Error(err));
            } else {
                branchMonitors[addOnName] = addOn;
                deferred.resolve();
            }
        });

        return deferred.promise.nodeify(callback);
    };

    this.queryAddOn = function (addOnName, branchName, parameters, callback) {
        var deferred = Q.defer(),
            addOn;

        if (!addOnName) {
            //TODO: This assumes a single running addOn.
            addOnName = Object.keys(branchMonitors)[0];
            logger.debug('No addOnName given for query picked one randomly', addOnName);
        }

        addOn = branchMonitors[addOnName];

        if (!addOn) {
            deferred.reject(new Error('The addOn is not running'));
        } else {
            addOn.query(parameters, function (err, message) {
                if (err) {
                    deferred.reject(err instanceof Error ? err : new Error(err));
                } else {
                    deferred.resolve(message);
                }
            });
        }

        return deferred.promise.nodeify(callback);
    };

    this.stopAddOn = function (addOnName, branchName, callback) {
        var deferred = Q.defer(),
            addOn;

        if (!addOnName) {
            //TODO: This assumes a single running addOn.
            addOnName = Object.keys(branchMonitors)[0];
            logger.debug('No addOnName given for query picked one randomly', addOnName);
        }

        addOn = branchMonitors[addOnName];

        if (addOn) {
            logger.debug('stopping addOn', {metadata: addOn.getName()});
            addOn.stop(function (err) {
                if (err) {
                    deferred.reject(err instanceof Error ? err : new Error(err));
                } else {
                    delete branchMonitors[addOnName];
                    deferred.resolve();
                }
            });
        } else {
            deferred.resolve();
        }

        return deferred.promise.nodeify(callback);
    };

    this.close = function (callback) {
        var addOnNames = Object.keys(branchMonitors);

        logger.debug('closing all running addOns', addOnNames);

        return Q.all(addOnNames.map(function (name) {
            return self.stopAddOn(name);
        }))
            .then(function () {
                return Q.ninvoke(storage, 'close');
            })
            .nodeify(callback);
    };
}

module.exports = AddOnManager;