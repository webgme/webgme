/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([], function () {
    "use strict";

    var DESCR_ID = "_desc";

    function descriptorCore (_innerCore) {

        //helper functions
        function updateDescriptorHash(node){
            var descriptors = _innerCore.getChild(node,DESCR_ID);
            var dCount = _innerCore.getRegistry(node,'d_count') || 0;
            _innerCore.setRegistry(node,'d_count',dCount + 1);
        }
        var _core = {};
        for(var i in _innerCore){
            _core[i] = _innerCore[i];
        }


        //extra functions
        _core.getAttributeDescriptor = function(node,attributename){
            var descriptors = _innerCore.getChild(node,DESCR_ID);
            var descriptor = _innerCore.getChild(descriptors,"a_"+attributename);
            return _innerCore.getRegistry(descriptor,'descriptor');
        };
        _core.setAttributeDescriptor = function(node,attributename,descobject){
            var descriptors = _innerCore.getChild(node,DESCR_ID);
            var descriptor = _innerCore.getChild(descriptors,"a_"+attributename);
            _innerCore.setRegistry(descriptor,'descriptor',descobject);
            updateDescriptorHash(node);
        };
        _core.delAttributeDescriptor = function(node,attributename){
            var descriptors = _innerCore.getChild(node,DESCR_ID);
            var descriptor = _innerCore.getChild(descriptors,"a_"+attributename);
            _innerCore.deleteNode(descriptor);
            updateDescriptorHash(node);
        };

        _core.getPointerDescriptor = function(node,pointername){
            var descriptors = _innerCore.getChild(node,DESCR_ID);
            var descriptor = _innerCore.getChild(descriptors,"p_"+pointername);
            return _innerCore.getRegistry(descriptor,'descriptor');
        };
        _core.setPointerDescriptor = function(node,pointername,descobject){
            var descriptors = _innerCore.getChild(node,DESCR_ID);
            var descriptor = _innerCore.getChild(descriptors,"p_"+pointername);
            _innerCore.setRegistry(descriptor,'descriptor',descobject);
            updateDescriptorHash(node);
        };
        _core.delPointerDescriptor = function(node,pointername){
            var descriptors = _innerCore.getChild(node,DESCR_ID);
            var descriptor = _innerCore.getChild(descriptors,"p_"+pointername);
            _innerCore.deleteNode(descriptor);
            updateDescriptorHash(node);
        };


        _core.getNodeDescriptor = function(node){
            var descriptors = _innerCore.getChild(node,DESCR_ID);
            var descriptor = _innerCore.getChild(descriptors,"n_");
            return _innerCore.getRegistry(descriptor,'descriptor');
        };
        _core.setNodeDescriptor = function(node,descobject){
            var descriptors = _innerCore.getChild(node,DESCR_ID);
            var descriptor = _innerCore.getChild(descriptors,"n_");
            _innerCore.setRegistry(descriptor,'descriptor',descobject);
            updateDescriptorHash(node);
        };
        _core.delNodeDescriptor = function(node,descobject){
            var descriptors = _innerCore.getChild(node,DESCR_ID);
            var descriptor = _innerCore.getChild(descriptors,"n_");
            _innerCore.deleteNode(descriptor);
            updateDescriptorHash(node);
        };


        return _core;
    }

    return descriptorCore;
});

