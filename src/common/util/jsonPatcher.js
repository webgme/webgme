/*globals define*/
/*jshint browser:true, node:true*/

/**
 * This is a partial implementation of RFC 6902
 * the generated patch is fully compliant though the
 * patch generation is specialized to the expected input form.
 *
 * @author kecso / https://github.com/kecso
 */

define([
    'common/util/canon',
    'common/util/random',
    'common/core/constants',
    'common/regexp'
], function (CANON, RANDOM, CORE_CONSTANTS, REGEXP) {

    'use strict';

    var MIN_RELID_LENGTH_PATH = CORE_CONSTANTS.PATH_SEP + CORE_CONSTANTS.MINIMAL_RELID_LENGTH_PROPERTY;

    function _strEncode(str) {
        //we should replace the '/' in the patch paths
        return str.replace(/\//g, '%2f');
    }

    function _strDecode(str) {
        return str.replace(/%2f/g, '/');
    }

    function _endsWith(str, pattern) {
        var d = str.length - pattern.length;
        return d >= 0 && str.lastIndexOf(pattern) === d;
    }

    function _startsWith(str, pattern) {
        return str.indexOf(pattern) === 0;
    }

    function _isOvr(path) {
        return path.indexOf('/ovr') === 0;
    }

    function _isRelid(path) {
        return RANDOM.isValidRelid(path.substring(1));
    }

    function _isGmePath(path) {
        if (typeof path !== 'string') {
            return false;
        }

        if (path === '') {
            return true;
        }

        var relIds = path.split('/'),
            result = false,
            i;

        for (i = 1; i < relIds.length; i += 1) {
            if (RANDOM.isValidRelid(relIds[i]) === false) {
                return false;
            } else {
                result = true;
            }
        }

        return result;
    }

    function diff(source, target, basePath, excludeList, noUpdate, innerPath, overlay, inOverlay) {
        var result = [],
            patchItem,
            path,
            i;

        //add
        for (i in target) {
            if (excludeList.indexOf(i) === -1 && target.hasOwnProperty(i)) {
                if (!source.hasOwnProperty(i)) {
                    patchItem = {
                        op: 'add',
                        path: basePath + _strEncode(i),
                        value: target[i]
                    };

                    if (inOverlay || overlay) {
                        patchItem.partialUpdates = [];
                        patchItem.updates = [];
                        if (inOverlay) {
                            if (_isGmePath(target[i])) {
                                patchItem.partialUpdates.push(target[i]);
                                if (_isGmePath(innerPath)) {
                                    patchItem.updates.push(innerPath);
                                }
                            } else if (target[i] === '/_nullptr') {
                                patchItem.updates.push('');
                            }
                        } else {
                            for (path in target[i]) {
                                if (_isGmePath(target[i][path])) {
                                    patchItem.partialUpdates.push(target[i][path]);
                                    if (_isGmePath(i)) {
                                        patchItem.updates.push(i);
                                    }
                                } else if (target[i][path] === '/_nullptr') {
                                    patchItem.updates.push('');
                                }
                            }
                        }
                    }

                    result.push(patchItem);
                }
            }
        }

        //replace
        if (!noUpdate) {
            for (i in target) {
                if (excludeList.indexOf(i) === -1 && target.hasOwnProperty(i)) {
                    if (source.hasOwnProperty(i) && CANON.stringify(source[i]) !== CANON.stringify(target[i])) {
                        patchItem = {
                            op: 'replace',
                            path: basePath + _strEncode(i),
                            value: target[i]
                            //oldValue: source[i]
                        };

                        if (inOverlay) {
                            patchItem.partialUpdates = [];
                            patchItem.updates = [];

                            if (_isGmePath(target[i])) {
                                patchItem.partialUpdates.push(target[i]);
                                if (_isGmePath(innerPath)) {
                                    patchItem.updates.push(innerPath);
                                }
                            } else if (target[i] === '/_nullptr') {
                                patchItem.updates.push('');
                            }

                            if (_isGmePath(source[i])) {
                                patchItem.partialUpdates.push(source[i]);
                            } else if (source[i] === '/_nullptr') {
                                patchItem.updates.push('');
                            }
                        }

                        result.push(patchItem);
                    }
                }
            }
        }

        //remove
        for (i in source) {
            if (excludeList.indexOf(i) === -1 && source.hasOwnProperty(i)) {
                if (!target.hasOwnProperty(i)) {
                    patchItem = {
                        op: 'remove',
                        path: basePath + _strEncode(i)
                        //oldValue: source[i]
                    };

                    if (inOverlay || overlay) {
                        patchItem.partialUpdates = [];
                        patchItem.updates = [];
                        if (inOverlay) {
                            if (_isGmePath(source[i])) {
                                patchItem.partialUpdates.push(source[i]);
                                if (_isGmePath(innerPath)) {
                                    patchItem.updates.push(innerPath);
                                }
                            } else if (source[i] === '/_nullptr') {
                                patchItem.updates.push('');
                            }
                        } else {
                            for (path in source[i]) {
                                if (_isGmePath(source[i][path])) {
                                    patchItem.partialUpdates.push(source[i][path]);
                                    if (_isGmePath(i)) {
                                        patchItem.updates.push(i);
                                    }
                                } else if (source[i][path] === '/_nullptr') {
                                    patchItem.updates.push('');
                                }
                            }
                        }
                    }

                    result.push(patchItem);
                }
            }
        }

        return result;
    }

    function _isEmptyObject(object) {
        for (var key in object) {
            return false;
        }
        return true;
    }

    function wholeShardDiff(items, isAddition) {
        var patchItem = {
                updates: [],
                partialUpdates: []
            },
            source,
            name;

        patchItem.op = 'replace';
        patchItem.path = '/items';

        if (isAddition) {
            patchItem.value = items;
        } else {
            patchItem.value = {};
        }

        for (source in items) {
            patchItem.updates.push(source);
            for (name in items[source]) {
                patchItem.partialUpdates.push(items[source][name]);
            }
        }

        return patchItem;
    }

    function overlayShardDiff(sourceJson, targetJson) {
        var patch,
            key,
            sourceEmpty = _isEmptyObject(sourceJson.items || {}),
            targetEmpty = _isEmptyObject(targetJson.items || {});

        patch = diff(sourceJson, targetJson, '/', ['_id', 'type', 'items'], false, '', false, false);

        if (sourceEmpty && targetEmpty) {
            // Do nothing as nothing have changed
        } else if (sourceEmpty) {
            patch.push(wholeShardDiff(targetJson.items, true));
        } else if (targetEmpty) {
            patch.push(wholeShardDiff(sourceJson.items, false));
        } else {
            patch = patch
                .concat(diff(sourceJson.items || {}, targetJson.items || {}, '/items/', [], true, '', true, false));
            for (key in sourceJson.items) {
                if (targetJson.items.hasOwnProperty(key)) {
                    patch = patch.concat(diff(
                        sourceJson.items[key],
                        targetJson.items[key],
                        '/items/' + _strEncode(key) + '/',
                        [],
                        false,
                        key,
                        false,
                        true));
                }
            }
        }

        return patch;
    }

    function getShardingDiff(commonOverlay, shardedOverlay) {
        var patchItem = {
            op: 'replace',
            path: '/ovr',
            value: shardedOverlay,
            preShardRelations: commonOverlay
        };

        return patchItem;
    }

    function create(sourceJson, targetJson) {
        var patch,
            patchItem,
            diffRes,
            i,
            key;

        //if it is an overlay shard, we make a more simple diff
        if (sourceJson.type === 'shard' && targetJson.type === 'shard') {
            return overlayShardDiff(sourceJson, targetJson);
        }

        //main level diff
        patch = diff(sourceJson, targetJson, '/', ['_id', 'ovr', 'atr', 'reg', '_sets'], false, '', false, false);

        //atr
        if (sourceJson.atr && targetJson.atr) {
            patch = patch.concat(diff(sourceJson.atr, targetJson.atr, '/atr/', [], false, '', false, false));
        } else if (sourceJson.atr) {
            patch.push({
                op: 'remove',
                path: '/atr'
            });
        } else if (targetJson.atr) {
            patch.push({
                op: 'add',
                path: '/atr',
                value: targetJson.atr
            });
        }

        //reg
        if (sourceJson.reg && targetJson.reg) {
            patch = patch.concat(diff(sourceJson.reg, targetJson.reg, '/reg/', [], false, '', false, false));
        } else if (sourceJson.reg) {
            patch.push({
                op: 'remove',
                path: '/reg'
            });
        } else if (targetJson.reg) {
            patch.push({
                op: 'add',
                path: '/reg',
                value: targetJson.reg
            });
        }

        //_sets
        if (sourceJson._sets && targetJson._sets) {
            patch = patch.concat(diff(sourceJson._sets, targetJson._sets, '/_sets/', [], true, '', false, false));
            for (key in targetJson._sets) {
                if (sourceJson._sets[key]) {
                    patch = patch.concat(diff(
                        sourceJson._sets[key],
                        targetJson._sets[key],
                        '/_sets/' + _strEncode(key) + '/',
                        [],
                        false,
                        '',
                        false,
                        false));
                }
            }
        } else if (sourceJson._sets) {
            patch.push({
                op: 'remove',
                path: '/_sets'
            });
        } else if (targetJson._sets) {
            patch.push({
                op: 'add',
                path: '/_sets',
                value: targetJson._sets
            });
        }

        //ovr
        if (sourceJson.ovr && targetJson.ovr) {
            if (sourceJson.ovr.sharded !== true && targetJson.ovr.sharded === true) {
                // Transformation into sharded overlays means that we have to collect update information.
                patch.push(getShardingDiff(sourceJson.ovr, targetJson.ovr));
            } else if (sourceJson.ovr.sharded === true && targetJson.ovr.sharded === true) {
                patch = patch.concat(diff(sourceJson.ovr, targetJson.ovr, '/ovr/', [], false, '', true, false));
            } else {
                patch = patch.concat(diff(sourceJson.ovr, targetJson.ovr, '/ovr/', [], true, '', true, false));
                for (key in targetJson.ovr) {
                    if (sourceJson.ovr[key]) {
                        patch = patch.concat(diff(
                            sourceJson.ovr[key],
                            targetJson.ovr[key],
                            '/ovr/' + _strEncode(key) + '/',
                            [],
                            false,
                            key,
                            false,
                            true));
                    }
                }
            }
        } else if (sourceJson.ovr || targetJson.ovr) {
            patchItem = {
                path: '/ovr',
                partialUpdates: [],
                updates: []
            };

            if (sourceJson.ovr) {
                patchItem.op = 'remove';
            } else {
                patchItem.op = 'add';
                patchItem.value = targetJson.ovr;
            }

            // For ovr removal/addition we need to compute updates/partialUpdates
            diffRes = diff(sourceJson.ovr || {}, targetJson.ovr || {}, '/ovr/', [], true, '', true, false);
            for (i = 0; i < diffRes.length; i += 1) {
                patchItem.partialUpdates = patchItem.partialUpdates.concat(diffRes[i].partialUpdates);
                patchItem.updates = patchItem.updates.concat(diffRes[i].updates);
            }

            patch.push(patchItem);
        }

        return patch;
    }

    function apply(sourceJson, patch) {
        var targetJson = JSON.parse(JSON.stringify(sourceJson)),
            i, j,
            badOperation = false,
            pathArray,
            key,
            parent,
            result = {
                status: 'success',
                faults: [],
                patch: patch,
                result: targetJson
            };

        for (i = 0; i < patch.length; i += 1) {
            pathArray = (patch[i].path + '').split('/').slice(1);
            parent = targetJson;

            for (j = 0; j < pathArray.length; j += 1) {
                pathArray[j] = _strDecode(pathArray[j]);
            }
            key = pathArray.pop();
            badOperation = false;
            switch (patch[i].op) {
                case 'remove':
                    if (typeof patch[i].path === 'string') {
                        for (j = 0; j < pathArray.length; j += 1) {
                            if (!parent[pathArray[j]]) {
                                badOperation = true;
                                break;
                            }
                            parent = parent[pathArray[j]];
                        }
                        if (!badOperation && parent[key] !== undefined) {
                            delete parent[key];
                        } else {
                            result.status = 'fail';
                            result.faults.push(patch[i]);
                        }
                    } else {
                        result.status = 'fail';
                        result.faults.push(patch[i]);
                    }
                    break;
                case 'add':
                    if (typeof patch[i].path === 'string' && patch[i].value !== undefined) {
                        for (j = 0; j < pathArray.length; j += 1) {
                            if (!parent[pathArray[j]]) {
                                parent[pathArray[j]] = {};
                            }
                            parent = parent[pathArray[j]];
                        }
                        parent[key] = patch[i].value;

                    } else {
                        result.status = 'fail';
                        result.faults.push(patch[i]);
                    }
                    break;
                case 'replace':
                    if (typeof patch[i].path === 'string' && patch[i].value !== undefined) {
                        for (j = 0; j < pathArray.length; j += 1) {
                            if (!parent[pathArray[j]]) {
                                badOperation = true;
                                break;
                            }
                            parent = parent[pathArray[j]];
                        }
                        if (!badOperation && parent[key] !== undefined) {
                            parent[key] = patch[i].value;
                        } else {
                            result.status = 'fail';
                            result.faults.push(patch[i]);
                        }
                    } else {
                        result.status = 'fail';
                        result.faults.push(patch[i]);
                    }
                    break;
                default:
                    result.status = 'fail';
                    result.faults.push(patch[i]);
                    break;
            }
        }

        return result;
    }

    function _inLoadOrUnload(res, gmePath) {
        var pathPieces = gmePath.split('/'),
            parentPath;

        parentPath = gmePath;

        do {
            if (res.load[parentPath] || res.unload[parentPath]) {
                return true;
            }

            pathPieces.pop();
            parentPath = pathPieces.join('/');
        } while (pathPieces.length > 1);

        return false;
    }

    function _removeFromUpdates(res, gmePath) {
        var updatesPath,
            i;

        updatesPath = Object.keys(res.update);
        for (i = 0; i < updatesPath; i += 1) {
            if (_startsWith(updatesPath[i], gmePath)) {
                delete res.update[gmePath];
            }
        }

        updatesPath = Object.keys(res.partialUpdate);
        for (i = 0; i < updatesPath; i += 1) {
            if (_startsWith(updatesPath[i], gmePath)) {
                delete res.partialUpdate[gmePath];
            }
        }
    }

    function _isShardChange(patchItem) {
        if (!_isOvr(patchItem.path)) {
            return false;
        }

        if (patchItem.op === 'add' || patchItem.op === 'replace') {
            return REGEXP.HASH.test(patchItem.value);
        }
    }

    function _getChangedNodesFromShard(patch, res, hash, gmePath) {
        var shardPatch = patch[hash] && patch[hash].patch ? patch[hash] && patch[hash].patch : patch[hash],
            source,
            name,
            i, j,
            absGmePath;

        if (!shardPatch) {
            return;
        }

        if (shardPatch instanceof Array) {
            // patch objects
            for (i = 0; i < shardPatch.length; i += 1) {
                if (shardPatch[i].updates instanceof Array) {
                    for (j = 0; j < shardPatch[i].updates.length; j += 1) {
                        absGmePath = gmePath + shardPatch[i].updates[j];
                        if (_inLoadOrUnload(res, absGmePath) === false) {
                            res.update[absGmePath] = true;
                        }
                    }
                }

                if (shardPatch[i].partialUpdates instanceof Array) {
                    for (j = 0; j < shardPatch[i].partialUpdates.length; j += 1) {
                        absGmePath = gmePath + shardPatch[i].partialUpdates[j];
                        if (_inLoadOrUnload(res, absGmePath) === false) {
                            res.partialUpdate[absGmePath] = true;
                        }
                    }
                }
            }
        } else {
            // completely new shard
            for (source in shardPatch.items || {}) {
                for (name in shardPatch.items[source]) {
                    absGmePath = gmePath + source;
                    if (_inLoadOrUnload(res, absGmePath) === false) {
                        res.update[absGmePath] = true;
                    }

                    absGmePath = gmePath + shardPatch.items[source][name];
                    if (_inLoadOrUnload(res, absGmePath) === false) {
                        res.partialUpdate[absGmePath] = true;
                    }
                }
            }
        }
    }

    function _getChangedNodesFromSharding(patch, patchItem, res, gmePath) {
        var shards = [],
            shardId,
            absGmePath,
            preShardRelations = patchItem.preShardRelations,
            foundSource,
            source,
            name,
            i;

        for (shardId in patchItem.value) {
            if (REGEXP.HASH.test(patchItem.value[shardId])) {
                if (patch[patchItem.value[shardId]]) {
                    shards.push(patch[patchItem.value[shardId]]);
                }
            }
        }

        // First handle those relations where we have the source in both states
        for (source in preShardRelations) {
            foundSource = false;
            for (i = 0; i < shards.length; i += 1) {
                if (shards[i].items.hasOwnProperty(source)) {
                    foundSource = true;
                    // check the removal and updates
                    for (name in preShardRelations[source]) {
                        if (shards[i].items[source].hasOwnProperty(name)) {
                            if (shards[i].items[source][name] !== preShardRelations[source][name]) {
                                // update
                                absGmePath = gmePath + source;
                                if (_inLoadOrUnload(res, absGmePath) === false) {
                                    res.update[absGmePath] = true;
                                }

                                absGmePath = gmePath + preShardRelations[source][name];
                                if (_inLoadOrUnload(res, absGmePath) === false) {
                                    res.partialUpdate[absGmePath] = true;
                                }

                                absGmePath = gmePath + shards[i].items[source][name];
                                if (_inLoadOrUnload(res, absGmePath) === false) {
                                    res.partialUpdate[absGmePath] = true;
                                }
                            }
                        } else {
                            // remove
                            absGmePath = gmePath + source;
                            if (_inLoadOrUnload(res, absGmePath) === false) {
                                res.update[absGmePath] = true;
                            }

                            absGmePath = gmePath + preShardRelations[source][name];
                            if (_inLoadOrUnload(res, absGmePath) === false) {
                                res.partialUpdate[absGmePath] = true;
                            }
                        }
                    }

                    // check additions
                    for (name in shards[i].items[source]) {
                        if (preShardRelations[source].hasOwnProperty(name) === false) {
                            absGmePath = gmePath + source;
                            if (_inLoadOrUnload(res, absGmePath) === false) {
                                res.update[absGmePath] = true;
                            }

                            absGmePath = gmePath + shards[i].items[source][name];
                            if (_inLoadOrUnload(res, absGmePath) === false) {
                                res.partialUpdate[absGmePath] = true;
                            }
                        }
                    }
                    break;
                }
            }

            if (!foundSource) {
                // All relations from this source was removed
                absGmePath = gmePath + source;
                if (_inLoadOrUnload(res, absGmePath) === false) {
                    res.update[absGmePath] = true;
                }

                for (name in preShardRelations[source]) {
                    absGmePath = gmePath + preShardRelations[source][name];
                    if (_inLoadOrUnload(res, absGmePath) === false) {
                        res.partialUpdate[absGmePath] = true;
                    }
                }
            }
        }

        // Finally check for completely new sources
        for (i = 0; i < shards.length; i += 1) {
            for (source in shards[i].items) {
                if (preShardRelations.hasOwnProperty(source) === false) {
                    // All relations from this source was removed
                    absGmePath = gmePath + source;
                    if (_inLoadOrUnload(res, absGmePath) === false) {
                        res.update[absGmePath] = true;
                    }

                    for (name in shards[i].items[source]) {
                        absGmePath = gmePath + shards[i].items[source][name];
                        if (_inLoadOrUnload(res, absGmePath) === false) {
                            res.partialUpdate[absGmePath] = true;
                        }
                    }
                }
            }
        }
    }

    function _getChangedNodesRec(patch, res, hash, gmePath) {
        var nodePatches = patch[hash] && patch[hash].patch, // Changes regarding node with hash
            i, j,
            ownChange = false,
            absGmePath,
            patchPath;

        if (!nodePatches) {
            // E.g. if the node was added the full data is given instead of a patch.
            return;
        }

        for (i = 0; i < nodePatches.length; i += 1) {
            patchPath = nodePatches[i].path;

            if (nodePatches[i].op === 'replace' && typeof nodePatches[i].preShardRelations === 'object') {
                //special case when the overlay is converted
                _getChangedNodesFromSharding(patch, nodePatches[i], res, gmePath);
            } else if (_isShardChange(nodePatches[i])) {
                _getChangedNodesFromShard(patch, res, nodePatches[i].value, gmePath);
            } else if (_isOvr(patchPath) === true) {
                // Now handle the updates
                for (j = 0; j < nodePatches[i].partialUpdates.length; j += 1) {
                    absGmePath = gmePath + nodePatches[i].partialUpdates[j];
                    if (_inLoadOrUnload(res, absGmePath) === false) {
                        res.partialUpdate[absGmePath] = true;
                    }
                }

                for (j = 0; j < nodePatches[i].updates.length; j += 1) {
                    absGmePath = gmePath + nodePatches[i].updates[j];
                    if (_inLoadOrUnload(res, absGmePath) === false) {
                        res.update[absGmePath] = true;
                    }
                }
            } else if (_isRelid(patchPath) === true) {
                // There was a change in one of the children..
                switch (nodePatches[i].op) {
                    case 'add':
                        res.load[gmePath + patchPath] = true;
                        _removeFromUpdates(res, gmePath + patchPath);
                        break;
                    case 'remove':
                        res.unload[gmePath + patchPath] = true;
                        _removeFromUpdates(res, gmePath + patchPath);
                        break;
                    case 'replace':
                        _getChangedNodesRec(patch, res, nodePatches[i].value, gmePath + patchPath);
                        break;
                    default:
                        throw new Error('Unexpected patch operation ' + nodePatches[i]);
                }
            } else if (patchPath !== MIN_RELID_LENGTH_PATH && patchPath !== '/__v') {
                ownChange = true;
            }
        }

        if (ownChange) {
            res.update[gmePath] = true;
        }
    }

    /**
     *
     * @param {object} patch
     * @returns {object}
     */
    // TODO check if all event related information could be set during patch creation,
    // so this function would only collect those information.
    function getChangedNodes(patch, rootHash) {
        var res;

        if (patch[rootHash] && patch[rootHash].patch) {
            res = {
                load: {},
                unload: {},
                update: {},
                partialUpdate: {}
            };

            _getChangedNodesRec(patch, res, rootHash, '');
        } else {
            res = null;
        }

        return res;
    }

    return {
        create: create,
        apply: apply,
        getChangedNodes: getChangedNodes
    };
});