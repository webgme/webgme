/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

/*
 * Utility helper functions implementing GME concepts...
 */

define(['js/Constants',
        'js/NodePropertyNames',
        'js/RegistryKeys'], function (CONSTANTS,
                                       nodePropertyNames,
                                       REGISTRY_KEYS) {

    var FCO_REGISTRY = {};
    var FCO_ATTRIBUTES = {};


    //fill default FCO attributes
    FCO_ATTRIBUTES[nodePropertyNames.Attributes.name] = 'FCO';


    //fill default FCO registry
    FCO_REGISTRY[REGISTRY_KEYS.DECORATOR] = "";
    FCO_REGISTRY[REGISTRY_KEYS.IS_PORT] = false;
    FCO_REGISTRY[REGISTRY_KEYS.IS_ABSTRACT] = false;
    FCO_REGISTRY[REGISTRY_KEYS.SVG_ICON] = "";
    FCO_REGISTRY[REGISTRY_KEYS.PORT_SVG_ICON] = "";
    FCO_REGISTRY[REGISTRY_KEYS.DISPLAY_FORMAT] = CONSTANTS.DISPLAY_FORMAT_ATTRIBUTE_MARKER + nodePropertyNames.Attributes.name;

    //return utility functions
    return {
        FCO_ATTRIBUTES: FCO_ATTRIBUTES,
        FCO_REGISTRY: FCO_REGISTRY
    }
});