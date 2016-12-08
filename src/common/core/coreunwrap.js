/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author mmaroti / https://github.com/mmaroti
 */

define(['common/core/CoreAssert', 'common/core/tasync'], function (ASSERT, TASYNC) {
    'use strict';

    // ----------------- CoreUnwrap -----------------

    var CoreUnwrap = function (innercore, options) {
        ASSERT(typeof options === 'object');
        ASSERT(typeof options.globConf === 'object');
        ASSERT(typeof options.logger !== 'undefined');
        var logger = options.logger.fork('coreunwrap');

        function checkNode(node) {
            if (node === null || innercore.isValidNode(node)) {
                return node;
            } else {
                throw new Error('Invalid result node');
            }
        }

        function checkNodes(nodes) {
            ASSERT(nodes instanceof Array);

            var i;
            for (i = 0; i < nodes.length; ++i) {
                if (!innercore.isValidNode(nodes[i])) {
                    throw new Error('Invalid result node array');
                }
            }

            return nodes;
        }

        // copy all operations
        var core = {};
        for (var key in innercore) {
            core[key] = innercore[key];
        }
        logger.debug('initialized');
        core.loadRoot = TASYNC.unwrap(innercore.loadRoot);
        //core.persist = TASYNC.unwrap(oldcore.persist);

        // core.loadChild = TASYNC.unwrap(oldcore.loadChild);
        core.loadChild = TASYNC.unwrap(function (node, relid) {
            return TASYNC.call(checkNode, innercore.loadChild(node, relid));
        });

        // core.loadByPath = TASYNC.unwrap(oldcore.loadByPath);
        core.loadByPath = TASYNC.unwrap(function (node, path) {
            return TASYNC.call(checkNode, innercore.loadByPath(node, path));
        });

        // core.loadChildren = TASYNC.unwrap(oldcore.loadChildren);
        core.loadChildren = TASYNC.unwrap(function (node) {
            return TASYNC.call(checkNodes, innercore.loadChildren(node));
        });

        // core.loadOwnChildren = TASYNC.unwrap(oldcore.loadOwnChildren);
        core.loadOwnChildren = TASYNC.unwrap(function (node) {
            return TASYNC.call(checkNodes, innercore.loadOwnChildren(node));
        });

        core.loadPointer = TASYNC.unwrap(innercore.loadPointer);
        core.loadCollection = TASYNC.unwrap(innercore.loadCollection);

        core.loadSubTree = TASYNC.unwrap(innercore.loadSubTree);
        core.loadOwnSubTree = TASYNC.unwrap(innercore.loadOwnSubTree);
        core.loadTree = TASYNC.unwrap(innercore.loadTree);
        core.traverse = TASYNC.unwrap(innercore.traverse);

        core.setGuid = TASYNC.unwrap(innercore.setGuid);

        //core diff async functions
        if (typeof innercore.generateTreeDiff === 'function') {
            core.generateTreeDiff = TASYNC.unwrap(innercore.generateTreeDiff);
        }

        if (typeof innercore.generateLightTreeDiff === 'function') {
            core.generateLightTreeDiff = TASYNC.unwrap(innercore.generateLightTreeDiff);
        }

        if (typeof innercore.applyTreeDiff === 'function') {
            core.applyTreeDiff = TASYNC.unwrap(innercore.applyTreeDiff);
        }

        //library functions

        core.addLibrary = TASYNC.unwrap(innercore.addLibrary);
        core.updateLibrary = TASYNC.unwrap(innercore.updateLibrary);

        // core.loadInstances = TASYNC.unwrap(oldcore.loadInstances);
        core.loadInstances = TASYNC.unwrap(function (node) {
            return TASYNC.call(checkNodes, innercore.loadInstances(node));
        });


        return core;
    };

    return CoreUnwrap;
});
