/*globals define*/
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * @author brollb / https://github/brollb
 */

define(['./AutoRouter.Point'], function (ArPoint){

    'use strict'; 

    return {
        EMPTY_POINT: new ArPoint(-100000, -100000),
        ED_MAXCOORD: 100000,
        ED_MINCOORD: -2,//This allows connections to be still be draw when box is pressed against the edge
        ED_SMALLGAP: 15,
        CONNECTIONCUSTOMIZATIONDATAVERSION: 0,
        EMPTYCONNECTIONCUSTOMIZATIONDATAMAGIC: -1,
        DEBUG:  false,
        BUFFER: 10,

        EDLS_S: 15,//ED_SMALLGAP
        EDLS_R: 15 + 1, //ED_SMALLGAP+1
        EDLS_D: 100000 + 2,//ED_MAXCOORD - ED_MINCOORD,

        PathEndOnDefault: 0x0000,
        PathEndOnTop: 0x0010,
        PathEndOnRight: 0x0020,
        PathEndOnBottom: 0x0040,
        PathEndOnLeft: 0x0080,
        PathEndMask: (0x0010 | 0x0020 | 0x0040 | 0x0080),  // (PathEndOnTop | PathEndOnRight | PathEndOnBottom | PathEndOnLeft),

        PathStartOnDefault: 0x0000,
        PathStartOnTop: 0x0100,
        PathStartOnRight: 0x0200,
        PathStartOnBottom: 0x0400,
        PathStartOnLeft: 0x0800,
        PathStartMask: (0x0100 | 0x0200 | 0x0400 | 0x0800),  // (PathStartOnTop | PathStartOnRight | PathStartOnBottom | PathStartOnLeft),

        PathHighLighted: 0x0002,		// attributes,
        PathFixed: 0x0001,
        PathDefault: 0x0000,

        PathStateConnected: 0x0001,		// states,
        PathStateDefault: 0x0000,

        // Port Connection Variables
        PortEndOnTop: 0x0001,
        PortEndOnRight: 0x0002,
        PortEndOnBottom: 0x0004,
        PortEndOnLeft: 0x0008,
        PortEndOnAll: 0x000F,

        PortStartOnTop: 0x0010,
        PortStartOnRight: 0x0020,
        PortStartOnBottom: 0x0040,
        PortStartOnLeft: 0x0080,
        PortStartOnAll: 0x00F0,

        PortConnectOnAll: 0x00FF,
        PortConnectToCenter: 0x0100,

        PortStartEndHorizontal: 0x00AA,
        PortStartEndVertical: 0x0055,

        PortDefault: 0x00FF,

        // RoutingDirection vars 
        DirNone: -1,
        DirTop: 0,
        DirRight: 1,
        DirBottom: 2,
        DirLeft: 3,
        DirSkew: 4,
        
        //Path Custom Data
        SimpleEdgeDisplacement: 'EdgeDisplacement',
        CustomPointCustomization: 'PointCustomization'
        //CONNECTIONCUSTOMIZATIONDATAVERSION : null
    };

});

