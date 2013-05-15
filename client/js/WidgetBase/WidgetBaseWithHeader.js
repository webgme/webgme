"use strict";

define(['js/WidgetBase/WidgetBase',
        'js/WidgetBase/WidgetToolbar',
        'css!/css/WidgetBase/WidgetBaseWithHeader'], function (WidgetBase,
                                                               WidgetToolbar) {

    var WidgetBaseWithHeader,
        __parent__ = WidgetBase,
        __parent_proto__ = __parent__.prototype,
        BASE_CLASS = "widget-base-wh"; // /scss/WidgetBase/WidgetBaseWithHeader.scss

    //inherit from WidgetBase Phase #1
    WidgetBaseWithHeader = function (options) {
        //set properties from options
        options[WidgetBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = options[WidgetBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] || "WidgetBaseWithHeader";

        //add WidgetBaseWithHeader specific options when not present
        options[WidgetBaseWithHeader.OPTIONS.HEADER_TITLE] = options[WidgetBaseWithHeader.OPTIONS.HEADER_TITLE] === true ? true : false;
        options[WidgetBaseWithHeader.OPTIONS.HEADER_TOOLBAR] = options[WidgetBaseWithHeader.OPTIONS.HEADER_TOOLBAR] === true ? true : false;
        options[WidgetBaseWithHeader.OPTIONS.HEADER_TOOLBAR_SIZE] = options[WidgetBaseWithHeader.OPTIONS.HEADER_TOOLBAR_SIZE] || WidgetBaseWithHeader.OPTIONS.HEADER_TOOLBAR_SIZE_OPTIONS.NORMAL;
        options[WidgetBaseWithHeader.OPTIONS.FILL_CONTAINER] = options[WidgetBaseWithHeader.OPTIONS.FILL_CONTAINER] === true ? true : false;

        //call parent's constructor
        __parent__.apply(this, [options]);

        this.initUI(options);
        this._resize();

        this.attachScrollHandler(options.fnOnScroll);
    };
    //inherit from WidgetBase Phase #2
    WidgetBaseWithHeader.OPTIONS = _.extend(WidgetBase.OPTIONS, { "HEADER_TITLE": "HEADER_TITLE",
                                                                  "HEADER_TOOLBAR": "HEADER_TOOLBAR",
                                                                  "HEADER_TOOLBAR_SIZE": "HEADER_TOOLBAR_SIZE",
                                                                  "HEADER_TOOLBAR_SIZE_OPTIONS": { "NORMAL": "NORMAL",
                                                                                           "MINI": "MINI",
                                                                                           "MICRO": "MICRO"},
                                                                  "FILL_CONTAINER": "FILL_CONTAINER"});
    _.extend(WidgetBaseWithHeader.prototype, __parent__.prototype);


    /* OVERRIDE WidgetBase members */
    WidgetBaseWithHeader.prototype.parentContainerSizeChanged = function (newWidth, newHeight) {
        this._resize(newWidth, newHeight);
    };


    WidgetBaseWithHeader.prototype.onReadOnlyChanged = function (isReadOnly) {
        this._onReadOnlyChanged(isReadOnly);
    };


    /* CUSTOM MEMBERS */
    WidgetBaseWithHeader.prototype.initUI = function (options) {
        var self = this;

        //save original $el to $_el
        if (this.$_el === undefined) {
            this.$_el = this.$el;
        }

        //clear content
        this.$_el.empty();

        //add own class
        this.$_el.addClass(BASE_CLASS);

        //Create Widget's HEADER
        this.$widgetHeader = $('<div/>', {
            "class" : "widget-header"
        });
        this.$_el.append(this.$widgetHeader);

        //Create Widget's BODY
        //set $el to widget-body for subclass use
        this.$el = this.$widgetBody = $('<div/>', {
            "class" : "widget-body"
        });
        this.$_el.append(this.$widgetBody);

        //create additional visual pieces
        //READ-ONLY indicator in header
        this.$widgetHeaderReadOnlyIndicator = $('<div/>', {
            "class" : "ro-icon",
            "title" : "READ-ONLY mode ON"
        });
        this.$widgetHeaderReadOnlyIndicator.append($('<i class="icon-lock"></i>'));
        this.$widgetHeader.append(this.$widgetHeaderReadOnlyIndicator);

        //TITLE IN HEADER BAR
        if (options[WidgetBaseWithHeader.OPTIONS.HEADER_TITLE] === true) {
            this.$widgetHeaderTitle = $('<div/>', {
                "class" : "widget-header-title"
            });
            this.$widgetHeader.append(this.$widgetHeaderTitle);
        }

        if (options[WidgetBaseWithHeader.OPTIONS.HEADER_TOOLBAR] === true) {
            this.$widgetHeaderToolBar = $('<div/>', {
                "class" : "inline widget-header-toolbar"
            });
            this.$widgetHeader.append(this.$widgetHeaderToolBar);

            /*this.$widgetHeader.css({'overflow-y': 'visible',
                                    'overflow-x': 'hidden'});*/

            this.toolBar = new WidgetToolbar(this.$widgetHeaderToolBar, options[WidgetBaseWithHeader.OPTIONS.HEADER_TOOLBAR_SIZE]);

            //add default buttons
            //#1 Read-Only button in DEBUG mode
            if (__WebGME__DEBUG === true) {
                var readOnlyButtonGroup = this.toolBar.addButtonGroup();

                this.$readOnlyBtn = this.toolBar.addToggleButton(
                    {"icon": "icon-lock",
                     "title": "Turn read-only mode ON/OFF",
                        "clickFn": function (event, data, isPressed) {
                            self.setReadOnly(isPressed);
                        }}, readOnlyButtonGroup);
            }
        }

        this._fillContainer = options[WidgetBaseWithHeader.OPTIONS.FILL_CONTAINER] === true ? true : false;
    };

    WidgetBaseWithHeader.prototype.destroy = function () {
        this.clear();
        this.$_el.remove();
    };

    WidgetBaseWithHeader.prototype.setTitle = function (text) {
        if (this.$widgetHeaderTitle) {
            this.$widgetHeaderTitle.text(text);
        }
    };


    /************** CUSTOM RESIZE HANDLER *****************/
    WidgetBaseWithHeader.prototype._resize = function (parentW, parentH) {
        var widgetHeaderHeight = this.$widgetHeader.outerHeight(true),
            widgetHeaderPaddingLeft = parseInt(this.$widgetHeader.css('padding-left')),
            widgetHeaderPaddingRight = parseInt(this.$widgetHeader.css('padding-right'));

        if (this._fillContainer === true) {
            if (!parentW) {
                parentW = this.$_el.parent().width();
            }

            if (!parentH) {
                parentH = this.$_el.parent().height();
            }

            this.$_el.width(parentW).height(parentH);
            this.$widgetHeader.width(parentW - widgetHeaderPaddingLeft - widgetHeaderPaddingRight);
            this.$widgetBody.width(parentW).height(parentH - widgetHeaderHeight);

            //get widget-body's offset
            this.offset = this.$el.offset();

            this.size = {"width": parentW,
                "height": parentH - widgetHeaderHeight};
        }
    };
    /************** END OF --- CUSTOM RESIZE HANDLER *****************/


    /************** CUSTOM READ-ONLY CHANGED HANDLER *****************/
    WidgetBaseWithHeader.prototype._onReadOnlyChanged = function (isReadOnly) {
        if (isReadOnly === true) {
            this.$_el.addClass(WidgetBase.READ_ONLY_CLASS);
        } else {
            this.$_el.removeClass(WidgetBase.READ_ONLY_CLASS);
        }

        //in DEBUG mode set Read-only button's toggle status accordingly
        if (this.$readOnlyBtn) {
            this.$readOnlyBtn.setToggled(isReadOnly);
        }
    };
    /************** END OF --- CUSTOM READ-ONLY CHANGED HANDLER *****************/


    return WidgetBaseWithHeader;
});