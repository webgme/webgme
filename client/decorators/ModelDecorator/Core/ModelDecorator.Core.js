/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['js/Constants',
    'js/NodePropertyNames',
    'js/RegistryKeys',
    'loaderProgressBar',
    './Port',
    './ModelDecorator.Constants',
    'js/Decorators/DecoratorWithPorts.Base',
    'js/Utils/DisplayFormat',
    'js/Utils/GMEConcepts'], function (CONSTANTS,
                         nodePropertyNames,
                         REGISTRY_KEYS,
                         LoaderProgressBar,
                         Port,
                         ModelDecoratorConstants,
                         DecoratorWithPortsBase,
                         displayFormat,
                         GMEConcepts) {

    var ModelDecoratorCore,
        ABSTRACT_CLASS = 'abstract',
        SVG_DIR = CONSTANTS.ASSETS_DECORATOR_SVG_FOLDER,
        EMBEDDED_SVG_CLASS = 'embeddedsvg',
        CONNECTION_TYPE_CLASS = 'conn-type';


    ModelDecoratorCore = function () {
        DecoratorWithPortsBase.apply(this, []);
    };

    _.extend(ModelDecoratorCore.prototype, DecoratorWithPortsBase.prototype);

    ModelDecoratorCore.prototype._initializeVariables = function (params) {
        this.name = "";
        this.formattedName = "";
        this._refTo = undefined;
        this.portIDs = [];
        this.ports = {};
        this.skinParts = { "$name": undefined,
            "$portsContainer": undefined,
            "$portsContainerLeft": undefined,
            "$portsContainerRight": undefined,
            "$portsContainerCenter": undefined,
            "$ref": undefined,
            "$imgSVG": undefined};
		
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
        this.$el.attr({"data-id": this._metaInfo[CONSTANTS.GME_ID]});

        /* BUILD UI*/
        //find placeholders
        this.skinParts.$name = this.$el.find(".name");
        this.skinParts.$portsContainer = this.$el.find(".ports");
        this.skinParts.$portsContainerLeft = this.skinParts.$portsContainer.find(".left");
        this.skinParts.$portsContainerRight = this.skinParts.$portsContainer.find(".right");
        this.skinParts.$portsContainerCenter = this.skinParts.$portsContainer.find(".center");
		
		this._update();
    };
	
	ModelDecoratorCore.prototype._update = function () {
        this._updateColors();
        this._updateName();
        this._updatePorts();
        this._updateReference();
        this._updateAbstract();
        this._updateSVG();
        this._updateConnectionType();
    };

    ModelDecoratorCore.prototype._updateColors = function () {
        this._getNodeColorsFromRegistry();

        if (this.fillColor) {
            this.$el.css({'background-color': this.fillColor});
        } else {
            this.$el.css({'background-color': ''});
        }

        if (this.borderColor) {
            this.$el.css({'border-color': this.borderColor,
                          'box-shadow': '0px 0px 7px 0px ' + this.borderColor + ' inset'});
            this.skinParts.$name.css({'border-color': this.borderColor});
        } else {
            this.$el.css({'border-color': '',
                'box-shadow': ''});
            this.skinParts.$name.css({'border-color': ''});
        }

        if (this.textColor) {
            this.$el.css({'color': this.textColor});
        } else {
            this.$el.css({'color': ''});
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
            noName = "(N/A)";

        if (nodeObj) {
            this.name = nodeObj.getAttribute(nodePropertyNames.Attributes.name);
            this.formattedName = displayFormat.resolve(nodeObj);
        } else {
            this.name = "";
            this.formattedName = noName;
        }

        this.skinParts.$name.text(this.formattedName);
        this.skinParts.$name.attr("title", this.formattedName);
    };

    ModelDecoratorCore.prototype._updateConnectionType = function () {
        var isConnectionType = GMEConcepts.isConnectionType(this._metaInfo[CONSTANTS.GME_ID]);

        this.skinParts.$name.text(this.formattedName);
        this.skinParts.$name.attr("title", this.formattedName);
        if (isConnectionType) {
            if (!this.skinParts.$divConnType) {
                this.skinParts.$divConnType = $('<div/>', {class: CONNECTION_TYPE_CLASS });
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
            portInstance = new Port(portId, { "title": portNode.getAttribute(nodePropertyNames.Attributes.name),
                "decorator": this,
                "svg": portNode.getRegistry(REGISTRY_KEYS.PORT_SVG_ICON)});

        this._addPortToContainer(portNode, portInstance);

        return portInstance;
    };


    ModelDecoratorCore.prototype._addPortToContainer = function (portNode, portInstance) {
        var portId = portNode.getId(),
            portOrientation = "W",
            portContainer = this.skinParts.$portsContainerLeft,
            portPosition = portNode.getRegistry(REGISTRY_KEYS.POSITION) || { "x": 0, "y": 0 },
            portToAppendBefore = null,
            i,
            changed;

        //check if the port should be on the left or right-side
        if (portPosition.x > 300) {
            portOrientation = "E";
            portContainer = this.skinParts.$portsContainerRight;
        }

        changed = portInstance.updateOrPos(portOrientation, portPosition);

        //find its correct position
        for (i in this.ports) {
            if (this.ports.hasOwnProperty(i)) {
                if (i !== portId) {
                    if (this.ports[i].orientation === portInstance.orientation) {
                        if ((portInstance.position.y < this.ports[i].position.y) ||
                            ((portInstance.position.y === this.ports[i].position.y) && (portInstance.title < this.ports[i].title))) {
                            if (portToAppendBefore === null) {
                                portToAppendBefore = i;
                            } else {
                                if ((this.ports[i].position.y < this.ports[portToAppendBefore].position.y) ||
                                    ((this.ports[i].position.y === this.ports[portToAppendBefore].position.y) && (this.ports[i].title < this.ports[portToAppendBefore].title))) {
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


    ModelDecoratorCore.prototype._portPositionChanged = function (portId) {
    };


    ModelDecoratorCore.prototype._updatePort = function (portId) {
        var idx = this.portIDs.indexOf(portId),
            client = this._control._client,
            portNode = client.getNode(portId),
            isPort = this.isPort(portId);

        //check if it is already displayed as port
        if (idx !== -1) {
            //port already, should it stay one?
            if (isPort === true) {
                this.ports[portId].update({"title": portNode.getAttribute(nodePropertyNames.Attributes.name),
                    "svg": portNode.getRegistry(REGISTRY_KEYS.PORT_SVG_ICON)});
                this._updatePortPosition(portId);
            } else {
                this.removePort(portId);
            }
        } else {
            this.renderPort(portId);
        }
    };


    ModelDecoratorCore.prototype._updatePortPosition = function (portId) {
        var portNode = this._control._client.getNode(portId),
            portPosition = portNode.getRegistry(REGISTRY_KEYS.POSITION) || { "x": 0, "y": 0 };

        //check if is has changed at all
        if ((this.ports[portId].position.x !== portPosition.x) ||
            (this.ports[portId].position.y !== portPosition.y)) {

            //detach from DOM
            this.ports[portId].$el.detach();

            //reattach
            this._addPortToContainer(portNode);
        }
    };


    ModelDecoratorCore.prototype._checkTerritoryReady = function () {
        //the territory rule here is all children
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            tReady = true,
            childrenIDs,
            len;

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

        if (tReady === true) {
            this._hidePortProgressBar();
        } else {
            this._showPortProgressBar();
        }
    };


    ModelDecoratorCore.prototype._showPortProgressBar = function () {
        var pgBar = this.$el.find('.' + ModelDecoratorConstants.PROGRESS_BAR_CLASS);
        if (pgBar.length === 0) {
            pgBar = $('<div/>', {'class': ModelDecoratorConstants.PROGRESS_BAR_CLASS});
            this.$el.append(pgBar);

            this._loader = new LoaderProgressBar({"containerElement": pgBar});
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


    ModelDecoratorCore.prototype._refUIDOMBase = $('<div class="' + ModelDecoratorConstants.REFERENCE_POINTER_CLASS + '"><i class="icon-share"></i></div>');


    ModelDecoratorCore.prototype._updateReference = function () {
        var refTo;

        if (this._hasReference()) {
            this.skinParts.$ref = this.$el.find('.' + ModelDecoratorConstants.REFERENCE_POINTER_CLASS);
            if (this.skinParts.$ref.length === 0) {
                this.skinParts.$ref = this._refUIDOMBase.clone();
                this.$el.append(this.skinParts.$ref);
            }

            refTo = this._getReferenceValue();

            if (refTo !== undefined) {
                this.skinParts.$ref.removeClass(ModelDecoratorConstants.REFERENCE_POINTER_CLASS_NONSET);
            } else {
                this.skinParts.$ref.addClass(ModelDecoratorConstants.REFERENCE_POINTER_CLASS_NONSET);
            }

            //if the old value is different than the new
            if (this._refTo !== refTo) {
                var oldRefTo = this._refTo;
                this._refTo = refTo;

                this._refToChanged(oldRefTo, this._refTo);
            }
        } else {
            if (this.skinParts.$ref) {
                this.skinParts.$ref.remove();
                this.skinParts.$ref = undefined;
            }
        }
    };


    ModelDecoratorCore.prototype._refToChanged = function (oldValue, newValue) {
    };


    ModelDecoratorCore.prototype._hasReference = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            hasRefPointer = false;

        if (nodeObj) {
            hasRefPointer = nodeObj.getPointerNames().indexOf(ModelDecoratorConstants.REFERENCE_POINTER_NAME) !== -1;
        }

        return hasRefPointer;
    };


    ModelDecoratorCore.prototype._getReferenceValue = function () {
        var res,
            client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]);

        if (nodeObj) {
            res = nodeObj.getPointer(ModelDecoratorConstants.REFERENCE_POINTER_NAME);
            if (res && res.to !== undefined && res.to !== null) {
                res = res.to;
            } else {
                res = undefined;
            }
        }

        return res;
    };


    ModelDecoratorCore.prototype._setReferenceValue = function (val) {
        var client = this._control._client,
            nodeID = this._metaInfo[CONSTANTS.GME_ID];

        if (this._refTo !== val) {
            client.makePointer(nodeID, ModelDecoratorConstants.REFERENCE_POINTER_NAME, val);
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
            svgFile = "",
            svgURL,
            self = this,
            TOP_OFFSET = 5;

        var svgReady = function () {
            var portsHeight = self.skinParts.$portsContainer.outerHeight(),
                marginTop = -portsHeight + TOP_OFFSET;

            self.skinParts.$imgSVG.css('margin-top', marginTop);

            self.skinParts.$imgSVG.off('load');
            self.skinParts.$imgSVG.off('error');

            self.onRenderGetLayoutInfo();
            if (self.hostDesignerItem.canvas) {
                var sel = self.hostDesignerItem.canvas.selectionManager.getSelectedElements();
                if (sel.length === 1 &&
                    sel[0] === self.hostDesignerItem.id) {
                    self.hostDesignerItem.canvas.selectNone();
                    self.hostDesignerItem.canvas.select([self.hostDesignerItem.id]);
                }
            }
        };

        if (nodeObj) {
            svgFile = nodeObj.getRegistry(REGISTRY_KEYS.SVG_ICON);
        }

        if (svgFile) {
            // get the svg from the server in SYNC mode, may take some time
            svgURL = SVG_DIR + svgFile;
            if (!this.skinParts.$imgSVG) {
                this.skinParts.$imgSVG = $('<img>', {'class': EMBEDDED_SVG_CLASS});
                this.$el.append(this.skinParts.$imgSVG);
            }
            if (this.skinParts.$imgSVG.attr('src') !== svgURL) {
                this.skinParts.$imgSVG.attr('src', svgURL);
                this.skinParts.$imgSVG.on('load', function (/*event*/) {
                    svgReady();
                });
                this.skinParts.$imgSVG.on('error', function (/*event*/) {
                    svgReady();
                });
            }
        } else {
            if (this.skinParts.$imgSVG) {
                this.skinParts.$imgSVG.remove();
                this.skinParts.$imgSVG = undefined;
            }
        }
    };


    return ModelDecoratorCore;
});