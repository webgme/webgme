/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define(['common/core/users/tojson', 'common/util/url'], function (toJson, URL) {
    'use strict';

    var _refTypes = {
            url: 'url',
            path: 'path',
            guid: 'guid'
        },
        _cache = {},
        _rootPath = '',
        _refType = 'url',
        _core = null,
        _urlPrefix = '';

    var isRefObject = function (obj) {
        if (obj && obj.$ref) {
            return true;
        }
        return false;
    };

    var getRefObjectPath = function (obj) {
        var result = null;
        if (isRefObject(obj) === true) {
            var refValue = obj.$ref;
            switch (_refType) {
                case _refTypes.url:
                    if (refValue === null) {
                        result = null;
                    } else {
                        refValue = refValue.split('/');
                        result = decodeURIComponent(refValue[refValue.length - 1]);
                    }
                    break;
                case _refTypes.path:
                case _refTypes.guid:
                    result = refValue;
                    break;
                default:
                    result = null;
                    break;
            }
        }

        return result;
    };

    //var pathToRelRefObject = function (path) {
    //    if (_cache[path]) {
    //        return {$ref: _cache[path]};
    //    }
    //    return {$ref: null};
    //};

    var refToRelRefObj = function (path, refObj) {
        if (_cache[path]) {
            refObj.$ref = _cache[path];
        }
    };

    //var isSubordinate = function (path) {
    //    if (path.indexOf(_rootPath) === 0) {
    //        return true;
    //    }
    //    return false;
    //};

    var dumpChildren = function (node, dumpObject, urlPrefix, relPath, callback) {
        var needed = dumpObject.children.length;
        if (needed > 0) {
            _core.loadChildren(node, function (err, children) {
                if (err) {
                    callback(err);
                } else {
                    if (children === null || children === undefined || !children.length > 0) {
                        callback(new Error('invalid children info found'));
                    } else {
                        var setChildJson = function (child, cb) {
                            toJson(_core, child, urlPrefix, _refType, function (err, jChild) {
                                if (err) {
                                    cb(err);
                                } else {
                                    if (jChild) {
                                        var childRelPath,
                                            childPath = _core.getPath(child);
                                        for (var j = 0; j < dumpObject.children.length; j++) {
                                            if (childPath === getRefObjectPath(dumpObject.children[j])) {
                                                childRelPath = relPath + '/children[' + j + ']';
                                                _cache[childPath] = childRelPath;
                                                dumpObject.children[j] = jChild;
                                                break;
                                            }
                                        }
                                        dumpChildren(child, dumpObject.children[j], urlPrefix, childRelPath, cb);
                                    }
                                }
                            });
                        };
                        var error = null;

                        for (var i = 0; i < children.length; i++) {
                            setChildJson(children[i], function (err) {
                                error = error || err;
                                if (--needed === 0) {
                                    callback(error);
                                }
                            });
                        }
                    }
                }
            });
        } else {
            callback(null);
        }
    };

    var checkForInternalReferences = function (dumpObject) {
        if (typeof dumpObject === 'object') {
            for (var i in dumpObject) {
                if (typeof dumpObject[i] === 'object') {
                    if (isRefObject(dumpObject[i])) {
                        var path = getRefObjectPath(dumpObject[i]);
                        refToRelRefObj(path, dumpObject[i]);
                    } else {
                        checkForInternalReferences(dumpObject[i]);
                    }
                }
            }
        }
    };

    //var dumpJsonNode = function (core, node, urlPrefix, refType, callback) {
    //    _cache = {};
    //    _core = core;
    //    _rootPath = core.getPath(node);
    //    _refType = refType;
    //
    //    //TODO this needs to be done in another way
    //    toJson(core, node, urlPrefix, _refType, function (err, jDump) {
    //        if (err) {
    //            callback(err, null);
    //        } else {
    //            if (jDump) {
    //                _cache[_rootPath] = '#';
    //            }
    //            dumpChildren(node, jDump, urlPrefix, _cache[_rootPath], function (err) {
    //                if (err) {
    //                    callback(err);
    //                } else {
    //                    checkForInternalReferences(jDump);
    //                    callback(null, jDump);
    //                }
    //            });
    //        }
    //    });
    //};

    var dumpNode = function (node, relPath, containerDump, index, callback) {
        //first we should check if the node is already dumped or not
        var path = _core.getPath(node);
        if (_cache[path]) {
            containerDump[index] = {
                GUID: _core.getGuid(node),
                $ref: relPath
            };
            callback(null);
        } else {
            //we try to dump this path for the first time
            toJson(_core, node, _urlPrefix, _refType, function (err, jNode) {
                if (err) {
                    callback(err);
                } else {
                    containerDump[index] = jNode;
                    _cache[path] = relPath;

                    //now we should recursively call ourselves if the node has children
                    if (containerDump[index].children.length > 0) {
                        var needed = containerDump[index].children.length,
                            error = null;
                        _core.loadChildren(node, function (err, children) {
                            if (err) {
                                callback(err);
                            } else {
                                for (var i = 0; i < children.length; i++) {
                                    dumpNode(children[i], relPath + '/children[' + i + ']',
                                        containerDump[index].children, i, function (err) {
                                            error = error || err;
                                            if (--needed === 0) {
                                                callback(error);
                                            }
                                        }
                                    );
                                }
                            }
                        });
                    } else {
                        callback(null);
                    }
                }
            });
        }
    };

    var dumpMoreNodes = function (core, nodes, urlPrefix, refType, callback) {
        _cache = {};
        _core = core;
        _refType = refType;
        _urlPrefix = urlPrefix;

        var dumpNodes = [],
            needed = nodes.length,
            error = null,
            postProcessing = function (err) {
                if (err) {
                    callback(err);
                } else {
                    checkForInternalReferences(dumpNodes);
                    callback(null, dumpNodes);
                }
            };
        if (needed > 0) {
            for (var i = 0; i < nodes.length; i++) {
                dumpNodes.push({});
                dumpNode(nodes[i], '#[' + i + ']', dumpNodes, i, function (err) {
                    error = error || err;
                    if (--needed === 0) {
                        postProcessing(error);
                    }
                });
            }
        } else {
            callback('no node to dump!!!', null);
        }
    };

    return dumpMoreNodes;
});


