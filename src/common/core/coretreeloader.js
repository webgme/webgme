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
                ongoingVisits = 0,
                error = null,
                projectRoot = self.getRoot(root),
                timerId,
                addToQueue,
                loadByPath = TASYNC.unwrap(self.loadByPath),
                extendLoadQueue = function (node) {
                    var keys = self.getChildrenPaths(node),
                        i;

                    if (self.getPath(node) !== self.getPath(root)) {
                        for (i = 0; i < keys.length; i += 1) {
                            addToQueue.call(loadQueue, keys[i]);
                        }
                    }

                },
                nodeLoaded = function (err, node) {
                    error = error || err;
                    if (!err && node) {
                        extendLoadQueue(node);
                    }
                    visitFn(node, visitNext);
                },
                visitNext = function (err) {
                    error = error || err;
                    ongoingVisits -= 1;
                    if (error && options.stopOnError) {
                        loadQueue = [];
                    }
                };

            options = options || {};
            options.maxParallelLoad = options.maxParallelLoad || 100; //the amount of nodes we preload
            options.excludeRoot = options.excludeRoot === true || false;
            options.stopOnError = options.stopOnError === false ? false : true;

            if (options.order === 'DFS') {
                addToQueue = loadQueue.unshift;
            } else {
                addToQueue = loadQueue.push;
            }

            if (options.maxParallelLoad < 1 || options.order === 'DFS') {
                options.maxParallelLoad = 1;
            }

            loadQueue = self.getChildrenPaths(root);

            if (options.excludeRoot === false) {
                loadQueue.unshift(self.getPath(root));
            }

            timerId = setInterval(function () {
                if (loadQueue.length === 0 && ongoingVisits === 0) {
                    clearInterval(timerId);
                    callback(error);
                } else if (loadQueue.length > 0 && ongoingVisits < options.maxParallelLoad &&
                    (!error || options.stopOnError === false)) {
                    ongoingVisits += 1;
                    loadByPath(projectRoot, loadQueue.shift(), nodeLoaded);
                }
            }, 0);

        }

        this.traverse = TASYNC.wrap(traverse);
        //</editor-fold>
    };

    return CoreTreeLoader;
});
