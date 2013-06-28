"use strict";
/*
 * STRING CONSTANT DEFINITIONS USED IN CLIENT JAVASCRIPT (INHERITS ALL THE CONSTANST FROM COMMON/CONSTANST.JS)
 */

define(['underscore', 'common/Constants'], function (underscore, COMMON_CONSTANTS) {

    //define client-only string constants
    var clientContants = {};

    //copy over all the constanst form common/constants.js
    _.extend(clientContants, COMMON_CONSTANTS, {
        /*
         * DOM element ID to use for all-over-the-screen-draggable-parent
         */
        ALL_OVER_THE_SCREEN_DRAGGABLE_PARENT_ID : 'body',

        /*
         * LINE VISUAL DESCRIPTOR CONSTANTS
         */
        LINE_STYLE : { WIDTH : 'width',
                      COLOR: 'color',
                      PATTERN: 'pattern',
                      PATTERNS: { SOLID: '',
                                  DASH: "dash",
                                  DOT: "dot",
                                  DASH_DOT: "dash-dot",
                                  DASH_DOT_DOT: "dash-dot-dot"},
                      TYPE: 'type',
                      TYPES: { NONE : '',
                               BEZIER: 'bezier'},
                      START_ARROW: 'start-arrow',
                      END_ARROW: 'end-arrow',
                      POINTS: 'points'}
    });


    return clientContants;
});