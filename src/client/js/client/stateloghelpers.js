/*globals define*/
/*jshint browser: true*/
/**
 * Contains helper functions for logging/downloading the state of the client.
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'js/Utils/SaveToDisk'
], function (saveToDisk) {
    'use strict';

    function _stateLogReplacer(key, value) {
        var chainItem,
            prevChain,
            nextChain,
            chain;
        if (key === 'project') {
            if (value) {
                return value.name;
            } else {
                return null;
            }

        } else if (key === 'core') {
            if (value) {
                return 'instantiated';
            } else {
                return 'notInstantiated';
            }
        } else if (key === 'metaNodes') {
            return Object.keys(value);
        } else if (key === 'nodes') {
            return Object.keys(value);
        } else if (key === 'loadNodes') {
            return Object.keys(value);
        } else if (key === 'users') {
            return Object.keys(value);
        } else if (key === 'rootObject') {
            return;
        } else if (key === 'undoRedoChain') {
            if (value) {
                chain = {
                    previous: null,
                    next: null
                };
                if (value.previous) {
                    prevChain = {};
                    chain.previous = prevChain;
                }
                chainItem = value;
                while (chainItem.previous) {
                    prevChain.previous = {
                        commitHash: chainItem.commitHash,
                        previous: null
                    };
                    prevChain = prevChain.previous;
                    chainItem = chainItem.previous;
                }
                if (value.next) {
                    nextChain = {};
                    chain.next = nextChain;
                }
                chainItem = value;
                while (chainItem.next) {
                    nextChain.next = {
                        commitHash: chainItem.commitHash,
                        next: null
                    };
                    nextChain = nextChain.next;
                    chainItem = chainItem.next;
                }
                return chain;
            }
        }

        return value;
    }

    function getStateLogString(client, state, doFullState, indent) {
        indent = indent || 0;
        if (doFullState === true) {
            return JSON.stringify(state, _stateLogReplacer, indent);
        } else {
            return JSON.stringify({
                connection: client.getNetworkStatus(),
                projectId: client.getActiveProjectId(),
                branchName: client.getActiveBranchName(),
                branchStatus: client.getBranchStatus(),
                commitHash: client.getActiveCommitHash(),
                rootHash: client.getActiveRootHash(),
                projectReadOnly: client.isProjectReadOnly(),
                commitReadOnly: client.isCommitReadOnly()
            }, null, indent);
        }
    }

    function downloadStateDump(client, state) {
        var blob,
            fileUrl,
            errData = {
                timestamp: (new Date()).toISOString(),
                webgme: {
                    NpmVersion: 'n/a',
                    version: 'n/a',
                    GitHubVersion: 'n/a'
                },
                gmeConfig: client.gmeConfig,
                uiState: null,
                branchErrors: [],
                browserInfo: {
                    appCodeName: window.navigator.appCodeName,
                    appName: window.navigator.appName,
                    appVersion: window.navigator.appVersion,
                    onLine: window.navigator.onLine,
                    cookieEnabled: window.navigator.cookieEnabled,
                    platform: window.navigator.platform,
                    product: window.navigator.product,
                    userAgent: window.navigator.userAgent
                },
                clientState: JSON.parse(getStateLogString(client, state, true))
            };

        if (typeof WebGMEGlobal !== 'undefined') {
            /* jshint -W117 */
            errData.webgme.NpmVersion = WebGMEGlobal.NpmVersion;
            errData.webgme.GitHubVersion = WebGMEGlobal.GitHubVersion;
            errData.webgme.version = WebGMEGlobal.version;
            /* jshint +W117 */
        }

        if (typeof client.uiStateGetter === 'function') {
            errData.uiState = client.uiStateGetter();
        } else {
            errData.uiState = 'Client did not have an attached uiStateGetter.';
        }

        if (state.project && state.branchName && state.project.branches[state.branchName]) {
            state.project.branches[state.branchName].errorList.forEach(function (err) {
                errData.branchErrors.push({
                    message: err.message,
                    stack: err.stack});
            });
        }

        blob = new Blob([JSON.stringify(errData, null, 2)], {type: 'application/json'});
        fileUrl = window.URL.createObjectURL(blob);

        saveToDisk.saveUrlToDisk(fileUrl, 'webgme-client-dump.json');
    }

    function downloadCommitQueue(client, commitQueue) {
        var blob,
            fileUrl,
            backupData = {
                webgmeVersion: client.getConnectedStorageVersion(),
                projectId: client.getActiveProjectId(),
                branchName: client.getActiveBranchName(),
                branchStatus: client.getBranchStatus(),
                commitQueue: commitQueue
            };

        blob = new Blob([JSON.stringify(backupData, null, 2)], {type: 'application/json'});
        fileUrl = window.URL.createObjectURL(blob);

        saveToDisk.saveUrlToDisk(fileUrl, 'commit-queue-dump.json');
    }

    return {
        downloadStateDump: downloadStateDump,
        getStateLogString: getStateLogString,
        downloadCommitQueue: downloadCommitQueue
    };
});