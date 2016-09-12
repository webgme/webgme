/*globals define*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/Constants'], function (CONSTANTS) {

    'use strict';

    //return string constants
    return {
        /*
         * TERRITORY EVENTS
         */
        SELF: '__SELF__',

        /*
         * CLASS DEFINITIONS
         */
        DESIGNER_ITEM_CLASS: 'designer-item',
        DESIGNER_CONNECTION_CLASS: 'designer-connection',
        CONNECTION_DRAGGABLE_END_CLASS: 'c-d-end',
        CONNECTOR_CLASS: 'connector',
        CONNECTION_END_SRC: 'src',
        CONNECTION_END_DST: 'dst',
        CONNECTION_CONTAINER_SVG_CLASS: 'connection-container',
        PATH_EDIT_SEGMENT_CLASS: 'path-edit-segment',
        PATH_EDIT_SEGMENT_NEW_SEGMENT_POINT_MARKER_CLASS: 'new-segment-point-marker',
        CONNECTION_SEGMENT_POINT_CLASS: 'segment-point',
        SEGMENT_POINT_MOVE_PATH_CLASS: 'segment-point-move-path',
        CONNECTION_SEGMENT_POINT_BEZIER_CONTROL_CLASS: 'segment-point-bezier-control',
        HIGHLIGHT_MODE_CLASS: 'highlight-mode',
        ITEM_HIGHLIGHT_CLASS: 'highlighted',
        DROP_REGION_CLASS: 'drop-region',
        DROP_REGION_ACCEPT_DROPPABLE_CLASS: 'accept-droppable',
        DROP_REGION_REJECT_DROPPABLE_CLASS: 'reject-droppable',

        /*DOM ELEMENT ATTRIBUTES*/
        DATA_ITEM_ID: 'data-oid',
        DATA_SUBCOMPONENT_ID: 'data-sid',

        /*
         * LINE STYLE PARAMETERS KEYS
         */
        LINE_WIDTH: CONSTANTS.LINE_STYLE.WIDTH,
        LINE_COLOR: CONSTANTS.LINE_STYLE.COLOR,
        LINE_PATTERN: CONSTANTS.LINE_STYLE.PATTERN,
        LINE_PATTERNS: CONSTANTS.LINE_STYLE.PATTERNS,
        LINE_TYPE: CONSTANTS.LINE_STYLE.TYPE,
        LINE_TYPES: CONSTANTS.LINE_STYLE.TYPES,
        LINE_START_ARROW: CONSTANTS.LINE_STYLE.START_ARROW,
        LINE_END_ARROW: CONSTANTS.LINE_STYLE.END_ARROW,
        LINE_POINTS: CONSTANTS.LINE_STYLE.CUSTOM_POINTS,
        LINE_ARROWS: CONSTANTS.LINE_STYLE.LINE_ARROWS,
        LINE_LABEL_PLACEMENT: CONSTANTS.LINE_STYLE.LABEL_PLACEMENT,
        LINE_LABEL_PLACEMENTS: CONSTANTS.LINE_STYLE.LABEL_PLACEMENTS,

        /*
         * CONNECTION CONSTANTS
         */
        PATH_SHADOW_ID_PREFIX: 'p_',
        PATH_SHADOW_ARROW_END_ID_PREFIX: 'p_e_',

        /*
         * ROTATION CONSTANTS
         */
        ROTATION_RESET: 'reset',
        ROTATION_TOLEFT: 'toleft',
        ROTATION_TORIGHT: 'toright',
        ROTATION_CLEAR: 'clear',

        /*
         * ALIGN CONSTANTS
         */
        ALIGN_HORIZON: 'ALIGN_HORIZON',
        ALIGN_VERTICAL: 'ALIGN_VERTICAL',

        MOVE_TO_TOP: 'MOVE_TO_TOP',
        MOVE_TO_BOTTOM: 'MOVE_TO_BOTTOM',
        MOVE_TO_LEFT: 'MOVE_TO_LEFT',
        MOVE_TO_RIGHT: 'MOVE_TO_RIGHT',

        //TODO: Agree on the short cuts keys for these actions..
        KEY_SHORT_CUT_MOVE_TO_TOP: 'shift+up',
        KEY_SHORT_CUT_MOVE_TO_BOTTOM: 'shift+down',
        KEY_SHORT_CUT_MOVE_TO_LEFT: 'shift+left',
        KEY_SHORT_CUT_MOVE_TO_RIGHT: 'shift+right',
    };
});