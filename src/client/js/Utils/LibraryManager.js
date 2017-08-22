/*globals define, $*/
/*jshint browser: true*/
/**
 * Provides dialog helpers with backend support for handling libraries.
 * @author kecso / https://github.com/kecso
 */

define([
    'js/logger',
    'js/Dialogs/Confirm/ConfirmDialog',
    'js/Dialogs/AddOrUpdateLibrary/AddOrUpdateLibraryDialog',
    'js/Loader/ProgressNotification',
    'common/regexp',
    'common/storage/constants'
], function (Logger, ConfirmDialog, AddOrUpdateLibraryDialog, ProgressNotification, REGEXP, CONSTANTS) {
    'use strict';

    var LibraryManager = function (client, mainLogger) {
        this._add = new AddOrUpdateLibraryDialog(client, true);
        this._update = new AddOrUpdateLibraryDialog(client);
        this._remove = new ConfirmDialog();
        this._getName = new ConfirmDialog();
        this._doNotAskRemove = false;
        this._client = client;
        this._logger = mainLogger ? mainLogger.fork('LibraryManager') :
            Logger.createWithGmeConfig('Utils:LibraryManager', client.gmeConfig);
        this._libraryInfos = {};
        this._followedProjects = {};
        this._currentProjectId = null;
        this._currentBranchName = null;
    };

    LibraryManager.prototype.add = function () {
        var self = this,
            forbiddenNames = this._client.getLibraryNames();

        this._getName.show({
            title: 'Add Library',
            iconClass: 'glyphicon glyphicon-folder-close',
            question: 'Give a unique name of the new library..',
            input: {
                label: 'Name',
                placeHolder: 'Enter name of new library...',
                required: true,
                checkFn: function (value) {
                    if (forbiddenNames.indexOf(value) !== -1) {
                        return false;
                    }

                    return REGEXP.DOCUMENT_KEY.test(value);
                }
            },
            severity: 'info'
        }, function (_dummy, newName) {
            self._add.show(newName);
        });
    };

    LibraryManager.prototype.update = function (nodeId) {
        var self = this,
            client = this._client,
            node = client.getNode(nodeId),
            libraryName = node.getFullyQualifiedName(),
            libraryInfo = this._libraryInfos[libraryName];

        this._update.show(nodeId, function (newCommitHash) {
            if (libraryInfo && libraryInfo.commitHash && newCommitHash &&
                libraryInfo.commitHash !== newCommitHash) {
                libraryInfo.commitHash = newCommitHash;
                libraryInfo.notified = false;
                self._watchProject(libraryInfo.projectId);
            }
        });
    };

    LibraryManager.prototype.remove = function (nodeId) {
        var libraryRoot = this._client.getNode(nodeId),
            self = this,
            name;

        if (libraryRoot) {
            name = libraryRoot.getFullyQualifiedName();
            if (this._doNotAskRemove) {
                this._client.removeLibrary(name);
                return;
            }

            this._remove.show({
                enableDontAskAgain: true,
                deleteItem: libraryRoot.getFullyQualifiedName() + ' library'
            }, function (doNotAsk) {
                self._doNotAskRemove = doNotAsk;
                self._client.removeLibrary(name);
            });
        }
    };

    LibraryManager.prototype.rename = function (nodeId) {
        var self = this,
            libraryRoot = this._client.getNode(nodeId),
            ownName,
            forbiddenNames;

        if (libraryRoot) {
            ownName = libraryRoot.getFullyQualifiedName();
            forbiddenNames = this._client.getLibraryNames();
            forbiddenNames.splice(forbiddenNames.indexOf(ownName), 1);

            this._getName.show({
                title: 'Rename Library',
                iconClass: 'glyphicon glyphicon-folder-close',
                question: 'Would you like to rename "' + ownName + '"?',
                input: {
                    label: 'Name',
                    placeHolder: 'Enter new library name...',
                    required: true,
                    checkFn: function (value) {
                        if (forbiddenNames.indexOf(value) !== -1) {
                            return false;
                        }

                        return REGEXP.DOCUMENT_KEY.test(value);
                    }
                },
                severity: 'info'
            }, function (_dummy, newName) {
                self._client.renameLibrary(ownName, newName);
            });
        }

    };

    LibraryManager.prototype.check = function (name, callback) {
        var client = this._client,
            availableNames = client.getLibraryNames(),
            libraryInfo;

        if (availableNames.indexOf(name) !== -1) {
            libraryInfo = client.getLibraryInfo(name);
            if (libraryInfo && libraryInfo.projectId && libraryInfo.branchName) {
                client.getBranches(libraryInfo.projectId, function (err, branches) {
                    if (err) {
                        callback(err);
                    } else if (branches[libraryInfo.branchName] &&
                        branches[libraryInfo.branchName] !== libraryInfo.commitHash) {
                        this._notifyNewLibraryVersion(name);
                        callback(null, true);
                    } else {
                        callback(null, false);
                    }
                });
            }
        }
    };

    LibraryManager.prototype._clearWatchers = function () {
        var projectId;

        for (projectId in this._followedProjects) {
            this._client.unwatchProject(projectId, this._followedProjects[projectId]);
        }
        this._followedProjects = {};
    };

    LibraryManager.prototype._unwatchProject = function (projectId) {
        var libraryName,
            stillWatching = false;

        for (libraryName in this._libraryInfos) {
            if (this._libraryInfos[libraryName].projectId === projectId &&
                this._libraryInfos[libraryName].notified === false) {
                stillWatching = true;
            }
        }

        if (stillWatching === false) {
            this._client.unwatchProject(projectId, this._followedProjects[projectId]);
            delete this._followedProjects[projectId];
        }
    };

    LibraryManager.prototype._watchProject = function (projectId) {
        var self = this,
            eventFunction = function (websocket, event) {
                var libraryName;

                if (event.etype === CONSTANTS.BRANCH_HASH_UPDATED && self._followedProjects[event.projectId]) {
                    for (libraryName in self._libraryInfos) {
                        if (self._libraryInfos[libraryName].projectId === event.projectId &&
                            event.branchName === self._libraryInfos[libraryName].branchName &&
                            self._libraryInfos[libraryName].notified === false) {

                            self._notifyNewLibraryVersion(libraryName);
                            self._libraryInfos[libraryName].notified = true;
                            self._unwatchProject(self._libraryInfos[libraryName].projectId);
                        }
                    }
                }
            };

        if (!this._followedProjects[projectId]) {
            this._followedProjects[projectId] = eventFunction;
            this._client.watchProject(projectId, eventFunction);
        }
    };

    LibraryManager.prototype._checkLibrary = function (name) {
        var self = this,
            client = this._client,
            libraryInfo = this._libraryInfos[name];
        if (libraryInfo) {
            client.getBranches(libraryInfo.projectId, function (err, branches) {
                if (err) {
                    self._logger.error(err);
                } else if (branches[libraryInfo.branchName] &&
                    branches[libraryInfo.branchName] !== libraryInfo.commitHash) {
                    self._notifyNewLibraryVersion(name);
                    libraryInfo.notified = true;
                    self._unwatchProject(libraryInfo.projectId);
                }
            });
        }
    };

    LibraryManager.prototype._notifyNewLibraryVersion = function (libName) {
        var self = this,
            projectId = this._client.getActiveProjectId(),
            branchName = this._client.getActiveBranchName(),
            note;

        if (this._client.isReadOnly()) {
            this._client.notifyUser({message: 'New version of [' + libName + '] library available'});
        } else {
            note = $.notify({
                icon: 'glyphicon glyphicon-folder-close',
                message: 'A new version of the <strong>' + libName + '</strong> library is available for the ' +
                'current project. Click here to update!'
            }, {
                delay: 10000,
                hideDuration: 0,
                type: 'info',
                offset: {
                    x: 20,
                    y: 37
                },
                mouse_over: 'pause',
                onClose: function () {
                    note.$ele.off();
                }
            });

            note.$ele.css('cursor', 'pointer');

            note.$ele.on('click', function () {
                note.close();
                var progress = ProgressNotification.start('Updating library <strong>' + libName + '</strong>,' +
                    'please stand by...');

                if (projectId === self._client.getActiveProjectId() &&
                    branchName === self._client.getActiveBranchName()) {
                    self._client.workerRequests.updateLibrary(libName, null, function (err/*, res*/) {
                        if (err) {
                            clearInterval(progress.intervalId);
                            progress.note.update({
                                message: 'Library updated failed with error: ' + err.message,
                                type: 'danger',
                                progress: 100
                            });
                        } else {
                            clearInterval(progress.intervalId);
                            progress.note.update({
                                message: 'Library updated successfully!',
                                type: 'success',
                                progress: 100
                            });

                            progress.note.close();
                        }
                    });
                } else {
                    clearInterval(progress.intervalId);
                    progress.note.update({
                        message: 'Project and or branch changed before update was invoked.',
                        type: 'danger',
                        progress: 100
                    });
                }
            });
        }
    };

    LibraryManager.prototype.follow = function () {
        var client = this._client,
            projectId = client.getActiveProjectId(),
            branchName = client.getActiveBranchName(),
            availableNames,
            info,
            name,
            i;

        if (typeof projectId !== 'string' || typeof branchName !== 'string') {
            // No project or branch -> clear everything.

            this._currentProjectId = projectId;
            this._libraryInfos = {};
            this._clearWatchers();
            return;
        } else if (projectId === this._currentProjectId && branchName === this._currentBranchName) {
            //Same project and branch -> check if there is any change in the set of libraries.

            availableNames = client.getLibraryNames();

            //removals
            for (name in this._libraryInfos) {
                if (availableNames.indexOf(name) === -1) {
                    this._unwatchProject(this._libraryInfos[name].projectId);
                    delete this._libraryInfos[name];
                }
            }

            //additions
            for (i = 0; i < availableNames.length; i += 1) {
                if (!this._libraryInfos[availableNames[i]]) {
                    info = client.getLibraryInfo(availableNames[i]);
                    if (info && info.projectId && info.branchName) {
                        this._watchProject(info.projectId);
                        this._libraryInfos[availableNames[i]] = {
                            projectId: info.projectId,
                            branchName: info.branchName,
                            commitHash: info.commitHash,
                            notified: false
                        };
                        this._checkLibrary(availableNames[i]);
                    }
                }
            }

        } else {
            // Project and/or branch changed -> reset the library watchers.

            this._currentProjectId = projectId;
            this._currentBranchName = branchName;
            this._libraryInfos = {};
            availableNames = client.getLibraryNames();
            this._clearWatchers();
            for (i = 0; i < availableNames.length; i += 1) {
                info = client.getLibraryInfo(availableNames[i]);
                if (info && info.projectId && info.branchName) {
                    this._watchProject(info.projectId);
                    this._libraryInfos[availableNames[i]] = {
                        projectId: info.projectId,
                        branchName: info.branchName,
                        commitHash: info.commitHash,
                        notified: false
                    };
                    this._checkLibrary(availableNames[i]);
                }
            }
        }
    };

    LibraryManager.prototype.openLibraryOriginInNewWindow = function (libraryRootId, followBranch) {
        var nodeObj = this._client.getNode(libraryRootId),
            address,
            info;

        if (!nodeObj) {
            this._logger.error('Library node is not loaded and cannot be followed [', libraryRootId, ']');
            return;
        }

        info = this._client.getLibraryInfo(nodeObj.getFullyQualifiedName());

        if (!info) {
            this._logger.error('Library node has no available info and cannot be followed [', libraryRootId, ']');
            return;
        }

        if (!info.projectId) {
            this._logger.error('Library info did not a have projectId in info and cannot be followed [',
                libraryRootId, ']');
            return;
        }

        address = window.location.origin + '/?project=' + encodeURIComponent(info.projectId);

        if (info.branchName && followBranch) {
            address += '&branch=' + encodeURIComponent(info.branchName);
        } else if (info.commitHash) {
            address += '&commit=' + encodeURIComponent(info.commitHash);
        }

        window.open(address, '_blank');
        window.focus();
    };

    return LibraryManager;
});