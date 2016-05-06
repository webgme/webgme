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
    'text!./templates/addDialog.html'
], function (LoaderCircles,
             CORE_CONSTANTS,
             AssetWidget,
             UTILS,
             REGEXP,
             addDialogTemplate) {

    'use strict';

    var AddDialog,
        MAX_FILE_SIZE = 100000000;

    AddDialog = function (client) {
        this._client = client;
        this.assetWidget = new AssetWidget({
            propertyName: 'AddLibrary',
            propertyValue: ''
        });

    };

    AddDialog.prototype.show = function () {
        var self = this;

        this._initDialog();

        this._dialog.on('hide.bs.modal', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });

        this._dialog.modal('show');
    };

    AddDialog.prototype._initDialog = function () {
        var self = this;

        this._urlProjectInfo = null;
        this._dialog = $(addDialogTemplate);

        this._btnUpdate = this._dialog.find('.btn-add');
        this._btnUpdate.disable(true);

        this._loader = new LoaderCircles({containerElement: this._dialog});

        this._dialog.find('#packageInput').append(this.assetWidget.el);
        this.assetWidget.el.find('.asset-widget').css("width", '100%');

        this._libraryName = this._dialog.find('#libraryName');
        this._urlInput = this._dialog.find('#urlInput');

        this._errorText = this._dialog.find('#errorText');

        // Setting the modal-body to increase its height if needed
        this._dialog.find('.modal-body').css('max-height', 'none');

        //libraryName
        this._libraryName.on('keyup', function () {
            self.clearError();
            if (self.isValidLibraryName(self._libraryName.val())) {
                self._libraryName.parent().removeClass('has-error');
            } else {
                self._libraryName.parent().addClass('has-error');
            }
            self.setButton();
        });

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
            self.assetWidget.setValue(null);
            self.clearError();
            self._urlProjectInfo = {
                projectId: UTILS.getURLParameterByNameFromString(self._urlInput.val(), 'project'),
                branchName: UTILS.getURLParameterByNameFromString(self._urlInput.val(), 'branch'),
                commitHash: UTILS.getURLParameterByNameFromString(self._urlInput.val(), 'commit')
            };
            self.setButton();
        });

        this._btnUpdate.on('click', function () {
            if (self.canStartUpdate()) {
                self._client.addLibrary(self._libraryName.val(),
                    self.assetWidget.propertyValue || self._urlProjectInfo,
                    function (err) {
                        if (err) {
                            self.setError('unable to add library: ' + err);
                        } else {
                            self._dialog.modal('hide');
                        }
                    }
                );
            }
        });
    };

    AddDialog.prototype.canStartUpdate = function () {
        return this.isValidLibraryName(this._libraryName.val()) &&
            (this.assetWidget.propertyValue || this._urlProjectInfo);
    };

    AddDialog.prototype.setButton = function () {
        var self = this;
        if (self.canStartUpdate()) {
            self._btnUpdate.disable(false);
        } else {
            self._btnUpdate.disable(true);
        }
    };

    AddDialog.prototype.isValidLibraryName = function (name) {
        return this._client.getLibraryNames().indexOf(name) === -1 &&
            name.length > 0 &&
            REGEXP.DOCUMENT_KEY.test(name);
    };

    AddDialog.prototype.clearError = function () {
        this._errorText.addClass('hidden');
        this._errorText.text('');
    };

    AddDialog.prototype.setError = function (errorMessage) {
        this._errorText.removeClass('hidden');
        this._errorText.text(errorMessage);
        this._btnUpdate.disable(true);
    };

    return AddDialog;
});