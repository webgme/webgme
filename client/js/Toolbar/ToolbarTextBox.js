/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['./ToolbarItemBase'], function (ToolbarItemBase) {

    var ToolbarTextBox,
        EL_BASE = $('<div class="toolbar-input"></div>'),
        TXT_GROUP_BASE = $('<div/>', {"class": "input-prepend"}),
        TEXTBOX_BASE = $('<input/>', {"class": "input-medium input-mini","type" :"text"}),
        LABEL_BASE = $('<span/>', {"class":"add-on add-on-mini"});

    ToolbarTextBox = function (params) {
        this.el = EL_BASE.clone();

        var $txtGroup = TXT_GROUP_BASE.clone(),
            $label,
            $textBox = TEXTBOX_BASE.clone();

        this._textBox = $textBox;

        if (params && params.label) {
            $label = LABEL_BASE.clone();
            $label.text(params.label + ": ");
        }

        if (params && params.prependContent) {
            $label = LABEL_BASE.clone();
            $label.html(params.prependContent);
        }

        if (params && params.collapse) {
            $textBox.addClass('no-focus-collapse');
        }

        if ($label) {
            $txtGroup.append($label);
        }

        if (params && params.placeholder) {
            $textBox.attr('placeholder', params.placeholder);
        }

        $txtGroup.append($textBox);

        if (params && params.textChangedFn) {
            var oldVal;
            $textBox.on('keyup', function(/*e*/) {
                var val = $(this).val();

                if (val !== oldVal) {
                    params.textChangedFn.call(this, oldVal, val);
                    oldVal = val;
                }
            } );
        }

        $textBox.on('keypress', function(e) {
                /* Prevent form submission */
                if ( e.keyCode == 13 )
                {
                    if (params && params.onEnterFn) {
                        var val = $(this).val();
                        params.onEnterFn.call(this, val);
                    }
                    return false;
                }
            }
        );

        this.el.append($txtGroup);
    };

    _.extend(ToolbarTextBox.prototype, ToolbarItemBase.prototype);

    ToolbarTextBox.prototype.enabled = function (enabled) {
        if (enabled === true) {
            this._textBox.removeAttr('disabled');
        } else {
            this._textBox.attr('disabled', 'disabled')
        }
    };

    ToolbarTextBox.prototype.setText = function (text) {
        this._textBox.val(text);
    };

    ToolbarTextBox.prototype.getText = function () {
        return this._textBox.val();
    };

    return ToolbarTextBox;
});