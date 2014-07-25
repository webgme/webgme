var DIR;
(function (DIR) {
    DIR._map = [];
    DIR.NONE = -1;
    DIR.TOP = 0;
    DIR.RIGHT = 1;
    DIR.BOTTOM = 2;
    DIR.LEFT = 3;
})(DIR || (DIR = {}));

var PORTDIRS;
(function (PORTDIRS) {
    PORTDIRS._map = [];
    PORTDIRS.END_ON_TOP = 1;
    PORTDIRS.END_ON_RIGHT = 2;
    PORTDIRS.END_ON_BOTTOM = 4;
    PORTDIRS.END_ON_LEFT = 8;
    PORTDIRS.END_ON_ALL = 15;
    PORTDIRS.START_ON_TOP = 16;
    PORTDIRS.START_ON_RIGHT = 32;
    PORTDIRS.START_ON_BOTTOM = 64;
    PORTDIRS.START_ON_LEFT = 128;
    PORTDIRS.START_ON_ALL = 240;
    PORTDIRS.CONNECT_ON_ALL = 255;
    PORTDIRS.CONNECT_TO_CENTER = 256;
    PORTDIRS.START_END_HORIZONTAL = 170;
    PORTDIRS.START_END_VERTICAL = 85;
    PORTDIRS.DEFAULT = 255;
})(PORTDIRS || (PORTDIRS = {}));

define([
    "core/assert"
], function (ASSERT) {
    "use strict";
    var MINCOORD = 0;
    var MAXCOORD = 100000;
    var SMALLGAP = 15;
    function isRectEmpty(rect) {
        return rect.x0 >= rect.x1 || rect.y0 >= rect.y1;
    }
    function createPort() {
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
    function canHaveStartEndPointOn(port, dir, isstart) {
        ASSERT(0 <= dir && dir <= 3);
        if(isstart) {
            dir += 4;
        }
        return (port.attributes & (1 << dir)) !== 0;
    }
    function canHaveStartEndPoint(port, isstart) {
        return (port.attributes & (isstart ? PORTDIRS.START_ON_ALL : PORTDIRS.END_ON_ALL)) !== 0;
    }
    function CanHaveStartEndPointHorizontal(port, ishorizontal) {
        return (port.attributes & (ishorizontal ? PORTDIRS.START_END_HORIZONTAL : PORTDIRS.START_END_VERTICAL)) !== 0;
    }
    function GetStartEndDirTo(port, point, isstart, notthis) {
        ASSERT(!isRectEmpty(port.rect));
    }
});
//@ sourceMappingURL=autorouter.js.map
