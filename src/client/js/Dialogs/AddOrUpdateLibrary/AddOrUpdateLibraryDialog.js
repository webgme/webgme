/*globals define, $*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'js/Controls/PropertyGrid/Widgets/AssetWidget',
    'js/util',
    'js/Utils/WebGMEUrlManager',
    'common/regexp',
    'js/Dialogs/MultiTab/MultiTabDialog',
    'css!./styles/AddOrUpdateLibraryDialog.css'
], function (AssetWidget,
             UTILS,
             URL_UTIL,
             REGEXP,
             MultiTabDialog) {

    'use strict';

    /**
     * 
     * @param client
     * @param addLibrary
     * @constructor
     */
    function AddOrUpdateLibraryDialog(client, addLibrary) {
        this._client = client;
        this._addLibrary = addLibrary;
    }

    AddOrUpdateLibraryDialog.prototype.show = function (libraryIdOrName) {
        var self = this,
            dialog = new MultiTabDialog(),
            parameters = {
                title: this._addLibrary ? 'Add Library' : 'Update Library',
                extraClasses: 'add-or-update-library-dialog',
                iconClass: 'glyphicon glyphicon-folder-close',
                activeTabIndex: 0,
                tabs: []
            },
            libraryNode;

        if (this._addLibrary) {
            this._libraryName = libraryIdOrName;
        } else {
            libraryNode = this._client.getNode(libraryIdOrName);
        }

        // Refresh only applies to update library.
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

        parameters.tabs.push(this._getFileTab());
        parameters.tabs.push(this._getUrlTab());

        dialog.show(parameters, function () {
            self._urlInputControl.off('keyup');
            self._urlInputControl.off('keydown');
            self._assetWidget.destroy();
        });
    };

    AddOrUpdateLibraryDialog.prototype._getRefreshTab = function () {
        var self = this,
            linkUrl = '/?' + URL_UTIL.getSearchQuery({
                    projectId: this._storedLibraryInfo.projectId,
                    branchName: this._storedLibraryInfo.branchName
                });

        function onOK(callback) {
            self._client.updateLibrary(self._libraryName, null, function (err, result) {
                if (err) {
                    callback('Failed to refresh library: ' + err);
                } else if (!self._checkCommitStatus(result.status)) {
                    callback('Project updated with library at commit ' + result.hash.substring(0, 7) +
                        ' but could not update branch.');
                } else {
                    callback();
                }
            });
        }

        return {
            title: 'Refresh',
            infoTitle: 'Refresh from branch ' + this._storedLibraryInfo.branchName + ' in ' +
            this._storedLibraryInfo.projectId,
            infoDetails: 'The library info stored at the library root node indicates that this library originated ' +
            'from a project within this deployment. It also has a branch stored and it is therefore possible ' +
            'to attempt to update the attached library to the head of the branch linked. Use the link below to ' +
            'view the current state of the branch.',
            formControl: $('<a class="refresh-link" href="' + linkUrl + '" target="_blank">View branch of library</a>'),
            onOK: onOK
        };
    };

    AddOrUpdateLibraryDialog.prototype._getFileTab = function () {
        var self = this;

        this._assetWidget = new AssetWidget({
            propertyName: 'AddOrUpdateLibraryDialog',
            propertyValue: ''
        });

        function onOK(callback) {
            if (!self._assetWidget.propertyValue) {
                callback('No file uploaded.');
                return;
            }

            function resultCallback (err, result) {
                if (err) {
                    callback('Error getting library from blob: ' + err);
                } else if (!self._checkCommitStatus(result.status)) {
                    callback('Project updated with library at commit ' + result.hash.substring(0, 7) +
                        ' but could not update branch.');
                } else {
                    callback();
                }
            }

            if (self._addLibrary) {
                self._client.addLibrary(self._libraryName, self._assetWidget.propertyValue, resultCallback);
            } else {
                self._client.updateLibrary(self._libraryName, self._assetWidget.propertyValue, resultCallback);
            }
        }

        return {
            title: 'File',
            infoTitle: 'From webgmex file',
            infoDetails: 'Use an exported project package (webgmex-file) as the source of the library.',
            formControl: self._assetWidget.el,
            onOK: onOK
        };
    };

    AddOrUpdateLibraryDialog.prototype._getUrlTab = function () {
        var self = this,
            formControl = $('<div class="input-group"><span class="input-group-addon">URL</span>' +
                '<input type="text" class="form-control"></div>'),
            urlProjectInfo = {};

        this._urlInputControl = formControl.find('.form-control');

        this._urlInputControl.on('keyup', function () {
            urlProjectInfo = {
                projectId: UTILS.getURLParameterByNameFromString(self._urlInputControl.val(), 'project'),
                branchName: UTILS.getURLParameterByNameFromString(self._urlInputControl.val(), 'branch'),
                commitHash: UTILS.getURLParameterByNameFromString(self._urlInputControl.val(), 'commit')
            };
        });

        this._urlInputControl.on('keydown', function (event) {
            var enterPressed = event.which === 13;

            if (enterPressed) {
                event.preventDefault();
                event.stopPropagation();
            }
        });

        function onOK(callback) {
            if (typeof urlProjectInfo.projectId !== 'string') {
                callback('Provided url is not valid, it must at least contain a project id.');
                return;
            }

            function resultCallback (err, result) {
                if (err) {
                    callback('Error getting library via url: ' + err);
                } else if (!self._checkCommitStatus(result.status)) {
                    callback('Project updated with library at commit ' + result.hash.substring(0, 7) +
                        ' but could not update branch.');
                } else {
                    callback();
                }
            }

            if (self._addLibrary) {
                self._client.addLibrary(self._libraryName, urlProjectInfo, resultCallback);
            } else {
                self._client.updateLibrary(self._libraryName, urlProjectInfo, resultCallback);
            }
        }

        return {
            title: 'URL',
            infoTitle: 'From intra deployment URL',
            infoDetails: 'Use the URL of the project as the source of the library. To obtain the url, open up the ' +
            'project you would like to use as library and copy the full url from the address field. N.B. if you ' +
            'later would like to be able to refresh the library, make sure that a branch i opened before copying.',
            formControl: formControl,
            onOK: onOK
        };
    };

    AddOrUpdateLibraryDialog.prototype._checkCommitStatus = function (commitStatus) {
        return commitStatus === this._client.CONSTANTS.STORAGE.SYNCED ||
                commitStatus === this._client.CONSTANTS.STORAGE.MERGED;
    };

    return AddOrUpdateLibraryDialog;
});