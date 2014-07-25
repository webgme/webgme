/*globals define*/
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * @author brollb / https://github/brollb/
 */

define(['logManager',
           'util/assert',
           './AutoRouter.Constants',
           './AutoRouter.Utils',
           './AutoRouter.Point',
           './AutoRouter.Rect',
           './AutoRouter.Port'], function ( logManager, assert, CONSTANTS, UTILS, ArPoint, ArRect, AutoRouterPort) {

    "use strict"; 

    var AutoRouterBox = function (){
        this.owner = null;
        this.rect = new ArRect();
        this.atomic = false;
        this.selfPoints = [];
        this.ports = [];
        this.childBoxes = [];//dependent boxes
        this.mother = null;
        this.id = null;

        this.calculateSelfPoints(); //Part of initialization
    };

    AutoRouterBox.prototype.calculateSelfPoints = function (){
        this.selfPoints = [];
        this.selfPoints.push(new ArPoint(this.rect.getTopLeft()));

        this.selfPoints.push(new ArPoint( this.rect.right, this.rect.ceil));
        this.selfPoints.push(new ArPoint(this.rect.right, this.rect.floor));
        this.selfPoints.push(new ArPoint(this.rect.left, this.rect.floor));
    };

    AutoRouterBox.prototype.deleteAllPorts = function (){
        for(var i = 0; i < this.ports.length; i++){
            this.ports[i].setOwner(null);
            this.ports[i] = null;
        }

        this.ports = [];

        this.atomic = false;
    };

    AutoRouterBox.prototype.setID = function (_id){
        this.id = _id;
    };

    AutoRouterBox.prototype.getID = function (){
        return this.id;
    };

    AutoRouterBox.prototype.getOwner = function (){
        return this.owner;
    };

    AutoRouterBox.prototype.hasOwner = function (){
        return this.owner !== null;
    };

    AutoRouterBox.prototype.setOwner = function (graph){
        this.owner = graph;
    };

    AutoRouterBox.prototype.createPort = function (){
        var port = new AutoRouterPort();
        assert(port !== null, "ARBox.createPort: port !== null FAILED");

        return port;
    };

    AutoRouterBox.prototype.hasNoPort = function (){
        return this.ports.length === 0;
    };

    AutoRouterBox.prototype.getPortCount = function (){
        return this.ports.length;
    };

    AutoRouterBox.prototype.isAtomic = function (){
        return this.atomic;
    };

    AutoRouterBox.prototype.addPort = function (port){
        assert(port !== null, "ARBox.addPort: port !== null FAILED");

        if(port === null){
            return;
        }

        port.setOwner(this);
        this.ports.push(port);

        if(this.owner){//Not pointing to the ARGraph
            this.owner._addEdges(port);
        }
    };

    AutoRouterBox.prototype.deletePort = function (port){
        assert(port !== null, "ARBox.deletePort: port !== null FAILED");
        if(port === null){
            return;
        }

        var index = this.ports.indexOf(port),
            delPort,
            graph = this.owner;

        assert(index !== -1, "ARBox.deletePort: index !== -1 FAILED");

        graph.deleteEdges(port);
        delPort = this.ports.splice(index, 1)[0];
        delPort.destroy();
        delPort = null;

        this.atomic = false;

    };

    AutoRouterBox.prototype.getPortList = function (){
        return this.ports;
    };

    AutoRouterBox.prototype.getRect = function (){
        return this.rect;
        //return new ArRect(this.rect);
    };

    AutoRouterBox.prototype.isRectEmpty = function (){
        return this.rect.isRectEmpty();
    };

    AutoRouterBox.prototype.setRect = function (r){
        assert(r instanceof ArRect, "Invalthis.id arg in ARBox.setRect. Requires ArRect");

        assert( r.getWidth() >= 3 && r.getHeight() >= 3, "ARBox.setRect: r.getWidth() >= 3 && r.getHeight() >= 3 FAILED!");
        assert( r.getTopLeft().x >= CONSTANTS.ED_MINCOORD && r.getTopLeft().y >= CONSTANTS.ED_MINCOORD, "ARBox.setRect: r.getTopLeft().x >= CONSTANTS.ED_MINCOORD && r.getTopLeft().y >= CONSTANTS.ED_MAXCOORD FAILED!");
        assert( r.getBottomRight().x <= CONSTANTS.ED_MAXCOORD && r.getBottomRight().y <= CONSTANTS.ED_MAXCOORD, "ARBox.setRect:  r.getBottomRight().x <= CONSTANTS.ED_MAXCOORD && r.getBottomRight().y <= CONSTANTS.ED_MAXCOORD FAILED!");
        assert( this.ports.length === 0 || this.atomic, "ARBox.setRect: this.ports.length === 0 || this.atomic FAILED!");

        this.rect.assign(r);

        this.calculateSelfPoints();

        if(this.atomic){
            assert(this.ports.length === 1, "ARBox.setRect: this.ports.length === 1 FAILED!");
            this.ports[0].setRect(r);
        }
    };

    AutoRouterBox.prototype.setRectByPoint = function (point){
        this.shiftBy(point);
    };

    AutoRouterBox.prototype.shiftBy = function (offset){
        this.rect.add(offset);

        var i = this.ports.length;
        while(i--){
            this.ports[i].shiftBy(offset);
        }

        /*
           This is not necessary; the ARGraph will shift all children
           i = this.childBoxes.length;
           while(i--){
           this.childBoxes[i].shiftBy(offset);
           }
         */
        this.calculateSelfPoints();
    };

    AutoRouterBox.prototype.resetPortAvailability = function (){
        for(var i = 0; i < this.ports.length; i++){
            this.ports[i].resetAvailableArea();
        }
    };

    AutoRouterBox.prototype.adjustPortAvailability = function (r){
        for(var i = 0; i < this.ports.length; i++){
            this.ports[i].adjustAvailableArea(r);
        }
    };

    AutoRouterBox.prototype.getParent = function (){
        return this.mother;
    };

    AutoRouterBox.prototype.setParent = function (box){
        this.mother = box;
    };

    AutoRouterBox.prototype.addChild = function (box){
        assert(this.childBoxes.indexOf(box) === -1, "ARBox.addChild: box already is child of " + this.getID());
        this.childBoxes.push(box);
        box.setParent(this);
    };

    AutoRouterBox.prototype.removeChild = function (box){
        var i = this.childBoxes.indexOf(box);
        assert(i !== -1, "ARBox.removeChild: box isn't child of " + this.getID());
        this.childBoxes.splice(i,1)[0].setParent(null);
    };

    AutoRouterBox.prototype.clearChildren = function (){
        var i = this.childBoxes.length;
        while(i--){
            this.removeChild(this.childBoxes[i]);
        }
    };

    AutoRouterBox.prototype.getChildren = function (){
        return this.childBoxes;
    };

    AutoRouterBox.prototype.getSelfPoints = function (){
        return this.selfPoints;
    };

    AutoRouterBox.prototype.isBoxAt = function (point, nearness){
        return UTILS.UTILS.isPointIn(point, this.rect, nearness);
    };

    AutoRouterBox.prototype.isBoxClip = function (r){
        return UTILS.isRectClip (this.rect, r);
    };

    AutoRouterBox.prototype.isBoxIn = function (r){
        return UTILS.isRectIn(this.rect, r);
    };

    AutoRouterBox.prototype.destroy = function (){
        var i = this.childBoxes.length;

        //notify this.mother of destruction
        //if there is a this.mother, of course
        if(this.mother){
            this.mother.removeChild(this);
        }

        this.setOwner(null);
        this.deleteAllPorts();

        while(i--){
            this.childBoxes[i].destroy();
        }
    };


    return AutoRouterBox;

});
