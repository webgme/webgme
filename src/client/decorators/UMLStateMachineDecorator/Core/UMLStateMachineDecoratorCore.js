/*globals define, _, $*/
/*jshint browser: true, newcap: false*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */


//TODO does it really work with the fixed paths????
define([
    'js/Constants',
    'js/RegistryKeys',
    'js/NodePropertyNames',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants',
    'text!./Diagram.html',
    'text!./InitialState.html',
    'text!./EndState.html',
    'text!./State.html',
    'text!./Transition.html',
    './Transition',
    './UMLStateMachine.META'
], function (CONSTANTS,
             REGISTRY_KEYS,
             nodePropertyNames,
             DiagramDesignerWidgetConstants,
             DiagramTemplate,
             InitialStateTemplate,
             EndStateTemplate,
             StateTemplate,
             TransitionTemplate,
             Transition,
             UMLStateMachineMETA) {
    'use strict';

    var UMLStateMachineDecoratorCore,
        UMLStateMachineDecoratorClass = 'uml-state-machine',
        DEFAULT_CLASS = 'default',
        METATYPETEMPLATE_INTIAL = $(InitialStateTemplate),
        METATYPETEMPLATE_END = $(EndStateTemplate),
        METATYPETEMPLATE_UMLSTATEDIAGRAM = $(DiagramTemplate),
        METATYPETEMPLATE_STATE = $(StateTemplate),
        METATYPETEMPLATE_TRANSITION = $(TransitionTemplate);


    UMLStateMachineDecoratorCore = function () {
    };

    UMLStateMachineDecoratorCore.prototype.$DOMBase = $('<div/>', {class: UMLStateMachineDecoratorClass});


    UMLStateMachineDecoratorCore.prototype._initializeDecorator = function (params) {
        this.$name = undefined;

        this._displayConnectors = false;
        if (params && params.connectors) {
            this._displayConnectors = params.connectors;
        }
    };

    /**** Override from *.WidgetDecoratorBase ****/
    UMLStateMachineDecoratorCore.prototype.getTerritoryQuery = function () {
        return {};
    };


    /**** Override from *.WidgetDecoratorBase ****/
    UMLStateMachineDecoratorCore.prototype.destroy = function () {
    };


    /**** Override from *.WidgetDecoratorBase ****/
    UMLStateMachineDecoratorCore.prototype.doSearch = function (searchDesc) {
        var searchText = searchDesc.toString().toLowerCase(),
            name = this._getName();

        return (name && name.toLowerCase().indexOf(searchText) !== -1);
    };


    UMLStateMachineDecoratorCore.prototype.renderMetaType = function () {
        if (this._metaType && this._metaTypeTemplate) {
            this.$el.append(this._metaTypeTemplate);
        } else {
            this.$el.addClass(DEFAULT_CLASS);
            this.$el.append($('<div/>', {class: 'name'}));
        }

        this.$name = this.$el.find('.name');

        if (this._displayConnectors) {
            this.initializeConnectors();
        } else {
            this.$el.find('.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS).remove();
        }

        this._renderMetaTypeSpecificParts();
    };

    /* TO BE OVERRIDDEN IN META TYPE SPECIFIC CODE */
    UMLStateMachineDecoratorCore.prototype._renderMetaTypeSpecificParts = function () {
    };

    UMLStateMachineDecoratorCore.prototype._getName = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._gmeID),
            name = '(N/A)';

        if (nodeObj) {
            name = nodeObj.getAttribute(nodePropertyNames.Attributes.name) || name;
        }

        return name;
    };


    UMLStateMachineDecoratorCore.prototype._renderContent = function () {
        //render GME-ID in the DOM, for debugging
        this._gmeID = this._metaInfo[CONSTANTS.GME_ID];
        this.$el.attr({'data-id': this._gmeID});

        this._instantiateMetaType();

        this.renderMetaType();

        //find placeholders

        this._update();
    };


    /**** Override from PartBrowserWidgetDecoratorBase ****/
    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    UMLStateMachineDecoratorCore.prototype.update = function () {
        this._update();

    };

    UMLStateMachineDecoratorCore.prototype._update = function () {
        this._updateName();
        this._updateMetaTypeSpecificParts();
        this._updateColors();
    };

    /* TO BE OVERRIDDEN IN META TYPE SPECIFIC CODE */
    UMLStateMachineDecoratorCore.prototype._updateMetaTypeSpecificParts = function () {
    };

    /***** UPDATE THE NAME OF THE NODE *****/
    UMLStateMachineDecoratorCore.prototype._updateName = function () {
        if (this.$name) {
            this.$name.text(this._getName());
        }
    };


    UMLStateMachineDecoratorCore.prototype._instantiateMetaType = function () {
        var META_TYPES = UMLStateMachineMETA.getMetaTypes();

        if (META_TYPES) {
            if (UMLStateMachineMETA.TYPE_INFO.isInitial(this._gmeID)) {
                this._metaType = META_TYPES.Initial;
                this._metaTypeTemplate = METATYPETEMPLATE_INTIAL.clone();
            } else if (UMLStateMachineMETA.TYPE_INFO.isEnd(this._gmeID)) {
                this._metaType = META_TYPES.End;
                this._metaTypeTemplate = METATYPETEMPLATE_END.clone();
            } else if (UMLStateMachineMETA.TYPE_INFO.isState(this._gmeID)) {
                this._metaType = META_TYPES.State;
                this._metaTypeTemplate = METATYPETEMPLATE_STATE.clone();
            } else if (UMLStateMachineMETA.TYPE_INFO.isTransition(this._gmeID)) {
                this._metaType = META_TYPES.Transition;
                this._metaTypeTemplate = METATYPETEMPLATE_TRANSITION.clone();
                _.extend(this, new Transition());
            } else if (UMLStateMachineMETA.TYPE_INFO.isUMLStateDiagram(this._gmeID)) {
                this._metaType = META_TYPES.UMLStateDiagram;
                this._metaTypeTemplate = METATYPETEMPLATE_UMLSTATEDIAGRAM.clone();
            }
        }
    };


    UMLStateMachineDecoratorCore.prototype._updateColors = function () {
        var el;
        this._getNodeColorsFromRegistry();

        if (this.fillColor && this._metaTypeTemplate) {
            if (UMLStateMachineMETA.TYPE_INFO.isInitial(this._gmeID)) {
                el = this._metaTypeTemplate.find('.icon');
                if (el) {
                    el.css({
                        'background-color': this.fillColor,
                        'border-color': this.fillColor
                    });
                }
            } else if (UMLStateMachineMETA.TYPE_INFO.isEnd(this._gmeID)) {
                el = this._metaTypeTemplate.find('.icon');
                if (el) {
                    el.css({'border-color': this.fillColor});
                    el = el.find('.inner');
                    if (el) {
                        el.css({
                            'background-color': this.fillColor,
                            'border-color': this.fillColor
                        });
                    }
                }
            } else if (UMLStateMachineMETA.TYPE_INFO.isState(this._gmeID)) {
                this._metaTypeTemplate.css({'background-color': this.fillColor});
            } else if (UMLStateMachineMETA.TYPE_INFO.isTransition(this._gmeID)) {
                // Do nothing
            } else if (UMLStateMachineMETA.TYPE_INFO.isUMLStateDiagram(this._gmeID)) {
                this._metaTypeTemplate.css({'background-color': this.fillColor});
            }
        }

        if (this.borderColor && this._metaTypeTemplate) {
            if (UMLStateMachineMETA.TYPE_INFO.isInitial(this._gmeID)) {
                // Do nothing
            } else if (UMLStateMachineMETA.TYPE_INFO.isEnd(this._gmeID)) {
                el = this._metaTypeTemplate.find('.icon');
                if (el) {
                    el.css({'background-color': this.borderColor});
                }
            } else {
                this._metaTypeTemplate.css({'border-color': this.borderColor});
            }
        }

        if (this.textColor) {
            this.$el.css({color: this.textColor});
        } else {
            this.$el.css({color: ''});
        }
    };

    UMLStateMachineDecoratorCore.prototype._getNodeColorsFromRegistry = function () {
        var objID = this._metaInfo[CONSTANTS.GME_ID];
        this.fillColor = this.preferencesHelper.getRegistry(objID, REGISTRY_KEYS.COLOR, true);
        this.borderColor = this.preferencesHelper.getRegistry(objID, REGISTRY_KEYS.BORDER_COLOR, true);
        this.textColor = this.preferencesHelper.getRegistry(objID, REGISTRY_KEYS.TEXT_COLOR, true);
    };


    return UMLStateMachineDecoratorCore;
});