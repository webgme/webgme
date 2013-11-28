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
    'js/NodePropertyNames',
    'text!./Diagram.html',
    'text!./InitialState.html',
    'text!./EndState.html',
    'text!./State.html'], function (CONSTANTS,
                                       METATypeHelper,
                                       nodePropertyNames,
                                       DiagramTemplate,
                                       InitialStateTemplate,
                                       EndStateTemplate,
                                       StateTemplate) {

    var UMLStateMachineDecoratorCore,
        UMLStateMachineDecoratorClass = 'uml-state-machine',
        WebGMEGlobal_META = WebGMEGlobal[METATypeHelper.METAKey],
        DEFAULT_CLASS = 'default',
        METATYPETEMPLATES = undefined;


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
        if (!METATYPETEMPLATES) {
            this._initializeMetaTypeTemapltes();
        }

        if (this._metaType && METATYPETEMPLATES && METATYPETEMPLATES[this._metaType]) {
            this.$el.append(METATYPETEMPLATES[this._metaType].clone());
            this.$name = this.$el.find('.name');
        } else {
            this.$el.addClass(DEFAULT_CLASS);
            this.$el.append(this._getName());
        }

        this.initializeConnectors();
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

    UMLStateMachineDecoratorCore.prototype.update = function () {
        this._update();

    };

    UMLStateMachineDecoratorCore.prototype._update = function () {
        this._updateName();

    };

    /***** UPDATE THE NAME OF THE NODE *****/
    UMLStateMachineDecoratorCore.prototype._updateName = function () {
        if (this.$name) {
            this.$name.text(this._getName());
        }
    };


    UMLStateMachineDecoratorCore.prototype._instantiateMetaType = function () {
        if (WebGMEGlobal_META) {
            if (METATypeHelper.isMETAType(this._gmeID, WebGMEGlobal_META.Initial)) {
                this._metaType = WebGMEGlobal_META.Initial;
            } else if (METATypeHelper.isMETAType(this._gmeID, WebGMEGlobal_META.End)) {
                this._metaType = WebGMEGlobal_META.End;
            } else if (METATypeHelper.isMETAType(this._gmeID, WebGMEGlobal_META.State)) {
                this._metaType = WebGMEGlobal_META.State;
            } else if (METATypeHelper.isMETAType(this._gmeID, WebGMEGlobal_META.Transition)) {
                this._metaType = WebGMEGlobal_META.Transition;
            } else if (METATypeHelper.isMETAType(this._gmeID, WebGMEGlobal_META.UMLStateDiagram)) {
                this._metaType = WebGMEGlobal_META.UMLStateDiagram;
            }
        }
    };

    UMLStateMachineDecoratorCore.prototype._initializeMetaTypeTemapltes = function () {
        if (!METATYPETEMPLATES) {
            if (WebGMEGlobal_META) {
                METATYPETEMPLATES = {};
                METATYPETEMPLATES[WebGMEGlobal_META.Initial] = $(InitialStateTemplate);
                METATYPETEMPLATES[WebGMEGlobal_META.End] = $(EndStateTemplate);
                METATYPETEMPLATES[WebGMEGlobal_META.UMLStateDiagram] = $(DiagramTemplate);
                METATYPETEMPLATES[WebGMEGlobal_META.State] = $(StateTemplate);
            }
            
        }
    };


    return UMLStateMachineDecoratorCore;
});