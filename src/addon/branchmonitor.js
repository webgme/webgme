/*globals requireJS*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var Q = require('q'),
    BlobClientClass = requireJS('blob/BlobClient'),
    Core = requireJS('common/core/coreQ');

/**
 * Monitors given branch and starts, stops and updates registered addOns.
 *
 * @param {string} webgmeToken
 * @param {EditorStorage} storage
 * @param {Project} project
 * @param {string} branchName
 * @param {object} gmeConfig
 * @param {object} mainLogger
 * @constructor
 * @ignore
 */
function BranchMonitor(webgmeToken, storage, project, branchName, mainLogger, gmeConfig) {
    var self = this,
        logger = mainLogger.fork('BranchMonitor:' + branchName),
        core = new Core(project, {globConf: gmeConfig, logger: logger.fork('core')}),
        startDeferred,
        stopDeferred;

    this.runningAddOns = [
        //{id: {string}, instance: {AddOnBase}}
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
        var blobClient = new BlobClientClass({
            serverPort: gmeConfig.server.port,
            httpsecure: false, // N.B.: addons are running on the server only
            server: '127.0.0.1',
            webgmeToken: webgmeToken,
            logger: logger.fork('BlobClient')
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
        self.rootHash = commitData.commitObject.root;
        self.commitHash = commitData.commitObject._id;
        logger.debug('loadNewRoot [commit/rootHash]', self.commitHash, self.rootHash);

        core.loadRoot(self.rootHash, function (err, root) {
            if (err) {
                deferred.reject(new Error(err));
                return;
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

        function getUpdateCallback(addOn, counter) {
            return function (err, addOnResult) {
                if (err) {
                    // TODO: How to handle this?
                    logger.error('AddOn [' + addOn.id + '] returned error at init/update', err);
                }

                if (addOnResult.commitMessage) {
                    self.commitMessage += addOnResult.commitMessage;
                    logger.debug('AddOn [' + addOn.id + '] added to commitMessage', self.commitMessage);
                }

                addOnResult.notifications.forEach(function (notification) {
                    // Do not wait/block for the notification result.
                    storage.webSocket.sendNotification(notification, function (err) {
                        if (err) {
                            logger.error('Failed sending notification', notification, err);
                        } else {
                            logger.debug('Sent notification', notification);
                        }
                    });
                });

                updateAddOn(self.runningAddOns[counter]);
            };
        }

        function updateAddOn(addOn) {
            if (counter === limit) {
                deferred.resolve();
                return;
            }
            counter += 1;
            if (addOn.instance.initialized === true) {
                logger.debug('updating addOn: ', addOn.id);
                addOn.instance._update(self.rootNode, commitObj, getUpdateCallback(addOn, counter));
            } else {
                addOn.instance.configure(getConfiguration());
                logger.debug('initializing addOn: ', addOn.id);
                addOn.instance._initialize(self.rootNode, commitObj, getUpdateCallback(addOn, counter));
            }
        }

        if (limit === 0) {
            logger.debug('There are no running addOns');
            deferred.resolve();
        } else {
            updateAddOn(self.runningAddOns[0]);
        }

        return deferred.promise.nodeify(callback);
    }

    function onUpdate(eventData, commitQueue, updateQueue, handlerCallback) {
        var commitData = eventData.commitData;

        if (eventData.local) {
            // This is when an addOn made changes and a commit was made below.
            logger.debug('AddOn made changes (local event data)');
            handlerCallback(null, self.stopRequested === false);
            return;
        }

        // loadNewRoot will set self.commitHash/rootHash/rootNode
        loadNewRoot(commitData)
            .then(function () {
                var runningAddOnsNew = [],
                    requiredAddOns = core.getRegistry(self.rootNode, 'usedAddOns'),
                    i,
                    j,
                    newAddOn,
                    wasRunning;

                if (typeof requiredAddOns === 'string') {
                    requiredAddOns = requiredAddOns.trim();
                    requiredAddOns = requiredAddOns ? requiredAddOns.split(' ') : [];
                } else {
                    requiredAddOns = [];
                }


                logger.debug('requiredAddOns:', requiredAddOns);

                for (i = 0; i < requiredAddOns.length; i += 1) {
                    wasRunning = false;
                    for (j = 0; j < self.runningAddOns.length; j += 1) {
                        //FIXME: This can raise an error that
                        if (self.runningAddOns[j].id === requiredAddOns[i]) {
                            runningAddOnsNew.push(self.runningAddOns[j]);
                            wasRunning = true;
                            break;
                        }
                    }
                    if (wasRunning === false) {
                        newAddOn = getAddOn(requiredAddOns[i]);
                        if (newAddOn instanceof Error) {
                            logger.error('Could not get addOn', newAddOn);
                        } else {
                            runningAddOnsNew.push({
                                id: requiredAddOns[i],
                                instance: newAddOn
                            });
                        }
                    }
                }

                self.runningAddOns = runningAddOnsNew;
                self.commitMessage = 'AddOns';

                return updateRunningAddOns(commitData.commitObject);
            })
            .then(function () {
                var persisted = core.persist(self.rootNode),
                    persistedObjects = Object.keys(persisted.objects);
                if (persistedObjects.length === 0) {
                    logger.debug('No changes made by addOns');
                } else {
                    // This will create an update event with local:true, see top of function.
                    logger.debug('Changes were made', self.commitMessage);
                    logger.debug('Number of persisted objects', persistedObjects.length);
                    project.makeCommit(branchName, [self.commitHash], persisted.rootHash,
                        persisted.objects, self.commitMessage,
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
    /**
     * Opens up its branch and registers the onUpdate function.
     * @param [callback]
     * @returns {Promise}
     */
    this.start = function (callback) {
        if (self.startRequested === false) {
            startDeferred = Q.defer();
            self.startRequested = true;

            storage.openBranch(project.projectId, branchName, onUpdate, branchStatusHandler,
                function (err/*, latestCommitData*/) {
                    if (err) {
                        startDeferred.reject(err);
                        return;
                    }
                    self.branchIsOpen = true;
                    startDeferred.resolve();
                }
            );
        }

        return startDeferred.promise.nodeify(callback);
    };

    /**
     * Closes the open branch.
     * @param [callback]
     * @returns {Promise}
     */
    this.stop = function (callback) {
        if (self.stopRequested === false) {
            stopDeferred = Q.defer();
            self.stopRequested = true;

            storage.closeBranch(project.projectId, branchName, function (err) {
                self.branchIsOpen = false;
                if (err) {
                    stopDeferred.reject(err);
                } else {
                    stopDeferred.resolve();
                }
            });
        }

        return stopDeferred.promise.nodeify(callback);
    };

    this.queryAddOn = function (addOnId, commitHash, queryParams, callback) {
        var deferred = Q.defer();
        deferred.reject(new Error('queryAddOn not implemented yet!'));
        return deferred.promise.nodeify(callback);
    };
}


module.exports = BranchMonitor;
