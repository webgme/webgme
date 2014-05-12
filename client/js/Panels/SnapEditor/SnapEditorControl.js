/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Brian Broll
 */

"use strict";

define(['logManager',
    'js/Constants',
    'js/NodePropertyNames',
    'js/RegistryKeys',
    'js/Utils/GMEConcepts'], function (logManager,
                                        CONSTANTS,
                                        nodePropertyNames,
                                        REGISTRY_KEYS,
                                        GMEConcepts){

/*
 * TODO:
 *
 * Get the data from the data base
 * Create widgets that allow the objects to draw themselves
 *
 */

    var SnapEditorControl = function(params){
        this._client = params.client;
        this.logger = params.logger || logManager.create(params.loggerName || "SnapEditorControl");

        this.snapCanvas = params.widget;
    };

    SnapEditorControl.prototype.selectedObjectChanged = function(nodeId){
        this.snapCanvas.clear();
        //
    }; 

    SnapEditorControl.prototype.onActivate = function(){
        //When you have the split view and only one is active
    }; 

    SnapEditorControl.prototype.onDeactivate = function(){
    }; 

    SnapEditorControl.prototype.destroy = function(){
        //When you changing to meta view or something
    }; 

   return SnapEditorControl;
});
