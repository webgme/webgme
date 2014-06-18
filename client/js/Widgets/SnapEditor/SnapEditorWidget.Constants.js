"use strict";
/*
 * STRING CONSTANT DEFINITIONS USED IN SNAP EDITOR
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
         * May need to change some of these (if I don't use the "designer item")
         */
        DESIGNER_ITEM_CLASS : "clickable-item",
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

        /*COLORING OF ITEMS*/
        COLOR_PRIMARY: 'primary',
        COLOR_SECONDARY: 'secondary'
    };
});
