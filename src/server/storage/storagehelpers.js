/*globals requireJS*/
/*jshint node: true, newcap: false*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var Q = require('q'),
    REGEXP = requireJS('common/regexp');

function _loadHistoryRec(dbProject, nbr, target, result, added, heads) {
    var latest,
        i;

    heads.sort(function (a, b) {
        if (a.time > b.time) {
            return -1;
        }
        if (a.time < b.time) {
            return 1;
        }
        return 0;
    });

    for (i = 0; i < heads.length; i += 1) {
        if (!added[heads[i]._id]) {
            break;
        }
    }

    heads.splice(0, i);

    if (heads.length === 0) {
        return Q(result);
    }

    latest = heads.shift();
    result.push(latest);
    added[latest._id] = true;

    if (result.length === nbr || target === latest._id) {
        return Q(result);
    }

    return Q.allSettled(latest.parents.map(function (parentHash) {
        if (parentHash) {
            return dbProject.loadObject(parentHash);
        }
    }))
        .then(function (res) {
            var i;
            for (i = 0; i < res.length; i += 1) {
                if (res[i].state === 'fulfilled' && res[i].value) {
                    heads.push(res[i].value);
                } else if (res[i].state === 'rejected') {
                    throw new Error('parent does not exist: ' + JSON.stringify(latest));
                }
            }
            return _loadHistoryRec(dbProject, nbr, target, result, added, heads);
        });
}

/**
 *
 * @param project
 * @param {number} nbr
 * @param {string} target
 * @param {string[]} heads
 * @returns {*}
 * @ignore
 */
function loadHistory(dbProject, nbr, target, heads) {
    return _loadHistoryRec(dbProject, nbr, target, [], {}, heads);
}

/**
 * Loads the specific object, and if that object represents a node with sharded overlays,
 * then it loads those objects as well, and pack it into a single response.
 *
 * @param {object} dbProject
 * @param {string} nodeHash
 * @returns {function|promise}
 * @ignore
 */
function loadObject(dbProject, nodeHash) {
    var deferred = Q.defer(),
        node;

    dbProject.loadObject(nodeHash)
        .then(function (node_) {
            var shardLoads = [],
                shardId;
            node = node_;

            if (node && node.ovr && node.ovr.sharded === true) {
                for (shardId in node.ovr) {
                    if (REGEXP.DB_HASH.test(node.ovr[shardId]) === true) {
                        shardLoads.push(dbProject.loadObject(node.ovr[shardId]));
                    }
                }
                return Q.allSettled(shardLoads);
            } else {
                deferred.resolve(node);
                return;
            }
        })
        .then(function (overlayShardResults) {
            var i,
                response = {
                    multipleObjects: true,
                    objects: {}
                };
            response.objects[nodeHash] = node;

            for (i = 0; i < overlayShardResults.length; i += 1) {
                if (overlayShardResults[i].state === 'rejected') {
                    throw new Error('Loading overlay shard of node [' + nodeHash + '] failed');
                } else if (overlayShardResults[i].value._id) {
                    response.objects[overlayShardResults[i].value._id] = overlayShardResults[i].value;
                }
            }

            deferred.resolve(response);
        })
        .catch(deferred.reject);

    return deferred.promise;
}

/**
 * Loads the entire composition chain up till the rootNode for the provided path. And stores the nodes
 * in the loadedObjects. If the any of the objects already exists in loadedObjects - it does not load it
 * from the database.
 *
 * @param {object} dbProject
 * @param {string} rootHash
 * @param {Object<string, object>} loadedObjects
 * @param {string} path
 * @param {boolean} excludeParents - if true will only include the node at the path
 * @returns {function|promise}
 * @ignore
 */
function loadPath(dbProject, rootHash, loadedObjects, path, excludeParents) {
    var deferred = Q.defer(),
        pathArray = path.split('/');

    function processLoadResult(hash, result) {
        var subHash;
        if (result.multipleObjects === true) {
            for (subHash in result.objects) {
                loadedObjects[subHash] = result.objects[subHash];
            }
        } else {
            loadedObjects[hash] = result;
        }
    }

    function loadParent(parentHash, relPath) {
        var hash;
        if (loadedObjects[parentHash]) {
            // Object was already loaded.
            if (relPath) {
                hash = loadedObjects[parentHash][relPath];
                loadParent(hash, pathArray.shift());
            } else {
                deferred.resolve();
            }
        } else {
            loadObject(dbProject, parentHash)
                .then(function (object) {
                    if (relPath) {
                        hash = object[relPath];
                        if (!excludeParents) {
                            processLoadResult(parentHash, object);
                        }
                        loadParent(hash, pathArray.shift());
                    } else {
                        processLoadResult(parentHash, object);
                        deferred.resolve();
                    }
                })
                .catch(function (err) {
                    deferred.reject(err);
                });
        }
    }

    // Remove the root-path
    pathArray.shift();

    loadParent(rootHash, pathArray.shift());
    return deferred.promise;
}

function filterArray(arr) {
    var i,
        filtered = [];
    for (i = 0; i < arr.length; i += 1) {
        if (typeof arr[i] !== 'undefined') {
            filtered.push(arr[i]);
        }
    }
    return filtered;
}

module.exports = {
    loadHistory: loadHistory,
    loadPath: loadPath,
    filterArray: filterArray,
    loadObject: loadObject
}