/*globals define*/
/*
 * @author brollb / https://github/brollb
 *
 * STRING CONSTANT DEFINITIONS USED IN CONSTRAINT EDITOR
 */

define([], function () {

    "use strict";
    //return string constants
    return {
        /*
         * TERRITORY EVENTS
         */
        SELF : "__SELF__",

        /*
         * CLASS DEFINITIONS
         * May need to change some of these (if I don't use the "designer item")
         */
        DESIGNER_ITEM_CLASS : "snappable-item",
        HIGHLIGHT_MODE_CLASS: 'highlight-mode',
        ITEM_HIGHLIGHT_CLASS: 'highlighted',
        DROP_REGION_CLASS: 'drop-region',
        DROP_REGION_ACCEPT_DROPPABLE_CLASS: 'accept-droppable',
        DROP_REGION_REJECT_DROPPABLE_CLASS: 'reject-droppable',

        /*
         * Clickable constants
         */
        CONN_ACCEPTING: "in",
        CONN_PASSING: "out",

        //Special "pointers"
        PTR_NEXT: "next",
        NAME: "name", 
        SIBLING_PTRS: ["next"],//pointer names to ptrs on the same level

        /*
         * Droppable constants
         */
        BACKGROUND: "background",
        ITEM: "item",

        /*DOM ELEMENT ATTRIBUTES*/
        DATA_ITEM_ID : 'data-oid',
        DATA_SUBCOMPONENT_ID : 'data-sid',

        /*GME*/
        GME_ID: 'GME_ID',

        /* * * * * * * SVG TAGS * * * * * * */

        /*COLORING OF ITEMS*/
        COLOR_PRIMARY: 'primary',
        COLOR_SECONDARY: 'secondary',

        /*CUSTOM HIGHLIGHTING*/
        CONNECTION_HIGHLIGHT: 'connection-highlight',

        /*DEFAULT HEIGHT MEASUREMENT*/
        INITIAL_MEASURE: 'initial-measure',
        STRETCH_TYPE: { SVG: 'svg', TEXT: 'text' },

        /*INPUT FIELDS*/
        INPUT_FIELDS: 'input-field',
        TEXT_FIELD: { NAME: 'text',
                      CONTENT: { TEXT: 'text' } },

        DROPDOWN: { NAME: 'dropdown', 
                    CONTENT: { POINTERS: 'pointers',
                               ATTRIBUTES: 'attributes',
                               META_ENUM: 'enum'  } }

    };
});
