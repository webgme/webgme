/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

'use strict';

define([],
    function(){
        var AddonBase = function(Core,Storage){
            this._Core = Core;
            this._Storage = Storage;
            this.core = null;
            this.logger = null;
            this.project = null;
            this.branchName = '';
            this.projectName = '';
            this.commit = null;

        };
        AddonBase.prototype.getName = function () {
            throw new Error('implement this function in the derived class - getting type automatically is a bad idea,' +
                'when the js scripts are minified names are useless.');
        };

        AddonBase.prototype._eventer = function(){

        };

        AddonBase.prototype.init = function(parameters){
            //this is the part of the start process which should be always done, so this function should be always called from the start
            if(!(parameters.projectName && parameters.branchName && parameters.project)){
                return false;
            }
            this.project = parameters.project;
            this.core = new this._Core(this.project);
            this.projectName = parameters.projectName;
            this.branchName = parameters.branchName;

        };
        AddonBase.prototype.start = function(parameters,callback){
            //this is the initialization function it could be overwritten or use as it is
            if(this.init(parameters)){
                callback(null);
            } else {
                callback(new Error('basic initialization failed, check parameters!'));
            }
        };

        return AddonBase;
    });