/*globals define*/
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * @author brollb / https://github/brollb
 */

define(['common/LogManager',
	    'common/util/assert',
        './AutoRouter.Constants',
        './AutoRouter.Utils'], function (logManager,
                                         assert,
                                         CONSTANTS,
                                         Utils) {


    'use strict'; 

    var _logger = logManager.create('AutoRouterPointList');
    var array = [];
    var ArPointListPath = function () {
    };

    ArPointListPath.prototype = array;

    // Wrapper Functions
    ArPointListPath.prototype.concat = function(list) {
        var newPoints = new ArPointListPath(),
            i;

        for (i = 0; i < this.length; i++) {
            newPoints.push(this[i]);
        }

        for (i = 0; i < list.length; i++) {
            newPoints.push(list[i]);
        }
        return newPoints;
    };

    // Functions

    ArPointListPath.prototype.end = function() {
        return this[this.length-1];
    };

    ArPointListPath.prototype.getHeadEdge = function(start, end) {

        var pos = this.length;
        if (this.length < 2) {
            return pos;
        }

        pos = 0;
        assert( pos < this.length, 'ArPointListPath.getHeadEdge: pos < this.length FAILED');

        start = this[pos++];
        assert( pos < this.length, 'ArPointListPath.getHeadEdge: pos < this.length FAILED');

        end = this[pos];

        return pos;
    };

    ArPointListPath.prototype.getTailEdge = function() {
        if ( this.length < 2 ) {
            return this.length ;
        }

        var pos = this.length-1,
            end = this[pos--],
            start = this[pos];

        return { 'pos': pos, 'start': start, 'end': end };
    };

    ArPointListPath.prototype.getNextEdge = function(pos, start, end) {
        if (CONSTANTS.DEBUG) {
            this.AssertValidPos(pos);
        }

        pos++;
        assert( pos < this.length, 'ArPointListPath.getNextEdge: pos < this.length FAILED');

        var p = pos;
        start = this[p++];
        if ( p === this.length) {
            pos = this.length;
        } else {
            end = this[p];
        }
    };

    ArPointListPath.prototype.getPrevEdge = function(pos, start, end) {
        if (CONSTANTS.DEBUG) {
            this.AssertValidPos(pos);
        }

        end = this[pos--];
        if ( pos !== this.length) {
            start = this[pos];
        }

        return { 'pos': pos, 'start': start, 'end': end };
    };

    ArPointListPath.prototype.getEdge = function(pos, start, end) {
        if (CONSTANTS.DEBUG) {
            this.AssertValidPos(pos);
        }

        start = this[pos++];
        assert( pos < this.length, 'ArPointListPath.getEdge: pos < this.length FAILED' );

        end = this[pos];
    };

    ArPointListPath.prototype.getHeadEdgePtrs = function(start, end) {
        if ( this.length < 2 ) {
            return { 'pos': this.length };
        }

        var pos = 0;

        assert( pos < this.length, 'ArPointListPath.getHeadEdgePtrs: pos < this.length FAILED');

        start = this[pos++];
        assert( pos < this.length, 'ArPointListPath.getHeadEdgePtrs: pos < this.length FAILED');

        end = this[pos];

        return { 'pos': pos, 'start': start, 'end': end };
    };

    ArPointListPath.prototype.getTailEdgePtrs = function() {
        var pos = this.length,
            start,
            end;

        if ( this.length < 2 ) {
            return { 'pos': pos };
        }

        assert( --pos < this.length, 'ArPointListPath.getTailEdgePtrs: --pos < this.length FAILED');

        end = this[pos--];
        assert( pos < this.length, 'ArPointListPath.getTailEdgePtrs: pos < this.length FAILED');

        start = this[pos];

        return { 'pos': pos, 'start': start, 'end': end };
    };

    ArPointListPath.prototype.getNextEdgePtrs = function(pos, start, end) {
        if (CONSTANTS.DEBUG) {
            this.AssertValidPos(pos);
        }

        start = this[pos++];
        if (pos < this.length) {
            end = this[pos];
        }

        return { 'pos': pos, 'start': start, 'end': end };
    };

    ArPointListPath.prototype.getPrevEdgePtrs = function(pos) {
        var start,
            end;

        if (CONSTANTS.DEBUG) {
            this.AssertValidPos(pos);
        }

        end = this[pos];

        if (pos-- > 0) {
            start = this[pos];
        }

        return {pos: pos, start: start, end: end};
    };

    ArPointListPath.prototype.getEdgePtrs = function(pos, start, end) {
        if (CONSTANTS.DEBUG) {
            this.AssertValidPos(pos);
        }

        start.assign(this[pos++]);
        assert( pos < this.length, 'ArPointListPath.getEdgePtrs: pos < this.length FAILED');

        end.assign(this[pos]);
    };

    ArPointListPath.prototype.getStartPoint = function(pos) {
        if (CONSTANTS.DEBUG) {
            this.AssertValidPos(pos);
        }

        return this[pos];
    };

    ArPointListPath.prototype.getEndPoint = function(pos) {
        if (CONSTANTS.DEBUG) {
            this.AssertValidPos(pos);
        }

        pos++;
        assert( pos < this.length, 
               'ArPointListPath.getEndPoint: pos < this.length FAILED' );

        return this[pos];
    };

    ArPointListPath.prototype.getPointBeforeEdge = function(pos) {
        if (CONSTANTS.DEBUG) {
            this.AssertValidPos(pos);
        }

        pos--;
        if (pos === this.length) {
            return null;
        }

        return this[pos]; 
    };

    ArPointListPath.prototype.getPointAfterEdge = function(pos) {
        if (CONSTANTS.DEBUG) {
            this.AssertValidPos(pos);
        }

        pos++;
        assert(pos < this.length, 
               'ArPointListPath.getPointAfterEdge: pos < this.length FAILED');

        pos++;
        if (pos === this.length ) {
            return null;
        }

        return this[pos];
    };

    ArPointListPath.prototype.getEdgePosBeforePoint = function(pos) {
        if (CONSTANTS.DEBUG) {
            this.AssertValidPos(pos);
        }

        pos--;
        return pos;
    };

    ArPointListPath.prototype.getEdgePosAfterPoint = function(pos) {
        if (CONSTANTS.DEBUG) {
            this.AssertValidPos(pos);
        }

        var p = pos + 1;

        if (p === this.length) {
            return this.length;
        }

        return pos;
    };

    ArPointListPath.prototype.getEdgePosForStartPoint = function(start) {
        var pos = 0;
        while (pos < this.length) {
            if (this[pos++] === start) {
                assert(pos < this.length, 'ArPointListPath.getEdgePosForStartPoint: pos < this.length FAILED');
                pos--;
                break;
            }
        }

        assert(pos < this.length, 'ArPointListPath.getEdgePosForStartPoint: pos < this.length FAILED');
        return pos;
    };

    ArPointListPath.prototype.assertValid = function(msg) {
        // Check to make sure each point makes a horizontal/vertical line with it's neighbors
        msg = msg || '';
        for (var i = this.length-1; i > 0; i--) {
            assert(!!this[i].minus, 'Bad value at position '+i+' ('+Utils.stringify(this[i])+')');
            assert(!!this[i-1].minus, 'Bad value at position '+(i-1)+' ('+Utils.stringify(this[i-1])+')');

            assert(Utils.isRightAngle(Utils.getDir(this[i-1].minus(this[i]))), 
                msg+'\n\tArPointListPath contains skew edge:\n'+Utils.stringify(this));
        }
    };

    ArPointListPath.prototype.assertValidPos = function(pos) {
        assert(pos < this.length, 'ArPointListPath.assertValidPos: pos < this.length FAILED' );
    };

    ArPointListPath.prototype.dumpPoints = function(msg) {
        _logger.debug(msg + ', points dump begin:');
        var pos = 0,
            i = 0,
            p;
        while (pos < this.length) {
            p = this[pos++];
            _logger.debug(i + '.: (' + p.x + ', ' + p.y + ')');
            i++;
        }
        _logger.debug('points dump end.');
    };

    return ArPointListPath;
});

