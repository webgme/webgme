"use strict";

define(['jquery',
        'logManager'], function ( _jquery,
                                  logManager) {

    var PanelBase;

    PanelBase = function (options) {
        //this.logger --- logger instance for the Panel
        var loggerName = "PanelBase",
            msg = "";

        if (options && options[PanelBase.OPTIONS.LOGGER_INSTANCE_NAME]) {
            loggerName = options[PanelBase.OPTIONS.LOGGER_INSTANCE_NAME];
        }

        this.logger = logManager.create(loggerName);

        this.$pEl = this.$el = $('<div/>');

        //by default Panel is in EDIT mode
        this._isReadOnly = false;

        //scroll position
        this.scrollPos = {"left": 0,
            "top": 0};

        this.attachScrollHandler(options.fnOnScroll);
    };

    PanelBase.OPTIONS = { "CONTAINER_ELEMENT" : "containerElement",  //TODO:delete
        "LOGGER_INSTANCE_NAME": "LOGGER_INSTANCE_NAME" };

    PanelBase.READ_ONLY_CLASS = 'read-only';


    /************ SET READ-ONLY MODE *************/
    PanelBase.prototype.setReadOnly = function (isReadOnly) {
        if (this._isReadOnly !== isReadOnly) {
            this._isReadOnly = isReadOnly;
            this.logger.debug("ReadOnly mode changed to '" + isReadOnly + "'");
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

    PanelBase.prototype.attachScrollHandler = function (fnOnScroll) {
        var self = this;

        this.$el.on('scroll', function (event) {
            self.scrollPos.left = self.$el.scrollLeft();
            self.scrollPos.top = self.$el.scrollTop();

            if (fnOnScroll) {
                fnOnScroll(self.scrollPos);
            }
        });
    };

    PanelBase.prototype._size = function () {
        this.size = {"width": this.$el.outerWidth(true),
            "height": this.$el.outerHeight(true)};
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
    PanelBase.prototype.parentContainerSizeChanged = function (newWidth, newHeight) {
        this._size();
    };

    PanelBase.prototype.setSize = function (width, height) {
        this._size();
    };

    PanelBase.prototype.afterAppend = function () {
        //get panel's offset
        this.offset = this.$el.offset();

        //get panel's size
        this._size();
    };

    return PanelBase;
});