/*globals define, _, $*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/Constants',
    'js/NodePropertyNames',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget.DecoratorBase',
    './../Core/UMLStateMachineDecoratorCore',
    './../Core/UMLStateMachine.META',
    'css!./UMLStateMachineDecorator.DiagramDesignerWidget.css'
], function (CONSTANTS,
             nodePropertyNames,
             DiagramDesignerWidgetDecoratorBase,
             UMLStateMachineDecoratorCore,
             UMLStateMachineMETA) {
    'use strict';

    var UMLStateMachineDecoratorDiagramDesignerWidget,
        DECORATOR_ID = 'UMLStateMachineDecoratorDiagramDesignerWidget';

    UMLStateMachineDecoratorDiagramDesignerWidget = function (options) {
        var opts = _.extend({}, options);

        DiagramDesignerWidgetDecoratorBase.apply(this, [opts]);

        this._initializeDecorator({connectors: true});

        this.logger.debug('UMLStateMachineDecoratorDiagramDesignerWidget ctor');
    };

    /************************ INHERITANCE *********************/
    _.extend(UMLStateMachineDecoratorDiagramDesignerWidget.prototype, DiagramDesignerWidgetDecoratorBase.prototype);
    _.extend(UMLStateMachineDecoratorDiagramDesignerWidget.prototype, UMLStateMachineDecoratorCore.prototype);


    /**************** OVERRIDE INHERITED / EXTEND ****************/

    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    UMLStateMachineDecoratorDiagramDesignerWidget.prototype.DECORATORID = DECORATOR_ID;


    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    UMLStateMachineDecoratorDiagramDesignerWidget.prototype.on_addTo = function () { //jshint ignore: line
        var self = this,
            META_TYPES = UMLStateMachineMETA.META_TYPES;

        this._renderContent();

        //if END or INITIAL state, don't display name except only on META level
        if (META_TYPES.End &&
            META_TYPES.Initial &&
            (this._metaType === META_TYPES.End ||
            this._metaType === META_TYPES.Initial) &&
            this._gmeID !== META_TYPES.Initial &&
            this._gmeID !== META_TYPES.End) {
            this.$name.remove();
        } else {
            // set title editable on double-click
            if (this.$name) {
                this.$name.on('dblclick.editOnDblClick', null, function (event) {
                    if (self.hostDesignerItem.canvas.getIsReadOnlyMode() !== true) {
                        self.hostDesignerItem.canvas.selectNone();
                        $(this).editInPlace({
                            class: '',
                            onChange: function (oldValue, newValue) {
                                self._onNodeTitleChanged(oldValue, newValue);
                            }
                        });
                    }
                    event.stopPropagation();
                    event.preventDefault();
                });
            }
        }
    };


    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    UMLStateMachineDecoratorDiagramDesignerWidget.prototype.showSourceConnectors = function (/*params*/) {
        this.$sourceConnectors.appendTo(this.$el.find('> div').first());
    };

    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    UMLStateMachineDecoratorDiagramDesignerWidget.prototype.showEndConnectors = function (/*params*/) {
        this.$endConnectors.appendTo(this.$el.find('> div').first());
    };

    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    UMLStateMachineDecoratorDiagramDesignerWidget.prototype.onRenderGetLayoutInfo = function () {
        var META_TYPES = UMLStateMachineMETA.META_TYPES;

        //let the parent decorator class do its job first
        DiagramDesignerWidgetDecoratorBase.prototype.onRenderGetLayoutInfo.apply(this, arguments);

        if (this.$name) {
            if (META_TYPES.End &&
                META_TYPES.Initial &&
                (this._metaType === META_TYPES.End || this._metaType === META_TYPES.Initial)) {
                this.renderLayoutInfo.nameWidth = this.$name.outerWidth();
            }
        }
    };

    /**** Override from DiagramDesignerWidgetDecoratorBase ****/
    UMLStateMachineDecoratorDiagramDesignerWidget.prototype.onRenderSetLayoutInfo = function () {
        var META_TYPES = UMLStateMachineMETA.META_TYPES;

        if (this.renderLayoutInfo) {
            var shift = this.renderLayoutInfo.nameWidth / -2;

            if (this.$name) {
                if (META_TYPES.End &&
                    META_TYPES.Initial &&
                    (this._metaType === META_TYPES.End || this._metaType === META_TYPES.Initial)) {
                    this.$name.css({'margin-left': shift});
                }
            }
        }

        //let the parent decorator class do its job finally
        DiagramDesignerWidgetDecoratorBase.prototype.onRenderSetLayoutInfo.apply(this, arguments);
    };


    //isEnd, connectionMetaInfo are not used parameters of the function
    UMLStateMachineDecoratorDiagramDesignerWidget.prototype.getConnectionAreas = function (id) {
        var result = [],
            edge = 10,
            LEN = 20;

        //by default return the bounding box edge's midpoints

        if (id === undefined || id === this.hostDesignerItem.id) {
            //NORTH
            result.push({
                id: '0',
                x1: edge,
                y1: 0,
                x2: this.hostDesignerItem.getWidth() - edge,
                y2: 0,
                angle1: 270,
                angle2: 270,
                len: LEN
            });

            //EAST
            result.push({
                id: '1',
                x1: this.hostDesignerItem.getWidth(),
                y1: edge,
                x2: this.hostDesignerItem.getWidth(),
                y2: this.hostDesignerItem.getHeight() - edge,
                angle1: 0,
                angle2: 0,
                len: LEN
            });

            //SOUTH
            result.push({
                id: '2',
                x1: edge,
                y1: this.hostDesignerItem.getHeight(),
                x2: this.hostDesignerItem.getWidth() - edge,
                y2: this.hostDesignerItem.getHeight(),
                angle1: 90,
                angle2: 90,
                len: LEN
            });

            //WEST
            result.push({
                id: '3',
                x1: 0,
                y1: edge,
                x2: 0,
                y2: this.hostDesignerItem.getHeight() - edge,
                angle1: 180,
                angle2: 180,
                len: LEN
            });
        }

        return result;
    };


    /**************** EDIT NODE TITLE ************************/

    UMLStateMachineDecoratorDiagramDesignerWidget.prototype._onNodeTitleChanged = function (oldValue, newValue) {
        var client = this._control._client;

        client.setAttributes(this._metaInfo[CONSTANTS.GME_ID], nodePropertyNames.Attributes.name, newValue);
    };

    /**************** END OF - EDIT NODE TITLE ************************/


    return UMLStateMachineDecoratorDiagramDesignerWidget;
});