/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define([], function () {

    var ToolbarTextBox;

    ToolbarTextBox = function (params) {
        this.el = $('<div class="toolbar-input"></div>');

        var $txtGroup = $('<div/>', {
                "class": "input-prepend"
            }),
            $label,
            $textBox = $('<input/>', {
                "class": "input-medium input-mini",
                "type" :"text"
            });

        if (params && params.label) {
            $label = $('<span/>', {"class":"add-on add-on-mini"});
            $label.text(params.label + ": ");
        }

        if (params && params.prependContent) {
            $label = $('<span/>', {"class":"add-on add-on-mini"});
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

    return ToolbarTextBox;
});