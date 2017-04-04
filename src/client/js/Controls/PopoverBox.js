/*globals define */
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */


define(['jquery', 'css!./styles/PopoverBox.css'], function () {

    'use strict';

    var PopoverBox,
        AUTO_HIDE_MILLISEC = 2000;

    PopoverBox = function (el) {
        this._el = el;
        this._messageQueue = [];
    };

    PopoverBox.prototype._showNew = function () {
        var self = this,
            data = this._messageQueue[0];

        console.log('Showing new', JSON.stringify(data));

        this._el.popover({
            placement: 'top',
            content: data.message,
            container: this._el,
            trigger: 'manual'
        });

        this._el.addClass('pobox');

        this._el.popover('show');
        this._el.find('.popover').addClass('pobox ' + data.level);
        this._el.popover('show');
        this._el.find('.popover').addClass(data.level);

        this._el.on('hidden.bs.popover', function () {
            if (self._timeout) {
                clearTimeout(self._timeout);
                self._timeout = null;
            }

            self._el.off('hidden.bs.popover');

            setTimeout(function () {
                self._messageQueue.shift();

                if (self._messageQueue.length > 0) {
                    self._showNew();
                }
            });
        });

        if (data.delay) {
            this._timeout = setTimeout(function () {
                self._el.popover('destroy');
            }, data.delay);
        }
    };

    PopoverBox.prototype.show = function (message, alertLevel, autoHideOrDelay) {
        if (autoHideOrDelay === true) {
            autoHideOrDelay = AUTO_HIDE_MILLISEC;
        }

        this._messageQueue.push({
            message: message,
            level: alertLevel || this.alertLevels.info,
            delay: autoHideOrDelay
        });

        if (this._messageQueue.length === 1) {
            this._showNew();
        }
    };

    PopoverBox.prototype.hide = function () {
        this._messageQueue = [];
    };

    PopoverBox.prototype.alertLevels = {
        SUCCESS: 'ddwa-success',
        WARNING: 'ddwa-warning',
        ERROR: 'ddwa-error',
        INFO: 'ddwa-info',
        success: 'ddwa-success',
        warning: 'ddwa-warning',
        warn: 'ddwa-warning',
        error: 'ddwa-error',
        info: 'ddwa-info'
    };

    return PopoverBox;
});