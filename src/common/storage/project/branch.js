/*globals define*/
/*jshint browser: true, node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define(['common/storage/constants'], function (CONSTANTS) {
    'use strict';

    function Branch(name, mainLogger) {
        var self = this,
            logger = mainLogger.fork('Branch:' + name),
            originHash = '',
            localHash = '',
            commitQueue = [],
            updateQueue = [],
            branchStatus = CONSTANTS.BRANCH_STATUS.SYNC;

        logger.debug('ctor');
        this.name = name;
        this.isOpen = true;
        this.inSync = true;

        this.branchStatusHandlers = [];
        this.hashUpdateHandlers = [];
        this.callbackQueue = [];

        /**
         * @type {Error[]}
         */
        this.errorList = [];

        this._remoteUpdateHandler = null;

        this.cleanUp = function () {
            var i,
                commitResult;
            self.isOpen = false;
            self.branchStatusHandlers = [];
            self.hashUpdateHandlers = [];

            self._remoteUpdateHandler = null;
            for (i = 0; i < self.callbackQueue.length; i += 1) {
                // Make sure there are no pending callbacks, invoke with status CANCELED.
                commitResult = {
                    status: CONSTANTS.CANCELED,
                    hash: commitQueue[i].commitObject[CONSTANTS.MONGO_ID]
                };
                self.callbackQueue[i](null, commitResult);
            }
            self.callbackQueue = [];
            commitQueue = [];
            updateQueue = [];
        };

        // Hash related functions
        this.getLocalHash = function () {
            return localHash;
        };

        this.getOriginHash = function () {
            return originHash;
        };

        this.updateHashes = function (newLocal, newOrigin) {
            logger.debug('updatingHashes');
            if (newLocal !== null) {
                logger.debug('localHash: old, new', localHash, newLocal);
                localHash = newLocal;
            }
            if (newOrigin !== null) {
                logger.debug('originHash: old, new', originHash, newOrigin);
                originHash = newOrigin;
            }
        };

        // Queue related functions
        this.queueCommit = function (commitData, commitCallback) {
            commitQueue.push(commitData);
            self.callbackQueue.push(commitCallback);
            logger.debug('Adding new commit to queue', commitQueue.length);
        };

        this.getFirstCommit = function (shift) {
            var commitData;
            if (shift) {
                commitData = commitQueue.shift();
                self.callbackQueue.shift();
                logger.debug('Removed commit from queue', commitQueue.length);
            } else {
                commitData = commitQueue[0];
            }

            return commitData;
        };

        this.getMergedCommit = function (mergeHash) {
            var mergeCommit,
                i = updateQueue.length;

            while (i) {
                i -= 1;
                if (updateQueue[i].commitObject[CONSTANTS.MONGO_ID] === mergeHash) {
                    mergeCommit = updateQueue[i];
                    break;
                }
            }

            if (!mergeCommit) {
                logger.error('mergeCommit not available in updateQueue', mergeHash, JSON.stringify(updateQueue, null, 2));
            }

            updateQueue = [];

            return mergeCommit;
        };

        this.getCommitQueue = function () {
            return commitQueue;
        };

        this.getCommitsForNewFork = function (upTillCommitHash) {
            var i,
                commitData,
                commitHash,
                commitHashExisted = false,
                subQueue = [];

            logger.debug('getCommitsForNewFork', upTillCommitHash);

            if (commitQueue.length === 0) {
                commitHash = localHash;

                logger.debug('No commits queued will fork from', commitHash);
                upTillCommitHash = upTillCommitHash || commitHash;
                commitHashExisted = upTillCommitHash === commitHash;
            } else {
                upTillCommitHash = upTillCommitHash ||
                    commitQueue[commitQueue.length - 1].commitObject[CONSTANTS.MONGO_ID];
            }

            logger.debug('Will fork up to commitHash', upTillCommitHash);

            // Move over all commit-data up till the chosen commitHash to the fork's queue,
            // except the commit that caused the fork (all its objects are already in the database).
            for (i = 0; i < commitQueue.length; i += 1) {
                commitData = commitQueue[i];
                commitHash = commitData.commitObject[CONSTANTS.MONGO_ID];
                if (i !== 0) {
                    subQueue.push(commitData);
                }
                if (commitData.commitObject[CONSTANTS.MONGO_ID] === upTillCommitHash) {
                    // The commitHash from where to fork has been reached.
                    // If any, the rest of the 'pending' commits will not be used.
                    commitHashExisted = true;
                    break;
                }
            }

            if (commitHashExisted === false) {
                logger.error('Could not find the specified commitHash', upTillCommitHash);
                return false;
            }

            return {commitHash: commitHash, queue: subQueue};
        };

        this.queueUpdate = function (updateData) {
            updateQueue.push(updateData);
            logger.debug('Adding new update to queue', updateQueue.length);
        };

        this.getUpdateQueue = function () {
            return updateQueue;
        };

        this.getFirstUpdate = function (shift) {
            var updateData;
            if (shift) {
                updateData = updateQueue.shift();
                logger.debug('Removed update from queue', updateQueue.length);
            } else {
                updateData = updateQueue[0];
            }

            return updateData;
        };

        // Event related functions
        this.addBranchStatusHandler = function (fn) {
            self.branchStatusHandlers.push(fn);
        };

        this.removeBranchStatusHandler = function (fn) {
            var i;

            for (i = 0; i < self.branchStatusHandlers.length; i += 1) {
                if (self.branchStatusHandlers[i] === fn) {
                    self.branchStatusHandlers.splice(i, 1);
                    return true;
                }
            }

            return false;
        };

        this.dispatchBranchStatus = function (newStatus, err) {
            var i;

            logger.debug('dispatchBranchStatus old, new', branchStatus, newStatus);

            if (branchStatus === CONSTANTS.BRANCH_STATUS.ERROR) {
                logger.error('In error state, action from user required!');
                newStatus = branchStatus;
            } else {
                branchStatus = newStatus;
            }

            if (err) {
                this.errorList.push(err instanceof Error ? err : new Error(err));
            }

            for (i = 0; i < self.branchStatusHandlers.length; i += 1) {
                self.branchStatusHandlers[i](newStatus, commitQueue, updateQueue);
            }
        };

        this.addHashUpdateHandler = function (fn) {
            self.hashUpdateHandlers.push(fn);
        };

        this.removeHashUpdateHandler = function (fn) {
            var i;

            for (i = 0; i < self.hashUpdateHandlers.length; i += 1) {
                if (self.hashUpdateHandlers[i] === fn) {
                    self.hashUpdateHandlers.splice(i, 1);
                    return true;
                }
            }

            return false;
        };

        this.dispatchHashUpdate = function (data, callback) {
            var i,
                error = null,
                counter = self.hashUpdateHandlers.length,
                allProceed = true,
                counterCallback = function (err, proceed) {
                    error = error || err; // Use the latest error
                    allProceed = allProceed && proceed === true;
                    counter -= 1;
                    if (counter === 0) {
                        callback(error, allProceed);
                    }
                };

            for (i = 0; i < self.hashUpdateHandlers.length; i += 1) {
                self.hashUpdateHandlers[i](data, commitQueue, updateQueue, counterCallback);
            }
        };
    }

    return Branch;
});