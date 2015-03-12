/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

'use strict';

define([],
    function(){
        var AddOnBase = function(Core,Storage, gmeConfig){
            this._Core = Core;
            this._Storage = Storage; //TODO: Should Storage be lower-case? It seems to be an instance..
            this.gmeConfig = gmeConfig;
            this.core = null;
            this.logger = null;
            this.project = null;
            this.branchName = '';
            this.projectName = '';
            this.commit = null;
            if (!this.gmeConfig) {
                // TODO: this error check is temporary
                throw new Error('AddOnBase takes gmeConfig as parameter!');
            }

        };
        AddOnBase.prototype.getName = function () {
            throw new Error('implement this function in the derived class - getting type automatically is a bad idea,' +
                'when the js scripts are minified names are useless.');
        };

        AddOnBase.prototype._eventer = function(){
            var lastGuid = '',
                self = this,
                nextServerEvent = function(err,guid,parameters){
                    lastGuid = guid || lastGuid;
                    if(!err && parameters){
                        switch (parameters.type){
                            case "PROJECT_CREATED":
                            case "PROJECT_DELETED":
                            case "BRANCH_CREATED":
                            case "BRANCH_DELETED":
                                //TODO can be handled later
                                return self._Storage.getNextServerEvent(lastGuid,nextServerEvent);
                            case "BRANCH_UPDATED":
                                if(self.projectName === parameters.project && self.branchName === parameters.branch){
                                    self.project.loadObject(parameters.commit,function(err,commit){
                                        if(err || !commit){
                                            return self._Storage.getNextServerEvent(lastGuid,nextServerEvent);
                                        }

                                        self.commit = parameters.commit;
                                        self.core.loadRoot(commit.root,function(err,root){
                                            if(err){
                                                return self._Storage.getNextServerEvent(lastGuid,nextServerEvent);
                                            }
                                            self.update(root);
                                            return self._Storage.getNextServerEvent(lastGuid,nextServerEvent);
                                        });
                                    });
                                } else {
                                    return self._Storage.getNextServerEvent(lastGuid,nextServerEvent);
                                }
                        }
                    } else {
                        setTimeout(function(){
                            return self._Storage.getNextServerEvent(lastGuid,nextServerEvent);
                        },1000);
                    }
                };
            self._Storage.getNextServerEvent(lastGuid,nextServerEvent);
        };

        AddOnBase.prototype.init = function(parameters){
            //this is the part of the start process which should be always done, so this function should be always called from the start
            if(!(parameters.projectName && parameters.branchName && parameters.project)){
                return false;
            }
            this.project = parameters.project;
            this.core = new this._Core(this.project, {globConf: this.gmeConfig});
            this.projectName = parameters.projectName;
            this.branchName = parameters.branchName;

            //start the eventing
            this._eventer();
            return true;
        };
        AddOnBase.prototype.start = function(parameters,callback){
            //this is the initialization function it could be overwritten or use as it is
            if(this.init(parameters)){
                callback(null);
            } else {
                callback(new Error('basic initialization failed, check parameters!'));
            }
        };

        AddOnBase.prototype.update = function(root){
            throw new Error('the update function is a main point of an AddOn\'s functionality so it must be overwritten');
        };

        AddOnBase.prototype.query = function(parameters,callback){
            callback(new Error('the function is the main function of the AddOn so it must be overwritten'));
        };

        AddOnBase.prototype.stop = function(callback){
            callback(new Error('this function must be overwritten to make sure that the addon stops properly'));
        };


        return AddOnBase;
    });