"use strict"; 

define(['logManager'
        //'./AutoRouter.Point',
        /*'./AutoRouter.Rect'*/], function (logManager
                                            //ArPoint,
                                            /*ArRect*/) {

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
        if( this.cx === otherSize.cx && this.cy === otherSize.cy)
            return true;

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

    ArSize.prototype.subtract = function(otherSize){
        this.cx -= otherSize.cx;
        this.cy -= otherSize.cy;
    };

/*
    ArSize.prototype.plus = function(otherObject){ //equivalent to +
        var objectCopy = undefined;

        if(otherObject instanceof ArSize){
            objectCopy = new ArSize(otherObject);
            objectCopy.add(this);

        }else if(otherObject instanceof ArPoint){
            objectCopy = new ArPoint(otherObject);
            objectCopy.x += this.cx;
            objectCopy.y += this.cy;

        }else if(otherObject instanceof ArRect){
            objectCopy = new ArRect(otherObject);
            objectCopy.add(this);

        }

        return objectCopy;
    };

    ArSize.prototype.minus = function(otherObject){ //equivalent to -
        var objectCopy = undefined;

        if(otherObject instanceof ArSize){
            objectCopy = new ArSize(otherObject);
            objectCopy.subtract(this);

        }else if(otherObject instanceof ArPoint){
            objectCopy = new ArPoint(otherObject);
            objectCopy.x -= this.cx;
            objectCopy.y -= this.cy;

        }else if(otherObject instanceof ArRect){
            objectCopy = new ArRect(otherObject);
            objectCopy.subtract(this);

        }

        return objectCopy;
    };

*/
    ArSize.prototype.assign = function(otherSize){
        this.cx = otherSize.cx;
        this.cy = otherSize.cy;
    };

    ArSize.prototype.getArray = function(){
        var res = [];
        res.push(this.cx);
        res.push(this.cy);
        return res;
    };

    return ArSize;
});
