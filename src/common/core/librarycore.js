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

            function getLibraryInfo(libraryRootHashOrNode) {
                var isNode = typeof libraryRootHashOrNode === 'object',
                    libraryName = '',
                    libraryNamePrefix = '',
                    getPath = function (node) {
                        if (isNode) {
                            return self.getPath(node, libraryRootHashOrNode);
                        } else {
                            return self.getPath(node);
                        }
                    },
                    getName = function (node) {
                        return self.getFullyQualifiedName(node).substr(libraryNamePrefix.length);
                    },
                    getGuid = function (node) {
                        if (isNode) {
                            return self.getLibraryGuid(node, libraryName);
                        } else {
                            return self.getGuid(node);
                        }
                    },
                    load = function () {
                        if (isNode) {
                            return self.loadSubTree(libraryRootHashOrNode);
                        } else {
                            return self.loadTree(libraryRootHashOrNode);
                        }
                    };

                if (isNode) {
                    libraryName = self.getAttribute(libraryRootHashOrNode, 'name');
                    libraryNamePrefix = libraryName + '.';
                }

                return TASYNC.call(function (libraryNodes) {
                    var info = {},
                        infoItem,
                        i;

                    for (i = 1; i < libraryNodes.length; i += 1) {
                        infoItem = {
                            path: getPath(libraryNodes[i]),
                            hash: self.getHash(libraryNodes[i]),
                            fcn: getName(libraryNodes[i])
                        };

                        info[getGuid(libraryNodes[i])] = infoItem;
                    }

                    return info;
                }, load());
                //we use that the root of the library is always the first element
            }

            function removeLibraryRelations(root, path) {
                var overlayItems = self.overlayQuery(root, path),
                    i;

                for (i = 0; i < overlayItems.length; i += 1) {
                    if (overlayItems[i].s === path || overlayItems.t === path) {
                        self.overlayRemove(root, overlayItems[i].s, overlayItems[i].n, overlayItems[i].t);
                    }
                }
            }

            function moveLibraryRelations(root, from, to) {
                var overlayItems = self.overlayQuery(root, from),
                    i;

                for (i = 0; i < overlayItems.length; i += 1) {
                    if (overlayItems[i].s === from) {
                        self.overlayRemove(root, overlayItems[i].s, overlayItems[i].n, overlayItems[i].t);
                        self.overlayInsert(root, to, overlayItems[i].n, overlayItems[i].t);

                    } else if (overlayItems[i].t === from) {
                        self.overlayRemove(root, overlayItems[i].s, overlayItems[i].n, overlayItems[i].t);
                        self.overlayInsert(root, overlayItems[i].s, overlayItems[i].n, to);
                    }
                }

            }

            function isPathInSubTree(fullPath, subTreePath) {
                if (fullPath === subTreePath) {
                    return true;
                }
                if (fullPath.indexOf(subTreePath + CONSTANTS.PATH_SEP) === 0) {
                    return true;
                }

                return false;
            }

            function isClosureInternalTarget(targetPath, closureInfo) {
                var selectionPath;

                for (selectionPath in closureInfo.selection) {
                    if (isPathInSubTree(targetPath, selectionPath)) {
                        return true;
                    }
                }

                return false;
            }

            function collectBaseInformation(baseNode, closureInfo) {
                var libraryRoots = getAllLibraryRoots(baseNode),
                    namespaceInfo = {},
                    i,
                    namespace;

                for (i = 0; i < libraryRoots.length; i += 1) {
                    namespace = self.getFullyQualifiedName(libraryRoots[i]);
                    namespaceInfo[namespace] = {
                        info: self.getLibraryInfo(libraryRoots[i], namespace),
                        guid: self.getLibraryGuid(baseNode, namespace)
                    };
                    if (namespaceInfo[namespace].info && namespaceInfo[namespace].info.hash) {
                        namespaceInfo[namespace].hash = namespaceInfo[namespace].info.hash;
                    }
                }

                closureInfo.bases[self.getGuid(baseNode)] = {
                    originGuid: libraryRoots.length > 0 ? self.getLibraryGuid(baseNode) : self.getGuid(baseNode),
                    name: self.getAttribute(baseNode, 'name'),
                    fullName: self.getFullyQualifiedName(baseNode),
                    namsespaces: namespaceInfo
                };
            }

            function addRelationsFromNodeToClosureInfo(node, allMetaNodes, closureInfo) {
                var basePath = self.getPath(node),
                    overlayInfo = self.getProperty(node, CONSTANTS.OVERLAYS_PROPERTY),
                    overlayKey,
                    pointerName,
                    path,
                    targetPath;

                for (overlayKey in overlayInfo) {
                    path = basePath + overlayKey;
                    if (isClosureInternalTarget(path, closureInfo)) {
                        for (pointerName in overlayInfo[overlayKey]) {
                            if (self.isPointerName(pointerName)) {
                                targetPath = basePath + overlayInfo[overlayKey][pointerName];
                                if (pointerName === CONSTANTS.BASE_POINTER) {
                                    if (allMetaNodes[targetPath]) {
                                        collectBaseInformation(allMetaNodes[targetPath], closureInfo);
                                        closureInfo.relations.preserved[path] =
                                            closureInfo.relations.preserved[path] || {};
                                        closureInfo.relations.preserved[path][CONSTANTS.BASE_POINTER] =
                                            self.getGuid(allMetaNodes[targetPath]);
                                    } else if (isClosureInternalTarget(targetPath, closureInfo)) {
                                        closureInfo.relations.preserved[path] =
                                            closureInfo.relations.preserved[path] || {};
                                        closureInfo.relations.preserved[path][CONSTANTS.BASE_POINTER] = targetPath;
                                    } else {
                                        closureInfo.relations.lost[path] = closureInfo.relations.lost[path] || {};
                                        closureInfo.relations.lost[path][CONSTANTS.BASE_POINTER] = targetPath;
                                    }
                                } else {
                                    if (isClosureInternalTarget(targetPath, closureInfo)) {
                                        closureInfo.relations.preserved[path] =
                                            closureInfo.relations.preserved[path] || {};
                                        closureInfo.relations.preserved[path][pointerName] = targetPath;
                                    } else {
                                        closureInfo.relations.lost[path] = closureInfo.relations.lost[path] || {};
                                        closureInfo.relations.lost[path][pointerName] = targetPath;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            function normalizeSelectionForClosure(nodes) {
                var paths = [],
                    i, j,
                    nodesToKeep = [],
                    nodesToCut = {};

                for (i = 0; i < nodes.length; i += 1) {
                    paths.push(self.getPath(nodes[i]));
                }

                for (i = 0; i < paths.length; i += 1) {
                    for (j = 0; j < paths.length; j += 1) {
                        if (i !== j && isPathInSubTree(paths[j], paths[i])) {
                            nodesToCut[paths[j]] = true;
                        }
                    }
                }

                for (i = 0; i < paths.length; i += 1) {
                    if (nodesToCut[paths[i]] !== true) {
                        nodesToKeep.push(nodes[i]);
                    }
                }

                return nodesToKeep;

            }

            function getBasePathOfPath(path, closureInfo) {
                var basePath;

                for (basePath in closureInfo.hashes) {
                    if (isPathInSubTree(path, basePath)) {
                        return basePath;
                    }
                }

                return '';
            }

            function mapRelationEndings(closureInfo) {
                var source,
                    sourceInfo,
                    name,
                    basePath;

                for (source in closureInfo.relations.preserved) {
                    sourceInfo = closureInfo.relations.preserved[source];
                    for (name in sourceInfo) {
                        if (!closureInfo.bases[sourceInfo[name]]) {
                            basePath = getBasePathOfPath(sourceInfo[name], closureInfo);
                            if (basePath) {
                                sourceInfo[name] = sourceInfo[name].replace(basePath, closureInfo.hashes[basePath]);
                            } else {
                                logger.error('during closure generation unknown based target [' +
                                    sourceInfo[name] + '] remained.');
                                delete sourceInfo[name];
                            }
                        }
                    }

                    basePath = getBasePathOfPath(source, closureInfo);
                    if (basePath) {
                        closureInfo.relations.preserved[source.replace(basePath, closureInfo.hashes[basePath])] =
                            closureInfo.relations.preserved[source];
                        delete closureInfo.relations.preserved[source];
                    } else {
                        logger.error('during closure generation unknown based source [' +
                            source + '] remained.');
                        delete closureInfo.relations.preserved[source];
                    }

                }
            }

            function gatherOccurancesOfType(baseGuid, closureInformation, allMetaNodes) {
                var keys = Object.keys(allMetaNodes),
                    occurrences = [],
                    i;

                for (i = 0; i < keys.length; i += 1) {
                    if (closureInformation.bases[baseGuid].originGuid === self.getLibraryGuid(allMetaNodes[keys[i]]) ||
                        closureInformation.bases[baseGuid].originGuid === self.getGuid(allMetaNodes[keys[i]])) {
                        occurrences.push(allMetaNodes[keys[i]]);
                    }
                }

                return occurrences;
            }

            function checkClosure(allMetaNodes, closureInformation) {
                //here we only check for exact GUID matches
                //TODO we might be able to map even with no exact GUID match based on library information
                var keys = Object.keys(allMetaNodes),
                    occurrences, i, j, errorTxt;

                closureInformation.destinationBases = {};
                for (i = 0; i < keys.length; i += 1) {
                    closureInformation.destinationBases[self.getGuid(allMetaNodes[keys[i]])] = keys[i];
                }

                keys = Object.keys(closureInformation.bases || {});

                for (i = 0; i < keys.length; i += 1) {
                    if (!closureInformation.destinationBases[keys[i]]) {
                        occurrences = gatherOccurancesOfType(keys[i], closureInformation, allMetaNodes);
                        if (occurrences.length === 0) {
                            return new Error('Cannot find necessary base [' +
                                closureInformation.bases[keys[i]].fullName + ' : ' + keys[i] + ']');
                        } else if (occurrences.length === 1) {
                            closureInformation.destinationBases[keys[i]] = self.getPath(occurrences[0]);
                        } else {
                            errorTxt = 'Ambiguous occurrences of base [' +
                                closureInformation.bases[keys[i]].fullName + ' : ' + keys[i] + '] ( ';
                            for (j = 0; j < occurrences.length; j += 1) {
                                errorTxt += '[' + self.getFullyQualifiedName(occurrences[j]) +
                                    ' : ' + self.getPath(occurrences[j]) + '] ';
                            }
                            errorTxt += ')';
                            return new Error(errorTxt);
                        }

                    }
                }

                return null;
            }

            function getAncestor(node, from, to) {
                var fromArray = from.split(CONSTANTS.PATH_SEP),
                    toArray = to.split(CONSTANTS.PATH_SEP),
                    commonAncestorPath = '',
                    i;

                fromArray.shift();
                toArray.shift();

                for (i = 0; i < fromArray.length && i < toArray.length; i += 1) {
                    if (fromArray[i] === toArray[i]) {
                        commonAncestorPath += CONSTANTS.PATH_SEP + fromArray[i];
                    } else {
                        break;
                    }
                }

                while (self.getPath(node) !== commonAncestorPath && node !== null) {
                    node = self.getParent(node);
                }

                return node;
            }

            function addRelation(parent, from, to, name) {
                var commonAncestor = getAncestor(parent, from, to),
                    overlay,
                    collectionName = name + CONSTANTS.COLLECTION_NAME_SUFFIX,
                    relFrom, relTo,
                    newEntry;

                if (commonAncestor) {
                    overlay = self.getChild(commonAncestor, CONSTANTS.OVERLAYS_PROPERTY);
                    relFrom = from.substr(self.getPath(commonAncestor).length);
                    relTo = to.substr(self.getPath(commonAncestor).length);

                    // First we set the forward direction
                    newEntry = JSON.parse(JSON.stringify(self.getProperty(overlay, relFrom) || {}));
                    newEntry[name] = relTo;
                    self.setProperty(overlay, relFrom, newEntry);

                    // Then the backward direction
                    newEntry = JSON.parse(JSON.stringify(self.getProperty(overlay, relTo) || {}));
                    newEntry[collectionName] = newEntry[collectionName] || [];
                    newEntry[collectionName].push(relFrom);
                    self.setProperty(overlay, relTo, newEntry);
                } else {
                    logger.error('unable to add relation: ' + name + '(' + from + '->' + to + ')');
                }
            }

            function getFinalPath(path, closureInformation) {
                // #9ab4 1eaad 98572 de827 49f0d 54520 3ad99 6b564 7 => 41 char is the hash length
                var hash = path.substr(0, 41),
                    resultPath = '';

                if (closureInformation.relids[hash]) {
                    resultPath = closureInformation.parent + CONSTANTS.PATH_SEP + closureInformation.relids[hash];
                    resultPath += path.substr(41);
                }

                return resultPath;
            }

            function computePaths(closureInformation) {
                var source, name, sourceInfo;

                for (source in closureInformation.relations.preserved) {
                    sourceInfo = closureInformation.relations.preserved[source];
                    for (name in sourceInfo) {
                        if (closureInformation.destinationBases[sourceInfo[name]]) {
                            sourceInfo[name] = closureInformation.destinationBases[sourceInfo[name]];
                        } else {
                            sourceInfo[name] = getFinalPath(sourceInfo[name], closureInformation);
                        }
                    }
                }

                for (source in closureInformation.relations.preserved) {
                    closureInformation.relations.preserved[getFinalPath(source, closureInformation)] =
                        closureInformation.relations.preserved[source];
                    delete closureInformation.relations.preserved[source];
                }
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
                root.childrenRelids = null;

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

            this.updateLibrary = function (node, name, updatedLibraryRootHash, libraryInfo/*, updateInstructions*/) {
                var logs = {added: {}, updated: {}, moved: {}, removed: {}},
                    root = self.getRoot(node),
                    libraryRoot = getRootOfLibrary(root, name),
                    relid,
                    FCO = self.getFCO(root);

                if (!libraryRoot) { //do nothing if not valid library
                    return logs;
                }

                relid = self.getRelid(libraryRoot);

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
                    }, self.loadChild(root, relid));
                }, getLibraryInfo(libraryRoot), getLibraryInfo(updatedLibraryRootHash));

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

            this.getClosureInformation = function (nodes) {
                ASSERT(nodes.length > 0);
                var closureInfo = {
                        hashes: {},
                        selection: {},
                        bases: {},
                        relations: {preserved: {}, lost: {}}
                    },
                    infoLosses = {},
                    allMetaNodes,
                    path,
                    node,
                    keys,
                    i;

                nodes = normalizeSelectionForClosure(nodes);
                allMetaNodes = this.getAllMetaNodes(nodes[0]);

                // We first collect the absolute paths of the selected nodes
                for (i = 0; i < nodes.length; i += 1) {
                    // The selection cannot contain library elements as that would violate read-only
                    if (this.isLibraryElement(nodes[i]) || this.isLibraryRoot(nodes[i])) {
                        return new Error('Cannot select node[' +
                            this.getPath(nodes[i]) + '] because it is library content!'
                        );
                    }
                    if (this.getParent(nodes[i]) === null) {
                        return new Error('Cannot select the project root!');
                    }
                    closureInfo.selection[this.getPath(nodes[i])] = this.getGuid(nodes[i]);
                    closureInfo.hashes[this.getPath(nodes[i])] = this.getHash(nodes[i]);
                }

                // Secondly, we collect relation information (the first order ones).
                // We leave the handling of the root node's overlay info for a separate step
                for (i = 0; i < nodes.length; i += 1) {
                    node = this.getParent(nodes[i]);
                    while (this.getPath(node)) { // until it is not the root
                        addRelationsFromNodeToClosureInfo(node, allMetaNodes, closureInfo);
                        node = this.getParent(node);
                    }
                }

                // Finally we process the relations of the root
                addRelationsFromNodeToClosureInfo(this.getRoot(nodes[0]), allMetaNodes, closureInfo);

                //now we combine the selection and hashes info
                keys = Object.keys(closureInfo.selection);
                for (i = 0; i < keys.length; i += 1) {
                    closureInfo.selection[closureInfo.selection[keys[i]]] = closureInfo.hashes[keys[i]];
                    delete closureInfo.selection[keys[i]];
                }

                //now map the paths to some guid+relpath format
                mapRelationEndings(closureInfo);

                //remove hashes field from closure information
                delete closureInfo.hashes;

                //checking and logging lost relation information
                logger.debug('Closure creation finished!', closureInfo);
                for (path in closureInfo.relations.lost) {
                    if (closureInfo.relations.lost[path][CONSTANTS.BASE_POINTER]) {
                        //we do not allow external non-Meta bases
                        return new Error('Closure cannot be created due to [' + path +
                            '] misses its base [' + closureInfo.relations.lost[path][CONSTANTS.BASE_POINTER] + '].');
                    }
                }

                return closureInfo;
            };

            this.importClosure = function (parent, closureInformation) {
                //at this point we can assume that the database has the necessary blobs
                var allMetaNodes = this.getAllMetaNodes(parent),
                    checkResult,
                    key,
                    name,
                    longestNewRelid = '',
                    reservedRelids = this.getChildrenRelids(parent, true),
                    newRelid;

                checkResult = checkClosure(allMetaNodes, closureInformation);

                if (checkResult) {
                    return checkResult;
                }

                closureInformation.relids = {};
                closureInformation.parent = this.getPath(parent);

                // Attaching the selected nodes under the parent node
                for (key in closureInformation.selection) {
                    newRelid = RANDOM.generateRelid(reservedRelids,
                        innerCore.getProperty(parent, CONSTANTS.MINIMAL_RELID_LENGTH_PROPERTY));
                    reservedRelids[newRelid] = true;
                    innerCore.setProperty(parent, newRelid, closureInformation.selection[key]);
                    closureInformation.relids[closureInformation.selection[key]] = newRelid;
                    if (newRelid.length > longestNewRelid.length) {
                        longestNewRelid = newRelid;
                    }
                }

                parent.childrenRelids = null;

                // Now processing the new relid creations
                innerCore.processRelidReservation(parent, longestNewRelid);

                // Replacing the paths in the closure information with actual paths in the target project
                computePaths(closureInformation);

                // Creating all the relations
                for (key in closureInformation.relations.preserved) {
                    for (name in closureInformation.relations.preserved[key]) {
                        addRelation(parent, key, closureInformation.relations.preserved[key][name], name);
                    }
                }

                logger.debug('Closure import finished!', closureInformation);

                return closureInformation;
            };
            //</editor-fold>
        };

        return LibraryCore;
    }
);