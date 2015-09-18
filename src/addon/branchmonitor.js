/*globals requireJS*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var Q = require('q'),
    BlobClient = requireJS('common/blob/BlobClient'),
    Core = requireJS('common/core/core');

/**
 * Monitors given branch and starts, stops and updates registered addOns.
 *
 *
 * @param {string} webGMESessionId
 * @param {EditorStorage} storage
 * @param {Project} project
 * @param {string} branchName
 * @param {object} gmeConfig
 * @param {object} mainLogger
 * @constructor
 */
function BranchMonitor(webGMESessionId, storage, project, branchName, gmeConfig, mainLogger) {
    var self = this,
        logger = mainLogger.fork('BranchMonitor:' + branchName),
        core =  new Core(project, {globConf: gmeConfig, logger: logger.fork('core')});

    this.runningAddOns = [
        //{id: {string}, addOn: {AddOnBase}}
    ];

    // State
    this.commitHash = '';
    this.rootHash = '';
    this.rootNode = null;
    this.commitMessage = '';

    this.stopRequested = false;
    this.startRequested = false;
    this.branchIsOpen = false;


    // Helper functions
    function getAddOn(id) {
        var addOnPath = 'addon/' + id + '/' + id + '/' + id,
            AddOn,
            error,
            addOn;

        logger.debug('requireJS addOn from path: ' + addOnPath);
        try {
            AddOn = requireJS(addOnPath);
        } catch (err) {
            error = err;
        }

        // This is weird, the second time requirejs simply returns with undefined.
        if (AddOn) {
            addOn = new AddOn(logger.fork(id), gmeConfig);
            return addOn;
        } else {
            return error || new Error('AddOn is not available from: ' + addOnPath);
        }
    }

    function getConfiguration() {
        var blobClient = new BlobClient({
            serverPort: gmeConfig.server.port,
            httpsecure: gmeConfig.server.https.enable,
            server: '127.0.0.1',
            webgmeclientsession: webGMESessionId
        });

        return {
            core: core,
            project: project,
            branchName: branchName,
            blobClient: blobClient
        };
    }

    function loadNewRoot(commitData, callback) {
        var deferred = Q.defer();
        self.rootHash = commitData.commitData.commitObject.root;
        self.commitHash = commitData.commitData.commitObject._id;

        core.loadRoot(self.rootHash, function (err, root) {
            if (err) {
                deferred.reject(new Error(err));
            }

            self.rootNode = root;
            deferred.resolve(root);
        });

        return deferred.promise.nodeify(callback);
    }

    function updateRunningAddOns(commitObj, callback) {
        var deferred = new Q.defer(),
            counter = 0,
            limit = self.runningAddOns.length;

        function updateAddOn(addOn) {
            if (counter === limit) {
                deferred.resolve();
                return;
            }
            counter += 1;
            if (addOn.addOn.initialized === true) {
                logger.debug('updating addOn: ', addOn.id);
                addOn.addOn.update(self.rootNode, commitObj, function (err, data) {
                    if (err) {
                        // TODO: How to handle this?
                        logger.error('AddOn [' + addOn.id + '] returned error at update', err);
                    }
                    if (data.notification) {
                        logger.warn('AddOn [' + addOn.id + '] sent not yet supported notification!', data.notification);
                    }
                    if (data.commitMessage) {
                        self.commitMessage += ' ' + data.commitMessage;
                    }
                    updateAddOn(self.runningAddOns[counter]);
                });
            } else {
                addOn.addOn.configure(getConfiguration());
                logger.debug('initializing addOn: ', addOn.id);
                addOn.addOn.initialize(self.rootNode, commitObj, function (err, notification) {
                    if (err) {
                        // TODO: How to handle this?
                        logger.error('AddOn [' + addOn.id + '] returned error at update', err);
                    }
                    if (notification) {
                        logger.warn('AddOn [' + addOn.id + '] sent not yet supported notification!', notification);
                    }
                    updateAddOn(self.runningAddOns[counter]);
                });
            }
        }

        updateAddOn(self.runningAddOns[0]);

        return deferred.promise.nodeify(callback);
    }

    function onUpdate(eventData, commitQueue, updateQueue, handlerCallback) {
        var commitData = eventData.commitData;

        if (eventData.local) {
            // This is when an addOn made changes and a commit was made below.
            handlerCallback(null, self.stopRequested === false);
            return;
        }

        // loadNewRoot will set self.commitHash/rootHash/rootNode
        loadNewRoot(commitData)
            .then(function () {
                var runningAddOnsNew = [],
                    requiredAddOns = core.getRegistry(self.root, 'usedAddOns').split(' '),
                    i,
                    j,
                    wasRunning;

                logger.debug('requiredAddOns', requiredAddOns);

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
                self.commitMessage = 'AddOns made changes: ';

                return updateRunningAddOns(commitData.commitObject);
            })
            .then(function () {
                var persisted = core.persist(self.rootNode);
                if (Object.keys(persisted.objects) === 0) {
                    logger.debug('No changes made by addOns');
                } else {
                    // This will create an update event with local:true, see top of function.
                    project.makeCommit(branchName, [self.commitHash], self.rootHash, persisted.objects, self.commitMsg,
                    function (err, result) {
                        if (err) {
                            logger.error('makeCommit', err);
                        } else {
                            logger.debug('makeCommit', result);
                        }
                    });
                }
                handlerCallback(null, self.stopRequested === false);
            })
            .catch(function (err) {
                logger.error('Fatal error', err);
                handlerCallback(err, false);
            });
    }

    function branchStatusHandler(branchStatus /*, commitQueue, updateQueue*/) {
        //TODO check how it should work
        logger.debug('New branchStatus', branchStatus);
    }

    // API functions
    this.start = function (callback) {
        var deferred = Q.defer();

        self.startRequested = true;

        storage.openBranch(project.projectId, branchName, onUpdate, branchStatusHandler,
            function (err/*, latestCommitData*/) {
                if (err) {
                    deferred.reject(err);
                    return;
                }
                self.branchIsOpen = true;
                deferred.resolve();
            }
        );

        return deferred.promise.nodeify(callback);
    };

    this.stop = function (callback) {
        var deferred = Q.defer();

        self.stopRequested = true;

        storage.closeBranch(function (err) {
            self.branchIsOpen = false;
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve();
            }
        });

        return deferred.promise.nodeify(callback);
    };

    this.queryAddOn = function (addOnId, commitHash, queryParams, callback) {
        var deferred = Q.defer();
        deferred.reject(new Error('queryAddOn not implemented yet!'));
        return deferred.promise.nodeify(callback);
    };
}

module.exports = BranchMonitor;