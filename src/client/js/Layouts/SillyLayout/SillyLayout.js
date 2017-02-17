/*globals define, DEBUG, WebGMEGlobal, $ */
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define(['jquery-layout',
        'js/logger',
        'js/Utils/ComponentSettings',
        'text!./templates/SillyLayout.html',
        'text!./SillyLayoutConfig.json'
], function (_jQueryLayout,
             Logger,
             ComponentSettings,
             defaultLayoutTemplate,
             SillyLayoutConfigJSON) {

    'use strict';

    var SillyLayout;

    SillyLayout = function (params) {
        this._logger = (params && params.logger) || Logger.create('gme:Layouts:SillyLayout',
            WebGMEGlobal.gmeConfig.client.log);

        this._config = SillyLayout.getDefaultConfig();
        ComponentSettings.resolveWithWebGMEGlobal(this._config, SillyLayout.getComponentId());
        this._logger.debug('Resolved component-settings', this._config);

        this.panels = (params && params.panels) || this._config.panels;
        this._template = (params && params.template) || defaultLayoutTemplate;
    };

    SillyLayout.getComponentId = function () {
        return 'GenericUISillyLayout';
    };

    SillyLayout.getDefaultConfig = function () {
        return JSON.parse(SillyLayoutConfigJSON);
    };

    SillyLayout.prototype.init = function () {
        var self = this;

        this._body = $('body');
        this._body.html(this._template);

        this._centerPanel = this._body.find('div.ui-layout-center');

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
            center: {
                onresize: function (/*paneName, paneElement, paneState, paneOptions, layoutName*/) {
                    self._onCenterResize();
                }
            }
        });
    };

    SillyLayout.prototype.addToContainer = function (panel, container) {
        if (container === 'header') {
            this._headerPanel.append(panel.$pEl);
        } else if (container === 'footer') {
            this._footerPanel.append(panel.$pEl);
        } else if (container === 'center') {
            this._centerPanel.append(panel.$pEl);
            this._centerPanels.push(panel);
            this._onCenterResize();
            return this._onCenterResize;
        }
    };

    SillyLayout.prototype.remove = function (panel) {
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

    SillyLayout.prototype.destroy = function () {
        this._body.empty();
    };

    SillyLayout.prototype._onCenterResize = function () {
        var len = this._centerPanels.length,
            w = this._centerPanel.width(),
            h = this._centerPanel.height(),
            pHeight = Math.floor(h / len),
            i;

        for (i = 0; i < len; i += 1) {
            this._centerPanels[i].setSize(w, pHeight);
        }
    };

    SillyLayout.prototype._onEastResize = function () {
        var len = this._eastPanels.length,
            w = this._eastPanel.width(),
            h = this._eastPanel.height(),
            pHeight = Math.floor(h / len),
            i;

        for (i = 0; i < len; i += 1) {
            this._eastPanels[i].setSize(w, pHeight);
        }
    };

    SillyLayout.prototype._onWestResize = function () {
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

    return SillyLayout;
});