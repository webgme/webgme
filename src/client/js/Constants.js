/*globals define*/
/*jshint browser: true*/
/**
 * Browser side constants - inherits all constants from common/Constants.js
 *
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'common/Constants',
    'client/constants'
], function (COMMON_CONSTANTS, CLIENT_CONSTANTS) {

    'use strict';

    var CONSTANTS = {},
        key;

    // Define client-only string constants.
    CONSTANTS = {
        /*
         * DOM element ID to use for all-over-the-screen-draggable-parent
         */
        ALL_OVER_THE_SCREEN_DRAGGABLE_PARENT_ID: 'body',

        /*
         * META-INFORMATION ABOUT THE USER ACTION
         */
        META_INFO: 'metaInfo',

        /*
         * DRAG SOURCE IDENTIFIER (Widget, panel, etc)
         */
        DRAG_SOURCE: 'dragSource',

        /*
         * LINE VISUAL DESCRIPTOR CONSTANTS
         */
        LINE_STYLE: {
            WIDTH: 'width',
            COLOR: 'color',
            PATTERN: 'pattern',
            PATTERNS: {
                SOLID: '',
                DASH: '-',
                LONGDASH: '- ',
                DOT: '.',
                DASH_DOT: '-.',
                DASH_DOT_DOT: '-..'
            },
            TYPE: 'type',
            TYPES: {
                NONE: '',
                BEZIER: 'bezier'
            },
            START_ARROW: 'start-arrow',
            END_ARROW: 'end-arrow',
            CUSTOM_POINTS: 'custom-points',
            LABEL_PLACEMENT: 'label-placement',
            LABEL_PLACEMENTS: {
                SRC: 'src',
                MIDDLE: 'mid',
                DST: 'dst'
            },
            LINE_ARROWS: {
                NONE: 'none',
                DIAMOND: 'diamond',
                OPEN_DIAMOND: 'opendiamond',
                BLOCK: 'block',
                CLASSIC: 'classic',
                OPEN: 'open',
                OVAL: 'oval',
                DIAMOND2: 'diamond2',
                OPEN_DIAMOND2: 'opendiamond2',
                INHERITANCE: 'inheritance'
            },
            LINE_SHOW_CONNECTION_AREAS: 'LINE_SHOW_CONNECTION_AREAS'
        },

        DISPLAY_FORMAT_ATTRIBUTE_MARKER: '$',

        //the path to the SVGs that can be used by the decorators supporting SVG_Icon
        ASSETS_DECORATOR_SVG_FOLDER: 'assets/DecoratorSVG/',

        /*WebGME state constants*/
        STATE_TO_BE_ACTIVE_OBJECT: '_toBeActiveObject',
        STATE_ACTIVE_OBJECT: 'activeObject',
        STATE_ACTIVE_SELECTION: 'activeSelection',
        STATE_ACTIVE_ASPECT: 'activeAspect',
        STATE_ACTIVE_VISUALIZER: 'activeVisualizer',
        STATE_ACTIVE_PROJECT_NAME: 'activeProjectName',
        STATE_ACTIVE_COMMIT: 'activeCommit',
        STATE_ACTIVE_BRANCH_NAME: 'activeBranchName',
        STATE_ACTIVE_TAB: 'activeTab',

        STATE_LAYOUT: 'layout',

        /* ASPECTS */
        ASPECT_ALL: 'All',

        /* Property groups */
        PROPERTY_GROUP_META: 'META',
        PROPERTY_GROUP_PREFERENCES: 'Preferences',
        PROPERTY_GROUP_ATTRIBUTES: 'Attributes',
        PROPERTY_GROUP_POINTERS: 'Pointers',

        /* Visualizer */
        DEFAULT_VISUALIZER: 'ModelEditor',

        // This is assigned by the VisualizerPanel onto the visualizer instance on the fly and is set to
        // the id defined in Visualizers.json.
        VISUALIZER_PANEL_IDENTIFIER: 'VISUALIZER_PANEL_IDENTIFIER'
    };

    // Copy over all the constants form common/constants.js.
    for (key in COMMON_CONSTANTS) {
        CONSTANTS[key] = COMMON_CONSTANTS[key];
    }

    CONSTANTS.CLIENT = CLIENT_CONSTANTS;

    return CONSTANTS;
});
