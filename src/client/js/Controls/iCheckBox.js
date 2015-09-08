/*globals define, $*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define(['jquery', 'css!./styles/iCheckBox.css'], function () {

    'use strict';

    var iCheckBox,
        DEFAULT_CHECKED_TEXT = 'ON',
        DEFAULT_UNCHECKED_TEXT = 'OFF',
        CHECKED_CLASS = 'checked',
        DISABLED_CLASS = 'disabled',
        EL_BASE = $('<div class="iCheckBox checked"><div class="sw"></div><div class="txt"></div></div>');

    iCheckBox = function (options) {
        var self = this;

        this._checkedText = (options && options.checkedText) || DEFAULT_CHECKED_TEXT;
        this._checkedText = this._checkedText.toUpperCase();
        this._uncheckedText = (options && options.uncheckedText) || DEFAULT_UNCHECKED_TEXT;
        this._uncheckedText = this._uncheckedText.toUpperCase();

        this.el = EL_BASE.clone();

        if (options.icon) {
            this.el.find('.sw').append('<i class="' + options.icon + '"></i>');
        }

        if (options.title) {
            this.el.attr('title', options.title);
        }

        this._txt = this.el.find('.txt').first();
        this._txt.text(this._checkedText);

        if (options && options.hasOwnProperty('checked')) {
            this.setChecked(options.checked);
        }

        if (options && options.data) {
            this.el.data(options.data);
        }

        this.el.on('click', null, function (event) {
            self.toggleChecked();
            event.stopPropagation();
        });

        this._checkChangedFn = options && options.checkChangedFn;
    };

    iCheckBox.prototype.toggleChecked = function () {
        this.setChecked(!this.isChecked());
    };

    iCheckBox.prototype.isChecked = function () {
        return this.el.hasClass(CHECKED_CLASS);
    };

    iCheckBox.prototype.setChecked = function (isChecked) {
        var checkBox = this.el,
            checkState = this.isChecked(),
            data = this.el.data();

        // be prepared if the isChecked is a string
        if (isChecked === 'false') {
            isChecked = false;
        }

        if (!checkBox.hasClass(DISABLED_CLASS)) {

            if (checkState !== isChecked) {
                this.el.toggleClass(CHECKED_CLASS);
                this._txt.text(isChecked ? this._checkedText : this._uncheckedText);

                if (this._checkChangedFn) {
                    this._checkChangedFn.call(this, data, isChecked);
                }
            }
        }
    };

    iCheckBox.prototype.setEnabled = function (isEnabled) {
        if (isEnabled) {
            this.el.removeClass(DISABLED_CLASS);
        } else {
            this.el.addClass(DISABLED_CLASS);
        }
    };

    return iCheckBox;
});