/*globals define*/
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * @author brollb / https://github/brollb
 */

define(['logManager',
	    'util/assert',
        './AutoRouter.Port'], function (logManager,
                                        assert,
                                        AutoRouterPort) {

    "use strict"; 

    var ArPathMap = function(i, p, s, d){
        //Stores a path with ports used
        //This allows for paths with dynamic src/dst's 
        this.id = i;
        this.path = p;

        this.srcPorts = s;
        this.dstPorts = d;
        this.srcBox = this.calcBoxId(s);
        this.dstBox = this.calcBoxId(d);
    };


    ArPathMap.prototype.calcBoxId = function (ports){
        for(var i in ports){
            if(ports.hasOwnProperty(i) && ports[i].getOwner()){
                return ports[i].getOwner().getID();
            }
        }
    };

    ArPathMap.prototype.getSrcPorts = function(){
        return this.srcPorts;
    };

    ArPathMap.prototype.getDstPorts = function(){
        return this.dstPorts;
    };

    ArPathMap.prototype.setSrcPort = function(index, port){
        assert(port instanceof AutoRouterPort, "ArPathMap.setSrcPort: port instanceof AutoRouterPort FAILED");
        this.srcPorts[index] = port;
    };

    ArPathMap.prototype.setDstPort = function(index, port){
        assert(port instanceof AutoRouterPort, "ArPathMap.setDstPort: port instanceof AutoRouterPort FAILED");
        this.dstPorts[index] = port;
    };

    ArPathMap.prototype.setSrcPorts = function(s){
        this.srcPorts = s;
    };

    ArPathMap.prototype.setDstPorts = function(s){
        this.dstPorts = s;
    };

    ArPathMap.prototype.deleteSrcPort = function(index){
        delete this.srcPorts[index];
    };

    ArPathMap.prototype.deleteDstPort = function(index){
        delete this.dstPorts[index];
    };

    ArPathMap.prototype.getSrcBoxId = function(){
        if(this.srcPorts && this.calcBoxId(this.srcPorts)){
            return this.srcBox;
        }
        return null;
    };

    ArPathMap.prototype.getDstBoxId = function(){
        if(this.dstPorts && this.calcBoxId(this.dstPorts)){
            return this.dstBox;
        }
        return null;
    };

    ArPathMap.prototype.updateSrcPorts = function(){
        var src = [];

        for(var i in this.srcPorts){
            if(this.srcPorts.hasOwnProperty(i)){
                assert( this.srcPorts[i] instanceof AutoRouterPort, "ArPathMap.updateSrcPorts: this.srcPorts[i] instanceof AutoRouterPort FAILED");
            }
            src.push(this.srcPorts[i]);
        }

        this.path.setStartPorts(src);
        this.srcBox = this.calcBoxId(this.srcPorts);
    };

    ArPathMap.prototype.updateDstPorts = function(){
        var dst = [];

        for(var i in this.dstPorts){
            if(this.dstPorts.hasOwnProperty(i)){
                assert( this.dstPorts[i] instanceof AutoRouterPort, "ArPathMap.updateDstPorts: this.dstPorts[i] instanceof AutoRouterPort FAILED");
            }
            dst.push(this.dstPorts[i]);
        }

        this.path.setEndPorts(dst);
        this.dstBox = this.calcBoxId(this.dstPorts);
    };

    return ArPathMap;
});

