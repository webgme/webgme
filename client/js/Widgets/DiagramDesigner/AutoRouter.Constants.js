"use strict"; 

define(['./AutoRouter.Point'], function (ArPoint){
//define([], function (){

    return {
	    "EMPTY_POINT": new ArPoint(-100000, -100000),
        "ED_MAXCOORD": 100000,
        "ED_MINCOORD": -2,//This allows connections to be still be draw when box is pressed against the edge
        "ED_SMALLGAP": 15,
        "CONNECTIONCUSTOMIZATIONDATAVERSION": 0,
        "EMPTYCONNECTIONCUSTOMIZATIONDATAMAGIC": -1,
        "DEBUG":  false,
        "BUFFER": 10,

        "EDLS_S": 15,//ED_SMALLGAP
        "EDLS_R": 15 + 1, //ED_SMALLGAP+1
        "EDLS_D": 100000 + 2,//ED_MAXCOORD - ED_MINCOORD,

        "ARPATH_EndOnDefault": 0x0000,
        "ARPATH_EndOnTop": 0x0010,
        "ARPATH_EndOnRight": 0x0020,
        "ARPATH_EndOnBottom": 0x0040,
        "ARPATH_EndOnLeft": 0x0080,
        "ARPATH_EndMask": (0x0010 | 0x0020 | 0x0040 | 0x0080),//(ARPATH_EndOnTop | ARPATH_EndOnRight | ARPATH_EndOnBottom | ARPATH_EndOnLeft),

        "ARPATH_StartOnDefault": 0x0000,
        "ARPATH_StartOnTop": 0x0100,
        "ARPATH_StartOnRight": 0x0200,
        "ARPATH_StartOnBottom": 0x0400,
        "ARPATH_StartOnLeft": 0x0800,
        "ARPATH_StartMask": (0x0100 | 0x0200 | 0x0400 | 0x0800),//(ARPATH_StartOnTop | ARPATH_StartOnRight | ARPATH_StartOnBottom | ARPATH_StartOnLeft),

        "ARPATH_HighLighted": 0x0002,		// attributes,
        "ARPATH_Fixed": 0x0001,
        "ARPATH_Default": 0x0000,

        "ARPATHST_Connected": 0x0001,		// states,
        "ARPATHST_Default": 0x0000,

        // Port Connection Variables
        "ARPORT_EndOnTop": 0x0001,
        "ARPORT_EndOnRight": 0x0002,
        "ARPORT_EndOnBottom": 0x0004,
        "ARPORT_EndOnLeft": 0x0008,
        "ARPORT_EndOnAll": 0x000F,

        "ARPORT_StartOnTop": 0x0010,
        "ARPORT_StartOnRight": 0x0020,
        "ARPORT_StartOnBottom": 0x0040,
        "ARPORT_StartOnLeft": 0x0080,
        "ARPORT_StartOnAll": 0x00F0,

        "ARPORT_ConnectOnAll": 0x00FF,
        "ARPORT_ConnectToCenter": 0x0100,

        "ARPORT_StartEndHorizontal": 0x00AA,
        "ARPORT_StartEndVertical": 0x0055,

        "ARPORT_Default": 0x00FF,

        //RoutingDirection vars 
        "Dir_None": -1,
        "Dir_Top": 0,
        "Dir_Right": 1,
        "Dir_Bottom": 2,
        "Dir_Left": 3,
        "Dir_Skew": 4,

        //Path Custom Data
        "SimpleEdgeDisplacement": "EdgeDisplacement",
        "CustomPointCustomization": "PointCustomization"
        //CONNECTIONCUSTOMIZATIONDATAVERSION : null
    };

});

