/*globals define, $*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'common/core/constants',
    'js/Controls/PropertyGrid/Widgets/AssetWidget',
    'js/util',
    'js/Utils/WebGMEUrlManager',
    'common/regexp',
    'js/Dialogs/MultiTab/MultiTabDialog'
], function (CORE_CONSTANTS,
             AssetWidget,
             UTILS,
             URL_UTIL,
             REGEXP,
             MultiTabDialog) {

    'use strict';

    function UpdateLibraryDialog(client) {
        this._client = client;
    }

    UpdateLibraryDialog.prototype.show = function (libraryId) {
        var self = this,
            dialog = new MultiTabDialog(),
            parameters = {
                title: 'Update Library',
                iconClass: 'glgl',
                tabs: []
            },
            libraryNode = this._client.getNode(libraryId);

        if (libraryNode) {
            this._libraryName = libraryNode.getFullyQualifiedName();
            this._storedLibraryInfo = this._client.getLibraryInfo(this._libraryName);

            if (this._libraryName &&
                this._storedLibraryInfo &&
                this._storedLibraryInfo.projectId &&
                this._storedLibraryInfo.branchName) {

                parameters.tabs.push(this._getRefreshTab());
            }
        }

        dialog.show(parameters, function () {
            self._urlInputControl.off('keyup');
        });
    };

    UpdateLibraryDialog.prototype._getFileTab = function () {
        var self = this,
            urlProjectInfo = {};

        this.assetWidget = new AssetWidget({
            propertyName: 'UpdateLibrary',
            propertyValue: ''
        });

        formControl.on('keyup', function () {
            urlProjectInfo = {
                projectId: UTILS.getURLParameterByNameFromString(self._urlInput.val(), 'project'),
                branchName: UTILS.getURLParameterByNameFromString(self._urlInput.val(), 'branch'),
                commitHash: UTILS.getURLParameterByNameFromString(self._urlInput.val(), 'commit')
            };
        });

        this._urlInputControl = formControl;


        function onOK(callback) {
            if (typeof urlProjectInfo.projectId !== 'string') {
                callback('Provided url is not valid, it must at least contain a project id.');
                return;
            }

            self._client.updateLibrary(self._libraryName, urlProjectInfo, function (err) {
                if (err) {
                    callback('Failed to update library' + err);
                } else {
                    callback();
                }
            });
        }

        return {
            title: 'File',
            infoTitle: 'From webgmex file',
            infoDetails: 'Use project package as the source of the library',
            formControl: formControl,
            onOK: onOK
        };
    };

    UpdateLibraryDialog.prototype._getUrlTab = function () {
        var self = this,
            formControl = $('<input type="text" class="form-control"/>'),
            urlProjectInfo = {};

        formControl.on('keyup', function () {
            urlProjectInfo = {
                projectId: UTILS.getURLParameterByNameFromString(self._urlInput.val(), 'project'),
                branchName: UTILS.getURLParameterByNameFromString(self._urlInput.val(), 'branch'),
                commitHash: UTILS.getURLParameterByNameFromString(self._urlInput.val(), 'commit')
            };
        });

        this._urlInputControl = formControl;


        function onOK(callback) {
            if (typeof urlProjectInfo.projectId !== 'string') {
                callback('Provided url is not valid, it must at least contain a project id.');
                return;
            }

            self._client.updateLibrary(self._libraryName, urlProjectInfo, function (err) {
                if (err) {
                    callback('Failed to update library' + err);
                } else {
                    callback();
                }
            });
        }

        return {
            title: 'URL',
            infoTitle: 'Update from intra deployment URL',
            infoDetails: 'Use the URL of the project as the source of the library',
            formControl: formControl,
            onOK: onOK
        };
    };

    UpdateLibraryDialog.prototype._getRefreshTab = function () {
        var self = this,
            linkUrl = '/?' + URL_UTIL.getSearchQuery({
                projectId: this._storedLibraryInfo.projectId,
                branchName: this._storedLibraryInfo.branchName
            });

        function onOK(callback) {
            self._client.updateLibrary(self._libraryName, null, function (err) {
                if (err) {
                    callback('Failed to refresh library' + err);
                } else {
                    callback();
                }
            });
        }

        return {
            title: 'Refresh',
            infoTitle: 'Refresh library from originating project',
            infoDetails: 'Use project package as the source of the library',
            formControl: $('<a href=""' + linkUrl + '" target="_blank">View branch of library.</a>'),
            onOK: onOK
        };
    };

    return UpdateLibraryDialog;
});