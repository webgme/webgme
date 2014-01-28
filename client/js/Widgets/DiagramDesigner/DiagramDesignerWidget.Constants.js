"use strict";
/*
 * STRING CONSTANT DEFINITIONS USED IN DESIGNER DIAGRAM
 */

define([], function () {

    //return string constants
    return {
        /*
         * TERRITORY EVENTS
         */
        SELF : "__SELF__",

        /*
         * CLASS DEFINITIONS
         */
        DESIGNER_ITEM_CLASS : "designer-item",
        DESIGNER_CONNECTION_CLASS : "designer-connection",
        CONNECTION_DRAGGABLE_END_CLASS : "c-d-end",
        CONNECTOR_CLASS : "connector",
        CONNECTION_END_SRC : 'src',
        CONNECTION_END_DST : 'dst',
        CONNECTION_CONTAINER_SVG_CLASS : 'connection-container',
        PATH_EDIT_SEGMENT_CLASS: 'path-edit-segment',
        PATH_EDIT_SEGMENT_NEW_SEGMENT_POINT_MARKER_CLASS: 'new-segment-point-marker',
        CONNECTION_SEGMENT_POINT_CLASS: 'segment-point',
        SEGMENT_POINT_MOVE_PATH_CLASS : 'segment-point-move-path',
        CONNECTION_SEGMENT_POINT_BEZIER_CONTROL_CLASS: 'segment-point-bezier-control',
        HIGHLIGHT_MODE_CLASS: 'highlight-mode',
        ITEM_HIGHLIGHT_CLASS: 'highlighted',
        DROP_REGION_CLASS: 'drop-region',
        DROP_REGION_ACCEPT_DROPPABLE_CLASS: 'accept-droppable',
        DROP_REGION_REJECT_DROPPABLE_CLASS: 'reject-droppable',

        /*DOM ELEMENT ATTRIBUTES*/
        DATA_ITEM_ID : 'data-oid',
        DATA_SUBCOMPONENT_ID : 'data-sid',

        /*
         * LINE STYLE PARAMETERS KEYS
         */
        LINE_WIDTH : 'width',
        LINE_COLOR : 'color',
        LINE_PATTERN: 'pattern',
        LINE_PATTERNS: { SOLID: '',
            DASH: "-",
            DOT: ".",
            DASH_DOT: "-.",
            DASH_DOT_DOT: "-.."},
        LINE_TYPE: 'type',
        LINE_TYPES: { NONE : '',
                      BEZIER: 'bezier'},
        LINE_START_ARROW: 'start-arrow',
        LINE_END_ARROW: 'end-arrow',
        LINE_POINTS: 'points',
        LINE_ARROWS: { NONE: 'none',
                       DIAMOND: 'diamond',
                       BLOCK: 'block',
                       CLASSIC: 'classic',
                       OPEN: 'open',
                       OVAL: 'oval',
                       DIAMOND2: 'diamond2',
                       INHERITANCE: 'inheritance'},

        /*
         * CONNECTION CONSTANTS
         */
        PATH_SHADOW_ID_PREFIX: "p_",
        PATH_SHADOW_ARROW_END_ID_PREFIX: "p_e_",

        /*
         * ROTATINO RESET CONSTANTS
         */
        ROTATION_RESET: 'reset'
    };
});