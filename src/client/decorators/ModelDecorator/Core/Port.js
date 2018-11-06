/*globals define, WebGMEGlobal, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/logger',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
    'js/Constants'
], function (Logger, DiagramDesignerWidgetConstants, CONSTANTS) {

    'use strict';

    var Port,
        PORT_CONNECTOR_LEN = 20,
        PORT_DOM_HEIGHT = 15,
        PORT_TITLE_WRAPPER_WITH_ICON_CLASS = 'w-icon',
        PORT_DOT_WIDTH = 3,
        PORT_ICON_WIDTH = 5;   //_Port.scss: $svg-icon-width: 5px;

    Port = function (id, options) {
        this.id = id;

        this.title = options.title || '';
        this.icon = options.svg || '';
        this.orientation = undefined;
        this.position = {};
        this.skinParts = [];
        this.connectionArea = {
            x1: 0,
            y1: 0,
            x2: 0,
            y2: 0,
            angle1: 0,
            angle2: 0,
            len: PORT_CONNECTOR_LEN
        };

        this.decorator = options.decorator;

        //get logger instance for this component
        //some comment here
        this.logger = Logger.create('gme:decorators:ModelDecorator:Core:Port_' + this.id,
            WebGMEGlobal.gmeConfig.client.log);
        this.logger.debug('Created');
    };

    Port.prototype._DOMPortBase = $('<div  id="__ID__" class="port" data-id="__ID__"></div>');
    Port.prototype._DOMTitleWrapper = $('<div class="title-wrapper"><span class="title">__NAME__</span></div>');
    Port.prototype._DOMDot = $('<span class="dot"></span>');
    Port.prototype._DOMConnector = $('<div class="connector"></div>');
    Port.prototype._DOMSVGIcon = $('<img class="svg-icon"/>');

    Port.prototype._DOMBaseLeftTemplate = Port.prototype._DOMPortBase.clone().append(Port.prototype._DOMDot.clone())
        .append(Port.prototype._DOMConnector.clone()).append(Port.prototype._DOMSVGIcon.clone())
        .append(Port.prototype._DOMTitleWrapper.clone());

    Port.prototype._DOMBaseRightTemplate = Port.prototype._DOMPortBase.clone()
        .append(Port.prototype._DOMTitleWrapper.clone()).append(Port.prototype._DOMSVGIcon.clone())
        .append(Port.prototype._DOMDot.clone()).append(Port.prototype._DOMConnector.clone());

    Port.prototype._DOMBaseTopBottomTemplate = Port.prototype._DOMPortBase.clone()
        .append(Port.prototype._DOMSVGIcon.clone())
        .append(Port.prototype._DOMDot.clone())
        .append(Port.prototype._DOMConnector.clone());

    Port.prototype._initialize = function () {
        var concretePortTemplate;

        switch (this.orientation) {
            case 'W':
                concretePortTemplate = this._DOMBaseLeftTemplate;
                break;
            case 'S':
            case 'N':
                concretePortTemplate = this._DOMBaseTopBottomTemplate;
                break;
            default:
                concretePortTemplate = this._DOMBaseRightTemplate;
                break;
        }

        this.$el = concretePortTemplate.clone();
        this.$el.attr({
            id: this.id,
            'data-id': this.id,
            title: this.title
        });

        this.$portTitle = this.$el.find('.title');
        this._updateTitle();

        this.$portTitleWrapper = this.$el.find('.title-wrapper');

        this.$portIcon = this.$el.find('.svg-icon');
        this._updateIcon();

        this.$connectors = this.$el.find('.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS);

        this.$portDot = this.$el.find('.dot');

        if (this.decorator._displayConnectors === true) {
            if (this.decorator.hostDesignerItem) {
                this.decorator.hostDesignerItem.registerConnectors(this.$connectors, this.id);
            }
            this.hideConnectors();
        } else {
            this.$connectors.remove();
        }
    };

    Port.prototype.update = function (options) {
        this.title = options.title || '';
        this.icon = options.svg || '';
        this._updateTitle();
        this._updateIcon();
    };

    Port.prototype._updateTitle = function () {
        this.$portTitle.text(this.title);
        this.$el.attr({title: this.title});
    };

    Port.prototype._updateIcon = function () {
        if (this.icon) {
            this.$portIcon.attr('src', this.icon);
            this.$portIcon.show();
            this.$el.addClass(PORT_TITLE_WRAPPER_WITH_ICON_CLASS);
        } else {
            this.$portIcon.hide();
            this.$el.removeClass(PORT_TITLE_WRAPPER_WITH_ICON_CLASS);
        }
    };

    Port.prototype.updateOrPos = function (or, pos) {
        var changed = false;

        if (this.position.x !== pos.x) {
            this.position.x = pos.x;
            changed = true;
        }

        if (this.position.y !== pos.y) {
            this.position.y = pos.y;
            changed = true;
        }


        if (this.orientation !== or) {
            this.orientation = or;
            changed = true;

            if (!this.$el) {
                this._initialize();
            } else {
                //port's DOM has to be reformatted

                //detach elements and re-append them in a different place
                this.$connectors.detach();
                this.$portDot.detach();

                if (this.orientation === 'E') {
                    //now it has EAST orientation
                    this.$el.append(this.$portDot).append(this.$connectors);
                } else {
                    //now it has WEST orientation
                    this.$el.prepend(this.$connectors).prepend(this.$portDot);
                }

                if (this.decorator._displayConnectors !== true) {
                    this.$connectors.remove();
                }
            }
        }

        return changed;
    };

    Port.prototype.destroy = function () {
        //finally remove itself from DOM
        if (this.$el) {
            this.$el.remove();
            this.$el.empty();
        }
    };

    //Shows the 'connectors' - appends them to the DOM
    Port.prototype.showConnectors = function () {
        this.$connectors.show();
    };

    //Hides the 'connectors' - detaches them from the DOM
    Port.prototype.hideConnectors = function () {
        this.$connectors.hide();
    };


    Port.prototype.getConnectorArea = function () {
        var allPorts = this.$el.parent().children(),
            len = allPorts.length,
            xShift,
            i;

        if (this.orientation === 'N' || this.orientation === 'S') {
            // Ports are centered in the middle so we need to determine the "shift" depending on how many
            // ports there are.
            // HEIGHT is width for N/S ports..
            xShift = Math.floor(this.decorator.hostDesignerItem.getWidth() / 2);
            if (len % 2 === 0) {
                xShift -= (((len / 2) - 1) * PORT_DOM_HEIGHT + Math.floor(PORT_DOM_HEIGHT / 2));
            } else {
                xShift -= ((len - 1) / 2) * PORT_DOM_HEIGHT;
            }
        }

        for (i = 0; i < len; i += 1) {
            if (allPorts[i] === this.$el[0]) {
                break;
            }
        }

        switch (this.orientation) {
            case 'N':

                this.connectionArea.y1 = this.connectionArea.y2 = - PORT_DOM_HEIGHT - 6;
                this.connectionArea.x1 = this.connectionArea.x2 = xShift + i * PORT_DOM_HEIGHT;
                this.connectionArea.angle1 = this.connectionArea.angle2 = 270;
                break;
            case 'S':
                this.connectionArea.y1 = this.decorator.hostDesignerItem.getHeight() - PORT_DOM_HEIGHT;
                this.connectionArea.y2 = this.connectionArea.y1;
                this.connectionArea.x1 = this.connectionArea.x2 = xShift + i * PORT_DOM_HEIGHT;
                this.connectionArea.angle1 = this.connectionArea.angle2 = 90;
                break;
            case 'W':
                if (this.icon) {
                    this.connectionArea.x1 = 1 - PORT_ICON_WIDTH;
                } else {
                    this.connectionArea.x1 = 1 - PORT_DOT_WIDTH;
                }

                this.connectionArea.y1 = i * PORT_DOM_HEIGHT + 9;

                this.connectionArea.x2 = this.connectionArea.x1;
                this.connectionArea.y2 = this.connectionArea.y1;

                this.connectionArea.angle1 = this.connectionArea.angle2 = 180;
                break;
            default: // case E
                if (this.icon) {
                    this.connectionArea.x1 = this.decorator.hostDesignerItem.getWidth() + PORT_ICON_WIDTH  - 1;
                } else {
                    this.connectionArea.x1 = this.decorator.hostDesignerItem.getWidth() + PORT_DOT_WIDTH  - 1;
                }

                this.connectionArea.y1 = i * PORT_DOM_HEIGHT + 9;

                this.connectionArea.x2 = this.connectionArea.x1;
                this.connectionArea.y2 = this.connectionArea.y1;

                this.connectionArea.angle1 = this.connectionArea.angle2 = 0;
                break;
        }

        return this.connectionArea;
    };

    return Port;
});