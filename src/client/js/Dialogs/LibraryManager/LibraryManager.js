/*globals define*/
/*jshint browser: true*/
/**
 * @author kecso / https://github.com/kecso
 */

define(['./addDialog',
    'js/Dialogs/Confirm/ConfirmDialog',
    'js/Dialogs/AddOrUpdateLibrary/AddOrUpdateLibrary',
    'common/regexp',
], function (AddDialog, ConfirmDialog, AddOrUpdateLibrary, REGEXP) {
    'use strict';

    var LibraryManager = function (client) {
        this._add = new AddOrUpdateLibrary(client, true);
        this._update = new AddOrUpdateLibrary(client);
        this._remove = new ConfirmDialog();
        this._getName = new ConfirmDialog();
        this._doNotAskRemove = false;
        this._client = client;
    };

    LibraryManager.prototype.add = function () {
        var self = this,
            forbiddenNames = this._client.getLibraryNames();

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
        this._add.show();
    };

    LibraryManager.prototype.update = function (nodeId) {
        this._update.show(nodeId);
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

    return LibraryManager;
});