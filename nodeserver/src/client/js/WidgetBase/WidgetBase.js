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

        //scroll position
        this.scrollPos = {"left": 0,
            "top": 0};

        //clear content
        this.$el.empty();

        //get widget's offset
        this.offset = this.$el.offset();

        //get widget's size
        this._size();

        this.attachScrollHandler(options.fnOnScroll);
    };

    WidgetBase.OPTIONS = { "CONTAINER_ELEMENT" : "containerElement",
        "LOGGER_INSTANCE_NAME": "LOGGER_INSTANCE_NAME" };

    WidgetBase.READ_ONLY_CLASS = 'read-only';


    /************ SET READ-ONLY MODE *************/
    WidgetBase.prototype.setReadOnly = function (isReadOnly) {
        if (this._isReadOnly !== isReadOnly) {
            this._isReadOnly = isReadOnly;
            this.logger.debug("ReadOnly mode changed to '" + isReadOnly + "'");
            this.onReadOnlyChanged(this._isReadOnly);
        }
    };

    WidgetBase.prototype.isReadOnly = function () {
        return this._isReadOnly;
    };

    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    WidgetBase.prototype.onReadOnlyChanged = function (isReadOnly) {
        if (isReadOnly === true) {
            this.$el.addClass(WidgetBase.READ_ONLY_CLASS);
        } else {
            this.$el.removeClass(WidgetBase.READ_ONLY_CLASS);
        }
    };
    /***** END OF --- SET READ-ONLY MODE *********/

    WidgetBase.prototype.attachScrollHandler = function (fnOnScroll) {
        var self = this;

        this.$el.on('scroll', function (event) {
            self.scrollPos.left = self.$el.scrollLeft();
            self.scrollPos.top = self.$el.scrollTop();

            if (fnOnScroll) {
                fnOnScroll(self.scrollPos);
            }
        });
    };

    WidgetBase.prototype._size = function () {
        this.size = {"width": this.$el.outerWidth(true),
            "height": this.$el.outerHeight(true)};
    };

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
        this._size();
    };

    return WidgetBase;
});