/*globals define*/
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * @author brollb / https://github/brollb
 */

define([], function () {
                                            
    'use strict'; 

    var ArSize = function (x, y){
        //Multiple Constructors
        if(x === undefined){ //No arguments were passed to constructor
            x = 0;
            y = 0;
        }else if(y === undefined){ //One argument passed to constructor
            y = x.cy;
            x = x.cx;
        }

        this.cx = x;
        this.cy = y;
    };

    ArSize.prototype.equals = function(otherSize){
        if( this.cx === otherSize.cx && this.cy === otherSize.cy){
            return true;
        }

        return false;
    };

    ArSize.prototype.add = function(otherSize){ //equivalent to +=
        if(otherSize.cx || otherSize.cy){
            this.cx += otherSize.cx;
            this.cy += otherSize.cy;
        }
        if(otherSize.x || otherSize.y){
            this.cx += otherSize.x;
            this.cy += otherSize.y;
        }
    };

    ArSize.prototype.getArray = function(){
        var res = [];
        res.push(this.cx);
        res.push(this.cy);
        return res;
    };

    return ArSize;
});
