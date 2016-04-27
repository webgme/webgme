/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define([
        'common/util/assert',
        'common/core/tasync',
        'common/core/constants',
        'common/util/random'
    ], function (ASSERT, TASYNC, CONSTANTS, RANDOM) {
        'use strict';

        var LibraryCore = function (innerCore, options) {
            ASSERT(typeof options === 'object');
            ASSERT(typeof options.globConf === 'object');
            ASSERT(typeof options.logger !== 'undefined');

            var logger = options.logger,
                self = this,
                key;

            for (key in innerCore) {
                this[key] = innerCore[key];
            }

            logger.debug('initialized LibraryCore');

            //<editor-fold=Helper Functions>
            function getLibraryRootsInfo(node) {
                var allMetaNodes = self.getAllMetaNodes(node),
                    libraryRoots = {},
                    path,
                    roots,
                    i,
                    name;

                for (path in allMetaNodes) {
                    roots = getAllLibraryRoots(allMetaNodes[path]);
                    for (i = 0; i < roots.length; i += 1) {
                        name = getLibraryName(roots[i]) + self.getAttribute(roots[i], 'name');
                        if (!libraryRoots[name]) {
                            libraryRoots[name] = roots[i];
                        }
                    }
                }

                return libraryRoots;
            }

            function getLibraryName(node) {
                ASSERT(self.isValidNode(node));
                var name = '';

                node = self.getParent(node);

                while (node) {
                    if (self.isLibraryRoot(node) && self.getParent(node) !== null) {
                        name = self.getAttribute(node, 'name') + CONSTANTS.NAMESPACE_SEPARATOR + name;
                    }
                    node = self.getParent(node);
                }

                return name;
            }

            function getRootOfLibrary(node, name) {
                return self.getRoot(node).libraryRoots[name];
            }

            function getLibraryRoot(node) {
                while (node) {
                    if (self.isLibraryRoot(node) && !self.isLibraryElement(node)) {
                        return node;
                    }
                    node = self.getParent(node);
                }

                return null;
            }

            function getAllLibraryRoots(node) {
                var roots = [];
                while (node) {
                    if (self.isLibraryRoot(node)) {
                        roots.push(node);
                    }
                    node = self.getParent(node);
                }

                return roots;
            }

            function getLibraryInfo(libraryRootHash) {
                return TASYNC.call(function (libraryNodes) {
                    var info = {},
                        infoItem,
                        i;

                    for (i = 1; i < libraryNodes.length; i += 1) {
                        infoItem = {
                            path: self.getPath(libraryNodes[i]),
                            hash: self.getHash(libraryNodes[i]),
                            fcn: self.getFullyQualifiedName(libraryNodes[i])
                        };

                        info[self.getGuid(libraryNodes[i])] = infoItem;
                    }

                    return info;
                }, self.loadTree(libraryRootHash));
                //we use that the root of the library is always the first element
            }

            //TODO check if these functions needed on lower layers...
            function removeRelationFromOverlay(overlay, name, source, target) {
                var sOvr = JSON.parse(JSON.stringify(self.getProperty(overlay, source))),
                    tOvr = JSON.parse(JSON.stringify(self.getProperty(overlay, target)));

                if (sOvr[name] && sOvr[name] === target) {
                    delete sOvr[name];
                    self.setProperty(overlay, source, sOvr);
                    if (tOvr[name + CONSTANTS.COLLECTION_NAME_SUFFIX] &&
                        tOvr[name + CONSTANTS.COLLECTION_NAME_SUFFIX].indexOf(source) !== -1) {
                        tOvr[name + CONSTANTS.COLLECTION_NAME_SUFFIX]
                            .splice(tOvr[name + CONSTANTS.COLLECTION_NAME_SUFFIX].indexOf(source), 1);
                        if (tOvr[name + CONSTANTS.COLLECTION_NAME_SUFFIX].length === 0) {
                            delete tOvr[name + CONSTANTS.COLLECTION_NAME_SUFFIX]
                        }
                        self.setProperty(overlay, target, tOvr);
                    }
                }
            }

            function removeLibraryRelations(root, path) {
                var overlay = self.getChild(root, CONSTANTS.OVERLAYS_PROPERTY),
                    selfOverlays = JSON.parse(JSON.stringify(self.getProperty(overlay, path))),
                    key, collKey, i;

                for (key in selfOverlays) {
                    if (key.indexOf(CONSTANTS.COLLECTION_NAME_SUFFIX) !== -1) {
                        collKey = key.substr(0, key.length - CONSTANTS.COLLECTION_NAME_SUFFIX.length);
                        for (i = 0; i < selfOverlays[key].length; i += 1) {
                            removeRelationFromOverlay(overlay, collKey, selfOverlays[key][i], path);
                        }
                    } else {
                        removeRelationFromOverlay(overlay, key, path, selfOverlays[key]);
                    }
                }
            }

            function moveLibraryRelations(root, from, to) {
                var overlay = self.getChild(root, CONSTANTS.OVERLAYS_PROPERTY),
                    fromOverlay = JSON.parse(JSON.stringify(self.getProperty(overlay, from))),
                    tempOverlay,
                    index,
                    key, collKey, i;

                delete fromOverlay[CONSTANTS.MUTABLE_PROPERTY];
                for (key in fromOverlay) {
                    if (key.indexOf(CONSTANTS.COLLECTION_NAME_SUFFIX) !== -1) {
                        collKey = key.substr(0, key.length - CONSTANTS.COLLECTION_NAME_SUFFIX.length);
                        for (i = 0; i < fromOverlay[key].length; i += 1) {
                            tempOverlay = JSON.parse(JSON.stringify(self.getProperty(overlay, fromOverlay[key][i])));
                            delete tempOverlay[CONSTANTS.MUTABLE_PROPERTY];
                            tempOverlay[collKey] = to;
                            self.setProperty(overlay, fromOverlay[key][i], tempOverlay);
                        }
                    } else {
                        tempOverlay = JSON.parse(JSON.stringify(self.getProperty(overlay, fromOverlay[key])));
                        index = tempOverlay[key + CONSTANTS.COLLECTION_NAME_SUFFIX].indexOf(from);
                        if (index) {
                            tempOverlay[key + CONSTANTS.COLLECTION_NAME_SUFFIX] = to;
                            delete tempOverlay[CONSTANTS.MUTABLE_PROPERTY];
                            self.setProperty(overlay, fromOverlay[key], tempOverlay);
                        }
                    }
                }

                self.deleteProperty(overlay, from);
                self.setProperty(overlay, to, fromOverlay);
            }

            //</editor-fold>

            //<editor-fold=Modified Methods>
            this.loadRoot = function (hash) {
                return TASYNC.call(function (root) {
                    root.libraryRoots = getLibraryRootsInfo(root);
                    return root;
                }, innerCore.loadRoot(hash));
            };

            this.createNode = function (parameters) {
                var node;

                if (parameters && parameters.parent &&
                    (self.isLibraryRoot(parameters.parent) || self.isLibraryElement(parameters.parent))) {
                    return new Error('Not allowed to create new node inside library.');
                }

                if (parameters && parameters.base && self.isLibraryRoot(parameters.base)) {
                    return new Error('Not allowed to instantiate library root.');
                }

                node = innerCore.createNode(parameters);
                if (node.parent === null) {
                    node.libraryRoots = {};
                }

                return node;
            };

            this.deleteNode = function (node, technical) {
                if (self.isLibraryRoot(node) || self.isLibraryElement(node)) {
                    return new Error('Not allowed to remove library node by simply deleting them.');
                }

                return innerCore.deleteNode(node, technical);
            };

            this.copyNode = function (node, parent) {
                if (self.isLibraryRoot(parent) || self.isLibraryElement(parent)) {
                    return new Error('Not allowed to add nodes inside a library.');
                }

                if (self.isLibraryRoot(node)) {
                    return new Error('Not allowed to copy library root.');
                }

                return innerCore.copyNode(node, parent);
            };

            this.copyNodes = function (nodes, parent) {
                var i;
                if (self.isLibraryRoot(parent) || self.isLibraryElement(parent)) {
                    return new Error('Not allowed to add nodes inside a library.');
                }

                for (i = 0; i < nodes.length; i += 1) {
                    if (self.isLibraryRoot(nodes[i])) {
                        return new Error('Not allowed to copy library root.');
                    }
                }

                return innerCore.copyNodes(nodes, parent);
            };

            this.moveNode = function (node, parent) {
                if (self.isLibraryRoot(parent) || self.isLibraryElement(parent)) {
                    return new Error('Not allowed to add nodes inside a library.');
                }

                if (self.isLibraryRoot(node) || self.isLibraryElement(node)) {
                    return new Error('Not allowed to move library elements.');
                }

                return innerCore.moveNode(node, parent);
            };

            this.setAttribute = function (node, name, value) {
                if (self.isLibraryElement(node) || self.isLibraryRoot(node)) {
                    return new Error('Not allowed to modify library elements.');
                }

                return innerCore.setAttribute(node, name, value);
            };

            this.delAttribute = function (node, name) {
                if (self.isLibraryElement(node) || self.isLibraryRoot(node)) {
                    return new Error('Not allowed to modify library elements.');
                }

                return innerCore.delAttribute(node, name);
            };

            this.setRegistry = function (node, name, value) {
                if (self.isLibraryElement(node) || self.isLibraryRoot(node)) {
                    return new Error('Not allowed to modify library elements.');
                }

                return innerCore.setRegistry(node, name, value);
            };

            this.delRegistry = function (node, name) {
                if (self.isLibraryElement(node) || self.isLibraryRoot(node)) {
                    return new Error('Not allowed to modify library elements.');
                }

                return innerCore.delRegistry(node, name);
            };

            this.setPointer = function (node, name, target) {
                if (self.isLibraryElement(node) || self.isLibraryRoot(node)) {
                    return new Error('Not allowed to modify library elements.');
                }

                return innerCore.setPointer(node, name, target);
            };

            this.deletePointer = function (node, name) {
                if (self.isLibraryElement(node) || self.isLibraryRoot(node)) {
                    return new Error('Not allowed to modify library elements.');
                }

                return innerCore.deletePointer(node, name);
            };

            this.setBase = function (node, base) {
                if (self.isLibraryElement(node) || self.isLibraryRoot(node)) {
                    return new Error('Not allowed to modify library elements.');
                }

                if (base && self.isLibraryRoot(base)) {
                    return new Error('Not allowed to instantiate library root.');
                }

                return innerCore.setBase(node, base);
            };

            this.addMember = function (node, name, member) {
                if (self.isLibraryElement(node) || self.isLibraryRoot(node)) {
                    return new Error('Not allowed to modify library elements.');
                }

                return innerCore.addMember(node, name, member);
            };

            this.delMember = function (node, name, path) {
                if (self.isLibraryElement(node) || self.isLibraryRoot(node)) {
                    return new Error('Not allowed to modify library elements.');
                }

                return innerCore.delMember(node, name, path);
            };

            this.setMemberAttribute = function (node, setName, memberPath, attrName, value) {
                if (self.isLibraryRoot(node) || self.isLibraryElement(node)) {
                    return new Error('Not allowed to modify library elements.');
                }
                return innerCore.setMemberAttribute(node, setName, memberPath, attrName, value);
            };

            this.delMemberAttribute = function (node, setName, memberPath, attrName) {
                if (self.isLibraryRoot(node) || self.isLibraryElement(node)) {
                    return new Error('Not allowed to modify library elements.');
                }
                return innerCore.delMemberAttribute(node, setName, memberPath, attrName);
            };

            this.setMemberRegistry = function (node, setName, memberPath, regName, value) {
                if (self.isLibraryRoot(node) || self.isLibraryElement(node)) {
                    return new Error('Not allowed to modify library elements.');
                }
                return innerCore.setMemberRegistry(node, setName, memberPath, regName, value);
            };

            this.delMemberRegistry = function (node, setName, memberPath, regName) {
                if (self.isLibraryRoot(node) || self.isLibraryElement(node)) {
                    return new Error('Not allowed to modify library elements.');
                }
                return innerCore.delMemberRegistry(node, setName, memberPath, regName);
            };

            this.createSet = function (node, name) {
                if (self.isLibraryRoot(node) || self.isLibraryElement(node)) {
                    return new Error('Not allowed to modify library elements.');
                }
                return innerCore.createSet(node, name);
            };

            this.deleteSet = function (node, name) {
                if (self.isLibraryRoot(node) || self.isLibraryElement(node)) {
                    return new Error('Not allowed to modify library elements.');
                }
                return innerCore.deleteSet(node, name);
            };

            this.setGuid = function (node, guid) {
                if (self.isLibraryRoot(node) || self.isLibraryElement(node)) {
                    //FIXME cannot return any error in async functions :/
                    // /return new Error('Not allowed to modify library elements.');
                } else {
                    return innerCore.setGuid(node, guid);
                }
            };

            this.setConstraint = function (node, name, constraint) {
                if (self.isLibraryRoot(node) || self.isLibraryElement(node)) {
                    return new Error('Not allowed to modify library elements.');
                }
                return innerCore.setConstraint(node, name, constraint);
            };

            this.delConstraint = function (node, name) {
                if (self.isLibraryRoot(node) || self.isLibraryElement(node)) {
                    return new Error('Not allowed to modify library elements.');
                }
                return innerCore.delConstraint(node, name);
            };

            this.clearMetaRules = function (node) {
                if (self.isLibraryRoot(node) || self.isLibraryElement(node)) {
                    return new Error('Not allowed to modify library elements.');
                }

                return innerCore.clearMetaRules(node);
            };

            this.setAttributeMeta = function (node, name, rule) {
                if (self.isLibraryRoot(node) || self.isLibraryElement(node)) {
                    return new Error('Not allowed to modify library elements.');
                }

                return innerCore.setAttributeMeta(node, name, rule);
            };

            this.delAttributeMeta = function (node, name) {
                if (self.isLibraryRoot(node) || self.isLibraryElement(node)) {
                    return new Error('Not allowed to modify library elements.');
                }

                return innerCore.delAttributeMeta(node, name);
            };

            this.setChildMeta = function (node, child, min, max) {
                if (self.isLibraryRoot(node) || self.isLibraryElement(node)) {
                    return new Error('Not allowed to modify library elements.');
                }

                if (self.isLibraryRoot(child)) {
                    return new Error('Not allowed to use library root as valid child.');
                }

                return innerCore.setChildMeta(node, child, min, max);
            };

            this.delChildMeta = function (node, childPath) {
                if (self.isLibraryRoot(node) || self.isLibraryElement(node)) {
                    return new Error('Not allowed to modify library elements.');
                }

                return innerCore.delChildMeta(node, childPath);
            };

            this.setChildrenMetaLimits = function (node, min, max) {
                if (self.isLibraryRoot(node) || self.isLibraryElement(node)) {
                    return new Error('Not allowed to modify library elements.');
                }

                return innerCore.setChildrenMetaLimits(node, min, max);
            };

            this.setPointerMetaTarget = function (node, name, target, min, max) {
                if (self.isLibraryRoot(node) || self.isLibraryElement(node)) {
                    return new Error('Not allowed to modify library elements.');
                }

                return innerCore.setPointerMetaTarget(node, name, target, min, max);
            };

            this.delPointerMetaTarget = function (node, name, targetPath) {
                if (self.isLibraryRoot(node) || self.isLibraryElement(node)) {
                    return new Error('Not allowed to modify library elements.');
                }

                return innerCore.delPointerMetaTarget(node, name, targetPath);
            };

            this.setPointerMetaLimits = function (node, name, min, max) {
                if (self.isLibraryRoot(node) || self.isLibraryElement(node)) {
                    return new Error('Not allowed to modify library elements.');
                }

                return innerCore.setPointerMetaLimits(node, name, min, max);
            };

            this.delPointerMeta = function (node, name) {
                if (self.isLibraryRoot(node) || self.isLibraryElement(node)) {
                    return new Error('Not allowed to modify library elements.');
                }

                return innerCore.delPointerMeta(node, name);
            };

            this.setAspectMetaTarget = function (node, name, target) {
                if (self.isLibraryRoot(node) || self.isLibraryElement(node)) {
                    return new Error('Not allowed to modify library elements.');
                }

                return innerCore.setAspectMetaTarget(node, name, target);
            };

            this.delAspectMetaTarget = function (node, name, targetPath) {
                if (self.isLibraryRoot(node) || self.isLibraryElement(node)) {
                    return new Error('Not allowed to modify library elements.');
                }

                return innerCore.delAspectMetaTarget(node, name, targetPath);
            };

            this.delAspectMeta = function (node, name) {
                if (self.isLibraryRoot(node) || self.isLibraryElement(node)) {
                    return new Error('Not allowed to modify library elements.');
                }

                return innerCore.delAspectMeta(node, name);
            };

            this.delMixin = function (node, mixinPath) {
                if (self.isLibraryRoot(node) || self.isLibraryElement(node)) {
                    return new Error('Not allowed to modify library elements.');
                }

                return innerCore.delMixin(node, mixinPath);
            };

            this.addMixin = function (node, mixinPath) {
                var libraryName,
                    root = self.getRoot(node);

                if (self.isLibraryRoot(node) || self.isLibraryElement(node)) {
                    return new Error('Not allowed to modify library elements.');
                }

                for (libraryName in root.libraryRoots) {
                    if (self.getPath(root.libraryRoots[libraryName]) === mixinPath) {
                        return new Error('Not allowed to use library root as mixin.');
                    }
                }

                return innerCore.addMixin(node, mixinPath);
            };

            this.clearMixins = function (node) {
                if (self.isLibraryRoot(node) || self.isLibraryElement(node)) {
                    return new Error('Not allowed to modify library elements.');
                }

                return innerCore.clearMixins(node);
            };
            //</editor-fold>

            //<editor-fold=Added Methods>

            this.getLibraryRoot = function (node, name) {
                var root = self.getRoot(node);

                return root.libraryRoots[name] || null;
            };

            this.isLibraryElement = function (node) {
                var parent = self.getParent(node);

                while (parent) {
                    if (self.isLibraryRoot(parent)) {
                        return true;
                    }
                    parent = self.getParent(parent);
                }

                return false;
            };

            this.isLibraryRoot = function (node) {
                if (innerCore.getAttribute(node, '_libraryInfo')) {
                    return true;
                }
                return false;
            };

            this.getNamespace = function (node) {
                var libPrefix = getLibraryName(node);

                if (libPrefix) {
                    // Trim the trailing dot..
                    libPrefix = libPrefix.substring(0, libPrefix.length - 1);
                }

                return libPrefix;
            };

            this.getFullyQualifiedName = function (node) {
                ASSERT(self.isValidNode(node));
                return getLibraryName(node) + self.getAttribute(node, 'name');
            };

            this.getLibraryGuid = function (node, name) {
                ASSERT(self.isValidNode(node));
                var libraryRoot;

                if (!self.isLibraryElement(node) && !self.isLibraryRoot(node)) {
                    return new Error('Node is not a library member');
                }

                if (!name) {
                    libraryRoot = getLibraryRoot(node);
                } else {
                    libraryRoot = getRootOfLibrary(node, name);
                }

                if (!libraryRoot) {
                    return new Error('Unknown library was given');
                }

                if (self.getFullyQualifiedName(node).indexOf(self.getFullyQualifiedName(libraryRoot)) !== 0) {
                    return new Error('Node is not a member of the library');
                }

                if (self.isLibraryRoot(node) && self.getPath(node) === self.getPath(libraryRoot)) {
                    return innerCore.getDataGuid(node);
                }

                return innerCore.getDeducedGuid(node, self.getLibraryGuid(self.getParent(node), name));
            };

            this.addLibrary = function (node, name, libraryRootHash, libraryInfo) {
                var root = self.getRoot(node),
                    libraryRelid = RANDOM.generateRelid(root.data);

                innerCore.setProperty(root, libraryRelid, libraryRootHash);
                return TASYNC.call(function (newLibraryRoot) {
                    return TASYNC.call(function (libraryNodes) {
                        var inMeta = self.getMemberPaths(newLibraryRoot, CONSTANTS.META_SET_NAME),
                            libraryInfoAttribute = libraryInfo;
                        //remove the libraryRoot from the libraryNodes
                        libraryNodes.shift();

                        //set the name of the library root
                        innerCore.setAttribute(newLibraryRoot, 'name', name);

                        //add library_info
                        libraryInfoAttribute.hash = libraryRootHash;
                        innerCore.setAttribute(newLibraryRoot, '_libraryInfo', libraryInfoAttribute);

                        if (libraryNodes.length > 0) {
                            //connect the FCO as base of libraryFCO
                            innerCore.setBase(self.getBaseRoot(libraryNodes[0]), self.getFCO(root));

                            //adding nodes to the global META
                            var i;
                            for (i = 0; i < libraryNodes.length; i += 1) {
                                if (inMeta.indexOf(self.getPath(libraryNodes[i])) !== -1) {
                                    innerCore.addMember(root, CONSTANTS.META_SET_NAME, libraryNodes[i]);
                                }
                            }
                        }
                        //refreshing libraryInfo
                        root.libraryRoots[name] = newLibraryRoot;
                    }, self.loadSubTree(newLibraryRoot));
                }, self.loadChild(root, libraryRelid));
            };

            this.updateLibrary = function (node, name, updatedLibraryRootHash, libraryInfo, updateInstructions) {
                var logs = {added: {}, updated: {}, moved: {}, removed: {}},
                    root = self.getRoot(node),
                    libraryRoot = getRootOfLibrary(root, name),
                    relid,
                    FCO = self.getFCO(root),
                    oldLibraryRootHash;

                if (!libraryRoot) { //do nothing if not valid library
                    return logs;
                }

                relid = self.getRelid(libraryRoot);
                oldLibraryRootHash = self.getAttribute(libraryRoot, '_libraryInfo').hash;

                return TASYNC.call(function (oldInfo, newInfo) {
                    var newNodePaths = [],
                        removedNodePaths = [],
                        i,
                        moves = [],
                        guid;

                    for (guid in newInfo) {
                        if (!oldInfo[guid]) {
                            newNodePaths.push('/' + relid + newInfo[guid].path);
                        } else if (oldInfo[guid].path !== newInfo[guid].path) {
                            moves.push({from: '/' + relid + oldInfo[guid].path, to: '/' + relid + newInfo[guid].path});
                        }
                    }

                    for (guid in oldInfo) {
                        if (!newInfo[guid]) {
                            removedNodePaths.push('/' + relid + oldInfo[guid].path);
                        }
                    }

                    for (i = 0; i < removedNodePaths.length; i += 1) {
                        removeLibraryRelations(root, removedNodePaths[i]);
                    }

                    for (i = 0; i < moves.length; i += 1) {
                        moveLibraryRelations(root, moves[i].from, moves[i].to);
                    }

                    innerCore.setProperty(root, relid, updatedLibraryRootHash);
                    root = self.removeChildFromCache(root, relid);
                    return TASYNC.call(function (newLibraryRoot) {
                        return TASYNC.call(function (newLibraryNodes) {
                            var i,
                                inMeta = self.getMemberPaths(newLibraryRoot, CONSTANTS.META_SET_NAME),
                                libraryInfoAttribute = libraryInfo,
                                libraryFCO;

                            newLibraryNodes.shift();
                            //set the name of the library root
                            innerCore.setAttribute(newLibraryRoot, 'name', name);

                            //add library_info
                            libraryInfoAttribute.hash = updatedLibraryRootHash;
                            innerCore.setAttribute(newLibraryRoot, '_libraryInfo', libraryInfoAttribute);

                            if (newLibraryNodes.length > 0) {
                                //connect the FCO as base of libraryFCO, but be sure to remove the nullPtr

                                libraryFCO = self.getBaseRoot(newLibraryNodes[0]);
                                innerCore.deletePointer(libraryFCO, 'base');
                                innerCore.setBase(libraryFCO, FCO);

                                //adding new nodes to the global META
                                for (i = 0; i < newLibraryNodes.length; i += 1) {
                                    if (newNodePaths.indexOf(self.getPath(newLibraryNodes[i])) !== -1 &&
                                        inMeta.indexOf(self.getPath(newLibraryNodes[i])) !== -1) {
                                        innerCore.addMember(root, CONSTANTS.META_SET_NAME, newLibraryNodes[i]);
                                    }
                                }
                            }

                            root.libraryRoots[name] = newLibraryRoot;

                            return logs;
                        }, self.loadSubTree(newLibraryRoot));
                    }, self.loadChild(root, relid))
                }, getLibraryInfo(oldLibraryRootHash), getLibraryInfo(updatedLibraryRootHash));

            };

            this.removeLibrary = function (node, name) {
                ASSERT(self.isValidNode(node));
                var root = self.getRoot(node),
                    libraryRoot = root.libraryRoots[name];

                if (libraryRoot && !self.isLibraryElement(libraryRoot)) {
                    innerCore.deleteNode(root.libraryRoots[name], true);
                    delete root.libraryRoots[name];
                }

            };

            this.renameLibrary = function (node, oldName, newName) {
                ASSERT(self.isValidNode(node));
                var root = self.getRoot(node);

                ASSERT(typeof oldName === 'string' && typeof newName === 'string' &&
                    oldName.indexOf(CONSTANTS.NAMESPACE_SEPARATOR) === -1 &&
                    newName.indexOf(CONSTANTS.NAMESPACE_SEPARATOR) === -1 &&
                    root.libraryRoots[oldName] && !root.libraryRoots[newName]);

                innerCore.setAttribute(root.libraryRoots[oldName], 'name', newName);
                root.libraryRoots[newName] = root.libraryRoots[oldName];
                delete root.libraryRoots[oldName];
            };

            this.getLibraryNames = function (node) {
                ASSERT(self.isValidNode(node));
                return Object.keys(self.getRoot(node).libraryRoots);
            };

            this.getLibraryMetaNodes = function (node, name, onlyOwn) {
                var allNodes = self.getAllMetaNodes(node),
                    libraryNodes = {},
                    path;

                for (path in allNodes) {
                    if (onlyOwn) {
                        if (self.getNamespace(allNodes[path]) === name) {
                            libraryNodes[path] = allNodes[path];
                        }
                    } else {
                        if (self.getNamespace(allNodes[path]).indexOf(name) === 0) {
                            libraryNodes[path] = allNodes[path];
                        }
                    }
                }

                return libraryNodes;
            };

            this.getLibraryInfo = function (node, name) {
                var libroot = getRootOfLibrary(node, name);
                return self.getAttribute(libroot, '_libraryInfo');
            };
            //</editor-fold>
        };

        return LibraryCore;
    }
);