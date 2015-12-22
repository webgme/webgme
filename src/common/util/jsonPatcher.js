/**
 * @author kecso / https://github.com/kecso
 */
/*
 this is a partial implementation of RFC 6902
 the generated patch is fully compliant though the
 patch generation is specialized to the expected input form
 */

define(['common/util/canon', 'underscore'], function (CANON, _) {

    function _strEncode(str) {
        //we should replace the '/' in the patch paths
        return str.replace(/\//g, '%2f');
    }

    function _strDecode(str) {
        return str.replace(/%2f/g, '/');
    }

    function create(sourceJson, targetJson) {
        var patch = [],
            diff = function (source, target, basePath, excludeList, noUpdate) {
                var sKeys, tKeys, keys, i;
                sKeys = _.difference(Object.keys(source), excludeList);
                tKeys = _.difference(Object.keys(target), excludeList);

                //add
                keys = _.difference(tKeys, sKeys);
                for (i = 0; i < keys.length; i += 1) {
                    patch.push({op: 'add', path: basePath + _strEncode(keys[i]), value: target[keys[i]]});
                }

                //update
                if (!noUpdate) {
                    keys = _.intersection(tKeys, sKeys);
                    for (i = 0; i < keys.length; i += 1) {
                        if (CANON.stringify(source[keys[i]]) !== CANON.stringify(target[keys[i]])) {
                            patch.push({op: 'replace', path: basePath + _strEncode(keys[i]), value: target[keys[i]]});
                        }
                    }
                }

                //remove
                keys = _.difference(sKeys, tKeys);
                for (i = 0; i < keys.length; i += 1) {
                    patch.push({op: 'remove', path: basePath + _strEncode(keys[i])});
                }
            },
            keys, i;

        //main level diff
        diff(sourceJson, targetJson, '/', ['_id', '_nullptr', 'ovr', 'atr', 'reg', '_sets'], false);

        //atr
        diff(sourceJson.atr || {}, targetJson.atr || {}, '/atr/', [], false);

        //reg
        diff(sourceJson.reg || {}, targetJson.reg || {}, '/reg/', [], false);

        //ovr add+remove
        diff(sourceJson.ovr || {}, targetJson.ovr || {}, '/ovr/', [], true);

        //in case of update, we go field by field
        keys = _.intersection(Object.keys(sourceJson.ovr || {}), Object.keys(targetJson.ovr || {}));

        for (i = 0; i < keys.length; i += 1) {
            diff(sourceJson.ovr[keys[i]], targetJson.ovr[keys[i]], '/ovr/' + _strEncode(keys[i]) + '/', [], false);
        }

        //complete set addition or removal
        diff(sourceJson._sets || {}, targetJson._sets || {}, '/_sets/', [], true);

        //update done set-by-set
        keys = _.intersection(Object.keys(sourceJson._sets || {}), Object.keys(targetJson._sets || {}));

        for (i = 0; i < keys.length; i += 1) {
            diff(sourceJson._sets[keys[i]], targetJson._sets[keys[i]], '/_sets/' + _strEncode(keys[i]) + '/', [], false);
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
                result: targetJson
            };

        for (i = 0; i < patch.length; i += 1) {
            pathArray = (patch[i].path+'').split('/').slice(1);
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

    return {
        create: create,
        apply: apply
    }
});