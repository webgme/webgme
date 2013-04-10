"use strict";

define(['jquery',
        'logManager'], function ( _jquery,
                                  logManager) {

    var WidgetBase;

    WidgetBase = function (options) {
        //this.logger --- logger instance for the Widget
        var loggerName = "WidgetBase",
            msg = "";

        if (options && options[WidgetBase.OPTIONS.LOGGER_INSTANCE_NAME]) {
            loggerName = options[WidgetBase.OPTIONS.LOGGER_INSTANCE_NAME];
        }

        this.logger = logManager.create(loggerName);

        //this.$el --- jQuery reference to the DOM container of Widget
        if (options && options[WidgetBase.OPTIONS.CONTAINER_ELEMENT]) {
            this.$el = $(options[WidgetBase.OPTIONS.CONTAINER_ELEMENT]);
            if (this.$el.length === 0) {
                msg = "Widget's container element can not be found";
                this.logger.error(msg);
                throw (msg);
            }
        } else {
            msg = "Widget's container element is not specified in constructor's 'options' parameter";
            this.logger.error(msg);
            throw (msg);
        }

        //by default Widget is in EDIT mode
        this._isReadOnly = false;
    };

    WidgetBase.OPTIONS = { "CONTAINER_ELEMENT" : "containerElement",
        "LOGGER_INSTANCE_NAME": "LOGGER_INSTANCE_NAME" };


    /************ SET READ-ONLY MODE *************/
    WidgetBase.prototype.setReadOnly = function (isReadOnly) {
        if (this._isReadOnly !== isReadOnly) {
            this._isReadOnly = isReadOnly;
            this._onReadOnlyChanged(this._isReadOnly);
        }
    };

    WidgetBase.prototype.getReadOnly = function () {
        return this._isReadOnly;
    };

    WidgetBase.prototype._onReadOnlyChanged = function (isReadOnly) {
        this.logger.debug("ReadOnly mode changed to '" + isReadOnly + "'");
        this.onReadOnlyChanged(this._isReadOnly);
    };

    WidgetBase.prototype.onReadOnlyChanged = function (isReadOnly) {
        this.logger.warning("onReadOnlyChanged (isReadOnly) not overridden...");
    };
    /***** END OF --- SET READ-ONLY MODE *********/

    /************** WIDGET-BASE INTERFACE *******************/

    /* METHOD CALLED WHEN THE WIDGET HAS TO CLEAR ITSELF */
    WidgetBase.prototype.clear = function () {
    };

    /* METHOD CALLED BEFORE IT WILL BE REMOVED FROM SCREEN */
    /* DO THE NECESSARY CLEANUP */
    WidgetBase.prototype.destroy = function () {
        this.clear();
    };

    /* METHOD CALLED WHEN THE PARENT CONTAINER SIZE HAS CHANGED AND WIDGET SHOULD RESIZE ITSELF ACCORDINGLY */
    WidgetBase.prototype.parentContainerSizeChanged = function (newWidth, newHeight) {
    };

    return WidgetBase;
});