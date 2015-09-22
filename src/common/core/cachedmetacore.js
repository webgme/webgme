/**
 * @author kecso / https://github.com/kecso
 */

define(['common/util/assert', 'common/core/core', 'common/core/tasync'], function (ASSERT, Core, TASYNC) {
    'use strict';

    var MetaCacheCore = function (oldcore, options) {
        ASSERT(typeof options === 'object');
        ASSERT(typeof options.globConf === 'object');
        ASSERT(typeof options.logger !== 'undefined');
        // copy all operations
        var core = {},
            META_SET_NAME = 'MetaAspectSet',
            logger = options.logger.fork('meta');
        for (var key in oldcore) {
            core[key] = oldcore[key];
        }
        logger.debug('initialized');

        function loadMetaSet(root) {
            var paths = oldcore.getMemberPaths(root, META_SET_NAME),
                i,
                metaElements = [];

            for (i = 0; i < paths.length; i += 1) {
                metaElements.push(oldcore.loadByPath(root, paths[i]));
            }

            return TASYNC.lift(metaElements);
        }

        core.loadRoot = function (hash) {
            return TASYNC.call(function (root) {
                return TASYNC.call(function (elements) {
                    var i = 0;
                    root.metaElements = {};
                    for (i = 0; i < elements.length; i += 1) {
                        root.metaElements[oldcore.getPath(elements[i])] = elements[i];
                    }
                    return root;
                }, loadMetaSet(root));
            }, oldcore.loadRoot(hash));
        };

        //functions where the cache may needs to be updated
        core.createNode = function (parameters) {
            var node = oldcore.createNode(parameters);

            if (!parameters || !parameters.parent) {
                //a root just have been created
                node.metaElements = {};
            }

            return node;
        };

        core.addMember = function (node, setName, member) {
            var root = core.getRoot(node);
            oldcore.addMember(node, setName, member);

            //check if our cache needs to be updated
            if (setName === META_SET_NAME && core.getPath(node) === core.getPath(root)) {
                root.metaElements[core.getPath(member)] = member;
            }
        };

        core.delMember = function (node, setName, memberPath) {
            var root = core.getRoot(node);
            oldcore.delMember(node, setName, memberPath);

            //check if our cache needs to be updated
            if (setName === META_SET_NAME && core.getPath(node) === core.getPath(root)) {
                delete root.metaElements[memberPath];
            }
        };

        core.deleteNode = function (node, technical) {
            var root = core.getRoot(node);
            if (root.metaElements[core.getPath(node)]) {
                delete root.metaElements[core.getPath(node)];
            }
            oldcore.deleteNode(node, technical);
        };

        core.moveNode = function (node, parent) {
            var root = core.getRoot(node),
                oldpath = core.getPath(node),
                moved = oldcore.moveNode(node, parent);

            if (root.metaElements[oldpath]) {
                delete root.metaElements[oldpath];
                root.metaElements[core.getPath(moved)] = moved;
            }

            return moved;
        };
        //additional inquiry functions
        core.isMetaNode = function (node) {
            var root = core.getRoot(node);
            if (root.metaElements && root.metaElemens[core.getPath(node)]) {
                return true;
            }

            return false;
        };

        core.getAllMetaNodes = function (node) {
            var root = core.getRoot(node);

            if (root.metaElements) {
                return root.metaElements;
            }

            return [];
        };

        //parameters
        // node - the node in question
        // children - the current children of the node, so that multiplicity can be checked
        // sensitive - if true the function do not return the connection and abstract types
        core.getValidChildrenMetaNodes = function(parameters){
            var validNodes = [],
                allNodes = core.getAllMetaNodes(node),
                i,
                node = parameters.node,
                children = parameters.children || [],
                sensitive = parameters.sensitive,
                typeCounter = function(){};

            for(i=0;i<allNodes.length;i+=1){
                if(core.isValidChildOf(allNodes[i],node)){
                    validNodes.push(allNodes[i]);
                }
            }

            return validNodes;
        };

        return core;
    };

    return MetaCacheCore;
});