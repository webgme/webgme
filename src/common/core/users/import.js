/*globals define*/
/*jshint node: true, browser: true*/

/**
 * this type of import is for merge purposes
 * it tries to import not only the outgoing relations but the incoming ones as well
 * it also tries to keep both the GUID and the relid's
 * if it finds the same guid in the same place then it overwrites the node with the imported one!!!
 * it not searches for GUID!!! so be careful when to use this method
 *
 * @author kecso / https://github.com/kecso
 */

define(['common/core/users/meta'], function (BaseMeta) {
    'use strict';
    var _core = null,
        _root = null,
        _cache = {},
        _underImport = {},
        _internalRefHash = {},
        META = new BaseMeta();

    function internalRefCreated(intPath, node) {
        _cache[_core.getPath(node)] = node;
        _internalRefHash[intPath] = _core.getPath(node);
        var callbacks = _underImport[intPath] || [];
        delete _underImport[intPath];
        for (var i = 0; i < callbacks.length; i++) {
            callbacks[i](null, node);
        }
    }

    function objectLoaded(error, node) {
        if (error === null) {
            _cache[_core.getPath(node)] = node;
        }

        var callbacks = _underImport[_core.getPath(node)] || [];
        delete _underImport[_core.getPath(node)];
        for (var i = 0; i < callbacks.length; i++) {
            callbacks[i](error, node);
        }
    }

    function isInternalReference(refObj) {
        if (refObj && typeof refObj.$ref === 'string') {
            if (refObj.$ref.indexOf('#') === 0) {
                return true;
            }
        }
        return false;
    }

    function getReferenceNode(refObj, callback) {
        //we allow the internal references and the
        if (refObj && typeof refObj.$ref === 'string') {
            if (refObj.$ref.indexOf('#') === 0) {
                //we assume that it is an internal reference
                if (_internalRefHash[refObj.$ref] !== undefined) {
                    callback(null, _cache[_internalRefHash[refObj.$ref]]);
                } else if (_underImport[refObj.$ref] !== undefined) {
                    _underImport[refObj.$ref].push(callback);
                } else {
                    //TODO we should check if the loading order is really finite this way
                    _underImport[refObj.$ref] = [callback];
                }
            } else if (refObj.$ref === null) {
                callback(null, null);
            } else {
                if (_cache[refObj.$ref]) {
                    callback(null, _cache[refObj.$ref]);
                } else if (_underImport[refObj.$ref]) {
                    _underImport[refObj.$ref].push(callback);
                } else {
                    _underImport[refObj.$ref] = [callback];
                    _core.loadByPath(_root, refObj.$ref, function (err, node) {
                        if (err) {
                            objectLoaded(err, null);
                        } else {
                            if (refObj.GUID) {
                                if (refObj.GUID === _core.getGuid(node)) {
                                    objectLoaded(err, node);
                                } else {
                                    objectLoaded('GUID mismatch', node);
                                }
                            } else {
                                objectLoaded(err, node);
                            }
                        }
                    });
                }
            }
        } else {
            callback(null, null);
        }
    }

    function importChildren(node, jNode, pIntPath, callback) {
        if (jNode && jNode.children && jNode.children.length) {
            var needed = jNode.children.length,
                imported = function (err) {
                    error = error || err;
                    if (--needed === 0) {
                        callback(error);
                    }
                };

            if (needed > 0) {
                var error = null;
                for (var i = 0; i < jNode.children.length; i++) {
                    importNode(jNode.children[i], node, pIntPath + '/children[' + i + ']', true, imported);
                }
            } else {
                callback(null);
            }

        } else {
            callback(null); //TODO maybe we should be more strict
        }
    }

    function importAttributes(node, jNode) {
        if (typeof jNode.attributes === 'object') {
            var names = Object.keys(jNode.attributes);
            if (jNode.OWN) {
                names = jNode.OWN.attributes;
            }

            for (var i = 0; i < names.length; i++) {
                var value = jNode.attributes[names[i]];
                if (value !== undefined) {
                    _core.setAttribute(node, names[i], value);
                }
            }
        }
    }

    function importRegistry(node, jNode) {
        if (typeof jNode.registry === 'object') {
            var names = Object.keys(jNode.registry);
            if (jNode.OWN) {
                names = jNode.OWN.registry;
            }

            for (var i = 0; i < names.length; i++) {
                var value = jNode.registry[names[i]];
                if (value !== undefined) {
                    _core.setRegistry(node, names[i], value);
                }
            }
        }
    }

    function importPointer(node, jNode, pName, callback) {
        if (jNode.pointers[pName].to && jNode.pointers[pName].from) {
            var needed = jNode.pointers[pName].to.length + jNode.pointers[pName].from.length,
                i,
                error = null,
                ownPointer = true,
                addingPointer = function (reference, isTarget) {
                    var nodeFound = function (err, targetOrSource) {
                        error = error || err;
                        if (targetOrSource) {
                            if (isTarget) {
                                _core.setPointer(node, pName, targetOrSource);
                            } else {
                                _core.setPointer(targetOrSource, pName, node);
                            }
                        }

                        if (--needed === 0) {
                            callback(error);
                        }
                    };

                    getReferenceNode(reference, nodeFound);
                };

            if (jNode.OWN) {
                if (jNode.OWN.pointers.indexOf(pName) === -1) {
                    ownPointer = false;
                    needed -= jNode.pointers[pName].to.length;
                }
            }
            if (needed === 0) {
                callback(null);
            } else {
                if (ownPointer) {
                    for (i = 0; i < jNode.pointers[pName].to.length; i++) {
                        addingPointer(jNode.pointers[pName].to[i], true);
                    }
                }

                for (i = 0; i < jNode.pointers[pName].from.length; i++) {
                    if (!isInternalReference(jNode.pointers[pName].from[i])) {
                        addingPointer(jNode.pointers[pName].from[i], false);
                    } else {
                        if (--needed === 0) {
                            callback(error);
                        }
                    }
                }
            }
        } else {
            callback(null);
        }
    }

    function importSet(node, jNode, sName, callback) {
        if (jNode.pointers[sName].to && jNode.pointers[sName].from) {
            var needed = 0,
                i,
                importSetRegAndAtr = function (sOwner, sMember, atrAndReg) {
                    _core.addMember(sOwner, sName, sMember);
                    var mPath = _core.getPath(sMember);
                    atrAndReg.attributes = atrAndReg.attributes || {};
                    for (i in atrAndReg.attributes) {
                        _core.setMemberAttribute(sOwner, sName, mPath, i, atrAndReg.attributes[i]);
                    }
                    atrAndReg.registry = atrAndReg.registry || {};
                    for (i in atrAndReg.registry) {
                        _core.setMemberRegistry(sOwner, sName, mPath, i, atrAndReg.registry[i]);
                    }
                },
                setReferenceImported = function (err) {
                    error = error || err;
                    if (--needed === 0) {
                        callback(error);
                    }
                },
                importSetReference = function (isTo, index) {
                    var jObj = isTo === true ? jNode.pointers[sName].to[index] : jNode.pointers[sName].from[index];
                    getReferenceNode(jObj, function (err, sNode) {
                        if (err) {
                            setReferenceImported(err);
                        } else {
                            if (sNode) {
                                var sOwner = isTo === true ? node : sNode,
                                    sMember = isTo === true ? sNode : node;
                                importSetRegAndAtr(sOwner, sMember, jObj);
                            }
                            setReferenceImported(null);
                        }
                    });
                },
                error = null;

            if (jNode.pointers[sName].to.length > 0) {
                needed += jNode.pointers[sName].to.length;
                _core.createSet(node, sName);
            }
            if (jNode.pointers[sName].from.length > 0) {
                needed += jNode.pointers[sName].from.length;
            }

            if (needed > 0) {
                for (i = 0; i < jNode.pointers[sName].to.length; i++) {
                    importSetReference(true, i);
                }
                for (i = 0; i < jNode.pointers[sName].from.length; i++) {
                    importSetReference(false, i);
                }
            } else {
                callback(null);
            }
        } else {
            callback(null); //TODO now we just simply try to ignore faulty data import
        }
    }

    function importRelations(node, jNode, callback) {
        //TODO now se use the pointer's 'set' attribute to decide if it is a set or a pointer really
        var pointers = [],
            sets = [],
            needed = 0,
            error = null,
            i,
            imported = function (err) {
                error = error || err;
                if (--needed === 0) {
                    callback(error);
                }
            };

        if (typeof jNode.pointers !== 'object') {
            callback(null); //TODO should we drop an error???
        } else {
            for (i in jNode.pointers) {
                if (jNode.pointers[i].set === true) {
                    sets.push(i);
                } else {
                    pointers.push(i);
                }
            }

            needed = sets.length + pointers.length;

            if (needed > 0) {
                for (i = 0; i < pointers.length; i++) {
                    importPointer(node, jNode, pointers[i], imported);
                }
                for (i = 0; i < sets.length; i++) {
                    importSet(node, jNode, sets[i], imported);
                }
            } else {
                callback(null);
            }
        }
    }

    function importMeta(node, jNode, callback) {
        //TODO now this function searches the whole meta data for reference objects and load them, then call setMeta
        var loadReference = function (refObj, cb) {
                getReferenceNode(refObj, function (err, rNode) {
                    if (err) {
                        cb(err);
                    } else {
                        if (rNode) {
                            refObj.$ref = _core.getPath(rNode);
                        }
                        cb(null);
                    }
                });
            },
            loadMetaReferences = function (jObject, cb) {
                var needed = 0,
                    i,
                    error = null,
                    referenceLoaded = function (err) {
                        error = error || err;
                        if (--needed === 0) {
                            cb(error);
                        }
                    };

                for (i in jObject) {
                    if (jObject[i] !== null && typeof jObject[i] === 'object') {
                        needed++;
                    }
                }

                if (needed > 0) {
                    for (i in jObject) {
                        if (jObject[i] !== null && typeof jObject[i] === 'object') {
                            if (jObject[i].$ref) {
                                loadReference(jObject[i], referenceLoaded);
                            } else {
                                loadMetaReferences(jObject[i], referenceLoaded);
                            }
                        }
                    }
                } else {
                    cb(error);
                }
            };

        loadMetaReferences(jNode.meta || {}, function (err) {
            if (err) {
                callback(err);
            } else {
                META.setMeta(_core.getPath(node), jNode.meta || {});
                callback(null);
            }
        });
    }

    function importRoot(jNode, callback) {
        //first we create the root node itself, then the other parts of the function is pretty much like the importNode
        _root = _core.createNode({guid: jNode.GUID});
        internalRefCreated('#', _root);
        importAttributes(_root, jNode);
        importRegistry(_root, jNode);
        importChildren(_root, jNode, '#', function (err) {
            if (err) {
                callback(err);
            } else {
                importRelations(_root, jNode, function (err) {
                    if (err) {
                        callback(err);
                    } else {
                        importMeta(_root, jNode, function (err) {
                            callback(err, _root);
                        });
                    }
                });
            }
        });
    }

    //function clearOldNode(relid, guid, parentNode, callback) {
    //    var relids = _core.getChildrenRelids(parentNode);
    //    if (relids.indexOf(relid) !== -1) {
    //        _core.loadChild(parentNode, relid, function (err, oldChild) {
    //            if (err) {
    //                callback(err);
    //            } else {
    //                if (_core.getGuid(oldChild) === guid) {
    //                    var root = _core.getRoot(oldChild);
    //                    _core.deleteNode(oldChild);
    //                    _core.persist(root, function () {
    //                        callback(null);
    //                    });
    //                } else {
    //                    callback(null);
    //                }
    //            }
    //        });
    //    } else {
    //        callback(null);
    //    }
    //}

    function getEmptyNode(jNode, parentNode, baseNode, noClear, callback) {
        var relids = _core.getChildrenRelids(parentNode),
            returnNewNode = function () {
                var node = _core.createNode({base: baseNode, parent: parentNode, relid: jNode.RELID, guid: jNode.GUID});
                callback(null, node);
            };
        if (relids.indexOf(jNode.RELID) !== -1) {
            _core.loadChild(parentNode, jNode.RELID, function (err, oldChild) {
                if (err) {
                    callback(err, null);
                } else {
                    if (_core.getGuid(oldChild) === jNode.GUID) {
                        if (noClear === true) {
                            callback(null, oldChild);
                        } else {
                            var root = _core.getRoot(oldChild);
                            _core.deleteNode(oldChild);
                            _core.persist(root, function () {
                                returnNewNode();
                            });
                        }
                    } else {
                        returnNewNode();
                    }
                }
            });
        } else {
            returnNewNode();
        }
    }

    function importNode(jNode, parentNode, intPath, noClear, callback) {
        //first we have to get the base of the node
        if (jNode.pointers && jNode.pointers.base && jNode.pointers.base.to) {
            getReferenceNode(jNode.pointers.base.to[0], function (err, base) {
                if (err) {
                    callback(err);
                } else {
                    getEmptyNode(jNode, parentNode, base, noClear, function (err, node) {
                        if (err) {
                            callback(err);
                        } else {
                            internalRefCreated(intPath, node);
                            importAttributes(node, jNode);
                            importRegistry(node, jNode);
                            importChildren(node, jNode, intPath, function (err) {
                                if (err) {
                                    callback(err);
                                } else {
                                    importRelations(node, jNode, function (err) {
                                        if (err) {
                                            callback(err);
                                        } else {
                                            importMeta(node, jNode, function (err) {
                                                callback(err);
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        } else {
            callback('wrong import format: base info is wrong');
        }
    }

    function importing(core, parent, jNode, callback) {
        var needed = jNode.length,
            error = null,
            nodeImported = function (err) {
                error = error || err;
                if (--needed === 0) {
                    callback(error);
                }
            };

        _core = core;
        _cache = {};
        _underImport = {};
        _internalRefHash = {};
        META.initialize(_core, _cache, function () {
        });

        if (jNode.length) {
            //multiple objects
            if (parent) {
                needed = jNode.length;
                error = null;
                _cache[core.getPath(parent)] = parent;
                _root = core.getRoot(parent);
                for (var i = 0; i < jNode.length; i++) {
                    importNode(jNode[i], parent, '#[' + i + ']', false, nodeImported);
                }
            } else {
                callback('no parent given!!!');
            }
        } else {
            //single object
            if (parent) {
                _cache[core.getPath(parent)] = parent;
                _root = core.getRoot(parent);
                importNode(jNode, parent, '#', false, callback);
            } else {
                importRoot(jNode, callback);
            }
        }
    }

    return importing;
});

