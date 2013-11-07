/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['js/PanelBase/PanelBase',
    'css!/css/Panels/SplitPanel/SplitPanel'], function (PanelBase) {

    var SplitPanel,
        SPLIT_PANEL_CLASS = 'split-panel',
        PANEL1_CLASS = "p1",
        PANEL2_CLASS = "p2",
        SPLITTER_CLASS = "splitter",
        SPLITTER_SIZE = 4,
        VERTICAL_CLASS = "vertical",
        HORIZONTAL_CLASS = "horizontal";

    SplitPanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBase.OPTIONS.LOGGER_INSTANCE_NAME] = "SplitPanel";

        //call parent's constructor
        PanelBase.apply(this, [options]);

        this._panel1 = undefined;
        this._panel2 = undefined;

        //initialize UI
        this._initialize();

        this.logger.debug("SplitPanel ctor finished");
    };

    //inherit from PanelBaseWithHeader
    _.extend(SplitPanel.prototype, PanelBase.prototype);

    SplitPanel.prototype.onResize = function (width, height) {
        this.logger.debug('onResize --> width: ' + width + ', height: ' + height);

        this._width = width;
        this._height = height;

        this.$el.width(this._width);
        this.$el.height(this._height);

        this._updateUI();
    };

    SplitPanel.prototype._initialize = function () {
        var self = this;

        this.$el.addClass(SPLIT_PANEL_CLASS);

        this._panel1Container = $('<div/>', {'class': PANEL1_CLASS});
        this.$el.append(this._panel1Container);

        this._splitter = $('<div/>', {'class': SPLITTER_CLASS});
        this.$el.append(this._splitter);

        this._panel2Container = $('<div/>', {'class': PANEL2_CLASS});
        this.$el.append(this._panel2Container);

        this._panel1Container.on('mousedown', function (event) {
            self._setActivePanel(0);
            event.stopPropagation();
        });

        this._panel2Container.on('mousedown', function (event) {
            self._setActivePanel(1);
            event.stopPropagation();
        });

        this._updateUI();
    };

    SplitPanel.prototype._updateUI = function () {
        var verticalSplit = this._width > this._height,
            w = this._width,
            h = this._height,
            sw = SPLITTER_SIZE,
            sh = SPLITTER_SIZE,
            p1_top = 0,
            p1_left = 0,
            splitter_top = 0,
            splitter_left = 0,
            p2_top = 0,
            p2_left = 0,
            has2Panels = this._panel2 !== undefined;

        if (has2Panels) {
            this._splitter.show();
            this._panel2Container.show();
            this._splitter.removeClass([VERTICAL_CLASS, HORIZONTAL_CLASS].join(' '));
        } else {
            this._splitter.hide();
            this._panel2Container.hide();
        }

        if (has2Panels) {
            if (verticalSplit) {
                sh = this._height;
                w = Math.floor((this._width - sw) / 2);
                if (w * 2 + sw !== this._width) {
                    sw = this._width - 2 * w;
                }
                this._splitter.addClass(VERTICAL_CLASS);
                p1_left = 0;
                splitter_left = w;
                p2_left = w + sw;
            } else {
                sw = this._width;
                h = Math.floor((this._height - sh) / 2);
                if (h * 2 + sh !== this._height) {
                    sh = this._height - 2 * h;
                }
                this._splitter.addClass(HORIZONTAL_CLASS);
                p1_top = 0;
                splitter_top = h;
                p2_top = h + sh;
            }

            this._splitter.css({'width': sw,
                'height': sh,
                'top': splitter_top,
                'left': splitter_left});

            this._panel1Container.css({'width': w,
                'height': h,
                'top': p1_top,
                'left': p1_left});

            this._panel2Container.css({'width': w,
                'height': h,
                'top': p2_top,
                'left': p2_left});

            if (this._panel1) {
                this._panel1.setSize(w, h);
            }

            if (this._panel2) {
                this._panel2.setSize(w, h);
            }
        } else {
            this._panel1Container.css({'width': w,
                'height': h,
                'top': p1_top,
                'left': p1_left});

            if (this._panel1) {
                this._panel1.setSize(w, h);
            }
        }
    };

    SplitPanel.prototype.setPanel = function (panel, container) {
        if (container === 'p1') {
            this._panel1Container.empty();
            this._panel1 = panel;
            this._panel1Container.append(this._panel1.$pEl);
            this._panel1.afterAppend();
            this._setActivePanel(0);
        } else {
            this._panel2Container.empty();
            this._panel2 = panel;
            this._panel2Container.append(this._panel2.$pEl);
            this._panel2.afterAppend();
            this._setActivePanel(1);
        }

        this._updateUI();
    };

    SplitPanel.prototype.deletePanel = function (container) {
        if (container === 'p1') {
            this._panel1Container.empty();
            this._panel1 = undefined;
            this._setActivePanel(1);
        } else {
            this._panel2Container.empty();
            this._panel2 = undefined;
            this._setActivePanel(0);
        }

        this._updateUI();
    };

    /* OVERRIDE FROM WIDGET-WITH-HEADER */
    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    SplitPanel.prototype.onReadOnlyChanged = function (isReadOnly) {
        //apply parent's onReadOnlyChanged
        PanelBase.prototype.onReadOnlyChanged.call(this, isReadOnly);

        if (this._panel1) {
            this._panel1.onReadOnlyChanged(isReadOnly);
        }

        if (this._panel2) {
            this._panel2.onReadOnlyChanged(isReadOnly);
        }
    };

    SplitPanel.prototype._setActivePanel = function (p) {
        //if (this._panel1 && this._panel2) {
            if (p === 0) {
                WebGMEGlobal.PanelManager.setActivePanel(this._panel1);
            }

            if (p === 1) {
                WebGMEGlobal.PanelManager.setActivePanel(this._panel2);
            }
        //}
    };

    return SplitPanel;
});

