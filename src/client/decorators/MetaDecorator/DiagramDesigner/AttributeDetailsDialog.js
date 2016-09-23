/*globals define, $*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/util',
    'common/regexp',
    'text!./templates/AttributeDetailsDialog.html',
    'css!./styles/AttributeDetailsDialog.css'
], function (util, REGEXP, attributeDetailsDialogTemplate) {

    'use strict';

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

    AttributeDetailsDialog.prototype._initDialog = function (attributeDesc, attributeNames, saveCallBack,
                                                             deleteCallBack) {
        var self = this,
            closeSave,
            closeDelete,
            isValidAttributeName,
            selectedTypeChanged,
            getTypeConvertedValue;

        function isValidRegExp(val) {
            var result = true;

            try {
                new RegExp(val);
            } catch (e) {
                result = false;
            }

            return result;
        }

        closeSave = function () {
            var i,
                len,
                eValues,
                attrDesc = {
                    name: self._inputName.val(),
                    type: self._inputType.val(),
                    defaultValue: self._inputDefaultValue.val(),
                    isEnum: self._cbEnum.is(':checked')
                },
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

                //adding range
                if (getTypeConvertedValue(self._pRangeMax.val(), attrDesc.type)) {
                    attrDesc.max = getTypeConvertedValue(self._pRangeMax.val(), attrDesc.type);
                }
                if (getTypeConvertedValue(self._pRangeMin.val(), attrDesc.type)) {
                    attrDesc.min = getTypeConvertedValue(self._pRangeMin.val(), attrDesc.type);
                }
            } else if (attrDesc.type === 'boolean') {
                //BOOL - get the default value from the radio button's selection
                attrDesc.defaultValue = self._el.find('#rbBooleanTrue').first().is(':checked');
                delete attrDesc.isEnum;
            } else if (attrDesc.type === ASSET_TYPE) {
                attrDesc.defaultValue = '';
                delete attrDesc.isEnum;
            } else if (attrDesc.type === 'string') {
                if (self._pRegExpValue.val()) {
                    attrDesc.regexp = self._pRegExpValue.val();
                }
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
                    self._pRegExp.hide();
                    self._pRange.show();
                    break;
                case 'float':
                    self._pRange.show();
                    self._pRegExp.hide();
                    break;
                case 'boolean':
                    self._pDefaultValue.hide();
                    self._pEnum.hide();
                    self._pEnumValues.hide();
                    self._pDefaultValueBoolean.show();
                    self._pRegExp.hide();
                    self._pRange.hide();
                    break;
                case ASSET_TYPE:
                    self._pDefaultValue.hide();
                    self._pEnum.hide();
                    self._pEnumValues.hide();
                    self._pRegExp.hide();
                    self._pRange.hide();
                    break;
                default:
                    self._pRegExp.show();
                    self._pRange.hide();
                    break;
            }
        };

        isValidAttributeName = function (name) {
            return !(name === '' ||
            name === 'name' ||
            attributeNames.indexOf(name) !== -1 ||
            REGEXP.DOCUMENT_KEY.test(name) === false);
        };

        this._dialog = $(attributeDetailsDialogTemplate);

        //get controls
        this._el = this._dialog.find('.modal-body').first();
        this._cbEnum = this._el.find('#cbEnum').first();
        this._pEnum = this._el.find('#pEnum').first();

        this._pEnumValues = this._el.find('#pEnumValues').first();
        this._pEnumValues.hide();

        this._btnSave = this._dialog.find('.btn-save').first();
        this._btnDelete = this._dialog.find('.btn-delete').first();

        this._inputName = this._el.find('#inputName').first();
        this._inputType = this._el.find('#inputType').first();
        this._inputDefaultValue = this._el.find('#inputDefaultValue').first();
        this._pDefaultValue = this._el.find('#pDefaultValue').first();

        this._pDefaultValueBoolean = this._el.find('#pDefaultValueBoolean').first();
        this._pDefaultValueBoolean.hide();

        this._inputEnumValues = this._el.find('#inputEnumValues').first();

        //extended options
        this._pRegExp = this._el.find('#pRegExp');
        this._pRegExpValue = this._el.find('#inputRegExp');

        this._pRange = this._el.find('#pRange');
        this._pRangeMin = this._el.find('#inputMinValue');
        this._pRangeMax = this._el.find('#inputMaxValue');

        //hook up event handlers
        //key-up in name textbox
        this._inputName.on('keyup', function () {
            var val = self._inputName.val();

            if (!isValidAttributeName(val)) {
                self._inputName.addClass('text-danger');
                self._btnSave.disable(true);
                self._btnDelete.disable(true);
            } else {
                self._inputName.removeClass('text-danger');
                self._btnSave.disable(false);
                self._btnDelete.disable(false);
            }
        });

        this._pRegExpValue.on('keyup', function () {
            var val = self._pRegExpValue.val();

            if (!isValidRegExp(val)) {
                self._pRegExpValue.addClass('text-danger');
                self._btnSave.disable(true);
                self._btnDelete.disable(true);
            } else {
                self._pRegExpValue.removeClass('text-danger');
                self._btnSave.disable(false);
                self._btnDelete.disable(false);
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
                self._pRange.hide();
                self._pRangeMax.val('');
                self._pRangeMin.val('');
                self._pRegExp.hide();
                self._pRegExpValue.val('');
            } else {
                self._pEnumValues.hide();
                self._inputEnumValues.val('');
                if (self._inputType.val() === 'float' ||
                    self._inputType.val() === 'integer') {
                    self._pRange.show();
                } else if (self._inputType.val() === 'string') {
                    self._pRegExp.show();
                }
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
            this._pRange.hide();
            this._pRegExp.hide();
            if (attributeDesc.defaultValue !== true) {
                this._el.find('#rbBooleanFalse').first().attr('checked', 'checked');
            }
        } else if (attributeDesc.type === ASSET_TYPE) {
            this._pDefaultValue.hide();
            this._pEnum.hide();
            this._pRange.hide();
            this._pRegExp.hide();
        } else {
            this._inputDefaultValue.val(attributeDesc.defaultValue);
            if (attributeDesc.isEnum) {
                this._cbEnum.attr('checked', true);
                this._inputEnumValues.val(attributeDesc.enumValues.join('\n'));
                this._pEnumValues.show();
            }

            if (attributeDesc.type === 'string') {
                this._pRange.hide();
                this._pRegExp.show();
                if (attributeDesc.regexp) {
                    this._pRegExpValue.val(attributeDesc.regexp);
                }
            } else {
                this._pRange.show();
                this._pRegExp.hide();
                if (attributeDesc.min) {
                    this._pRangeMin.val(attributeDesc.min);
                }
                if (attributeDesc.max) {
                    this._pRangeMax.val(attributeDesc.max);
                }
            }
        }
    };

    return AttributeDetailsDialog;
});