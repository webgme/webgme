/*globals define*/
/*jshint browser: true*/
/**
 * REGISTRY KEY NAMES USED BY THE UI
 *
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([], function () {

    'use strict';

    return {
        COLOR: 'color',   //fill color of the item
        TEXT_COLOR: 'textColor',   //color of the texts of the item
        BORDER_COLOR: 'borderColor',   //border color of the item (if any)
        POSITION: 'position',  //position of the item {x, y}
        ROTATION: 'rotation',   //rotation of the item
        DECORATOR: 'decorator', //custom decorator name of the item
        IS_PORT: 'isPort',  //if the item is port in its parent or not
        IS_ABSTRACT: 'isAbstract',  //whether the item is abstract or not !!! (attribute???)
        REPLACEABLE: 'replaceable',  //whether the item is replaceable or not (not necessarily inherited).
        LINE_STYLE: 'lineStyle',    //the style of the line (solid, dot, dash-dot)
        LINE_TYPE: 'lineType',      //the type of the line (straight, bezier, ...)
        LINE_WIDTH: 'lineWidth',     //width of the line
        LINE_START_ARROW: 'lineStartArrow',     //start arrow of a line
        LINE_END_ARROW: 'lineEndArrow',     //start arrow of a line
        LINE_CUSTOM_POINTS: 'lineCustomPoints',  //custom routing points of a line
        LINE_LABEL_PLACEMENT: 'lineLabel', // Where the connection labels should be placed 'src', 'mid', 'dst'.

        //TODO maybe we should harmonize with project registry
        VALID_PLUGINS: 'validPlugins', //space separated list of valid plugins for the project
        USED_ADDONS: 'usedAddOns', //space separated list of used addons in the given project
        VALID_VISUALIZERS: 'validVisualizers', //space separated list of valid visualizers for the node
        VALID_DECORATORS: 'validDecorators', //space separated list of valid decorators for the project
        /*
         *  MISC
         */
        PROJECT_REGISTRY: 'ProjectRegistry',
        DISPLAY_FORMAT: 'DisplayFormat',
        SVG_ICON: 'SVGIcon',
        PORT_SVG_ICON: 'PortSVGIcon',
        TREE_ITEM_COLLAPSED_ICON: 'TreeItemCollapsedIcon',
        TREE_ITEM_EXPANDED_ICON: 'TreeItemExpandedIcon',

        /*
         * META_SHEETS_METADATA (title, order, setID, etc)
         */
        META_SHEETS: 'MetaSheets',

        /*
         * CROSSCUTS_META_INFO_REGISTRY_KEY
         */
        CROSSCUTS: 'CrossCuts',

        /*
         * DISABLED CONNECTION AREAS FOR DIAGRAM-DESIGNER-WIDGET DECORATORS ARE STORED UNDER THIS REGISTRY KEY
         * ON A PER DECORATOR BASIS
         */
        DIAGRAM_DESIGNER_WIDGET_DECORATOR_DISABLED_CONNECTION_AREAS:
            'diagramDesignerWidgetDecoratorDisabledConnectionAreas_'
    };
});