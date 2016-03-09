/*globals define, $, _*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/util',
    'js/Constants',
    'common/regexp',
    'text!./templates/AspectDetailsDialog.html',
    'css!./styles/AspectDetailsDialog.css'
], function (util, CONSTANTS, REGEXP, aspectDetailsDialogTemplate) {

    'use strict';

    var AspectDetailsDialog,
        ASPECT_DESC_BASE = {
            name: undefined,
            items: []
        },
        TYPE_EL_BASE = $('<label class="checkbox"><input type="checkbox"></label>'),
        DATA_TYPE_ID = 'typeid';

    AspectDetailsDialog = function () {
    };

    AspectDetailsDialog.prototype.show = function (aspectDesc, aspectNames, saveCallBack, deleteCallBack) {
        var self = this;

        this._initDialog(aspectDesc, aspectNames, saveCallBack, deleteCallBack);

        this._dialog.modal('show');

        this._dialog.on('hidden.bs.modal', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });
    };

    AspectDetailsDialog.prototype._initDialog = function (aspectDesc, aspectNames, saveCallBack, deleteCallBack) {
        var self = this,
            closeSave,
            closeDelete,
            isValidAspectName,
            aDesc = {},
            i,
            typeEl,
            typeInfo,
            displayName,
            chb,
            checkSelected;

        _.extend(aDesc, ASPECT_DESC_BASE);
        _.extend(aDesc, aspectDesc);

        closeSave = function () {
            var saveDesc = {},
                checked = typesContainer.find('input[type=checkbox]:checked');

            _.extend(saveDesc, ASPECT_DESC_BASE);

            saveDesc.name = self._inputName.val();
            saveDesc.items = [];

            checked.each(function (/*index, el*/) {
                    saveDesc.items.push($(this).data(DATA_TYPE_ID));
                }
            );

            self._dialog.modal('hide');

            if (saveCallBack) {
                saveCallBack.call(self, saveDesc);
            }
        };

        closeDelete = function () {
            self._dialog.modal('hide');

            if (deleteCallBack) {
                deleteCallBack.call(self);
            }
        };

        isValidAspectName = function (name) {
            return !(name === '' || aspectNames.indexOf(name) !== -1 ||
            name.toLowerCase() === CONSTANTS.ASPECT_ALL.toLowerCase() ||
            REGEXP.DOCUMENT_KEY.test(name) === false);
        };

        checkSelected = function () {
            var checked = typesContainer.find('input[type=checkbox]:checked');

            if (checked.length > 0 && isValidAspectName(self._inputName.val())) {
                self._btnSave.disable(false);
            } else {
                self._btnSave.disable(true);
            }
        };

        this._dialog = $(aspectDetailsDialogTemplate);

        //get controls
        this._el = this._dialog.find('.modal-body').first();

        this._btnSave = this._dialog.find('.btn-save').first();
        this._btnDelete = this._dialog.find('.btn-delete').first();

        this._pTypes = this._el.find('#pTypes').first();

        var typesContainer = this._pTypes.find('.controls');

        this._inputName = this._el.find('#inputName').first();

        //hook up event handlers
        //key-up in name textbox
        this._inputName.on('keyup', function () {
            var val = self._inputName.val();

            if (!isValidAspectName(val)) {
                self._inputName.addClass('text-danger');
                self._btnSave.disable(true);
            } else {
                self._inputName.removeClass('text-danger');
                var checked = typesContainer.find('input[type=checkbox]:checked');

                if (checked.length > 0) {
                    self._btnSave.disable(false);
                }
            }
        });

        //check for ENTER in name textbox
        this._inputName.on('keydown', function (event) {
            var enterPressed = event.which === 13,
                val = self._inputName.val();

            if (enterPressed && isValidAspectName(val)) {
                closeSave();

                event.stopPropagation();
                event.preventDefault();
            }
        });

        //click on SAVE button
        this._btnSave.on('click', function (event) {
            var val = self._inputName.val();

            event.stopPropagation();
            event.preventDefault();

            if ($(this).hasClass('disabled') === false) {
                if (isValidAspectName(val)) {
                    closeSave();
                }
            }
        });

        //click on DELETE button
        if (deleteCallBack) {
            this._btnDelete.on('click', function (event) {
                event.stopPropagation();
                event.preventDefault();

                closeDelete();
            });
        } else {
            this._btnDelete.remove();
        }

        //fill controls based on the currently edited aspect
        this._inputName.val(aspectDesc.name).focus();

        //fill types
        for (i = 0; i < aDesc.validChildrenTypes.length; i += 1) {
            typeInfo = aDesc.validChildrenTypes[i];

            displayName = typeInfo.name;
            /*if (DEBUG === true) {
             displayName += ' (' + typeInfo.id + ')';
             }*/

            typeEl = TYPE_EL_BASE.clone();
            typeEl.append(displayName);

            chb = typeEl.find('input[type=checkbox]');
            chb.data(DATA_TYPE_ID, typeInfo.id);

            if (aDesc.items.indexOf(typeInfo.id) !== -1) {
                chb.prop('checked', true);
            }

            typesContainer.append(typeEl);
        }

        this._pTypes.on('change', 'input[type=checkbox]', function () {
            checkSelected();
        });

        checkSelected();
    };

    return AspectDetailsDialog;
});