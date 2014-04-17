"use strict"; 

define(['logManager',
	    'util/assert',
        './AutoRouter.Constants',
        './AutoRouter.Utils',
        './AutoRouter.Point'], function (logManager,
										    assert,
                                            CONSTANTS,
                                            UTILS,
                                            ArPoint) {


    var ArPointListPath = function (){
        //I will be using a wrapper to give this object array functionality
        //Ideally, I would inherit but this avoids some of the issues with
        //inheriting from arrays in js (currently anyway)
        this.ArPointList = [];
    };


    //Wrapper Functions
    ArPointListPath.prototype.getLength = function(){
        return this.ArPointList.length;
    };

    ArPointListPath.prototype.getArPointList = function(){
        return this.ArPointList;
    };

    ArPointListPath.prototype.setArPointList = function(list){
        this.ArPointList = list;
    };

    ArPointListPath.prototype.get = function(index){
        return this.ArPointList[index];
    };

    ArPointListPath.prototype.push = function(element){
        if(CONSTANTS.DEBUG && this.ArPointList.length > 0){
            assert(element[0].x === this.ArPointList[this.ArPointList.length - 1][0].x ||
                    element[0].y === this.ArPointList[this.ArPointList.length - 1][0].y, "ArPointListPath.push: point does not create horizontal or vertical edge!");
        }
        if(element instanceof Array)
            this.ArPointList.push(element);
        else
            this.ArPointList.push([element]);
    };

    ArPointListPath.prototype.indexOf = function(element){
        return this.ArPointList.indexOf(element);
    };

    ArPointListPath.prototype.concat = function(element){
        return this.ArPointList.concat(element);
    };

    ArPointListPath.prototype.splice = function(start, amt, insert){
        var res;
        if(insert !== undefined){
            res = this.ArPointList.splice(start, amt, insert);
        }else
            res = this.ArPointList.splice(start, amt);

        return res;
    };

    //Functions
    ArPointListPath.prototype.getHeadEdge = function(start, end){

        var pos = this.ArPointList.length;
        if( this.ArPointList.length < 2 )
            return pos;

        pos = 0;
        assert( pos < this.ArPointList.length, "ArPointListPath.getHeadEdge: pos < this.ArPointList.length FAILED");

        start = this.ArPointList[pos++];
        assert( pos < this.ArPointList.length, "ArPointListPath.getHeadEdge: pos < this.ArPointList.length FAILED");

        end = this.ArPointList[pos];

        return pos;
    };

    ArPointListPath.prototype.getTailEdge = function(start, end){
        if( this.ArPointList.length < 2 )
            return this.ArPointList.length ;

        var pos = this.ArPointList.length;
        assert( --pos < this.ArPointList.length, "ArPointListPath.getHeadEdge: --pos < this.ArPointList.length FAILED" );

        end = this.ArPointList[pos--];
        assert( pos < this.ArPointList.length, "ArPointListPath.getHeadEdge: pos < this.ArPointList.length FAILED" );

        start = this.ArPointList[pos];

        return { "pos": pos, "start": start, "end": end };
    };

    ArPointListPath.prototype.getNextEdge = function(pos, start, end){
        if(CONSTANTS.DEBUG)
            this.AssertValidPos(pos);

        pos++;
        assert( pos < this.ArPointList.length, "ArPointListPath.getNextEdge: pos < this.ArPointList.length FAILED");

        var p = pos;
        start = this.ArPointList[p++];
        if( p === this.ArPointList.length)
            pos = this.ArPointList.length;
        else
            end = this.ArPointList[p];
    };

    ArPointListPath.prototype.getPrevEdge = function(pos, start, end){
        if(CONSTANTS.DEBUG)
            this.AssertValidPos(pos);

        end = this.ArPointList[pos--];
        if( pos != this.ArPointList.length)
            start = this.ArPointList[pos];

        return { "pos": pos, "start": start, "end": end };
    };

    ArPointListPath.prototype.getEdge = function(pos, start, end){
        if(CONSTANTS.DEBUG)
            this.AssertValidPos(pos);

        start = this.ArPointList[pos++];
        assert( pos < this.ArPointList.length, "ArPointListPath.getEdge: pos < this.ArPointList.length FAILED" );

        end = this.ArPointList[pos];
    };

    ArPointListPath.prototype.getHeadEdgePtrs = function(start, end){
        if( this.ArPointList.length < 2 )
            return { 'pos': this.ArPointList.length };

        var start,
            end,
            pos = 0;
        assert( pos < this.ArPointList.length, "ArPointListPath.getHeadEdgePtrs: pos < this.ArPointList.length FAILED");

        start = this.ArPointList[pos++];
        assert( pos < this.ArPointList.length, "ArPointListPath.getHeadEdgePtrs: pos < this.ArPointList.length FAILED");

        end = this.ArPointList[pos];

        return { 'pos': pos, 'start': start, 'end': end };
    };

    ArPointListPath.prototype.getTailEdgePtrs = function(){
        var pos = this.ArPointList.length,
            start,
            end;

        if( this.ArPointList.length < 2 ){
            return { 'pos': pos };
        }

        assert( --pos < this.ArPointList.length, "ArPointListPath.getTailEdgePtrs: --pos < this.ArPointList.length FAILED");

        end = this.ArPointList[pos--];
        assert( pos < this.ArPointList.length, "ArPointListPath.getTailEdgePtrs: pos < this.ArPointList.length FAILED");

        start = this.ArPointList[pos];

        return { 'pos': pos, 'start': start, 'end': end };
    };

    ArPointListPath.prototype.getNextEdgePtrs = function(pos, start, end){
        if(CONSTANTS.DEBUG)
            this.AssertValidPos(pos);

        start = this.ArPointList[pos++];
        if (pos < this.ArPointList.length)
            end = this.ArPointList[pos];

        return { 'pos': pos, 'start': start, 'end': end };
    };

    ArPointListPath.prototype.getPrevEdgePtrs = function(pos){
        var result = {},
            start,
            end;

        if(CONSTANTS.DEBUG)
            this.AssertValidPos(pos);

        end = this.ArPointList[pos];//&

        if( pos-- > 0)
            start = this.ArPointList[pos];//&

        result.pos = pos;
        result.start = start;
        result.end = end;
        return result;
    };

    ArPointListPath.prototype.getEdgePtrs = function(pos, start, end){
        if(CONSTANTS.DEBUG)
            this.AssertValidPos(pos);

        start.assign(this.ArPointList[pos++]);
        assert( pos < this.ArPointList.length, "ArPointListPath.getEdgePtrs: pos < this.ArPointList.length FAILED");

        end.assign(this.ArPointList[pos]);
    };

    ArPointListPath.prototype.getStartPoint = function(pos){
        if(CONSTANTS.DEBUG)
            this.AssertValidPos(pos);

        return this.ArPointList[pos];//&
    };

    ArPointListPath.prototype.getEndPoint = function(pos){
        if(CONSTANTS.DEBUG)
            this.AssertValidPos(pos);

        pos++;
        assert( pos < this.ArPointList.length, "ArPointListPath.getEndPoint: pos < this.ArPointList.length FAILED" );

        return this.ArPointList[pos];//&
    };

    ArPointListPath.prototype.getPointBeforeEdge = function(pos){
        if(CONSTANTS.DEBUG)
            this.AssertValidPos(pos);

        pos--;
        if( pos === this.ArPointList.length)
            return null;

        return this.ArPointList[pos]; //&
    };

    ArPointListPath.prototype.getPointAfterEdge = function(pos){
        if(CONSTANTS.DEBUG)
            this.AssertValidPos(pos);

        pos++;
        assert( pos < this.ArPointList.length, "ArPointListPath.getPointAfterEdge: pos < this.ArPointList.length FAILED");

        pos++;
        if( pos === this.ArPointList.length )
            return null;

        return this.ArPointList[pos];//&
    };

    ArPointListPath.prototype.getEdgePosBeforePoint = function(pos){
        if(CONSTANTS.DEBUG)
            this.AssertValidPos(pos);

        pos--;
        return pos;
    };

    ArPointListPath.prototype.getEdgePosAfterPoint = function(pos){
        if(CONSTANTS.DEBUG)
            this.AssertValidPos(pos);

        var p = pos + 1;

        if( p === this.ArPointList.length )
            return this.ArPointList.length;

        return pos;
    };

    ArPointListPath.prototype.getEdgePosForStartPoint = function(start){
        var pos = 0;
        while( pos < this.ArPointList.length )
        {
            if( this.ArPointList[pos++] === start)
            {
                assert( pos < this.ArPointList.length, "ArPointListPath.getEdgePosForStartPoint: pos < this.ArPointList.length FAILED" );
                pos--;
                break;
            }
        }

        assert( pos < this.ArPointList.length, "ArPointListPath.getEdgePosForStartPoint: pos < this.ArPointList.length FAILED" );
        return pos;
    };

    ArPointListPath.prototype.assertValid = function(){
        //Check to make sure each point makes a horizontal/vertical line with it's neighbors
        var i = this.ArPointList.length - 1;
        while(i--){
            if(!UTILS.isRightAngle(UTILS.getDir(this.ArPointList[i+1][0].minus(this.ArPointList[i][0]))))
                throw "ArPointListPath contains skew edge";
        }
    };

    ArPointListPath.prototype.assertValidPos = function(pos){
        assert( pos < this.ArPointList.length, "ArPointListPath.assertValidPos: pos < this.ArPointList.length FAILED" );

        var p = 0;
        for(;;)
        {
            assert( pos < this.ArPointList.length, "ArPointListPath.assertValidPos: pos < this.ArPointList.length FAILED" );
            if( p === pos )
                return;

            p++;
        }
    };

    ArPointListPath.prototype.dumpPoints = function(msg){
        console.log(msg + ", points dump begin:");
        var pos = 0,
            i = 0,
            p;
        while(pos < this.ArPointList.length) {
            p = this.ArPointList[pos++][0];
            console.log(i + ".: (" + p.x + ", " + p.y + ")");
            i++;
        }
        console.log("points dump end.");
    };

    return ArPointListPath;
});

