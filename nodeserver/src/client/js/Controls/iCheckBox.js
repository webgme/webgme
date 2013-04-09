"use strict";

define(['jquery',
        'css!/css/Controls/iCheckBox'], function (_jquery) {

    var iCheckBox,
        DEFAULT_CHECKED_TEXT = 'ON',
        DEFAULT_UNCHECKED_TEXT = 'OFF',
        CHECKED_CLASS = 'checked',
        DISABLED_CLASS = 'disabled';

    iCheckBox = function (options) {
        var self = this;

        this._checkedText = options.checkedText || DEFAULT_CHECKED_TEXT;
        this._checkedText = this._checkedText.toUpperCase();
        this._uncheckedText = options.uncheckedText || DEFAULT_UNCHECKED_TEXT;
        this._uncheckedText = this._uncheckedText.toUpperCase();
        this._checkChangedFn = options.checkChangedFn;

        this.el = $('<div class="iCheckBox checked"><div class="sw"></div><div class="txt">' + this._checkedText + '</div></div>');

        this._txt = this.el.find('.txt').first();

        this.el.on('click', null, function (event) {
            self._toggleChecked();
            event.stopPropagation();
        });
    };

    iCheckBox.prototype._toggleChecked = function () {
        this.setChecked(!this.isChecked());
    };

    iCheckBox.prototype.isChecked = function () {
        return this.el.hasClass(CHECKED_CLASS);
    };

    iCheckBox.prototype.setChecked = function (isChecked) {
        var checkBox = this.el,
            checkState = this.el.hasClass(CHECKED_CLASS);

        if (!checkBox.hasClass(DISABLED_CLASS)) {

            if (checkState !== isChecked) {
                this.el.toggleClass(CHECKED_CLASS);

                if (this._checkChangedFn) {
                    this._checkChangedFn.call(this, isChecked);
                    this._txt.text( isChecked ? this._checkedText : this._uncheckedText );
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