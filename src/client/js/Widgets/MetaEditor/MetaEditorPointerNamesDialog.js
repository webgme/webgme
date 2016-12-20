/*globals define, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/util',
    'js/Constants',
    'common/regexp',
    'text!./templates/MetaEditorPointerNamesDialog.html',
    'css!./styles/MetaEditorPointerNamesDialog.css'
], function (util,
             CONSTANTS,
             REGEXP,
             metaEditorPointerNamesDialogTemplate) {

    'use strict';

    var MetaEditorPointerNamesDialog,
        POPULAR_POINTER_NAMES = [CONSTANTS.POINTER_SOURCE, CONSTANTS.POINTER_TARGET, CONSTANTS.POINTER_CONSTRAINED_BY];

    MetaEditorPointerNamesDialog = function () {

    };

    MetaEditorPointerNamesDialog.prototype.show = function (existingPointerNames, notAllowedPointerNames,
                                                            isSet, callback) {
        var self = this;

        this._initDialog(existingPointerNames, notAllowedPointerNames, isSet, callback);

        this._dialog.modal('show');

        this._dialog.on('shown.bs.modal', function () {
            if (existingPointerNames.length === 0) {
                self._txtNewPointerName.focus();
            }
        });

        this._dialog.on('hidden.bs.modal', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });
    };

    MetaEditorPointerNamesDialog.prototype._initDialog = function (existingPointerNames, notAllowedPointerNames,
                                                                   isSet, callback) {
        var self = this,
            i,
            len = existingPointerNames.length,
            closeAndCallback,
            popularsAdded;

        closeAndCallback = function (selectedName) {
            self._dialog.modal('hide');

            if (callback) {
                callback.call(self, selectedName);
            }
        };

        function _endsWith(str, pattern) {
            var d = str.length - pattern.length;
            return d >= 0 && str.lastIndexOf(pattern) === d;
        }

        function validateName(name) {
            var result = {
                hasViolation: false,
                message: ''
            };

            if (name === '') {
                result.hasViolation = true;
                result.message = (isSet ? 'Set' : 'Pointer') + ' must have a non-empty name.';
            } else if (notAllowedPointerNames.indexOf(name) > -1) {
                result.hasViolation = true;
                result.message = 'Name "' + name + '" is already used for a ' + (isSet ? 'pointer' : 'set') + ' or ' +
                'an aspect.';
            } else if (REGEXP.DOCUMENT_KEY.test(name) === false) {
                result.hasViolation = true;
                result.message = 'Name "' + name + '" contains illegal characters, it may not contain "." ' +
                    'or start with "$" or "_".';
            } else {
                if (_endsWith(name, CONSTANTS.CORE.COLLECTION_NAME_SUFFIX)) {
                    result.hasViolation = true;
                    result.message = 'Name "' + name + '" ends with "' + CONSTANTS.CORE.COLLECTION_NAME_SUFFIX + '", ' +
                        'which could lead to collisions with data stored for inverse pointers.';
                } else if (name === CONSTANTS.CORE.BASE_POINTER) {
                    result.hasViolation = true;
                    result.message = 'Name "' + CONSTANTS.CORE.BASE_POINTER  + '" is reserved for base/instance ' +
                        'relationship.';
                } else if (name === CONSTANTS.CORE.MEMBER_RELATION) {
                    result.hasViolation = true;
                    result.message = 'Name "' + CONSTANTS.CORE.MEMBER_RELATION  + '" is reserved for ' +
                        'set membership.';
                } else if (name === CONSTANTS.CORE.OVERLAYS_PROPERTY) {
                    result.hasViolation = true;
                    result.message = 'Name "' + name + '" is a reserved key word.';
                }

                if (isSet && name === 'src' || name === 'dst') {
                    result.hasViolation = true;
                    result.message = 'Name "' + name + '" can only be used for pointer names and not for sets.';
                }
            }

            return result;
        }

        this._dialog = $(metaEditorPointerNamesDialogTemplate);

        //by default the template is for single pointer
        //in case of pointer list, update labels in the dialog
        if (isSet === true) {
            this._dialog.find('.modal-header > h3').text('Create new set');
            this._dialog.find('.pick-existing-label').text('Pick one of the existing sets:');
            this._dialog.find('.create-new-label').text('Or create a new set:');
            this._dialog.find('.txt-pointer-name').attr('placeholder', 'New set name...');
        }

        //get controls
        this._el = this._dialog.find('.modal-body').first();
        this._btnGroup = this._el.find('.btn-group-existing').first();
        this._btnGroupPopular = this._dialog.find('.btn-group-popular').first();
        this._alertDiv = this._dialog.find('.message-badge').first();
        this._hideAlert();

        //fill pointer names
        existingPointerNames.sort();

        if (len) {

            this._btnGroup.empty();

            for (i = 0; i < len; i += 1) {
                if (existingPointerNames[i] !== CONSTANTS.CORE.BASE_POINTER) {
                    this._btnGroup.append($('<button class="btn btn-default">' +
                        util.toSafeString(existingPointerNames[i]) + '</button>'));
                }
            }
        } else {

            if (isSet === true) {
                this._btnGroup.html('<span class="empty-message">No existing sets defined yet...</i>');
            } else {
                this._btnGroup.html('<span class="empty-message">No existing pointers defined yet...</i>');
            }
        }

        //add most popular ones
        popularsAdded = false;
        if (isSet !== true) {
            len = POPULAR_POINTER_NAMES.length;

            for (i = 0; i < len; i += 1) {
                if (existingPointerNames.indexOf(POPULAR_POINTER_NAMES[i]) === -1) {
                    this._btnGroupPopular.append($('<button class="btn btn-default">' +
                        POPULAR_POINTER_NAMES[i] + '</button>'));
                    popularsAdded = true;
                }
            }
        }

        //if all the popular ones were there already, remove popular panel completely
        if (!popularsAdded) {
            this._dialog.find('.panel-popular').remove();
        }

        //create UI for new pointer name
        this._txtNewPointerName = this._dialog.find('.txt-pointer-name');
        this._btnCreateNew = this._dialog.find('.btn-create').disable(true);
        this._panelCreateNew = this._dialog.find('.panel-create-new');

        //hook up event handlers
        this._btnGroup.on('click', '.btn', function (event) {
            var selectedPointerName = $(this).text();

            event.stopPropagation();
            event.preventDefault();

            closeAndCallback(selectedPointerName);
        });

        //hook up event handlers
        this._btnGroupPopular.on('click', '.btn', function (event) {
            var selectedPointerName = $(this).text();

            event.stopPropagation();
            event.preventDefault();

            closeAndCallback(selectedPointerName);
        });

        this._txtNewPointerName.on('keyup', function () {
            var val = self._txtNewPointerName.val(),
                validationResult = validateName(val);

            if (validationResult.hasViolation) {
                self._panelCreateNew.addClass('has-error');
                self._showAlert(validationResult.message);
                self._btnCreateNew.disable(true);
            } else {
                self._panelCreateNew.removeClass('has-error');
                self._btnCreateNew.disable(false);
                self._hideAlert();
            }
        });

        this._txtNewPointerName.on('keydown', function (event) {
            var enterPressed = event.which === 13,
                selectedPointerName = self._txtNewPointerName.val();

            if (enterPressed && validateName(selectedPointerName).hasViolation === false) {
                closeAndCallback(selectedPointerName);

                event.stopPropagation();
                event.preventDefault();
            }
        });

        this._btnCreateNew.on('click', function (event) {
            var selectedPointerName = self._txtNewPointerName.val();

            event.stopPropagation();
            event.preventDefault();

            if (!($(this).hasClass('disabled'))) {
                closeAndCallback(selectedPointerName);
            }
        });
    };

    MetaEditorPointerNamesDialog.prototype._showAlert = function (msg) {
        this._alertDiv.text(msg);
        this._alertDiv.show();
    };

    MetaEditorPointerNamesDialog.prototype._hideAlert = function () {
        this._alertDiv.hide();
    };

    return MetaEditorPointerNamesDialog;
});