/*globals define*/
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * @author brollb / https://github/brollb
 */

define(['logManager',
	    'util/assert',
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

    ArPointListPath.prototype.getTailEdge = function() {
        if ( this.length < 2 ) {
            return this.length ;
        }

        var pos = this.length-1,
            end = this[pos--],
            start = this[pos];

        return { 'pos': pos, 'start': start, 'end': end };
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
        msg += ', points dump begin:\n';
        var pos = 0,
            i = 0,
            p;
        while (pos < this.length) {
            p = this[pos++];
            msg += i + '.: (' + p.x + ', ' + p.y + ')\n';
            i++;
        }
        msg += 'points dump end.';
        _logger.debug(msg);
        return msg;
    };

    return ArPointListPath;
});

