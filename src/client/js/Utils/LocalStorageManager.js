/*globals define, $, window, WebGMEGlobal*/
/**
 * TODO: This is work in progress and currently not used anywhere.
 * @author pmeijer / https://github.com/pmeijer
 */

define(['common/storage/util', 'js/Utils/SaveToDisk', 'bootstrap-notify'], function (storageUtil, saveToDisk) {
    'use strict';

    function LocalStorageManager(client, mainLogger) {
        var logger = mainLogger.fork('LocalStorageManager'),
            storedCommits = null;

        throw new Error('TODO: This is work in progress and should currently not be used anywhere.');

        if (typeof Storage === 'undefined') {
            logger.warn('No storage available in browser');
            return;
        }

        // Read in and parse the data at initialize.
        storedCommits = window.localStorage.getItem('GMEStoredCommits');
        if (storedCommits) {
            try {
                storedCommits = JSON.parse(storedCommits);
            } catch (e) {
                logger.error('Failed to parse localStorage.GMEStoredCommits', e);
                storedCommits = null;
                window.localStorage.removeItem('GMEStorage');
            }
        }

        // Add event-listener to the first connect event for the client and notify if there was old data stored.
        client.addEventListener(client.CONSTANTS.NETWORK_STATUS_CHANGED, function (_client, networkStatus) {
            logger.debug('NETWORK_STATUS_CHANGED', networkStatus);

            if (networkStatus === client.CONSTANTS.STORAGE.CONNECTED && storedCommits) {
                $.notify({
                    message: 'There are ' + storedCommits.commitQueue.length + ' local commit(s) from a previous session, ' +
                    'belonging to project "' + storageUtil.getProjectDisplayedNameFromProjectId(storedCommits.projectId) +
                    '" and target for branch "' + storedCommits.branchName + '".',
                }, {
                    type: 'warning',
                    delay: 0,
                    z_index: 1100
                });
            }

            client.removeEventListener(client.CONSTANTS.NETWORK_STATUS_CHANGED, this);
        });

        // Add listener to when browser is closed ('beforeunload') and store data if there are any commits in the queue.
        window.addEventListener('beforeunload', function (event) {
            var project = client.getProjectObject(),
                branchName = client.getActiveBranchName(),
                backupData,
                commitQueue;

            if (project && branchName && project.branches.hasOwnProperty(branchName)) {
                commitQueue = project.branches[branchName].getCommitQueue();

                if (commitQueue.length > 0) {
                    backupData = {
                        projectId: project.projectId,
                        branchName: branchName,
                        commitQueue: commitQueue
                    };

                    window.localStorage.setItem('GMEStoredCommits', JSON.stringify(backupData, null, 2));
                }
            }
        });
    }

    return LocalStorageManager;
});