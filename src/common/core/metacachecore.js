/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define([
        'common/core/CoreAssert',
        'common/core/tasync',
        'common/core/constants'
    ], function (ASSERT, TASYNC, CONSTANTS) {
        'use strict';

        var MetaCacheCore = function (innerCore, options) {
            ASSERT(typeof options === 'object');
            ASSERT(typeof options.globConf === 'object');
            ASSERT(typeof options.logger !== 'undefined');

            var logger = options.logger,
                self = this,
                key;

            for (key in innerCore) {
                this[key] = innerCore[key];
            }

            logger.debug('initialized MetaCacheCore');

            //<editor-fold=Helper Functions>
            function loadMetaSet(root) {
                var paths = innerCore.getMemberPaths(root, CONSTANTS.META_SET_NAME),
                    i,
                    metaNodes = [];

                return TASYNC.call(function () {
                    for (i = 0; i < paths.length; i += 1) {
                        metaNodes.push(innerCore.loadByPath(root, paths[i]));
                    }

                    return TASYNC.lift(metaNodes);
                }, self.loadPaths(self.getHash(root), JSON.parse(JSON.stringify(paths))));
            }

            //</editor-fold>

            //<editor-fold=Modified Methods>
            this.loadRoot = function (hash) {
                return TASYNC.call(function (root) {
                    return TASYNC.call(function (elements) {
                        var i = 0;
                        root.metaNodes = {};
                        for (i = 0; i < elements.length; i += 1) {
                            // It can happen that some elements just been removed during load because of missing base.
                            if (elements[i]) {
                                root.metaNodes[innerCore.getPath(elements[i])] = elements[i];
                            }
                        }
                        return root;
                    }, loadMetaSet(root));
                }, innerCore.loadRoot(hash));
            };

            this.loadByPath = function (node, path) {
                return TASYNC.call(function () {
                    return innerCore.loadByPath(node, path);
                }, self.loadPaths(self.getHash(node), [path]));
            };

            //functions where the cache may needs to be updated
            this.createNode = function (parameters) {
                var node = innerCore.createNode(parameters);

                if (!parameters || !parameters.parent) {
                    //a root just have been created
                    node.metaNodes = {};
                }

                return node;
            };

            this.addMember = function (node, setName, member) {
                var root = self.getRoot(node);
                innerCore.addMember(node, setName, member);

                //check if our cache needs to be updated
                if (setName === CONSTANTS.META_SET_NAME && self.getPath(node) === self.getPath(root)) {
                    root.metaNodes[self.getPath(member)] = member;
                }
            };

            this.delMember = function (node, setName, memberPath) {
                var root = self.getRoot(node);
                innerCore.delMember(node, setName, memberPath);

                //check if our cache needs to be updated
                if (setName === CONSTANTS.META_SET_NAME && self.getPath(node) === self.getPath(root)) {
                    delete root.metaNodes[memberPath];
                }
            };

            this.deleteNode = function (node, technical) {
                var root = self.getRoot(node);
                if (root.metaNodes[self.getPath(node)]) {
                    delete root.metaNodes[self.getPath(node)];
                }
                innerCore.deleteNode(node, technical);
            };

            this.moveNode = function (node, parent) {
                var root = self.getRoot(node),
                    oldpath = self.getPath(node),
                    moved = innerCore.moveNode(node, parent);

                if (root.metaNodes[oldpath]) {
                    delete root.metaNodes[oldpath];
                    root.metaNodes[self.getPath(moved)] = moved;
                }

                return moved;
            };
            //</editor-fold>

            //<editor-fold=Added Methods>
            this.isMetaNode = function (node) {
                var root = self.getRoot(node);
                if (root.metaNodes && root.metaNodes[self.getPath(node)]) {
                    return true;
                }

                return false;
            };

            this.getAllMetaNodes = function (node) {
                var root = self.getRoot(node);

                if (root.metaNodes) {
                    return root.metaNodes;
                }

                return {};
            };

            this.getFCO = function (node) {
                var root = self.getRoot(node),
                    key;

                for (key in root.metaNodes) {
                    return self.getBaseRoot(root.metaNodes[key]);
                }

                return null; //if there is no object on META, there is no FCO!!! 
            };

            //</editor-fold>
        };

        return MetaCacheCore;
    }
);