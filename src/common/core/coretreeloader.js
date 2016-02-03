/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define(['common/util/assert', 'common/core/tasync'], function (ASSERT, TASYNC) {
    'use strict';

    var CoreTreeLoader = function (innerCore, options) {
        ASSERT(typeof options === 'object');
        ASSERT(typeof options.globConf === 'object');
        ASSERT(typeof options.logger !== 'undefined');

        var logger = options.logger,
            self = this,
            key;

        for (key in innerCore) {
            this[key] = innerCore[key];
        }

        logger.debug('initialized CoreTreeLoader');

        //<editor-fold=Helper Functions>
        function loadSubTree(root, own) {
            var loadSubTrees = function (nodes) {
                    for (var i = 0; i < nodes.length; i++) {
                        nodes[i] = self.loadSubTree(nodes[i], own);
                    }
                    return TASYNC.lift(nodes);

                },
                childLoading = own === true ? self.loadOwnChildren : self.loadChildren;
            return TASYNC.call(function (children) {
                if (children.length < 1) {
                    return [root];
                } else {
                    return TASYNC.call(function (subArrays) {
                        var nodes = [],
                            i;
                        for (i = 0; i < subArrays.length; i++) {
                            nodes = nodes.concat(subArrays[i]);
                        }
                        nodes.unshift(root);
                        return nodes;
                    }, loadSubTrees(children));
                }
            }, childLoading(root));
        }
        //</editor-fold>

        //<editor-fold=Added Methods>
        this.loadTree = function (rootHash) {
            return TASYNC.call(self.loadSubTree, self.loadRoot(rootHash));
        };

        this.loadSubTree = function (root) {
            return loadSubTree(root, false);
        };

        this.loadOwnSubTree = function (root) {
            return loadSubTree(root, true);
        };
        //</editor-fold>
    };

    return CoreTreeLoader;
});
