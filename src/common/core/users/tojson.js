/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define(['common/core/users/meta', 'common/util/url'], function (BaseMeta, URL) {
    'use strict';

    var META = new BaseMeta(),
        _refTypes = {
            url: 'url',
            path: 'path',
            guid: 'guid'
        };

    var changeRefObjects = function (refType, urlPrefix, object, core, root, callback) {
        var i,
            needed = 0,
            neededNames = [],
            error = null,
            pathToRefObjFinished = function (err, refObj) {
                error = error || err;
                object[neededNames[i]] = refObj;
                if (--needed === 0) {
                    callback(error);
                }
            },
            changeRefObjDone = function (err) {
                error = error || err;
                if (--needed === 0) {
                    callback(error);
                }
            };
        if (typeof object === 'object') {
            for (i in object) { // TODO: use key here instead
                if (object[i] !== null && typeof object[i] === 'object') {
                    needed++;
                    neededNames.push(i);
                }
            }
            if (needed > 0) {
                for (i = 0; i < neededNames.length; i++) {
                    if (object[neededNames[i]].$ref) {
                        //reference object
                        pathToRefObjAsync(refType, urlPrefix, object[neededNames[i]].$ref/*.substring(1)*/,
                            core, root, pathToRefObjFinished);
                    } else {
                        changeRefObjects(refType, urlPrefix, object[neededNames[i]], core, root, changeRefObjDone);
                    }
                }
            } else {
                callback(null);
            }
        } else {
            callback(null);
        }
    };

    var pathToRefObj = function (refType, urlPrefix, path) {
        var result;
        switch (refType) {
            case _refTypes.url:
                if (path === null) {
                    result = URL.urlToRefObject(null);
                } else {
                    result = URL.urlToRefObject(urlPrefix + '&path=' + encodeURIComponent(path));
                }
                break;
            case _refTypes.path:
                result = URL.urlToRefObject(path);
                break;
            default:
                result = URL.urlToRefObject(null);
                break;
        }

        return result;
    };

    var getParentRefObject = function (refType, urlPrefix, core, node) {
        var parent = core.getParent(node),
            path = null,
            result;

        if (parent) {
            path = core.getPath(parent);
        }
        switch (refType) {
            case _refTypes.url:
                if (path === null) {
                    result = URL.urlToRefObject(null);
                } else {
                    result = URL.urlToRefObject(urlPrefix + '&path=' + encodeURIComponent(path));
                }
                break;
            case _refTypes.path:
                result = URL.urlToRefObject(path);
                break;
            case _refTypes.guid:
                if (path === null) {
                    result = URL.urlToRefObject(null);
                } else {
                    var refObj = URL.urlToRefObject(path);
                    refObj.GUID = core.getGuid(parent);
                    result = refObj;
                }
                break;
        }

        return result;
    };

    var pathToRefObjAsync = function (refType, urlPrefix, path, core, root, callback) {
        switch (refType) {
            case _refTypes.url:
                if (path === null) {
                    callback(null, URL.urlToRefObject(null));
                }
                callback(null, URL.urlToRefObject(urlPrefix + '&path=' + encodeURIComponent(path)));
                break;
            case _refTypes.path:
                callback(null, URL.urlToRefObject(path));
                break;
            case _refTypes.guid:
                core.loadByPath(root, path, function (err, node) {
                    if (err) {
                        callback(err, null);
                    } else {
                        var refObj = URL.urlToRefObject(path);
                        refObj.GUID = core.getGuid(node);
                        callback(null, refObj);
                    }
                });
                break;
            default:
                callback(null, URL.urlToRefObject(null));
        }
    };

    var getChildrenGuids = function (core, node, callback) {
        var GUIDHash = {};
        core.loadChildren(node, function (err, children) {
            if (err) {
                callback(err, null);
            } else {
                for (var i = 0; i < children.length; i++) {
                    GUIDHash[core.getPath(children[i])] = core.getGuid(children[i]);
                }
                callback(null, GUIDHash);
            }
        });
    };

    var getMetaOfNode = function (core, node, urlPrefix, refType, callback) {
        var meta = META.getMeta(core.getPath(node));
        changeRefObjects(refType, urlPrefix, meta, core, core.getRoot(node), function (err) {
            callback(err, meta);
        });
    };

    var getChildrenOfNode = function (core, node, urlPrefix, refType, callback) {
        if (refType === _refTypes.guid) {
            getChildrenGuids(core, node, function (err, gHash) {
                if (err) {
                    callback(err);
                } else {
                    //TODO possibly it needs some ordering
                    var children = [];
                    for (var i in gHash) {
                        var refObj = URL.urlToRefObject(i);
                        refObj.GUID = gHash[i];
                        children.push(refObj);
                    }
                    callback(null, children);
                }
            });
        } else {
            var paths = core.getChildrenPaths(node);
            var children = [];
            for (var i = 0; i < paths.length; i++) {
                children.push(pathToRefObj(refType, urlPrefix, paths[i]));
            }
            callback(null, children);
        }
    };

    var getSetAttributesAndRegistry = function (core, node, setName, setOwnerPath, callback) {
        var path = core.getPath(node),
            i;
        core.loadByPath(core.getRoot(node), setOwnerPath, function (err, owner) {
            if (err) {
                callback(err);
            } else {
                if (owner) {
                    var atrAndReg = {attributes: {}, registry: {}};
                    var names = core.getMemberAttributeNames(owner, setName, path);
                    for (i = 0; i < names.length; i++) {
                        atrAndReg.attributes[names[i]] = core.getMemberAttribute(owner, setName, path, names[i]);
                    }
                    names = core.getMemberRegistryNames(owner, setName, path);
                    for (i = 0; i < names.length; i++) {
                        atrAndReg.registry[names[i]] = core.getMemberRegistry(owner, setName, path, names[i]);
                    }
                    callback(null, atrAndReg);
                } else {
                    callback('internal error', null);
                }
            }
        });
    };

    var getMemberAttributesAndRegistry = function (core, node, setName, memberPath) {
        var retObj = {attributes: {}, registry: {}},
            names,
            i;
        names = core.getMemberAttributeNames(node, setName, memberPath);
        for (i = 0; i < names.length; i++) {
            retObj.attributes[names[i]] = core.getMemberAttribute(node, setName, memberPath, names[i]);
        }
        names = core.getMemberRegistryNames(node, setName, memberPath);
        for (i = 0; i < names.length; i++) {
            retObj.registry[names[i]] = core.getMemberRegistry(node, setName, memberPath, names[i]);
        }
        return retObj;
    };

    var getSetsOfNode = function (core, node, urlPrefix, refType, callback) {
        var setsInfo = {},
            tArray = core.getSetNames(node),
            memberOfInfo = core.isMemberOf(node),
            i, j, needed,
            error = null,
            createOneSetInfoFinished = function(err){
                error = error || err;
                if (--needed === 0) {
                    callback(error, setsInfo);
                }
            },
            createOneSetInfo = function (setName) {
            var needed,
                members = (core.getMemberPaths(node, setName)).sort(), //TODO Remove the sort part at some point
                info = {from: [], to: [], set: true},
                i,
                error = null,
                containers = [],
                collectSetInfoFinished = function (err, refObj) {
                    error = error || err;
                    if (refObj !== undefined && refObj !== null) {
                        info.to.push(refObj);
                    }

                    if (--needed === 0) {
                        if (error === null) {
                            setsInfo[setName] = info;
                        }
                        createOneSetInfoFinished(error);
                    }
                },
                collectSetInfo = function (nodePath, container) {
                    if (container === true) {
                        pathToRefObjAsync(refType, urlPrefix, nodePath, core, core.getRoot(node),
                            function (err, refObj) {
                                if (!err && refObj !== undefined && refObj !== null) {
                                    getSetAttributesAndRegistry(core, node, setName, nodePath,
                                        function (err, atrAndReg) {
                                            if (atrAndReg) {
                                                for (var j in atrAndReg) {
                                                    refObj[j] = atrAndReg[j];
                                                }
                                            }
                                            collectSetInfoFinished(err, refObj);
                                        }
                                    );
                                } else {
                                    collectSetInfoFinished(err, null);
                                }
                            }
                        );
                    } else {
                        //member
                        pathToRefObjAsync(refType, urlPrefix, nodePath, core, core.getRoot(node),
                            function (err, refObj) {
                                if (refObj !== undefined && refObj !== null) {
                                    var atrAndReg = getMemberAttributesAndRegistry(core, node, setName, nodePath);
                                    for (var j in atrAndReg) {
                                        refObj[j] = atrAndReg[j];
                                    }
                                    collectSetInfoFinished(err, refObj);
                                }
                            }
                        );
                    }
                };

            for (i in memberOfInfo) {
                if (memberOfInfo[i].indexOf(setName) !== -1) {
                    containers.push(i);
                }
            }

            needed = members.length + containers.length;
            if (needed > 0) {
                for (i = 0; i < members.length; i++) {
                    collectSetInfo(members[i], false);
                }

                for (i = 0; i < containers.length; i++) {
                    collectSetInfo(containers[i], true);
                }
            } else {
                callback(null);
            }
        };

        for (j in memberOfInfo) {
            for (i = 0; i < memberOfInfo[j].length; i++) {
                if (tArray.indexOf(memberOfInfo[j][i]) === -1) {
                    tArray.push(memberOfInfo[j][i]);
                }
            }
        }
        needed = tArray.length;
        if (needed > 0) {
            for (i = 0; i < tArray.length; i++) {
                createOneSetInfo(tArray[i]);
            }
        } else {
            callback(null, setsInfo);
        }
    };

    var getPointersGUIDs = function (core, node, callback) {
        var gHash = {},
            pointerNames = core.getPointerNames(node),
            collectionNames = core.getCollectionNames(node),
            needed = pointerNames.length + collectionNames.length,
            error = null,
            i;
        if (needed > 0) {
            //pointers
            for (i = 0; i < pointerNames.length; i++) {
                core.loadPointer(node, pointerNames[i], function (err, pointer) {
                    error = error || err;
                    if (pointer) {
                        if (gHash[core.getPath(pointer)] === undefined) {
                            gHash[core.getPath(pointer)] = core.getGuid(pointer);
                        }
                    }

                    if (--needed === 0) {
                        callback(error, gHash);
                    }
                });
            }
            //collections
            for (i = 0; i < collectionNames.length; i++) {
                core.loadCollection(node, collectionNames[i], function (err, collection) {
                    error = error || err;
                    if (collection) {
                        for (var j = 0; j < collection.length; j++) {
                            if (gHash[core.getPath(collection[j])] === undefined) {
                                gHash[core.getPath(collection[j])] = core.getGuid(collection[j]);
                            }
                        }
                    }

                    if (--needed === 0) {
                        callback(error, gHash);
                    }
                });
            }
        } else {
            callback(error, gHash);
        }
    };

    var getPointersOfNode = function (core, node, urlPrefix, refType, callback) {
        var GUIDHash = {};
        var getRefObj = function (path) {
            if (refType === _refTypes.guid) {
                var refObj = URL.urlToRefObject(path);
                refObj.GUID = GUIDHash[path];
                return refObj;
            } else {
                return pathToRefObj(refType, urlPrefix, path);
            }
        };
        var initialized = function () {
            var pointers = {},
                tArray = core.getPointerNames(node),
                t2Array = core.getCollectionNames(node),
                i, j;
            for (i = 0; i < t2Array.length; i++) {
                if (tArray.indexOf(t2Array[i]) === -1) {
                    tArray.push(t2Array[i]);
                }
            }
            for (i = 0; i < tArray.length; i++) {
                var coll = core.getCollectionPaths(node, tArray[i]);
                var pointer = {to: [], from: [], set: false},
                    pPath = core.getPointerPath(node, tArray[i]);
                if (pPath !== undefined) {
                    pointer.to.push(getRefObj(pPath));
                }
                for (j = 0; j < coll.length; j++) {
                    pointer.from.push(getRefObj(coll[j]));
                }
                pointers[tArray[i]] = pointer;
            }
            callback(null, pointers);
        };

        //start
        if (refType === _refTypes.guid) {
            getPointersGUIDs(core, node, function (err, gHash) {
                if (err) {
                    callback(err, null);
                } else {
                    GUIDHash = gHash;
                    initialized();
                }
            });
        } else {
            initialized();
        }
    };

    var getOwnPartOfNode = function (core, node) {
        var own = {attributes: [], registry: [], pointers: []};
        own.attributes = core.getOwnAttributeNames(node);
        own.registry = core.getOwnRegistryNames(node);
        own.pointers = core.getOwnPointerNames(node);
        return own;
    };

    var getJsonNode = function (core, node, urlPrefix, refType, callback) {
        var nodes = {},
            tArray,
            i,
            jNode;

        if (refType === _refTypes.guid && typeof core.getGuid !== 'function') {
            callback(new Error('cannot provide GUIDs'), null);
        }

        nodes[core.getPath(node)] = node;
        META.initialize(core, nodes, function () {
            //TODO: is this asynchronous?
        });

        jNode = {
            meta: {},
            children: [],
            attributes: {},
            pointers: {},
            registry: {}
        };


        //basic parts of the node
        //GUID
        if (typeof core.getGuid === 'function') {
            jNode.GUID = core.getGuid(node);
        }
        //RELID
        jNode.RELID = core.getRelid(node);
        //registry entries
        tArray = core.getRegistryNames(node);
        for (i = 0; i < tArray.length; i++) {
            jNode.registry[tArray[i]] = core.getRegistry(node, tArray[i]);
        }
        //attribute entries
        tArray = core.getAttributeNames(node);
        for (i = 0; i < tArray.length; i++) {
            jNode.attributes[tArray[i]] = core.getAttribute(node, tArray[i]);
        }

        //own part of the node
        jNode.OWN = getOwnPartOfNode(core, node);

        //reference to parent
        jNode.parent = getParentRefObject(refType, urlPrefix, core, node);


        //now calling the relational parts
        var needed = 4,
            error = null;
        getChildrenOfNode(core, node, urlPrefix, refType, function (err, children) {
            error = error || err;
            jNode.children = children;
            if (--needed === 0) {
                callback(error, jNode);
            }
        });
        getMetaOfNode(core, node, urlPrefix, refType, function (err, meta) {
            error = error || err;
            jNode.meta = meta;
            if (--needed === 0) {
                callback(error, jNode);
            }
        });
        getPointersOfNode(core, node, urlPrefix, refType, function (err, pointers) {
            error = error || err;
            for (var i in pointers) {
                jNode.pointers[i] = pointers[i];
            }
            if (--needed === 0) {
                callback(error, jNode);
            }
        });
        getSetsOfNode(core, node, urlPrefix, refType, function (err, sets) {
            error = error || err;
            for (var i in sets) {
                jNode.pointers[i] = sets[i];
            }
            if (--needed === 0) {
                callback(error, jNode);
            }
        });
    };

    return getJsonNode;
});
