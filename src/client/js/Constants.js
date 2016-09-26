/*globals define, _*/
/*jshint browser: true*/
/**
 * STRING CONSTANT DEFINITIONS USED IN CLIENT JAVASCRIPT (INHERITS ALL THE CONSTANST FROM COMMON/CONSTANST.JS)
 *
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'underscore',
    'common/Constants',
    'js/client/constants'
], function (underscore, COMMON_CONSTANTS, CLIENT_CONSTANTS) {

    'use strict';

    //define client-only string constants
    var clientConstants = {};

    //copy over all the constanst form common/constants.js
    _.extend(clientConstants, COMMON_CONSTANTS, {
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
                BLOCK: 'block',
                CLASSIC: 'classic',
                OPEN: 'open',
                OVAL: 'oval',
                DIAMOND2: 'diamond2',
                INHERITANCE: 'inheritance'
            }
        },

        DISPLAY_FORMAT_ATTRIBUTE_MARKER: '$',

        //the path to the SVGs that can be used by the decorators supporting SVG_Icon
        ASSETS_DECORATOR_SVG_FOLDER: 'assets/DecoratorSVG/',

        /*WebGME state constants*/
        STATE_ACTIVE_OBJECT: 'activeObject',
        STATE_ACTIVE_SELECTION: 'activeSelection',
        STATE_ACTIVE_ASPECT: 'activeAspect',
        STATE_ACTIVE_VISUALIZER: 'activeVisualizer',
        STATE_ACTIVE_PROJECT_NAME: 'activeProjectName',
        STATE_ACTIVE_COMMIT: 'activeCommit',
        STATE_ACTIVE_BRANCH_NAME: 'activeBranchName',
        STATE_ACTIVE_CROSSCUT: 'activeCrosscut',
        STATE_ACTIVE_TAB: 'activeTab',
        STATE_SUPPRESS_VISUALIZER_FROM_NODE: 'suppressVisualizerFromNode',

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
    });

    clientConstants.CLIENT = CLIENT_CONSTANTS;

    return clientConstants;
});
