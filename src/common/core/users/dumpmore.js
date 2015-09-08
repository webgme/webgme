/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define(['common/core/users/tojson'], function (toJson) {
    'use strict';

    var _refTypes = {
            url: 'url',
            path: 'path',
            guid: 'guid'
        },
        _cache = {},
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

    var refToRelRefObj = function (path, refObj) {
        if (_cache[path]) {
            refObj.$ref = _cache[path];
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
                var dumped = function (err) {
                    error = error || err;
                    if (--needed === 0) {
                        callback(error);
                    }
                };

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
                                        containerDump[index].children, i, dumped);
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
            dumped = function (err) {
                error = error || err;
                if (--needed === 0) {
                    postProcessing(error);
                }
            },
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
                dumpNode(nodes[i], '#[' + i + ']', dumpNodes, i, dumped);
            }
        } else {
            callback('no node to dump!!!', null);
        }
    };

    return dumpMoreNodes;
});


