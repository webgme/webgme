/*globals define, _, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/Constants',
    'js/NodePropertyNames',
    'js/RegistryKeys',
    'js/Loader/LoaderProgressBar',
    './Port',
    './ModelDecorator.Constants',
    'js/Decorators/DecoratorWithPortsAndPointerHelpers.Base',
    'js/Utils/DisplayFormat',
    'js/Utils/GMEConcepts',
], function (CONSTANTS,
             nodePropertyNames,
             REGISTRY_KEYS,
             LoaderProgressBar,
             Port,
             ModelDecoratorConstants,
             DecoratorWithPortsAndPointerHelpers,
             displayFormat,
             GMEConcepts) {

    'use strict';

    var ModelDecoratorCore,
        ABSTRACT_CLASS = 'abstract',
        EMBEDDED_SVG_CLASS = 'embeddedsvg',
        CONNECTION_TYPE_CLASS = 'conn-type',
        CONN_TYPE_BASE = $('<div/>', {class: CONNECTION_TYPE_CLASS}),
        EMBEDDED_SVG_IMG_BASE = $('<img>', {class: EMBEDDED_SVG_CLASS});

    ModelDecoratorCore = function (params) {
        DecoratorWithPortsAndPointerHelpers.apply(this, []);

        if (params && params.aspect) {
            this._aspect = params.aspect;
        }
    };

    _.extend(ModelDecoratorCore.prototype, DecoratorWithPortsAndPointerHelpers.prototype);

    ModelDecoratorCore.prototype._initializeVariables = function (params) {
        this.name = '';
        this.formattedName = '';
        this.portIDs = [];
        this.ports = {};
        this.skinParts = {
            $name: undefined,
            $portsContainer: undefined,
            $portsContainerLeft: undefined,
            $portsContainerRight: undefined,
            $portsContainerCenter: undefined,
            $ptr: undefined,
            $imgSVG: undefined,
            $replaceable: undefined
        };

        this._displayConnectors = false;
        if (params && params.connectors) {
            this._displayConnectors = params.connectors;
        }
    };

    /**** Override from *.WidgetDecoratorBase ****/
    ModelDecoratorCore.prototype.destroy = function () {
        var len = this.portIDs.length;
        while (len--) {
            this.unregisterPortIdForNotification(this.portIDs[len]);
            this.removePort(this.portIDs[len]);
        }
    };

    /**** Override from *.WidgetDecoratorBase ****/
    ModelDecoratorCore.prototype.doSearch = function (searchDesc) {
        var searchText = searchDesc.toString().toLowerCase();

        return (this.formattedName && this.formattedName.toLowerCase().indexOf(searchText) !== -1);
    };

    ModelDecoratorCore.prototype._renderContent = function () {
        //render GME-ID in the DOM, for debugging
        this.$el.attr({'data-id': this._metaInfo[CONSTANTS.GME_ID]});

        /* BUILD UI*/
        //find placeholders
        this.skinParts.$name = this.$el.find('.name');
        this.skinParts.$portsContainer = this.$el.find('.ports');
        this.skinParts.$portsContainerLeft = this.skinParts.$portsContainer.find('.left');
        this.skinParts.$portsContainerRight = this.skinParts.$portsContainer.find('.right');
        this.skinParts.$portsContainerCenter = this.skinParts.$portsContainer.find('.center');

        this._update();
    };

    ModelDecoratorCore.prototype._update = function () {
        this._updateColors();
        this._updateName();
        this._updatePorts();
        this._updatePointers();
        this._updateAbstract();
        this._updateSVG();
        this._updateConnectionType();
        this._updateIsReplaceable();
    };

    ModelDecoratorCore.prototype._updateColors = function () {
        this._getNodeColorsFromRegistry();

        if (this.fillColor) {
            this.$el.css({'background-color': this.fillColor});
        } else {
            this.$el.css({'background-color': ''});
        }

        if (this.borderColor) {
            this.$el.css({
                'border-color': this.borderColor,
                'box-shadow': '0px 0px 7px 0px ' + this.borderColor + ' inset'
            });
            this.skinParts.$name.css({'border-color': this.borderColor});
        } else {
            this.$el.css({
                'border-color': '',
                'box-shadow': ''
            });
            this.skinParts.$name.css({'border-color': ''});
        }

        if (this.textColor) {
            this.$el.css({color: this.textColor});
        } else {
            this.$el.css({color: ''});
        }
    };

    ModelDecoratorCore.prototype._getNodeColorsFromRegistry = function () {
        var objID = this._metaInfo[CONSTANTS.GME_ID];
        this.fillColor = this.preferencesHelper.getRegistry(objID, REGISTRY_KEYS.COLOR, true);
        this.borderColor = this.preferencesHelper.getRegistry(objID, REGISTRY_KEYS.BORDER_COLOR, true);
        this.textColor = this.preferencesHelper.getRegistry(objID, REGISTRY_KEYS.TEXT_COLOR, true);
    };

    /***** UPDATE THE NAME OF THE NODE *****/
    ModelDecoratorCore.prototype._updateName = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            noName = '(N/A)';

        if (nodeObj) {
            //this.name = nodeObj.getAttribute(nodePropertyNames.Attributes.name);
            this.name = nodeObj.getFullyQualifiedName();
            this.formattedName = displayFormat.resolve(nodeObj);
        } else {
            this.name = '';
            this.formattedName = noName;
        }

        this.skinParts.$name.text(this.formattedName);
        this.skinParts.$name.attr('title', this.formattedName);
    };

    ModelDecoratorCore.prototype._updateConnectionType = function () {
        var isConnectionType = GMEConcepts.isConnectionType(this._metaInfo[CONSTANTS.GME_ID]);

        this.skinParts.$name.text(this.formattedName);
        this.skinParts.$name.attr('title', this.formattedName);
        if (isConnectionType) {
            if (!this.skinParts.$divConnType) {
                this.skinParts.$divConnType = CONN_TYPE_BASE.clone();
                this.skinParts.$divConnType.insertAfter(this.skinParts.$name);
                this.skinParts.$divConnType.text('<< Connection >>');
            }
        } else {
            if (this.skinParts.$divConnType) {
                this.skinParts.$divConnType.remove();
                delete this.skinParts.$divConnType;
            }
        }
    };

    /***** UPDATE THE PORTS OF THE NODE *****/
    ModelDecoratorCore.prototype._updatePorts = function () {
        this.updatePortIDList();

        this._checkTerritoryReady();
    };

    ModelDecoratorCore.prototype.renderPort = function (portId) {
        var client = this._control._client,
            portNode = client.getNode(portId),
            portTitle = displayFormat.resolve(portNode),
            portInstance = new Port(portId, {
                title: portTitle,
                decorator: this,
                svg: portNode.getRegistry(REGISTRY_KEYS.PORT_SVG_ICON)
            });

        this._addPortToContainer(portNode, portInstance);

        return portInstance;
    };

    ModelDecoratorCore.prototype._addPortToContainer = function (portNode, portInstance) {
        var portId = portNode.getId(),
            portOrientation = 'W',
            portContainer = this.skinParts.$portsContainerLeft,
            portPosition = portNode.getRegistry(REGISTRY_KEYS.POSITION) || {x: 0, y: 0},
            portToAppendBefore = null,
            i,
            changed;

        //check if the port should be on the left or right-side
        if (portPosition.x > 300) {
            portOrientation = 'E';
            portContainer = this.skinParts.$portsContainerRight;
        }

        changed = portInstance.updateOrPos(portOrientation, portPosition);

        //find its correct position
        for (i in this.ports) {
            if (this.ports.hasOwnProperty(i)) {
                if (i !== portId) {
                    if (this.ports[i].orientation === portInstance.orientation) {
                        if ((portInstance.position.y < this.ports[i].position.y) ||
                            ((portInstance.position.y === this.ports[i].position.y) &&
                            (portInstance.title < this.ports[i].title))) {

                            if (portToAppendBefore === null) {
                                portToAppendBefore = i;
                            } else {
                                if ((this.ports[i].position.y < this.ports[portToAppendBefore].position.y) ||
                                    ((this.ports[i].position.y === this.ports[portToAppendBefore].position.y) &&
                                    (this.ports[i].title < this.ports[portToAppendBefore].title))) {

                                    portToAppendBefore = i;
                                }
                            }
                        }
                    }
                }
            }
        }

        if (portToAppendBefore === null) {
            portContainer.append(portInstance.$el);
        } else {
            portInstance.$el.insertBefore(this.ports[portToAppendBefore].$el);
        }

        if (changed === true) {
            this._portPositionChanged(portId);
        }
    };

    ModelDecoratorCore.prototype._portPositionChanged = function (/*portId*/) {
    };

    ModelDecoratorCore.prototype._updatePort = function (portId) {
        var idx = this.portIDs.indexOf(portId),
            client = this._control._client,
            portNode = client.getNode(portId),
            isPort = this.isPort(portId),
            portTitle;

        //check if it is already displayed as port
        if (idx !== -1) {
            //port already, should it stay one?
            if (isPort === true) {
                portTitle = displayFormat.resolve(portNode);
                this.ports[portId].update({
                    title: portTitle,
                    svg: portNode.getRegistry(REGISTRY_KEYS.PORT_SVG_ICON)
                });
                this._updatePortPosition(portId);
            } else {
                this.removePort(portId);
            }
        } else {
            this.addPort(portId);
        }
    };

    ModelDecoratorCore.prototype._updatePortPosition = function (portId) {
        var portNode = this._control._client.getNode(portId),
            portPosition = portNode.getRegistry(REGISTRY_KEYS.POSITION) || {x: 0, y: 0};

        //check if is has changed at all
        if ((this.ports[portId].position.x !== portPosition.x) ||
            (this.ports[portId].position.y !== portPosition.y)) {

            //detach from DOM
            this.ports[portId].$el.detach();

            //reattach
            this._addPortToContainer(portNode, this.ports[portId]);
        }
    };

    ModelDecoratorCore.prototype._checkTerritoryReady = function () {
        //the territory rule here is all children
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            tReady = true,
            childrenIDs,
            len;

        //TODO: hard to tell with the aspect info involved
        if (this._aspect === CONSTANTS.ASPECT_ALL) {
            if (nodeObj) {
                childrenIDs = nodeObj.getChildrenIds();
                len = childrenIDs.length;
                while (len--) {
                    nodeObj = client.getNode(childrenIDs[len]);
                    if (!nodeObj) {
                        tReady = false;
                        break;
                    }
                }
            } else {
                tReady = false;
            }
        }

        if (tReady === true) {
            this._hidePortProgressBar();
        } else {
            this._showPortProgressBar();
        }
    };

    ModelDecoratorCore.prototype._showPortProgressBar = function () {
        var pgBar = this.$el.find('.' + ModelDecoratorConstants.PROGRESS_BAR_CLASS);
        if (pgBar.length === 0) {
            pgBar = $('<div/>', {class: ModelDecoratorConstants.PROGRESS_BAR_CLASS});
            this.$el.append(pgBar);

            this._loader = new LoaderProgressBar({containerElement: pgBar});
            this._loader.start();
        }
    };

    ModelDecoratorCore.prototype._hidePortProgressBar = function () {
        if (this._loader) {
            this._loader.stop();
            this._loader.destroy();
            delete this._loader;
        }

        this.$el.find('.' + ModelDecoratorConstants.PROGRESS_BAR_CLASS).remove();
    };

    ModelDecoratorCore.prototype._ptrUIDOMBase =
        $('<div class="' + ModelDecoratorConstants.POINTER_CLASS + '"><i class="glyphicon glyphicon-share"></i></div>');

    ModelDecoratorCore.prototype._replaceableUIDOMBase =
        $('<div class="' + ModelDecoratorConstants.REPLACEABLE_CLASS +'">' +
            '<i class="glyphicon glyphicon-transfer" title="This node is replaceable"></i></div>');

    ModelDecoratorCore.prototype._updatePointers = function () {
        var ptrTo;

        if (this._getPointerNames().length > 0) {
            this.skinParts.$ptr = this.$el.find('.' + ModelDecoratorConstants.POINTER_CLASS);
            if (this.skinParts.$ptr.length === 0) {
                this.skinParts.$ptr = this._ptrUIDOMBase.clone();
                this.$el.append(this.skinParts.$ptr);
            }

            ptrTo = this._getPointerTargets();

            if (ptrTo.length > 0) {
                this.skinParts.$ptr.removeClass(ModelDecoratorConstants.POINTER_CLASS_NON_SET);
            } else {
                this.skinParts.$ptr.addClass(ModelDecoratorConstants.POINTER_CLASS_NON_SET);
            }
        } else {
            if (this.skinParts.$ptr) {
                this.skinParts.$ptr.remove();
                this.skinParts.$ptr = undefined;
            }
        }
    };

    ModelDecoratorCore.prototype._updateAbstract = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]);

        if (nodeObj) {
            if (nodeObj.getRegistry(REGISTRY_KEYS.IS_ABSTRACT) === true) {
                this.$el.addClass(ABSTRACT_CLASS);
            } else {
                this.$el.removeClass(ABSTRACT_CLASS);
            }
        } else {
            this.$el.removeClass(ABSTRACT_CLASS);
        }
    };

    /***** UPDATE THE SVG ICON OF THE NODE *****/
    ModelDecoratorCore.prototype._updateSVG = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            svgFile = '',
            svgURL,
            self = this;

        if (nodeObj) {
            svgFile = nodeObj.getRegistry(REGISTRY_KEYS.SVG_ICON);
        }

        if (svgFile) {
            // get the svg from the server in SYNC mode, may take some time
            svgURL = CONSTANTS.ASSETS_DECORATOR_SVG_FOLDER + svgFile;
            if (!this.skinParts.$imgSVG) {
                this.skinParts.$imgSVG = EMBEDDED_SVG_IMG_BASE.clone();
                this.$el.append(this.skinParts.$imgSVG);
            }
            if (this.skinParts.$imgSVG.attr('src') !== svgURL) {
                this.skinParts.$imgSVG.on('load', function (/*event*/) {
                    self._svgReady();
                });
                this.skinParts.$imgSVG.on('error', function (/*event*/) {
                    self._svgReady();
                });
                this.skinParts.$imgSVG.attr('src', svgURL);
            }
        } else {
            if (this.skinParts.$imgSVG) {
                this.skinParts.$imgSVG.remove();
                this.skinParts.$imgSVG = undefined;
            }
        }
    };

    ModelDecoratorCore.prototype._svgReady = function () {
        var portsHeight = this.skinParts.$portsContainer.outerHeight(),
            TOP_OFFSET = 5,
            marginTop = -portsHeight + TOP_OFFSET;

        this.skinParts.$imgSVG.css('margin-top', marginTop);

        this.skinParts.$imgSVG.off('load');
        this.skinParts.$imgSVG.off('error');

        if (_.isFunction(this.onRenderGetLayoutInfo)) {
            this.onRenderGetLayoutInfo();
        }
        if (this.hostDesignerItem &&
            this.hostDesignerItem.canvas) {
            var sel = this.hostDesignerItem.canvas.selectionManager.getSelectedElements();
            if (sel.length === 1 &&
                sel[0] === this.hostDesignerItem.id) {
                this.hostDesignerItem.canvas.selectNone();
                this.hostDesignerItem.canvas.select([this.hostDesignerItem.id]);
            }
        }
    };

    /***** UPDATE THE REPLACEABLE ICON *****/

    ModelDecoratorCore.prototype._updateIsReplaceable = function () {
        if (this._isReplaceable()) {
            this.skinParts.$replaceable = this.$el.find('.' + ModelDecoratorConstants.REPLACEABLE_CLASS);
            if (this.skinParts.$replaceable.length === 0) {
                this.skinParts.$replaceable = this._replaceableUIDOMBase.clone();
                this.$el.append(this.skinParts.$replaceable);
            }
        } else {
            if (this.skinParts.$replaceable) {
                this.skinParts.$replaceable.remove();
                this.skinParts.$replaceable = undefined;
            }
        }
    };

    return ModelDecoratorCore;
});