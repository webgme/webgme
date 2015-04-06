/*globals define, _*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */



define(['js/util',
    'text!./templates/AttributeDetailsDialog.html',
    'css!./styles/AttributeDetailsDialog.css'], function ( util,
                                                attributeDetailsDialogTemplate) {
    "use strict";

    var AttributeDetailsDialog,
        ASSET_TYPE = 'asset';

    AttributeDetailsDialog = function () {

    };

    AttributeDetailsDialog.prototype.show = function (attributeDesc, attributeNames, saveCallBack, deleteCallBack) {
        var self = this;

        this._initDialog(attributeDesc, attributeNames, saveCallBack, deleteCallBack);

        this._dialog.modal('show');

        this._dialog.on('shown.bs.modal', function () {
            self._inputName.focus().trigger('keyup');
        });

        this._dialog.on('hidden.bs.modal', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });
    };

    AttributeDetailsDialog.prototype._initDialog = function (attributeDesc, attributeNames, saveCallBack, deleteCallBack) {
        var self = this,
            closeSave,
            closeDelete,
            isValidAttributeName,
            selectedTypeChanged,
            getTypeConvertedValue;

        closeSave = function () {
            var i,
                len,
                eValues,
                attrDesc = {'name': self._inputName.val(),
                            'type': self._inputType.val(),
                            'defaultValue': self._inputDefaultValue.val(),
                            'isEnum': self._cbEnum.is(':checked')},
                cValue;

            if (attrDesc.isEnum) {
                attrDesc.enumValues = self._inputEnumValues.val().split('\n');
            }

            //make sure the default value / enum values are type correct
            if (attrDesc.type === 'integer' ||
                attrDesc.type === 'float') {
                //number -> convert
                attrDesc.defaultValue = getTypeConvertedValue(attrDesc.defaultValue, attrDesc.type);
                if (attrDesc.enumValues) {
                    eValues = attrDesc.enumValues.slice(0);
                    attrDesc.enumValues = [];
                    len = eValues.length;
                    for (i = 0; i < len; i += 1) {
                        cValue = getTypeConvertedValue(eValues[i], attrDesc.type);
                        if (cValue) {
                            attrDesc.enumValues.push(cValue);
                        }
                    }
                }
            } else if (attrDesc.type === 'boolean') {
                //BOOL - get the default value from the radio button's selection
                attrDesc.defaultValue = self._el.find('#rbBooleanTrue').first().is(':checked');
                delete attrDesc.isEnum;
            } else if (attrDesc.type === ASSET_TYPE) {
                attrDesc.defaultValue = '';
                delete attrDesc.isEnum;
            }

            self._dialog.modal('hide');

            if (saveCallBack) {
                saveCallBack.call(self, attrDesc);
            }
        };

        closeDelete = function () {
            self._dialog.modal('hide');

            if (deleteCallBack) {
                deleteCallBack.call(self);
            }
        };

        getTypeConvertedValue = function (value, type) {
            var result;

            switch (type) {
                case 'integer':
                    result = parseInt(value, 10);
                    if (isNaN(result)) {
                        result = 0;
                    }
                    break;
                case 'float':
                    result = parseFloat(value, 10);
                    if (isNaN(result)) {
                        result = 0;
                    }
                    break;
                case 'boolean':
                    break;
                default:
                    break;
            }

            return result;
        };

        selectedTypeChanged = function (newType) {
            self._pDefaultValue.show();
            self._pEnum.show();
            if (self._cbEnum.is(':checked')) {
                self._pEnumValues.show();
            }
            self._pDefaultValueBoolean.hide();

            switch (newType) {
                case 'integer':
                    break;
                case 'float':
                    break;
                case 'boolean':
                    self._pDefaultValue.hide();
                    self._pEnum.hide();
                    self._pEnumValues.hide();
                    self._pDefaultValueBoolean.show();
                    break;
                case ASSET_TYPE:
                    self._pDefaultValue.hide();
                    self._pEnum.hide();
                    self._pEnumValues.hide();
                    break;
                default:
                    break;
            }
        };

        isValidAttributeName = function (name) {
            return !(name === "" || attributeNames.indexOf(name) !== -1);
        };

        this._dialog = $(attributeDetailsDialogTemplate);

        //get controls
        this._el = this._dialog.find('.modal-body').first();
        this._cbEnum = this._el.find('#cbEnum').first();
        this._pEnum = this._el.find('#pEnum').first();

        this._pEnumValues = this._el.find('#pEnumValues').first();
        this._pEnumValues.hide();

        this._pName = this._el.find('#pName').first();

        this._btnSave = this._dialog.find('.btn-save').first();
        this._btnDelete = this._dialog.find('.btn-delete').first();

        this._inputName = this._el.find('#inputName').first();
        this._inputType = this._el.find('#inputType').first();
        this._inputDefaultValue = this._el.find('#inputDefaultValue').first();
        this._pDefaultValue = this._el.find('#pDefaultValue').first();

        this._pDefaultValueBoolean = this._el.find('#pDefaultValueBoolean').first();
        this._pDefaultValueBoolean.hide();

        this._inputEnumValues = this._el.find('#inputEnumValues').first();

        //hook up event handlers
        //key-up in name textbox
        this._inputName.on('keyup', function () {
            var val = self._inputName.val();

            if (!isValidAttributeName(val)) {
                self._pName.addClass("error");
                self._btnSave.disable(true);
            } else {
                self._pName.removeClass("error");
                self._btnSave.disable(false);
            }
        });

        //check for ENTER in name textbox
        this._inputName.on('keydown', function (event) {
            var enterPressed = event.which === 13,
                val = self._inputName.val();

            if (enterPressed && isValidAttributeName(val)) {
                closeSave();

                event.stopPropagation();
                event.preventDefault();
            }
        });

        //'Enumeration' checkbox check change
        this._cbEnum.on('change', null, function () {
            var checked = $(this).is(':checked');

            if (checked) {
                self._pEnumValues.show();
            } else {
                self._pEnumValues.hide();
                self._inputEnumValues.val('');
            }
        });

        //'type' checkbox check change
        this._inputType.on('change', null, function () {
            selectedTypeChanged(self._inputType.val());
        });

        //click on SAVE button
        this._btnSave.on('click', function (event) {
            var val = self._inputName.val();

            event.stopPropagation();
            event.preventDefault();

            if (isValidAttributeName(val)) {
                closeSave();
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


        //fill controls based on the currently edited attribute
        this._inputName.val(attributeDesc.name);
        this._inputType.val(attributeDesc.type);
        if (attributeDesc.type === 'boolean') {
            //boolean type
            this._pDefaultValue.hide();
            this._pEnum.hide();
            this._pDefaultValueBoolean.show();
            if (attributeDesc.defaultValue !== true) {
                this._el.find('#rbBooleanFalse').first().attr('checked', 'checked');
            }
        } else if (attributeDesc.type === ASSET_TYPE) {
            this._pDefaultValue.hide();
            this._pEnum.hide();
        } else {
            this._inputDefaultValue.val(attributeDesc.defaultValue);
            if (attributeDesc.isEnum) {
                this._cbEnum.attr('checked', true);
                this._inputEnumValues.val(attributeDesc.enumValues.join('\n'));
                this._pEnumValues.show();
            }
        }
    };


    return AttributeDetailsDialog;
});