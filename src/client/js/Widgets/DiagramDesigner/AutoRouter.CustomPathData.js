/*globals define*/
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * @author brollb / https://github/brollb
 */

define(['common/LogManager',
           'common/util/assert',
           './AutoRouter.Utils',
           './AutoRouter.Constants'], function ( logManager, assert, UTILS,
                                                CONSTANTS) {

    'use strict'; 

    var AutoRouterCustomPathData = function (_x, _y){
        this.edgeIndex = 0;
        this.edgeCount = 0;
        this.type = CONSTANTS.CustomPointCustomization; //By default, it is a point
        this.horizontalOrVerticalEdge = false;
        this.x = _x;
        this.y = _y;
    };

    //Functions
    AutoRouterCustomPathData.prototype.assign = function(other){
        this.edgeIndex					= other.edgeIndex;
        this.edgeCount					= other.edgeCount;
        this.type						= other.type;
        this.horizontalOrVerticalEdge	= other.horizontalOrVerticalEdge;
        this.x							= other.x;
        this.y							= other.y;

        return this;
    };

    return AutoRouterCustomPathData;
});

