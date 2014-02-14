/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";
/*
 * STRING CONSTANT DEFINITIONS USED IN METAEDITOR CONTROLLER
 */

define(['js/Constants'], function (CONSTANTS) {

    //return string constants
    return {
        META_ASPECT_SET_NAME : 'MetaAspectSet',
        RESERVED_POINTER_NAMES : [CONSTANTS.POINTER_BASE],
        META_ASPECT_CONTAINER_ID: CONSTANTS.PROJECT_ROOT_ID,
        META_ASPECT_SHEET_NAME_PREFIX : 'MetaAspectSet_'
    };
});