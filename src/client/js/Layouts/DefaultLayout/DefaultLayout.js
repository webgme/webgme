/*globals define, DEBUG, WebGMEGlobal, $ */
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define(['jquery-layout',
        'js/logger',
        'js/Utils/ComponentSettings',
        'text!./templates/DefaultLayout.html',
        'text!./DefaultLayoutConfig.json'
], function (_jQueryLayout,
             Logger,
             ComponentSettings,
             defaultLayoutTemplate,
             DefaultLayoutConfigJSON) {

    'use strict';

    var DefaultLayout,
        SPACING_OPEN_TOUCH = 10,
        SPACING_CLOSED_TOUCH = 10,
        SPACING_OPEN_DESKTOP = 3,
        SPACING_CLOSED_DESKTOP = 6,
        SPACING_OPEN = WebGMEGlobal.SUPPORTS_TOUCH ? SPACING_OPEN_TOUCH : SPACING_OPEN_DESKTOP,
        SPACING_CLOSED = WebGMEGlobal.SUPPORTS_TOUCH ? SPACING_CLOSED_TOUCH : SPACING_CLOSED_DESKTOP,
        SIDE_PANEL_WIDTH = 202;

    DefaultLayout = function (params) {
        this._logger = (params && params.logger) || Logger.create('gme:Layouts:DefaultLayout',
            WebGMEGlobal.gmeConfig.client.log);

        this._config = DefaultLayout.getDefaultConfig();
        ComponentSettings.resolveWithWebGMEGlobal(this._config, DefaultLayout.getComponentId());
        this._logger.debug('Resolved component-settings', this._config);

        this.panels = (params && params.panels) || this._config.panels;
        this._template = (params && params.template) || defaultLayoutTemplate;
    };

    DefaultLayout.getComponentId = function () {
        return 'GenericUIDefaultLayout';
    };

    DefaultLayout.getDefaultConfig = function () {
        return JSON.parse(DefaultLayoutConfigJSON);
    };

    DefaultLayout.prototype.init = function () {
        var self = this;

        this._body = $('body');
        this._body.html(this._template);

        this._westPanel = this._body.find('div.ui-layout-west');
        this._centerPanel = this._body.find('div.ui-layout-center');
        this._eastPanel = this._body.find('div.ui-layout-east');

        this._headerPanel = this._body.find('div.ui-layout-north');
        this._footerPanel = this._body.find('div.ui-layout-south');

        this._eastPanels = [];
        this._westPanels = [];
        this._centerPanels = [];

        this._body.layout({
            defaults: {},

            north: {
                closable: false,
                resizable: false,
                slidable: false,
                spacing_open: 0, //jshint ignore: line
                size: 64
            },
            south: {
                closable: false,
                resizable: false,
                slidable: false,
                spacing_open: 0, //jshint ignore: line
                size: 27        //has to match footer CSS settings (height + border)
            },
            east: {
                size: SIDE_PANEL_WIDTH,
                minSize: SIDE_PANEL_WIDTH,
                resizable: true,
                slidable: false,
                spacing_open: SPACING_OPEN, //jshint ignore: line
                spacing_closed: SPACING_CLOSED, //jshint ignore: line
                onresize: function (/*paneName, paneElement, paneState, paneOptions, layoutName*/) {
                    self._onEastResize();
                }
            }, west: {
                size: SIDE_PANEL_WIDTH,
                minSize: SIDE_PANEL_WIDTH,
                showOverflowOnHover:true,
                resizable: true,
                slidable: false,
                spacing_open: SPACING_OPEN, //jshint ignore: line
                spacing_closed: SPACING_CLOSED, //jshint ignore: line
                onresize: function (/*paneName, paneElement, paneState, paneOptions, layoutName*/) {
                    self._onWestResize();
                }
            },
            center: {
                onresize: function (/*paneName, paneElement, paneState, paneOptions, layoutName*/) {
                    self._onCenterResize();
                }
            }
        });
    };

    DefaultLayout.prototype.addToContainer = function (panel, container) {
        if (container === 'header') {
            this._headerPanel.append(panel.$pEl);
        } else if (container === 'footer') {
            this._footerPanel.append(panel.$pEl);
        } else if (container === 'west') {
            this._westPanel.append(panel.$pEl);
            this._westPanels.push(panel);
            this._onWestResize();
            return this._onWestResize;
        } else if (container === 'east') {
            this._eastPanel.append(panel.$pEl);
            this._eastPanels.push(panel);
            this._onEastResize();
            return this._onEastResize;
        } else if (container === 'center') {
            this._centerPanel.append(panel.$pEl);
            this._centerPanels.push(panel);
            this._onCenterResize();
            return this._onCenterResize;
        }
    };

    DefaultLayout.prototype.remove = function (panel) {
        var idx;

        //check it in the east pane
        idx = this._eastPanels.indexOf(panel);

        //check it in the west pane if not found in east
        if (idx === -1) {
            idx = this._westPanels.indexOf(panel);

            //check it in the center pane if not found in west
            if (idx === -1) {
                idx = this._centerPanels.indexOf(panel);

                if (idx === -1) {
                    this._logger.warn('Panel to be removed not found');
                } else {
                    this._centerPanels.splice(idx, 1);
                    this._onCenterResize();
                }
            } else {
                this._westPanels.splice(idx, 1);
            }
        } else {
            this._eastPanels.splice(idx, 1);
            this._onEastResize();
        }
    };

    DefaultLayout.prototype.destroy = function () {
        this._body.empty();
    };

    DefaultLayout.prototype._onCenterResize = function () {
        var len = this._centerPanels.length,
            w = this._centerPanel.width(),
            h = this._centerPanel.height(),
            pHeight = Math.floor(h / len),
            i;

        for (i = 0; i < len; i += 1) {
            this._centerPanels[i].setSize(w, pHeight);
        }
    };

    DefaultLayout.prototype._onEastResize = function () {
        var len = this._eastPanels.length,
            w = this._eastPanel.width(),
            h = this._eastPanel.height(),
            pHeight = Math.floor(h / len),
            i;

        for (i = 0; i < len; i += 1) {
            this._eastPanels[i].setSize(w, pHeight);
        }
    };

    DefaultLayout.prototype._onWestResize = function () {
        var len = this._westPanels.length,
            w = this._westPanel.width(),
            h = this._westPanel.height(),
            h0;

        //TODO: fix this
        //second widget takes all the available space
        if (len === 2) {
            h0 = this._westPanels[0].$pEl.outerHeight(true);
            this._westPanels[1].setSize(w, h - h0);
        }
    };

    return DefaultLayout;
});