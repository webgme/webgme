/*globals define*/
/*
 * @author brollb / https://github/brollb
 */

define(['./AutoRouter.Size'], function (ArSize) {

    'use strict';

    var ArPoint = function (x, y){
        // Multiple Constructors
        if(x === undefined){
            x = 0;
            y = 0;
        }else if(y === undefined){
            y = x.y;
            x = x.x;
        }

        this.x = x;
        this.y = y;
    };

    /**
     * Check if the points have the same coordinates.
     *
     * @param {ArPoint} otherPoint
     * @return {Boolean}
     */
    ArPoint.prototype.equals = function (otherPoint){
        return this.x === otherPoint.x && this.y === otherPoint.y;
    };

    ArPoint.prototype.shift = function (otherObject){ //equivalent to +=
        this.x += otherObject.dx;
        this.y += otherObject.dy;

        return this;
    };

    ArPoint.prototype.add = function (otherObject){ //equivalent to +=
        if(otherObject instanceof ArSize){
            this.x += otherObject.cx;
            this.y += otherObject.cy;
        }else if(otherObject instanceof ArPoint){
            this.x += otherObject.x;
            this.y += otherObject.y;
        }
    };

    ArPoint.prototype.subtract = function (otherObject){ //equivalent to +=
        if(otherObject instanceof ArSize){
            this.x -= otherObject.cx;
            this.y -= otherObject.cy;
        }else if(otherObject instanceof ArPoint){
            this.x -= otherObject.x;
            this.y -= otherObject.y;
        }
    };

    ArPoint.prototype.plus = function (otherObject){ //equivalent to +
        var objectCopy = null;

        if (otherObject instanceof ArSize) {
            objectCopy = new ArPoint(this);
            objectCopy.add(otherObject);

        } else if(otherObject instanceof ArPoint) {
            objectCopy = new ArPoint(otherObject);
            objectCopy.x += this.x;
            objectCopy.y += this.y;
        }
        return objectCopy || undefined;
    };

    ArPoint.prototype.minus = function (otherObject){
        var objectCopy = new ArPoint(otherObject);

        if(otherObject.cx || otherObject.cy){
            objectCopy.subtract(this);

        }else if(otherObject.x || otherObject.y){
            objectCopy = new ArSize();
            objectCopy.cx = this.x - otherObject.x;
            objectCopy.cy = this.y - otherObject.y;

        }
        return objectCopy;
    };

    ArPoint.prototype.assign = function (otherPoint){
        this.x = otherPoint.x;
        this.y = otherPoint.y;

        return this;
    };

    ArPoint.prototype.toString = function (){
        return '('+this.x+', '+this.y+')';
    };

    return ArPoint;
});
