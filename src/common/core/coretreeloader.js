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

        function traverse(root, options, visitFn, callback) {
            ASSERT(self.isValidNode(root) && typeof visitFn === 'function' && typeof callback === 'function');

            var loadQueue = [],
                ongoingLoads = 0,
                ids,
                blocked = false,
                i,
                error = null,
                projectRoot = self.getRoot(root),
                timerId,
                loadByPath = TASYNC.unwrap(self.loadByPath);

            options = options || {};
            options.maxParallelLoad = options.maxParallelLoad || 10; //the amount of nodes we preload
            options.excludeRoot = options.excludeRoot || false;
            options.speed = options.speed || 10; //the frequency for check
            options.blockingVisit =
                options.blockingVisit === undefined || options.blockingVisit === null ? true : options.blockingVisit;

            loadQueue = self.getChildrenPaths(root);

            if (options.excludeRoot === false) {
                loadQueue.unshift(self.getPath(root));
            }

            timerId = setInterval(function () {
                if (!blocked && loadQueue.length === 0 && ongoingLoads === 0) {
                    clearInterval(timerId);
                    callback(error);
                } else if (!blocked && loadQueue.length > 0 && ongoingLoads < options.maxParallelLoad) {
                    ongoingLoads += 1;
                    if (options.blockingVisit) {
                        blocked = true;
                    }

                    loadByPath(projectRoot, loadQueue.shift(), function (err, node) {
                        ongoingLoads -= 1;
                        error = error || err;

                        if (self.getPath(node) !== self.getPath(root)) {
                            loadQueue = loadQueue.concat(self.getChildrenPaths(node));
                        }
                        visitFn(node); //calling the actual visit function
                        blocked = false;
                    });
                }
            }, options.speed);

        }

        this.traverse = TASYNC.wrap(traverse);
        //</editor-fold>
    };

    return CoreTreeLoader;
});
