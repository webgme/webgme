/*globals define, WebGMEGlobal, $ */
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['jquery', 'js/logger'], function (_jquery, Logger) {

    'use strict';

    var PanelBase;

    PanelBase = function (options /*, layoutManager */) {
        //this.logger --- logger instance for the Panel
        var loggerName = 'gme:PanelBase:PanelBase';

        if (options && options[PanelBase.OPTIONS.LOGGER_INSTANCE_NAME]) {
            loggerName = 'gme:' + options[PanelBase.OPTIONS.LOGGER_INSTANCE_NAME];
        }

        this.logger = Logger.create(loggerName, WebGMEGlobal.gmeConfig.client.log);

        this.$pEl = this.$el = $('<div/>');

        //by default Panel is in EDIT mode
        this._isReadOnly = false;
    };

    PanelBase.OPTIONS = {LOGGER_INSTANCE_NAME: 'LOGGER_INSTANCE_NAME'};

    PanelBase.READ_ONLY_CLASS = 'read-only';


    /************ SET READ-ONLY MODE *************/
    PanelBase.prototype.setReadOnly = function (isReadOnly) {
        if (this._isReadOnly !== isReadOnly) {
            this._isReadOnly = isReadOnly;
            this.logger.debug('ReadOnly mode changed to "' + isReadOnly + '"');
            this.onReadOnlyChanged(this._isReadOnly);
        }
    };

    PanelBase.prototype.isReadOnly = function () {
        return this._isReadOnly;
    };

    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    PanelBase.prototype.onReadOnlyChanged = function (isReadOnly) {
        if (isReadOnly === true) {
            this.$el.addClass(PanelBase.READ_ONLY_CLASS);
        } else {
            this.$el.removeClass(PanelBase.READ_ONLY_CLASS);
        }
    };
    /***** END OF --- SET READ-ONLY MODE *********/

    PanelBase.prototype._getSize = function () {
        this.size = {
            width: this.$el.outerWidth(true),
            height: this.$el.outerHeight(true)
        };
    };

    /************** WIDGET-BASE INTERFACE *******************/

    /* METHOD CALLED WHEN THE WIDGET HAS TO CLEAR ITSELF */
    PanelBase.prototype.clear = function () {
    };

    /* METHOD CALLED BEFORE IT WILL BE REMOVED FROM SCREEN */
    /* DO THE NECESSARY CLEANUP */
    PanelBase.prototype.destroy = function () {
        this.clear();
        this.$el.remove();
    };

    /* METHOD CALLED WHEN THE PARENT CONTAINER SIZE HAS CHANGED AND WIDGET SHOULD RESIZE ITSELF ACCORDINGLY */
    PanelBase.prototype.setSize = function (width, height) {
        this.size = {
            width: width,
            height: height
        };

        this.onResize(this.size.width, this.size.height);
    };

    PanelBase.prototype.onResize = function (width, height) {
        this.logger.debug('onResize --> width: ' + width + ', height: ' + height);
    };

    PanelBase.prototype.afterAppend = function () {
        //get panel's offset
        this.offset = this.$el.offset();
        //get panel's size
        this._getSize();

    };

    PanelBase.prototype.setContainerUpdateFn = function (currentLayout, containerSizeUpdateFn) {
        if (containerSizeUpdateFn) {
            this.updateContainerSize = function () {
                containerSizeUpdateFn.call(currentLayout);
            };
        } else {
            this.updateContainerSize = function () {
                this.logger.warn('updateContainerSize not implemented for container in current-layout');
            };
        }
    };

    return PanelBase;
});