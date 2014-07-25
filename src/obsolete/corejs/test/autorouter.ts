/**
 * Copyright (C) Vanderbilt University, 1997-2013.
 * 
 * Author: Miklos Maroti
 */

interface Rect {
	x0 : number;
	y0 : number;
	x1 : number;
	y1 : number;
}

interface Port {
	owner : any;
	rect : Rect;
	attributes : PORTDIRS;
}

enum DIR {
	NONE = -1,
	TOP = 0,
	RIGHT = 1,
	BOTTOM = 2,
	LEFT = 3
}

enum PORTDIRS {
	END_ON_TOP = 0x0001,
	END_ON_RIGHT = 0x0002,
	END_ON_BOTTOM = 0x0004,
	END_ON_LEFT = 0x0008,
	END_ON_ALL = 0x000F,
	START_ON_TOP = 0x0010,
	START_ON_RIGHT = 0x0020,
	START_ON_BOTTOM = 0x0040,
	START_ON_LEFT = 0x0080,
	START_ON_ALL = 0x00F0,
	CONNECT_ON_ALL = 0x00FF,
	CONNECT_TO_CENTER = 0x0100,
	START_END_HORIZONTAL = 0x00AA,
	START_END_VERTICAL = 0x0055,
	DEFAULT = 0x00FF,
}

declare var define;
define([ "core/assert" ], function (ASSERT) {
	"use strict";

	var MINCOORD = 0;
	var MAXCOORD = 100000;
	var SMALLGAP = 15;

	// ------- Rect -------

	function isRectEmpty (rect : Rect) {
		return rect.x0 >= rect.x1 || rect.y0 >= rect.y1;
	}

	// ------- Port -------

	function createPort() : Port {
		return {
			owner: null,
			rect: {
				x0: 0,
				y0: 0,
				x1: 0,
				y1: 0
			},
			attributes: PORTDIRS.DEFAULT
		};
	}

	function canHaveStartEndPointOn (port : Port, dir : DIR, isstart : bool) {
		ASSERT(0 <= dir && dir <= 3);

		if( isstart ) {
			dir += 4;
		}

		return (port.attributes & (1 << dir)) !== 0;
	}

	function canHaveStartEndPoint (port : Port, isstart : bool) {
		return (port.attributes & (isstart ? PORTDIRS.START_ON_ALL : PORTDIRS.END_ON_ALL)) !== 0;
	}

	function CanHaveStartEndPointHorizontal (port, ishorizontal) {
		return (port.attributes & (ishorizontal ? PORTDIRS.START_END_HORIZONTAL
		: PORTDIRS.START_END_VERTICAL)) !== 0;
	}

	function GetStartEndDirTo (port, point, isstart, notthis) {
		ASSERT(!isRectEmpty(port.rect));
	}

	// ASSERT( !IsRectEmpty() );
	//
	// CSize offset = point - rect.CenterPoint();
	//
	// EArDir dir1 = GetMajorDir(offset);
	//
	// if( dir1 != notthis && CanHaveStartEndPointOn(dir1, isstart) )
	// return dir1;
	//
	// EArDir dir2 = GetMinorDir(offset);
	//
	// if( dir2 != notthis && CanHaveStartEndPointOn(dir2, isstart) )
	// return dir2;
	//
	// EArDir dir3 = ReverseDir(dir2);
	//
	// if( dir3 != notthis && CanHaveStartEndPointOn(dir3, isstart) )
	// return dir3;
	//
	// EArDir dir4 = ReverseDir(dir1);
	//
	// if( dir4 != notthis && CanHaveStartEndPointOn(dir4, isstart) )
	// return dir4;
	//
	// if( CanHaveStartEndPointOn(dir1, isstart) )
	// return dir1;
	//
	// if( CanHaveStartEndPointOn(dir2, isstart) )
	// return dir2;
	//
	// if( CanHaveStartEndPointOn(dir3, isstart) )
	// return dir3;
	//
	// if( CanHaveStartEndPointOn(dir4, isstart) )
	// return dir4;
	//
	// return Dir_Top;
	// }

});
