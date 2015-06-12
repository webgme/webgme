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
            updateQueue = [];

        logger.debug('ctor');
        this.name = name;
        this.isOpen = true;

        this.updateHandler = null;
        this.commitHandler = null;

        this.localUpdateHandler = null;

        this.cleanUp = function () {
            self.isOpen = false;
            self.updateHandler = null;
            self.commitHandler = null;
            self.localUpdateHandler = null;

            commitQueue = [];
            updateQueue = [];
        };

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

        this.queueCommit = function (commitData) {
            commitQueue.push(commitData);
            logger.debug('Adding new commit to queue', commitQueue.length);
        };

        this.getFirstCommit = function (shift) {
            var commitData;
            if (shift) {
                commitData = commitQueue.shift();
                logger.debug('Removed commit from queue', commitQueue.length);
            } else {
                commitData = commitQueue[0];
            }

            return commitData;
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
                // remove the branchName of the commitData
                delete commitData.branchName;
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
    }

    return Branch;
});