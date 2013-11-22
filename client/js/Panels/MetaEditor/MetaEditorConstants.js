/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";
/*
 * STRING CONSTANT DEFINITIONS USED IN METAEDITOR CONTROLLER
 */

define([], function () {

    var _emptyMetaEditorRegistry = function () {
        return { "Members": [],
            "MemberCoord": {}};
    };

    //return string constants
    return {
        META_EDITOR_REGISTRY_KEY: "MetaEditor",
        GET_EMPTY_META_EDITOR_REGISTRY_OBJ: _emptyMetaEditorRegistry
    };
});