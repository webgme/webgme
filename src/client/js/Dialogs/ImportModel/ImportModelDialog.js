/*globals define, $*/
/*jshint browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define(['js/Loader/LoaderCircles',
    'common/core/constants',
    'js/Controls/PropertyGrid/Widgets/AssetWidget',
    'js/util',
    'common/regexp',
    'text!./templates/ImportModelDialog.html'
], function (LoaderCircles,
             CORE_CONSTANTS,
             AssetWidget,
             UTILS,
             REGEXP,
             ImportModelDialogTemplate) {

    'use strict';

    var ImportModelDialog,
        MAX_FILE_SIZE = 100000000;

    ImportModelDialog = function (client) {
        this._client = client;
        this.assetWidget = new AssetWidget({
            propertyName: 'ImportModel',
            propertyValue: ''
        });

    };

    ImportModelDialog.prototype.show = function (parentId) {
        var self = this;

        this._initDialog();
        this._parentId = parentId;

        this._dialog.on('hide.bs.modal', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });

        this._dialog.modal('show');
    };

    ImportModelDialog.prototype._initDialog = function () {
        var self = this;

        this._dialog = $(ImportModelDialogTemplate);

        this._btnUpdate = this._dialog.find('.btn-add');
        this._btnUpdate.disable(true);

        this._loader = new LoaderCircles({containerElement: this._dialog});

        this._dialog.find('#packageInput').append(this.assetWidget.el);
        this.assetWidget.el.find('.asset-widget').css("width", '100%');

        this._errorText = this._dialog.find('#errorText');

        // Setting the modal-body to increase its height if needed
        this._dialog.find('.modal-body').css('max-height', 'none');

        //blob
        this.assetWidget.onFinishChange(function (/*data*/) {
            //TODO maybe some kind of checking needed
            self.clearError();
            self.setButton();
        });

        this._btnUpdate.on('click', function () {
            if (self.canStartUpdate()) {
                self._client.importSelectionFromFile(
                    self._client.getActiveProjectId(),
                    self._client.getActiveBranchName(),
                    self._parentId,
                    self.assetWidget.propertyValue,
                    function (err) {
                        if (err) {
                            self.setError('unable to import model: ' + err);
                        } else {
                            self._dialog.modal('hide');
                        }
                    }
                );
            }
        });
    };

    ImportModelDialog.prototype.canStartUpdate = function () {
        if (this.assetWidget.propertyValue) {
            return true;
        }
        return false;
    };

    ImportModelDialog.prototype.setButton = function () {
        var self = this;
        if (self.canStartUpdate()) {
            self._btnUpdate.disable(false);
        } else {
            self._btnUpdate.disable(true);
        }
    };

    ImportModelDialog.prototype.clearError = function () {
        this._errorText.addClass('hidden');
        this._errorText.text('');
    };

    ImportModelDialog.prototype.setError = function (errorMessage) {
        this._errorText.removeClass('hidden');
        this._errorText.text(errorMessage);
        this._btnUpdate.disable(true);
    };

    return ImportModelDialog;
});