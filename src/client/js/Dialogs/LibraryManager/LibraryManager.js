/*globals define, angular, $, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * @author kecso / https://github.com/kecso
 */

define(['./addDialog',
    './updateDialog',
    './renameDialog',
    'js/Dialogs/ConfirmDelete/ConfirmDeleteDialog'
], function (AddDialog, UpdateDialog, RenameDialog, ConfirmDelete) {

    var LibraryManager = function (client) {
        this._add = new AddDialog(client);
        this._update = new UpdateDialog(client);
        this._remove = new ConfirmDelete();
        this._rename = new RenameDialog();
        this._doNotAskRemove = false;
        this._client = client;
    };

    LibraryManager.prototype.add = function () {
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
            this._rename.show(forbiddenNames, function (newName) {
                self._client.renameLibrary(ownName, newName);
            });
        }

    };

    return LibraryManager;
});