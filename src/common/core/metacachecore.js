/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define([
    'common/util/assert',
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

            function sensitiveFilter(validNodes) {
                var i;

                i = validNodes.length;
                while (i--) {
                    if (self.isConnection(validNodes[i]) || self.isAbstract(validNodes[i])) {
                        validNodes.splice(i, 1);
                    }
                }
            }
            //</editor-fold>

            //<editor-fold=Modified Methods>
            this.loadRoot = function (hash) {
                return TASYNC.call(function (root) {
                    return TASYNC.call(function (elements) {
                        var i = 0;
                        root.metaNodes = {};
                        for (i = 0; i < elements.length; i += 1) {
                            root.metaNodes[innerCore.getPath(elements[i])] = elements[i];
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

                return [];
            };

            this.isAbstract = function (node) {
                return self.getRegistry(node, 'isAbstract') === true;
            };

            this.isConnection = function (node) {
                var validPtrNames = innerCore.getValidPointerNames(node);

                return validPtrNames.indexOf('dst') !== -1 && validPtrNames.indexOf('src') !== -1;
            };

            this.getValidChildrenMetaNodes = function (parameters) {
                var validNodes = [],
                    node = parameters.node,
                    metaNodes = self.getRoot(node).metaNodes,
                    keys = Object.keys(metaNodes || {}),
                    i, j,
                    typeCounters = {},
                    children = parameters.children || [],
                    rules,
                    inAspect,
                    temp;

                rules = innerCore.getChildrenMeta(node) || {};

                for (i = 0; i < keys.length; i += 1) {
                    temp = metaNodes[keys[i]];
                    while (temp) {
                        if (rules[innerCore.getPath(temp)]) {
                            validNodes.push(metaNodes[keys[i]]);
                            break;
                        }
                        temp = innerCore.getBase(temp);
                    }
                    //if (core.isValidChildOf(metaNodes[keys[i]], node)) {
                    //    validNodes.push(metaNodes[keys[i]]);
                    //}
                }

                //before every next step we check if we still have potential nodes
                if (validNodes.length === 0) {
                    return validNodes;
                }

                if (parameters.sensitive === true) {
                    sensitiveFilter(validNodes);
                }

                //before every next step we check if we still have potential nodes
                if (validNodes.length === 0) {
                    return validNodes;
                }

                if (parameters.multiplicity === true) {
                    if (rules.max && rules.max > -1 && innerCore.getChildrenRelids(node).length >= rules.max) {
                        validNodes = [];
                        return validNodes;
                    }
                    if (children.length === 0) {
                        return validNodes; //we cannot check type-multiplicity without children
                    }

                    delete rules.max;
                    delete rules.min;

                    //we need to clear nodes that are not on the meta sheet
                    // and we have to initialize the counters
                    keys = Object.keys(rules);
                    for (i = 0; i < keys.length; i += 1) {
                        if (!metaNodes[keys[i]]) {
                            delete rules[keys[i]];
                        } else {
                            typeCounters[keys[i]] = 0;
                        }
                    }

                    keys = Object.keys(rules);
                    for (i = 0; i < children.length; i += 1) {
                        for (j = 0; j < keys.length; j += 1) {
                            if (innerCore.isTypeOf(children[i], metaNodes[keys[j]])) {
                                typeCounters[keys[j]] += 1;
                            }
                        }
                    }

                    i = validNodes.length;
                    keys = Object.keys(typeCounters);
                    while (i--) {
                        for (j = 0; j < keys.length; j += 1) {
                            if (rules[keys[j]].max &&
                                rules[keys[j]].max > -1 &&
                                rules[keys[j]].max <= typeCounters[keys[j]] &&
                                innerCore.isTypeOf(validNodes[i], metaNodes[keys[j]])) {
                                validNodes.splice(i, 1);
                                break;
                            }
                        }
                    }
                }

                //before every next step we check if we still have potential nodes
                if (validNodes.length === 0) {
                    return validNodes;
                }


                if (parameters.aspect) {
                    keys = innerCore.getAspectMeta(node, parameters.aspect);
                    i = validNodes.length;

                    while (i--) {
                        inAspect = false;
                        for (j = 0; j < keys.length; j += 1) {
                            if (innerCore.isTypeOf(validNodes[i], metaNodes[keys[j]])) {
                                inAspect = true;
                                break;
                            }
                        }
                        if (!inAspect) {
                            validNodes.splice(i, 1);
                        }
                    }
                }
                return validNodes;
            };

            this.getValidSetElementsMetaNodes = function (parameters) {
                var validNodes = [],
                    node = parameters.node,
                    metaNodes = self.getRoot(node).metaNodes,
                    keys = Object.keys(metaNodes || {}),
                    i, j,
                    typeCounters = {},
                    members = parameters.members || [],
                    rules = self.getPointerMeta(node, parameters.name) || {},
                    temp;

                for (i = 0; i < keys.length; i += 1) {
                    temp = metaNodes[keys[i]];
                    while (temp) {
                        if (rules[innerCore.getPath(temp)]) {
                            validNodes.push(metaNodes[keys[i]]);
                            break;
                        }
                        temp = innerCore.getBase(temp);
                    }
                }

                //before every next step we check if we still have potential nodes
                if (validNodes.length === 0) {
                    return validNodes;
                }

                if (parameters.sensitive === true) {
                    sensitiveFilter(validNodes);
                }

                //before every next step we check if we still have potential nodes
                if (validNodes.length === 0) {
                    return validNodes;
                }

                if (parameters.multiplicity === true) {
                    if (rules.max && rules.max > -1 && innerCore.getMemberPaths(node).length >= rules.max) {
                        validNodes = [];
                        return validNodes;
                    }

                    if (members.length === 0) {
                        return validNodes; //we cannot check type-multiplicity without children
                    }

                    delete rules.max;
                    delete rules.min;

                    //we need to clear nodes that are not on the meta sheet
                    // and we have to initialize the counters
                    keys = Object.keys(rules);
                    for (i = 0; i < keys.length; i += 1) {
                        if (!metaNodes[keys[i]]) {
                            delete rules[keys[i]];
                        } else {
                            typeCounters[keys[i]] = 0;
                        }
                    }

                    keys = Object.keys(rules);
                    for (i = 0; i < members.length; i += 1) {
                        for (j = 0; j < keys.length; j += 1) {
                            if (innerCore.isTypeOf(members[i], metaNodes[keys[j]])) {
                                typeCounters[keys[j]] += 1;
                            }
                        }
                    }

                    i = validNodes.length;
                    keys = Object.keys(typeCounters);
                    while (i--) {
                        for (j = 0; j < keys.length; j += 1) {
                            if (rules[keys[j]].max &&
                                rules[keys[j]].max > -1 &&
                                rules[keys[j]].max <= typeCounters[keys[j]] &&
                                innerCore.isTypeOf(validNodes[i], metaNodes[keys[j]])) {
                                validNodes.splice(i, 1);
                                break;
                            }
                        }
                    }
                }

                return validNodes;
            };
            //</editor-fold>
        };

        return MetaCacheCore;
    }
);