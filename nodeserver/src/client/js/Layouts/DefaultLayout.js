"use strict";

define([ 'lib/jquery/' + (__WebGME__DEBUG ? 'jquery.layout' : 'jquery.layout.min'),
    'logManager',
    'text!html/Layouts/Default/DefaultLayout.html',
    'css!/css/jquery.layout',
    'css!/css/jquery.layout.webgme'], function (_jQueryLayout,
                             logManager,
                             defaultLayoutTemplate) {

    var DefaultLayout,
        SPACING_OPEN_TOUCH = 10,
        SPACING_CLOSED_TOUCH = 10,
        SPACING_OPEN_DESKTOP = 3,
        SPACING_CLOSED_DESKTOP = 6,
        SPACING_OPEN = SUPPORTS_TOUCH ? SPACING_OPEN_TOUCH : SPACING_OPEN_DESKTOP,
        SPACING_CLOSED = SUPPORTS_TOUCH ? SPACING_CLOSED_TOUCH : SPACING_CLOSED_DESKTOP;

    DefaultLayout = function () {
    };

    DefaultLayout.prototype.init = function () {
        var self = this;

        this._body = $('body');
        this._body.html(defaultLayoutTemplate);

        this._leftPanel = this._body.find('div.ui-layout-west');
        this._mainPanel = this._body.find('div.ui-layout-center');
        this._rightPanel = this._body.find('div.ui-layout-east');

        this._headerPanel = this._body.find('div.ui-layout-north div.project-info');
        this._footerPanel = this._body.find('div.ui-layout-south > div.navbar-inner');

        this._rightPanels = [];
        this._leftPanels = [];
        this._centerPanels = [];

        this._body.layout({
            defaults: {
            }
            ,  north: {
                closable :false,
                resizable: false,
                slidable: false,
                spacing_open: 0
            }
            ,  south: {
                closable :false,
                resizable: false,
                slidable: false,
                spacing_open: 0
            }
            ,  east: {
                size: 202,
                resizable: false,
                slidable: false,
                spacing_open: SPACING_OPEN,
                spacing_closed: SPACING_CLOSED,
                onresize : function (/*paneName, paneElement, paneState, paneOptions, layoutName*/) {
                    self._onEastResize();
                }
            }
            ,  west: {
                size: 202,
                resizable: false,
                slidable: false,
                spacing_open: SPACING_OPEN,
                spacing_closed: SPACING_CLOSED
            },
            center : {
                onresize : function (/*paneName, paneElement, paneState, paneOptions, layoutName*/) {
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
        } else if (container === 'left') {
            this._leftPanel.append(panel.$pEl);
            this._leftPanels.push(panel);
        } else if (container === 'right') {
            this._rightPanel.append(panel.$pEl);
            this._rightPanels.push(panel);
            this._onEastResize();
        } else if (container === 'main') {
            this._mainPanel.append(panel.$pEl);
        }
    };

    DefaultLayout.prototype.getMainPanelContainer = function () {
        return this._mainPanel;
    };

    DefaultLayout.prototype.destroy = function () {

    };

    DefaultLayout.prototype._onCenterResize = function () {
        var w = this._mainPanel.width(),
            h = this._mainPanel.height();

        if (this.onCenterResize) {
            this.onCenterResize(w, h);
        }
    };

    DefaultLayout.prototype._onEastResize = function () {
        var len = this._rightPanels.length,
            w = this._rightPanel.width(),
            h = this._rightPanel.height(),
            pHeight = Math.floor(h / len),
            i;

        for (i = 0; i < len; i += 1) {
            this._rightPanels[i].setSize(w, pHeight);
        }
    };

    return DefaultLayout;
});