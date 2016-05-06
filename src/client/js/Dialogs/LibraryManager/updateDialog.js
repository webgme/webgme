/**
 * @author kecso / https://github.com/kecso
 */
/*globals define, $*/
/*jshint browser: true*/

define(['js/Loader/LoaderCircles',
    'common/core/constants',
    'js/Controls/PropertyGrid/Widgets/AssetWidget',
    'js/util',
    'common/regexp',
    'text!./templates/updateDialog.html'
], function (LoaderCircles,
             CORE_CONSTANTS,
             AssetWidget,
             UTILS,
             REGEXP,
             updateDialogTemplate) {

    'use strict';

    var UpdateDialog;

    UpdateDialog = function (client) {
        this._client = client;
        this.assetWidget = new AssetWidget({
            propertyName: 'UpdateLibrary',
            propertyValue: ''
        });

    };

    UpdateDialog.prototype.show = function (libraryId) {
        var self = this,
            libraryNode = this._client.getNode(libraryId);

        if (libraryNode) {
            this._libraryName = libraryNode.getFullyQualifiedName();
            this._storedLibraryInfo = this._client.getLibraryInfo(this._libraryName);
        }
        this._initDialog();

        this._dialog.on('hide.bs.modal', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });

        this._dialog.modal('show');
    };

    UpdateDialog.prototype._initDialog = function () {
        var self = this;

        this._urlProjectInfo = null;
        this._dialog = $(updateDialogTemplate);

        this._btnUpdate = this._dialog.find('#btnUpdate');
        this._btnUpdate.disable(true);

        this._btnRefresh = this._dialog.find('#btnRefresh');
        if (this._libraryName &&
            this._storedLibraryInfo &&
            this._storedLibraryInfo.projectId &&
            this._storedLibraryInfo.branchName) {
            this._btnRefresh.disable(false);
        } else {
            this._btnRefresh.disable(true);
        }

        if (this._libraryName) {
            this._dialog.find('#title').html('Update library \'' + this._libraryName + '\'');
        }
        this._loader = new LoaderCircles({containerElement: this._dialog});

        this._dialog.find('#packageInput').append(this.assetWidget.el);
        this.assetWidget.el.find('.asset-widget').css('width', '100%');

        this._urlInput = this._dialog.find('#urlInput');

        this._errorText = this._dialog.find('#errorText');

        //blob
        this.assetWidget.onFinishChange(function (/*data*/) {
            //TODO maybe some kind of checking needed
            self.clearError();
            self._urlInput.val('');
            self._urlProjectInfo = null;
            self.setButton();
        });

        //url
        this._urlInput.on('keyup', function () {
            self.clearError();
            self.assetWidget.setValue(null);
            self._urlProjectInfo = {
                projectId: UTILS.getURLParameterByNameFromString(self._urlInput.val(), 'project'),
                branchName: UTILS.getURLParameterByNameFromString(self._urlInput.val(), 'branch'),
                commitHash: UTILS.getURLParameterByNameFromString(self._urlInput.val(), 'commit')
            };
            self.setButton();
        });

        this._btnUpdate.on('click', function () {
            if (self.canStartUpdate()) {
                self._client.updateLibrary(self._libraryName,
                    self.assetWidget.propertyValue || self._urlProjectInfo,
                    function (err) {
                        if (err) {
                            self.setError('unable to update library: ' + err);
                        }
                        self._dialog.modal('hide');
                    }
                );
            }
        });

        this._btnRefresh.on('click', function () {
            self._client.updateLibrary(self._libraryName, null,
                function (err) {
                    if (err) {
                        self.setError('unable to refresh library: ' + err);
                        self._btnRefresh.disable(true);
                    } else {
                        self._dialog.modal('hide');
                    }
                }
            );
        });
    };

    UpdateDialog.prototype.canStartUpdate = function () {
        return this.assetWidget.propertyValue || this._urlProjectInfo;
    };

    UpdateDialog.prototype.setButton = function () {
        var self = this;
        if (self.canStartUpdate()) {
            self._btnUpdate.disable(false);
        } else {
            self._btnUpdate.disable(true);
        }
    };

    UpdateDialog.prototype.clearError = function () {
        this._errorText.addClass('hidden');
        this._errorText.text('');
    };

    UpdateDialog.prototype.setError = function (errorMessage) {
        this._errorText.removeClass('hidden');
        this._errorText.text(errorMessage);
        this._btnUpdate.disable(true);
    };

    return UpdateDialog;
});