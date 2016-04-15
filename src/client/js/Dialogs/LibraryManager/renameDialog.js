/**
 * @author kecso / https://github.com/kecso
 */
/*globals define, $*/
/*jshint browser: true*/

define(['js/Loader/LoaderCircles',
    'common/core/constants',
    'common/regexp',
    'js/Controls/PropertyGrid/Widgets/AssetWidget',
    'text!./templates/renameDialog.html'
], function (LoaderCircles,
             CORE_CONSTANTS,
             REGEXP,
             AssetWidget,
             renameDialogTemplae) {

    'use strict';

    var RenameDialog,
        MAX_FILE_SIZE = 100000000;

    RenameDialog = function (client) {
        this._client = client;
    };

    RenameDialog.prototype.show = function (forbiddenNames, fnCallback) {
        var self = this;

        this._fnCallback = fnCallback;
        this._forbiddenNames = forbiddenNames || [];

        this._initDialog();

        this._dialog.on('hide.bs.modal', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;

            // if (self._fnCallback) {
            //     self._fnCallback();
            // }
        });

        this._dialog.modal('show');
    };

    RenameDialog.prototype._initDialog = function () {
        var self = this;

        this._dialog = $(renameDialogTemplae);

        this._btnRename = this._dialog.find('.btn-rename');
        this._btnRename.disable(true);

        this._libraryName = this._dialog.find('#newLibraryName');

        //libraryName
        this._libraryName.on('keyup', function () {
            if (self.isValidLibraryName(self._libraryName.val())) {
                self._libraryName.parent().removeClass('has-error');
                self._btnRename.disable(false);
            } else {
                self._libraryName.parent().addClass('has-error');
                self._btnRename.disable(true);
            }
        });

        this._btnRename.on('click', function () {
            self._dialog.modal('hide');
            self._fnCallback(self._libraryName.val());
        });
    };

    RenameDialog.prototype.isValidLibraryName = function (name) {
        if (this._forbiddenNames.indexOf(name) !== -1) {
            return false;
        }

        return REGEXP.DOCUMENT_KEY.test(name);
    };

    return RenameDialog;
});