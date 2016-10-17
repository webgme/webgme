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
    'common/core/constants'
], function (CANON, RANDOM, CORE_CONSTANTS) {

    'use strict';

    var MIN_RELID_LENGTH_PATH = CORE_CONSTANTS.PATH_SEP + CORE_CONSTANTS.MINIMAL_RELID_LENGTH_PROPERTY;

    function _strEncode(str) {
        //we should replace the '/' in the patch paths
        return str.replace(/\//g, '%2f');
    }

    function _strDecode(str) {
        return str.replace(/%2f/g, '/');
    }

    function collectPartials(source, target, key, operation, single) {
        if (single) {
            switch (operation) {
                case 'add':
                    return [target[key]];
                case 'replace':
                    return [source[key], target[key]];
                case 'remove':
                    return [source[key]];
            }
        } else {
            var partials = [],
                collection,
                item;
            if (operation === 'add') {
                collection = target[key];
            } else {
                collection = source[key];
            }

            for (item in collection) {
                if (partials.indexOf(collection[item])) {
                    partials.push(collection[item]);
                }
            }

            return partials;
        }
    }

    function create(sourceJson, targetJson) {
        var patch = [],
            diff = function (source, target, basePath, excludeList, noUpdate) {
                var i,
                    overlay = basePath === '/ovr/' ? true : false,
                    inOverlay = basePath.indexOf('/ovr/') === 0 && !overlay ? true : false,
                    patchItem;

                //add
                for (i in target) {
                    if (excludeList.indexOf(i) === -1 && target.hasOwnProperty(i)) {
                        if (!source.hasOwnProperty(i)) {
                            patchItem = {
                                op: 'add',
                                path: basePath + _strEncode(i),
                                value: target[i]
                            };

                            if (overlay) {
                                patchItem.partials = collectPartials(source, target, i, 'add', false);
                            } else if (inOverlay) {
                                patchItem.partials = collectPartials(source, target, i, 'add', true);
                            }

                            patch.push(patchItem);
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
                                    patchItem.partials = collectPartials(source, target, i, 'replace', true);
                                }

                                patch.push(patchItem);
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

                            if (overlay) {
                                patchItem.partials = collectPartials(source, target, i, 'remove', false);
                            } else if (inOverlay) {
                                patchItem.partials = collectPartials(source, target, i, 'remove', true);
                            }

                            patch.push(patchItem);
                        }
                    }
                }
            },
            key;

        //main level diff
        diff(sourceJson, targetJson, '/', ['_id', '_nullptr', 'ovr', 'atr', 'reg', '_sets'], false);

        //atr
        diff(sourceJson.atr || {}, targetJson.atr || {}, '/atr/', [], false);

        //reg
        diff(sourceJson.reg || {}, targetJson.reg || {}, '/reg/', [], false);

        //ovr add+remove
        diff(sourceJson.ovr || {}, targetJson.ovr || {}, '/ovr/', [], true);

        if (targetJson.hasOwnProperty('ovr') && sourceJson.hasOwnProperty('ovr')) {
            for (key in targetJson.ovr) {
                if (targetJson.ovr.hasOwnProperty(key) && sourceJson.ovr.hasOwnProperty(key)) {
                    diff(sourceJson.ovr[key], targetJson.ovr[key], '/ovr/' + _strEncode(key) + '/', [], false);
                }
            }
        }

        //complete set addition or removal
        diff(sourceJson._sets || {}, targetJson._sets || {}, '/_sets/', [], true);

        //update done set-by-set
        if (targetJson.hasOwnProperty('_sets') && sourceJson.hasOwnProperty('_sets')) {
            for (key in sourceJson._sets) {
                if (targetJson._sets.hasOwnProperty(key)) {
                    diff(sourceJson._sets[key], targetJson._sets[key], '/_sets/' + _strEncode(key) + '/', [], false);
                }
            }
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

    function _endsWith(str, pattern) {
        var d = str.length - pattern.length;
        return d >= 0 && str.lastIndexOf(pattern) === d;
    }

    function _startsWith(str, pattern) {
        return str.indexOf(pattern) === 0;
    }

    function _isOvr(path) {
        return path.indexOf('/ovr/') === 0;
    }

    function _isRelid(path) {
        return RANDOM.isValidRelid(path.substring(1));
    }

    function _isGmePath(path) {
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

    function _getChangedNodesRec(patch, res, hash, gmePath) {
        var nodePatches = patch[hash] && patch[hash].patch, // Changes regarding node with hash
            i, j,
            ownChange = false,
            pathPieces,
            relGmePath,
            absGmePath,
            patchPath;

        if (!nodePatches) {
            // E.g. if the node was added the full data is given instead of a patch.
            return;
        }

        for (i = 0; i < nodePatches.length; i += 1) {
            patchPath = nodePatches[i].path;

            if (_isOvr(patchPath) === true) {
                pathPieces = patchPath.substring('/ovr/'.length).split('/');
                relGmePath = _strDecode(pathPieces[0]);
                absGmePath = gmePath + relGmePath;
                if (_isGmePath(relGmePath) && _inLoadOrUnload(res, absGmePath) === false) {
                    res.update[absGmePath] = true;
                } else if (relGmePath === '/_nullptr') {
                    ownChange = true;
                }

                // Now handle the partial updates
                for (j = 0; j < nodePatches[i].partials.length; j += 1) {
                    absGmePath = gmePath + nodePatches[i].partials[j];
                    if (_isGmePath(nodePatches[i].partials[j]) && _inLoadOrUnload(res, absGmePath) === false) {
                        res.partialUpdate[absGmePath] = true;
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
            } else if (patchPath !== MIN_RELID_LENGTH_PATH) {
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