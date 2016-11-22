/*globals define*/
/*jshint browser: true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'js/Controls/PropertyGrid/Widgets/AssetWidget',
    'js/Dialogs/MultiTab/MultiTabDialog'
], function (AssetWidget,
             MultiTabDialog) {

    'use strict';

    /**
     *
     * @param client
     * @param logger
     * @constructor
     */
    function ImportModelDialog(client, logger) {
        this._client = client;
        this._logger = logger;
    }

    ImportModelDialog.prototype.show = function (parentId) {
        var self = this,
            dialog = new MultiTabDialog(),
            parameters = {
                title: 'Import Models',
                extraClasses: 'import-model-dialog',
                iconClass: 'glyphicon glyphicon-import',
                activeTabIndex: 0,
                tabs: [self._getFileTab()]
            };

        this._parentId = parentId;

        dialog.show(parameters, function () {
            self._assetWidget.destroy();
        });
    };

    ImportModelDialog.prototype._getFileTab = function () {
        var self = this;

        this._assetWidget = new AssetWidget({
            propertyName: 'ImportModelDialog',
            propertyValue: ''
        });

        function onOK(callback) {
            if (!self._assetWidget.propertyValue) {
                callback('No file uploaded.');
                return;
            }

            self._client.importSelectionFromFile(
                self._client.getActiveProjectId(),
                self._client.getActiveBranchName(),
                self._parentId,
                self._assetWidget.propertyValue,
                function (err, result) {
                    if (err) {
                        callback('Failed to import model' + err);
                    } else if (!self._checkCommitStatus(result.status)) {
                        callback('Project updated model at commit ' + result.hash.substring(0, 7) +
                            ' but could not update branch.');
                    } else {
                        callback();
                    }
                }
            );
        }

        return {
            title: 'File',
            infoTitle: 'From webgmexm file',
            infoDetails: 'The exported model(s) must come from a project that shares the same meta as the current' +
            ' project. Specifically all the meta-types used in exported model(s) must have matching meta-nodes ' +
            '(w.r.t GUIDs) in this project. If you are uncertain, there is no harm in trying to ' +
            'import the model(s) - an error will just be returned.',
            formControl: self._assetWidget.el,
            onOK: onOK
        };
    };

    ImportModelDialog.prototype._checkCommitStatus = function (commitStatus) {
        return commitStatus === this._client.CONSTANTS.STORAGE.SYNCED ||
            commitStatus === this._client.CONSTANTS.STORAGE.MERGED;
    };

    return ImportModelDialog;
});