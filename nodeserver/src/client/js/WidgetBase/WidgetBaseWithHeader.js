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
        options[WidgetBaseWithHeader.OPTIONS.HEADER_TITLE] = options[WidgetBaseWithHeader.OPTIONS.HEADER_TITLE] || true;
        options[WidgetBaseWithHeader.OPTIONS.HEADER_TOOLBAR] = options[WidgetBaseWithHeader.OPTIONS.HEADER_TOOLBAR] || true;
        options[WidgetBaseWithHeader.OPTIONS.HEADER_TOOLBAR_SIZE] = options[WidgetBaseWithHeader.OPTIONS.HEADER_TOOLBAR_SIZE] || WidgetBaseWithHeader.OPTIONS.HEADER_TOOLBAR_SIZE_OPTIONS.NORMAL;

        //call parent's constructor
        __parent__.apply(this, [options]);

        this.initUI(options);
        this._resize();
    };
    //inherit from WidgetBase Phase #2
    WidgetBaseWithHeader.OPTIONS = _.extend(WidgetBase.OPTIONS, { "HEADER_TITLE": "HEADER_TITLE",
                                                                  "HEADER_TOOLBAR": "HEADER_TOOLBAR",
                                                                  "HEADER_TOOLBAR_SIZE": "HEADER_TOOLBAR_SIZE",
                                                                  "HEADER_TOOLBAR_SIZE_OPTIONS": { "NORMAL": "NORMAL",
                                                                                           "MINI": "MINI",
                                                                                           "MICRO": "MICRO"}});
    _.extend(WidgetBaseWithHeader.prototype, __parent__.prototype);

    /* OVERRIDE WidgetBase members */
    WidgetBaseWithHeader.prototype.parentContainerSizeChanged = function (newWidth, newHeight) {
        this._resize(newWidth, newHeight);
    };

    /* CUSTOM MEMBERS */
    WidgetBaseWithHeader.prototype.initUI = function (options) {
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

        //TITLE IN HEADER BAR
        if (options[WidgetBaseWithHeader.OPTIONS.HEADER_TITLE] === true) {
            this.$widgetHeaderTitle = $('<div/>', {
                "class" : "widget-header-title"
            });
            this.$widgetHeader.append(this.$widgetHeaderTitle);
            this.setTitle = function (text) {
                this.$widgetHeaderTitle.text(text);
            };
        }

        if (options[WidgetBaseWithHeader.OPTIONS.HEADER_TOOLBAR] === true) {
            this.$widgetHeaderToolBar = $('<div/>', {
                "class" : "inline widget-header-toolbar"
            });
            this.$widgetHeader.append(this.$widgetHeaderToolBar);
            this.toolBar = new WidgetToolbar(this.$widgetHeaderToolBar, options[WidgetBaseWithHeader.OPTIONS.HEADER_TOOLBAR_SIZE]);
        }
    };

    WidgetBaseWithHeader.prototype._resize = function (parentW, parentH) {
        var widgetHeaderHeight = this.$widgetHeader.outerHeight(true),
            widgetHeaderPaddingLeft = parseInt(this.$widgetHeader.css('padding-left')),
            widgetHeaderPaddingRight = parseInt(this.$widgetHeader.css('padding-right'));

        if (!parentW) {
            parentW = this.$_el.parent().width();
        }

        if (!parentH) {
            parentH = this.$_el.parent().height();
        }

        this.$_el.width(parentW).height(parentH);
        this.$widgetHeader.width(parentW - widgetHeaderPaddingLeft - widgetHeaderPaddingRight);
        this.$widgetBody.width(parentW).height(parentH - widgetHeaderHeight);
    };

    return WidgetBaseWithHeader;
});