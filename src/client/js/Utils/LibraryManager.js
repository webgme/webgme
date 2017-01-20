/*globals define*/
/*jshint browser: true*/
/**
 * Provides dialog helpers with backend support for handling libraries.
 * @author kecso / https://github.com/kecso
 */

define([
    'js/Dialogs/Confirm/ConfirmDialog',
    'js/Dialogs/AddOrUpdateLibrary/AddOrUpdateLibraryDialog',
    'common/regexp',
    'common/storage/constants'
], function (ConfirmDialog, AddOrUpdateLibraryDialog, REGEXP, CONSTANTS) {
    'use strict';

    var LibraryManager = function (client) {
        this._add = new AddOrUpdateLibraryDialog(client, true);
        this._update = new AddOrUpdateLibraryDialog(client);
        this._remove = new ConfirmDialog();
        this._getName = new ConfirmDialog();
        this._doNotAskRemove = false;
        this._client = client;
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

    LibraryManager.prototype.update = function (nodeId, callback) {
        var client = this._client,
            node = client.getNode(nodeId),
            libraryName = node.getFullyQualifiedName(),
            libraryInfo = client.getLibraryInfo(libraryName);

        this._update.show(nodeId, function (newCommitHash) {
            if (libraryInfo && libraryInfo.commitHash && newCommitHash &&
                libraryInfo.commitHash !== newCommitHash) {
                callback(true);
            } else {
                callback(false);
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
            libraryInfo,
            notification;

        if (availableNames.indexOf(name) !== -1) {
            libraryInfo = client.getLibraryInfo(name);
            if (libraryInfo && libraryInfo.projectId && libraryInfo.branchName) {
                client.getBranches(libraryInfo.projectId, function (err, branches) {
                    if (err) {
                        callback(err);
                    } else if (branches[libraryInfo.branchName] &&
                        branches[libraryInfo.branchName] !== libraryInfo.commitHash) {
                        client.notifyUser({message: 'New version available from [' + name + '] library'});
                        callback(null, true);
                    } else {
                        callback(null, false);
                    }
                });
            }
        }
    };

    LibraryManager.prototype._libraryEvent = function (event) {
        if (event && event.type && event.type === CONSTANTS.BRANCH_HASH_UPDATED &&
            event.projectId && this._currentProjectId === event.projectId &&
            this._libraryInfos[this._currentProjectId] &&
            this._libraryInfos[this._currentProjectId].branchName === event.branchName &&
            this._libraryInfos[this._currentProjectId].commitHash !== event.newHash) {
            // The event is relevant so let us notify the user.
            this._client.notifyUser({message: 'New version available from [' + name + '] library'});
        }
    };

    LibraryManager.prototype.follow = function (projectId) {
        var currentLibraries = this._client.getLibraryNames(),
            i;

        this._libraryInfos = this._libraryInfos || {};
        if (this._currentProjectId !== projectId) {
            for (i in this._libraryInfos) {
                this._client.unwatchProject(this._currentProjectId, this._libraryEvent);
            }
            this._currentProjectId = projectId;
            this._libraryInfos = {};
        }
        for (i = 0; i < currentLibraries.length; i += 1) {
            if (currentLibraries[i].indexOf('.') === -1) {
                this._libraryInfos[currentLibraries[i]] = this._libraryInfos[currentLibraries[i]] || {};

            }
        }
    };

    return LibraryManager;
});