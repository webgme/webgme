/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

define("ifexists", {
    load: function (name, require, onload) {
        require([ name ], onload, function () {
            onload(null);
        });
    }
});

define(["ifexists!bin/decorators"], function (LOCAL_DECORATORS) {
    "use strict";

    var DECORATORS = {
        'DiagramDesigner': [
            'DefaultDecorator',
            'ModelDecorator',
            'UMLStateMachineDecorator',
    	    'SVGDecorator']
    };

    if (LOCAL_DECORATORS) {
        for ( var key in LOCAL_DECORATORS) {
            if (LOCAL_DECORATORS.hasOwnProperty(key)) {
                DECORATORS[key] = _.union(DECORATORS[key] || [], LOCAL_DECORATORS[key]);
            }
        }
    }

    //sort the decorators alphabetically
    for (var i in DECORATORS) {
        if (DECORATORS.hasOwnProperty(i)) {
            DECORATORS[i].sort();
        }
    }

    //List of available decorators for widgets that support decorators at all
    return {
        getDecoratorsByWidget : function (widget) {
            if (DECORATORS[widget]) {
                return DECORATORS[widget];
            } else {
                return [];
            }
        }
    };
});