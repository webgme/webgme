/*globals define, $*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/util',
    'common/regexp',
    'text!./templates/AttributeDetailsDialog.html',
    'common/Constants',
    'css!./styles/AttributeDetailsDialog.css'
], function (util, REGEXP, attributeDetailsDialogTemplate, CONSTANTS) {

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
        var self = this;

        function isValidRegExp(val) {
            var result = true;

            try {
                new RegExp(val);
            } catch (e) {
                result = false;
            }

            return result;
        }

        function isValidAttributeName(name) {
            return !(name === '' ||
            name === 'name' ||
            attributeNames.indexOf(name) !== -1 ||
            REGEXP.DOCUMENT_KEY.test(name) === false);
        }

        function getTypeConvertedValue(value, type) {
            var result;

            switch (type) {
                case 'integer':
                    result = parseInt(value, 10);
                    if (isNaN(result)) {
                        result = undefined;
                    }
                    break;
                case 'float':
                    result = parseFloat(value, 10);
                    if (isNaN(result)) {
                        result = undefined;
                    }
                    break;
                case 'boolean':
                    break;
                default:
                    break;
            }

            return result;
        }

        function enumSelectionChanged(checked) {
            var multiChecked = self._cbMultiline.is(':checked'),
                passwordChecked = self._cbPassword.is(':checked');

            if (checked) {
                if (multiChecked) {
                    self._cbMultiline.prop('checked', false);
                    multiLineSelectionChanged(false);
                }
                if (passwordChecked) {
                    self._cbPassword.prop('checked', false);
                    passwordSelectionChanged(false);
                }

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
        }

        function multiLineSelectionChanged(checked, value) {
            var enumChecked = self._cbEnum.is(':checked'),
                passwordChecked = self._cbPassword.is(':checked');

            if (checked) {
                if (enumChecked) {
                    self._cbEnum.prop('checked', false);
                    enumSelectionChanged(false);
                }
                if (passwordChecked) {
                    self._cbPassword.prop('checked', false);
                    passwordSelectionChanged(false);
                }

                if (typeof value === 'string') {
                    self._inputDefaultValueMultiline.val(value);
                } else {
                    self._inputDefaultValueMultiline.val(self._inputDefaultValue.val());
                }

                self._pMultilineSubTypes.show();
                self._pDefaultValueMultiline.show();
                self._pDefaultValue.hide();
            } else {

                if (typeof value === 'string') {
                    self._inputDefaultValue.val(value);
                } else {
                    self._inputDefaultValue.val(self._inputDefaultValueMultiline.val());
                }

                self._multilineType.val('');
                self._pMultilineSubTypes.hide();
                self._pDefaultValueMultiline.hide();
                self._pDefaultValue.show();
            }
        }

        function passwordSelectionChanged(checked) {
            var enumChecked = self._cbEnum.is(':checked'),
                multiChecked = self._cbMultiline.is(':checked');

            if (checked) {
                if (enumChecked) {
                    self._cbEnum.prop('checked', false);
                    enumSelectionChanged(false);
                }

                if (multiChecked) {
                    self._cbMultiline.prop('checked', false);
                    multiLineSelectionChanged(false);
                }
            }
        }

        function closeSave() {
            var i,
                len,
                eValues,
                attrDesc = {
                    name: self._inputName.val(),
                    description: self._description.val(),
                    type: self._inputType.val(),
                    defaultValue: self._inputDefaultValue.val(),
                    isEnum: self._cbEnum.is(':checked'),
                    readonly: self._cbReadonly.is(':checked'),
                    hidden: self._cbHidden.is(':checked'),
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
                if (typeof attrDesc.defaultValue !== 'number') {
                    attrDesc.defaultValue = 0;
                }
                if (attrDesc.enumValues) {
                    eValues = attrDesc.enumValues.slice(0);
                    attrDesc.enumValues = [];
                    len = eValues.length;
                    for (i = 0; i < len; i += 1) {
                        cValue = getTypeConvertedValue(eValues[i], attrDesc.type);
                        if (typeof cValue === 'number') {
                            attrDesc.enumValues.push(cValue);
                        }
                    }
                }

                //adding range
                if (typeof getTypeConvertedValue(self._pRangeMax.val(), attrDesc.type) === 'number') {
                    attrDesc.max = getTypeConvertedValue(self._pRangeMax.val(), attrDesc.type);
                }
                if (typeof getTypeConvertedValue(self._pRangeMin.val(), attrDesc.type) === 'number') {
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

                if (self._cbMultiline.is(':checked')) {
                    attrDesc.multiline = true;
                    attrDesc.defaultValue = self._inputDefaultValueMultiline.val();
                    if (self._multilineType.val()) {
                        attrDesc.multilineType = self._multilineType.val();
                    }
                }

                if(self._cbPassword.is(':checked')){
                    attrDesc.isPassword = true;
                }
            }

            self._dialog.modal('hide');

            if (saveCallBack) {
                saveCallBack.call(self, attrDesc);
            }
        }

        function closeDelete() {
            self._dialog.modal('hide');

            if (deleteCallBack) {
                deleteCallBack.call(self);
            }
        }

        function selectedTypeChanged(newType) {
            self._pDefaultValue.show();
            self._pDefaultValueBoolean.hide();
            self._pDefaultValueMultiline.hide();

            self._pEnum.show();
            if (self._cbEnum.is(':checked')) {
                self._pEnumValues.show();
            }

            self._pMultiline.hide();
            if (self._cbMultiline.is(':checked')) {
                self._pMultilineSubTypes.hide();
            }

            self._pPassword.hide();

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
                    self._pMultiline.show();
                    self._pPassword.show();
                    if (self._cbMultiline.is(':checked')) {
                        self._pDefaultValue.hide();
                        self._pDefaultValueMultiline.show();
                        self._pMultilineSubTypes.show();
                    }
                    break;
            }
        }

        this._dialog = $(attributeDetailsDialogTemplate);

        //get controls
        this._el = this._dialog.find('.modal-body').first();
        this._cbEnum = this._el.find('#cbEnum').first();
        this._pEnum = this._el.find('#pEnum').first();
        this._cbMultiline = this._el.find('#cbMultiline').first();
        this._cbPassword = this._el.find('#cbPassword').first();

        this._pMultiline = this._el.find('#pMultiline').first();
        this._pMultiline.hide();
        this._pMultilineSubTypes = this._el.find('#pMultilineSubtypes').first();
        this._pMultilineSubTypes.hide();
        this._multilineType = this._el.find('#multilineType').first();

        this._multilineType.append($('<option></option>'));

        Object.keys(CONSTANTS.ATTRIBUTE_MULTILINE_TYPES).forEach(function (type) {
            self._multilineType.append($('<option></option>').text(type));
        });

        this._pEnumValues = this._el.find('#pEnumValues').first();
        this._pEnumValues.hide();

        this._pPassword = this._el.find('#pPassword').first();
        this._pPassword.hide();

        this._btnSave = this._dialog.find('.btn-save').first();
        this._btnDelete = this._dialog.find('.btn-delete').first();

        this._inputName = this._el.find('#inputName').first();
        this._description = this._el.find('#description').first();
        this._inputType = this._el.find('#inputType').first();

        // Default value controls
        this._inputDefaultValue = this._el.find('#inputDefaultValue').first();
        this._pDefaultValue = this._el.find('#pDefaultValue').first();

        this._inputDefaultValueMultiline = this._el.find('#inputDefaultValueMultiline').first();
        this._pDefaultValueMultiline = this._el.find('#pDefaultValueMultiline').first();
        this._pDefaultValueMultiline.hide();

        this._pDefaultValueBoolean = this._el.find('#pDefaultValueBoolean').first();
        this._pDefaultValueBoolean.hide();

        this._inputEnumValues = this._el.find('#inputEnumValues').first();

        this._cbReadonly = this._el.find('#cbReadonly').first();
        this._cbHidden = this._el.find('#cbHidden').first();

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
            enumSelectionChanged($(this).is(':checked'));
        });

        this._cbMultiline.on('change', null, function () {
            multiLineSelectionChanged($(this).is(':checked'));
        });

        this._cbPassword.on('change', null, function () {
            passwordSelectionChanged($(this).is(':checked'));
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
        this._description.val(attributeDesc.description);

        if (attributeDesc.readonly) {
            this._cbReadonly.attr('checked', true);
        }

        if (attributeDesc.hidden) {
            this._cbHidden.attr('checked', true);
        }

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
            this._inputDefaultValueMultiline.val(attributeDesc.defaultValue);
            if (attributeDesc.isEnum) {
                this._cbEnum.attr('checked', true);
                this._inputEnumValues.val(attributeDesc.enumValues.join('\n'));
                enumSelectionChanged(true);
            }

            if (attributeDesc.type === 'string') {
                this._pRange.hide();
                this._pRegExp.show();
                this._pMultiline.show();
                this._pPassword.show();
                if (attributeDesc.regexp) {
                    this._pRegExpValue.val(attributeDesc.regexp);
                }

                if (attributeDesc.multiline) {
                    this._pDefaultValue.hide();
                    this._pDefaultValueMultiline.show();
                    this._inputDefaultValueMultiline.val(attributeDesc.defaultValue);

                    this._cbMultiline.attr('checked', true);

                    if (CONSTANTS.ATTRIBUTE_MULTILINE_TYPES.hasOwnProperty(attributeDesc.multilineType)) {
                        this._multilineType.val(attributeDesc.multilineType);
                    } else if (attributeDesc.multilineType) {
                        this._multilineType.append($('<option></option>').text(attributeDesc.multilineType));
                        this._multilineType.val(attributeDesc.multilineType);
                    } else {
                        this._multilineType.val('');
                    }

                    multiLineSelectionChanged(true, attributeDesc.defaultValue);
                }

                if (attributeDesc.isPassword){
                    this._pPassword.show();
                    this._cbPassword.prop('checked', true);
                    passwordSelectionChanged(true);
                }
            } else {
                this._pRange.show();
                this._pRegExp.hide();
                if (typeof attributeDesc.min === 'number') {
                    this._pRangeMin.val(attributeDesc.min);
                }
                if (typeof attributeDesc.max === 'number') {
                    this._pRangeMax.val(attributeDesc.max);
                }
            }
        }
    };

    return AttributeDetailsDialog;
});