"use strict";

define(['logManager',
        './AutoRouter.Size'], function (logManager,
                                            ArSize) {

    var ArPoint = function (x, y){
        //Multiple Constructors
        if(x === undefined){ //No arguments were passed to constructor
            x = 0;
            y = 0;
        }else if(y === undefined){ //One argument passed to constructor
            y = x.y;
            x = x.x;
        }

        this.x = Math.round(x);
        this.y = Math.round(y);
    };

    ArPoint.prototype.equals = function (otherPoint){
        if( this.x === otherPoint.x && this.y === otherPoint.y)
            return true;

        return false;
    };

    ArPoint.prototype.offset = function (x, y){
        if(y !== undefined){ //two arguments are sent to function
            x = new ArSize(x, y);
        }

        this.add(x);
    };

    ArPoint.prototype.add = function (otherObject){ //equivalent to +=
        if(otherObject instanceof ArSize){
            this.x += otherObject.cx;
            this.y += otherObject.cy;
        }else if(otherObject instanceof ArPoint){
            this.x += otherObject.x;
            this.y += otherObject.y;
        }

        this.x = Math.round(x);
        this.y = Math.round(y);
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
        var objectCopy = undefined;

        if(otherObject instanceof ArSize){
            objectCopy = new ArPoint(this);
            objectCopy.add(otherObject);

        }else if(otherObject instanceof ArPoint){
            objectCopy = new ArPoint(otherObject);
            objectCopy.x += this.x;
            objectCopy.y += this.y;

        }//else if(otherObject instanceof ArRect){
            //objectCopy = new ArRect(otherObject);
            //objectCopy.add(this);
        //}

        return objectCopy;
    };

    ArPoint.prototype.minus = function (otherObject){
        var objectCopy;

        if(otherObject instanceof ArSize){
            objectCopy = new ArPoint(otherObject);
            objectCopy.subtract(this);

        }else if(otherObject instanceof ArPoint){
            objectCopy = new ArSize();
            objectCopy.cx = this.x - otherObject.x;
            objectCopy.cy = this.y - otherObject.y;

        }//else if(otherObject instanceof ArRect){
          //  objectCopy = new ArRect(otherObject);
           // objectCopy.subtract(this);

        //}

        return objectCopy;
    };

    ArPoint.prototype.assign = function (otherPoint){
        this.x = otherPoint.x;
        this.y = otherPoint.y;

        return this;
    };

    return ArPoint;
});
