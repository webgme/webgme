/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['js/Constants',
    'js/Utils/METATypeHelper',
    './State',
    './InitialState',
    './EndState',
    './Diagram',
    'js/NodePropertyNames'], function (CONSTANTS,
                                       METATypeHelper,
                                       State,
                                       InitialState,
                                       EndState,
                                       Diagram,
                                       nodePropertyNames) {

    var UMLStateMachineDecoratorCore,
        UMLStateMachineDecoratorClass = 'uml-state-machine',
        WebGMEGlobal_META = WebGMEGlobal[METATypeHelper.METAKey],
        DEFAULT_CLASS = 'default';


    UMLStateMachineDecoratorCore = function () {
    };

    UMLStateMachineDecoratorCore.prototype.$DOMBase = $('<div/>', {'class': UMLStateMachineDecoratorClass});


    UMLStateMachineDecoratorCore.prototype._initializeDecorator = function (params) {
        this.name = "";
        this.skinParts = { "$name": undefined };

        this._displayConnectors = false;
        if (params && params.connectors) {
            this._displayConnectors = params.connectors;
        }
    };

    /**** Override from *.WidgetDecoratorBase ****/
    UMLStateMachineDecoratorCore.prototype.getTerritoryQuery = function () {
        var territoryRule = {};
        return territoryRule;
    };


    /**** Override from *.WidgetDecoratorBase ****/
    UMLStateMachineDecoratorCore.prototype.destroy = function () {
    };


    /**** Override from *.WidgetDecoratorBase ****/
    UMLStateMachineDecoratorCore.prototype.doSearch = function (searchDesc) {
        var searchText = searchDesc.toString().toLowerCase();

        return (this.name && this.name.toLowerCase().indexOf(searchText) !== -1);
    };


    UMLStateMachineDecoratorCore.prototype.renderMetaType = function () {
        this.$el.addClass(DEFAULT_CLASS);
        this.$el.append(this._getName());
    };

    UMLStateMachineDecoratorCore.prototype._getName = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._gmeID),
            name = "(N/A)";

        if (nodeObj) {
            name = nodeObj.getAttribute(nodePropertyNames.Attributes.name) || name;
        }

        return name;
    };


    UMLStateMachineDecoratorCore.prototype._renderContent = function () {
        //render GME-ID in the DOM, for debugging
        this._gmeID = this._metaInfo[CONSTANTS.GME_ID];
        this.$el.attr({"data-id": this._gmeID});

        this._instantiateMetaType();

        this.renderMetaType();

        //find placeholders

        this._update();
    };

    UMLStateMachineDecoratorCore.prototype._update = function () {
        //this._updateName();

    };

    /***** UPDATE THE NAME OF THE NODE *****/
    UMLStateMachineDecoratorCore.prototype._updateName = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            noName = "(N/A)";

        if (nodeObj) {
            this.name = nodeObj.getAttribute(nodePropertyNames.Attributes.name) || noName;
        } else {
            this.name = noName;
        }

    };


    UMLStateMachineDecoratorCore.prototype._instantiateMetaType = function () {
        if (WebGMEGlobal_META) {
            if (METATypeHelper.isMETAType(this._gmeID, WebGMEGlobal_META.Initial)) {
                _.extend(this, new InitialState());
            } else if (METATypeHelper.isMETAType(this._gmeID, WebGMEGlobal_META.End)) {
                _.extend(this, new EndState());
            } else if (METATypeHelper.isMETAType(this._gmeID, WebGMEGlobal_META.State)) {
                _.extend(this, new State());
            } else if (METATypeHelper.isMETAType(this._gmeID, WebGMEGlobal_META.Transition)) {
            } else if (METATypeHelper.isMETAType(this._gmeID, WebGMEGlobal_META.UMLStateDiagram)) {
                _.extend(this, new Diagram());
            }
        }
    };


    return UMLStateMachineDecoratorCore;
});