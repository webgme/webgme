/*globals define, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github/rkereskenyi
 */

define([
    'js/Constants',
    'js/Utils/DisplayFormat',
    'js/RegistryKeys',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants'
], function (CONSTANTS, displayFormat, RegistryKeys, DiagramDesignerWidgetConstants) {

    'use strict';

    var SVGPort,
        SVG_DIR = CONSTANTS.ASSETS_DECORATOR_SVG_FOLDER,
        DEFAULT_SVG_PORT_ICON = 'Port.svg';


    SVGPort = function (params) {
        this._id = params.id;
        this._logger = params.logger;
        this._client = params.client;
        this._decorator = params.decorator;

        this._initialize();
    };

    SVGPort.prototype.destroy = function () {
        this.hideConnectors();
        //finally remove itself from DOM
        if (this.$el) {
            this.$el.remove();
            this.$el.empty();
        }
    };

    SVGPort.prototype._initialize = function () {
        this.$el = $('<div/>', {class: 'port'});
        this.$title = $('<div/>', {class: 'title'});
        this.$icon = $('<div/>', {class: 'icon'});
        this.$connector = $('<div/>', {class: DiagramDesignerWidgetConstants.CONNECTOR_CLASS});

        this.$imgIcon = $('<img/>');
        this.$icon.append(this.$imgIcon);

        this.$el.append(this.$icon).append(this.$title).append(this.$connector);

        if (this._decorator._displayConnectors === true) {
            if (this._decorator.hostDesignerItem) {
                this._decorator.hostDesignerItem.registerConnectors(this.$connector, this._id);
            }
            this.hideConnectors();
        } else {
            this.$connector.remove();
        }
    };

    SVGPort.prototype.update = function () {
        this._updateCoordinates();
        this._updateTitle();
        this._updateIcon();
    };

    SVGPort.prototype._updateCoordinates = function () {
        var portNode = this._client.getNode(this._id);

        this.positionX = parseInt(portNode.getRegistry(RegistryKeys.POSITION).x, 10);
        this.positionY = parseInt(portNode.getRegistry(RegistryKeys.POSITION).y, 10);
    };

    SVGPort.prototype._updateTitle = function () {
        var portNode = this._client.getNode(this._id),
            formattedPortTitle = displayFormat.resolve(portNode);

        this.$title.text(formattedPortTitle);
        this.$title.attr('title', formattedPortTitle);
    };

    SVGPort.prototype._updateIcon = function () {
        var portNode = this._client.getNode(this._id),
            portIconUrl = portNode.getRegistry(RegistryKeys.PORT_SVG_ICON);

        if (!portIconUrl || portIconUrl === '') {
            portIconUrl = SVG_DIR + DEFAULT_SVG_PORT_ICON;
        } else {
            portIconUrl = SVG_DIR + portIconUrl;
        }

        this.$imgIcon.attr('src', portIconUrl);
    };

    SVGPort.prototype.updateOrientation = function (isLeft) {
        this.isLeft = isLeft;
    };

    SVGPort.prototype.updateTop = function (top) {
        this.$el.css('top', top);
        this.top = top;
    };

    //Shows the 'connectors' - appends them to the DOM
    SVGPort.prototype.showConnectors = function () {
        this.$connector.show();
    };

    //Hides the 'connectors' - detaches them from the DOM
    SVGPort.prototype.hideConnectors = function () {
        this.$connector.hide();
    };


    return SVGPort;
});
