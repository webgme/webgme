"use strict";

define(['js/PanelBase/PanelBase',
        'js/PanelBase/PanelToolbar',
        'css!/css/PanelBase/PanelBaseWithHeader'], function (PanelBase,
                                                               PanelToolbar) {

    var PanelBaseWithHeader,
        __parent__ = PanelBase,
        __parent_proto__ = __parent__.prototype,
        BASE_CLASS = "panel-base-wh"; // /scss/PanelBase/PanelBaseWithHeader.scss

    //inherit from PanelBase Phase #1
    PanelBaseWithHeader = function (options, layoutManager) {
        //set properties from options
        options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] || "PanelBaseWithHeader";

        //add PanelBaseWithHeader specific options when not present
        options[PanelBaseWithHeader.OPTIONS.HEADER_TITLE] = options[PanelBaseWithHeader.OPTIONS.HEADER_TITLE] === true ? true : false;
        options[PanelBaseWithHeader.OPTIONS.HEADER_TOOLBAR] = options[PanelBaseWithHeader.OPTIONS.HEADER_TOOLBAR] === true ? true : false;
        options[PanelBaseWithHeader.OPTIONS.HEADER_TOOLBAR_SIZE] = options[PanelBaseWithHeader.OPTIONS.HEADER_TOOLBAR_SIZE] || PanelBaseWithHeader.OPTIONS.HEADER_TOOLBAR_SIZE_OPTIONS.NORMAL;
        options[PanelBaseWithHeader.OPTIONS.FILL_CONTAINER] = options[PanelBaseWithHeader.OPTIONS.FILL_CONTAINER] === true ? true : false;

        //call parent's constructor
        __parent__.apply(this, [options, layoutManager]);

        this.initUI(options);
    };
    //inherit from PanelBase Phase #2
    PanelBaseWithHeader.OPTIONS = _.extend(PanelBase.OPTIONS, { "HEADER_TITLE": "HEADER_TITLE",
                                                                  "HEADER_TOOLBAR": "HEADER_TOOLBAR",
                                                                  "HEADER_TOOLBAR_SIZE": "HEADER_TOOLBAR_SIZE",
                                                                  "HEADER_TOOLBAR_SIZE_OPTIONS": { "NORMAL": "NORMAL",
                                                                                           "MINI": "MINI",
                                                                                           "MICRO": "MICRO"},
                                                                  "FILL_CONTAINER": "FILL_CONTAINER"});
    _.extend(PanelBaseWithHeader.prototype, __parent__.prototype);


    /* OVERRIDE PanelBase members */
    PanelBaseWithHeader.prototype.setSize = function (width, height) {
        this._setSize(width, height);

        this.onResize(this.size.width, this.size.height);
    };


    PanelBaseWithHeader.prototype.onReadOnlyChanged = function (isReadOnly) {
        this._onReadOnlyChanged(isReadOnly);
    };


    /* CUSTOM MEMBERS */
    PanelBaseWithHeader.prototype.initUI = function (options) {
        var self = this;

        //save original $el to $_el
        if (this.$_el === undefined) {
            this.$_el = this.$el;
        }

        //clear content
        this.$_el.empty();

        //add own class
        this.$_el.addClass(BASE_CLASS);

        //Create Panel's HEADER
        this.$panelHeader = $('<div/>', {
            "class" : "panel-header"
        });
        this.$_el.append(this.$panelHeader);

        //Create Panel's BODY
        //set $el to panel-body for subclass use
        this.$el = this.$panelBody = $('<div/>', {
            "class" : "panel-body"
        });
        this.$_el.append(this.$panelBody);

        //create additional visual pieces
        //READ-ONLY indicator in header
        this.$panelHeaderReadOnlyIndicator = $('<div/>', {
            "class" : "ro-icon",
            "title" : "READ-ONLY mode ON"
        });
        this.$panelHeaderReadOnlyIndicator.append($('<i class="icon-lock"></i>'));
        this.$panelHeader.append(this.$panelHeaderReadOnlyIndicator);

        //TITLE IN HEADER BAR
        if (options[PanelBaseWithHeader.OPTIONS.HEADER_TITLE] === true) {
            this.$panelHeaderTitle = $('<div/>', {
                "class" : "panel-header-title user-select-on"
            });
            this.$panelHeader.append(this.$panelHeaderTitle);
        }

        if (options[PanelBaseWithHeader.OPTIONS.HEADER_TOOLBAR] === true) {
            this.$panelHeaderToolBar = $('<div/>', {
                "class" : "inline panel-header-toolbar"
            });
            this.$panelHeader.append(this.$panelHeaderToolBar);

            /*this.$panelHeader.css({'overflow-y': 'visible',
                                    'overflow-x': 'hidden'});*/

            this.toolBar = new PanelToolbar(this.$panelHeaderToolBar, options[PanelBaseWithHeader.OPTIONS.HEADER_TOOLBAR_SIZE]);

            //add default buttons
            //#1 Read-Only button in DEBUG mode
            if (DEBUG === true) {
                var readOnlyButtonGroup = this.toolBar.addButtonGroup();

                this.$readOnlyBtn = this.toolBar.addToggleButton(
                    {"icon": "icon-lock",
                     "title": "Turn read-only mode ON/OFF",
                        "clickFn": function (event, data, isPressed) {
                            self.setReadOnly(isPressed);
                        }}, readOnlyButtonGroup);
            }
        }

        this._fillContainer = options[PanelBaseWithHeader.OPTIONS.FILL_CONTAINER] === true ? true : false;
    };

    PanelBaseWithHeader.prototype.destroy = function () {
        this.clear();
        this.$_el.remove();
    };

    PanelBaseWithHeader.prototype.setTitle = function (text) {
        if (this.$panelHeaderTitle) {
            this.$panelHeaderTitle.text(text);
        }
    };


    /************** CUSTOM RESIZE HANDLER *****************/
    PanelBaseWithHeader.prototype._setSize = function (w, h) {
        var panelHeaderHeight = this.$panelHeader.outerHeight(true),
            panelHeaderPadding = parseInt(this.$panelHeader.css('padding-left')) + parseInt(this.$panelHeader.css('padding-right')),
            panelBodyPadding = parseInt(this.$panelBody.css('padding-left')) + parseInt(this.$panelBody.css('padding-right')),
            panelBodyPaddingV = parseInt(this.$panelBody.css('padding-top')) + parseInt(this.$panelBody.css('padding-bottom')),
            panelBorder = parseInt(this.$_el.css('border-left-width')) + parseInt(this.$_el.css('border-right-width')),
            panelMargin = parseInt(this.$_el.css('margin-top')) + parseInt(this.$_el.css('margin-bottom'));

        w -= panelBorder;
        h -= panelMargin;

        this.$_el.width(w).height(h);
        this.$panelHeader.width(w - panelHeaderPadding);
        this.$panelBody.width(w - panelBodyPadding).height(h - panelHeaderHeight - panelBodyPaddingV);

        //get panel-body's offset
        this.offset = this.$el.offset();

        this.size = {"width": w - panelBodyPadding,
                    "height": h - panelHeaderHeight - panelBodyPaddingV};
    };
    /************** END OF --- CUSTOM RESIZE HANDLER *****************/


    /************** CUSTOM READ-ONLY CHANGED HANDLER *****************/
    PanelBaseWithHeader.prototype._onReadOnlyChanged = function (isReadOnly) {
        if (isReadOnly === true) {
            this.$_el.addClass(PanelBase.READ_ONLY_CLASS);
        } else {
            this.$_el.removeClass(PanelBase.READ_ONLY_CLASS);
        }

        //in DEBUG mode set Read-only button's toggle status accordingly
        if (this.$readOnlyBtn) {
            this.$readOnlyBtn.setToggled(isReadOnly);
        }
    };
    /************** END OF --- CUSTOM READ-ONLY CHANGED HANDLER *****************/

    return PanelBaseWithHeader;
});