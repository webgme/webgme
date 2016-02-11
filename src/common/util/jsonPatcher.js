/**
 * @author kecso / https://github.com/kecso
 */
/*
 this is a partial implementation of RFC 6902
 the generated patch is fully compliant though the
 patch generation is specialized to the expected input form
 */

define(['common/util/canon'], function (CANON) {

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
                var i;

                //add
                for (i in target) {
                    if (excludeList.indexOf(i) === -1 && target.hasOwnProperty(i)) {
                        if (!source.hasOwnProperty(i)) {
                            patch.push({op: 'add', path: basePath + _strEncode(i), value: target[i]});
                        }
                    }
                }

                //update
                if (!noUpdate) {
                    for (i in target) {
                        if (excludeList.indexOf(i) === -1 && target.hasOwnProperty(i)) {
                            if (source.hasOwnProperty(i) && CANON.stringify(source[i]) !== CANON.stringify(target[i])) {
                                patch.push({op: 'replace', path: basePath + _strEncode(i), value: target[i]});
                            }
                        }
                    }
                }

                //remove
                for (i in source) {
                    if (excludeList.indexOf(i) === -1 && source.hasOwnProperty(i)) {
                        if (!target.hasOwnProperty(i)) {
                            patch.push({op: 'remove', path: basePath + _strEncode(i)});
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

        for (key in targetJson.ovr) {
            if (targetJson.ovr.hasOwnProperty(key) && sourceJson.ovr.hasOwnProperty(key)) {
                diff(sourceJson.ovr[key], targetJson.ovr[key], '/ovr/' + _strEncode(key) + '/', [], false);
            }
        }

        //complete set addition or removal
        diff(sourceJson._sets || {}, targetJson._sets || {}, '/_sets/', [], true);

        //update done set-by-set
        for (key in sourceJson._sets) {
            if (targetJson._sets.hasOwnProperty(key)) {
                diff(sourceJson._sets[key], targetJson._sets[key], '/_sets/' + _strEncode(key) + '/', [], false);
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

    return {
        create: create,
        apply: apply
    }
});