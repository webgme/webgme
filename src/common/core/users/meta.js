/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define([], function () {
    'use strict';

    function metaStorage() {
        var _core = null,
            _nodes = null,
            _saveFunc = function () {
            },
            _errorFunc = function () {

            },
            _initialized = false;

        function _save(node, message) {
            var metaEvent = _core.getRegistry(node, '_meta_event_') || 0;
            _core.setRegistry(node, '_meta_event_', metaEvent + 1);
            _saveFunc(message);
        }

        function initialize(core, nodes, save, error) {
            _core = core;
            _nodes = nodes;
            _saveFunc = save;
            _errorFunc = error;
            _initialized = true;
        }

        function isValidMeta(/*meta*/) {
            //TODO implement it :)
            return true;
        }

        //TODO this may change - right now not used internally
        function pathToRefObject(path) {
            var ref = {};
            ref.$ref = path;
            return ref;
        }

        //TODO this may change - right now not used internally
        function refObjectToPath(ref) {
            if (typeof ref.$ref === 'string') {
                return ref.$ref/*.substring(1)*/;
            } else {
                return null;
            }
        }

        //getter setter functions
        function getMeta(path) {
            var node = _nodes[path],
                meta = {children: {}, attributes: {}, pointers: {}, aspects: {}},
                temp, i, j;

            if (_nodes === null || _nodes === undefined) {
                return meta;
            }

            if (!node) {
                return null;
            }

            meta = _core.getJsonMeta(node);

            return meta;
        }

        function setMeta(path, meta) {
            var i,
                j,
                aspectNode,
                error,
                targetPath;
            if (!isValidMeta) {
                return;
            }
            var node = _nodes[path] || null;
            if (node) {
                _core.clearMetaRules(node);

                //children
                if (meta.children && meta.children.items && meta.children.items.length > 0) {
                    error = _core.setChildrenMetaLimits(node, meta.children.min, meta.children.max);
                    if (error instanceof Error) {
                        _errorFunc(error);
                        return;
                    }
                    for (i = 0; i < meta.children.items.length; i += 1) {
                        if (typeof meta.children.items[i] === 'string' && _nodes[meta.children.items[i]]) {
                            error = _core.setChildMeta(node,
                                _nodes[meta.children.items[i]], meta.children.minItems[i], meta.children.maxItems[i]);
                            if (error instanceof Error) {
                                _errorFunc(error);
                                return;
                            }
                        }
                    }
                }

                //attributes
                if (meta.attributes) {
                    for (i in meta.attributes) {
                        error = _core.setAttributeMeta(node, i, meta.attributes[i]);
                        if (error instanceof Error) {
                            _errorFunc(error);
                            return;
                        }
                    }
                }

                //pointers and sets
                if (meta.pointers) {
                    for (i in meta.pointers) {
                        if (meta.pointers[i].items && meta.pointers[i].items.length > 0) {
                            error = _core.setPointerMetaLimits(node, i, meta.pointers[i].min, meta.pointers[i].max);
                            if (error instanceof Error) {
                                _errorFunc(error);
                                return;
                            }
                            for (j = 0; j < meta.pointers[i].items.length; j += 1) {
                                if (typeof meta.pointers[i].items[j] === 'string' &&
                                    _nodes[meta.pointers[i].items[j]]) {
                                    error = _core.setPointerMetaTarget(node, i, _nodes[meta.pointers[i].items[j]],
                                        meta.pointers[i].minItems[j], meta.pointers[i].maxItems[j]);
                                    if (error instanceof Error) {
                                        _errorFunc(error);
                                        return;
                                    }
                                }
                            }
                        }
                    }
                }

                //aspects
                if (meta.aspects) {
                    for (i in meta.aspects) {
                        if (meta.aspects[i].length > 0) {
                            for (j = 0; j < meta.aspects[i].length; j += 1) {
                                if (typeof meta.aspects[i][j] === 'string' && _nodes[meta.aspects[i][j]]) {
                                    error = _core.setAspectMetaTarget(node, i, _nodes[meta.aspects[i][j]]);
                                    if (error instanceof Error) {
                                        _errorFunc(error);
                                        return;
                                    }
                                }
                            }
                        }
                    }
                }

                //constraints
                if (meta.constraints) {
                    for (i in meta.constraints) {
                        if (typeof meta.constraints[i] === 'object') {
                            error = _core.setConstraint(node, i, meta.constraints[i]);
                            if (error instanceof Error) {
                                _errorFunc(error);
                                return;
                            }
                        }
                    }
                }

                _save(node, 'setMeta(' + path + ')');
            }
        }

        //validation functions
        function getBaseChain(path) {
            var chain = [];
            var node = _nodes[path];
            if (node) {
                while (node !== null) {
                    chain.push(_core.getPath(node));
                    node = _core.getBase(node);
                }
            }
            return chain;
        }

        function isTypeOf(path, typePath) {
            var node = _nodes[path],
                typeNode = _nodes[typePath];

            if (node && typeNode) {
                return _core.isTypeOf(node, typeNode);
            }

            return false;
        }

        function isValidTypeOfArray(path, typePathArray) {
            var i = 0,
                isGood = false;
            while (i < typePathArray.length && isGood === false) {
                isGood = isTypeOf(path, typePathArray[i]);
                i++;
            }
            return isGood;
        }

        function isValidChild(path, childPath) {
            var node = _nodes[path],
                child = _nodes[childPath];

            if (node && child) {
                return _core.isValidChildOf(child, node);
            }
            return false;
        }

        function isValidTarget(path, name, targetPath) {
            var node = _nodes[path],
                target = _nodes[targetPath];

            if (node && target) {
                return _core.isValidTargetOf(target, node, name);
            }

            return false;
        }

        function isValidAttribute(/*path, name, attribute*/) {
            //TODO we should check against schema
            return true;
        }

        function getValidChildrenTypes(path) {
            var node = _nodes[path];

            if (node) {
                return _core.getValidChildrenPaths(node);
            }

            return [];
        }

        function getValidTargetTypes(path, name) {
            var node = _nodes[path],
                meta, i,
                targets = [];

            if (node) {
                meta = _core.getPointerMeta(node, name);

                for (i in meta) {
                    if (i !== 'min' && i !== 'max') {
                        targets.push(i);
                    }
                }
            }
            return targets;
        }

        function hasOwnMetaRules(path) {
            var node = _nodes[path],
                ownMeta, key;

            if (node) {
                ownMeta = _core.getOwnJsonMeta(node);

                //children
                if (ownMeta.children && ownMeta.children.items && ownMeta.children.items.length > 0) {
                    return true;
                }

                //pointers
                for (key in ownMeta.pointers || {}) {
                    return true;
                }

                //attributes
                for (key in ownMeta.attributes || {}) {
                    return true;
                }
                //aspects
                for (key in ownMeta.aspects || {}) {
                    return true;
                }

                //mixins
                if (ownMeta.mixins && ownMeta.mixins.length > 0) {
                    return true;
                }
            }

            return false;
        }

        function filterValidTarget(path, name, paths) {
            var targets = [];
            for (var i = 0; i < paths.length; i++) {
                if (isValidTarget(path, name, paths[i])) {
                    targets.push(paths[i]);
                }
            }
            return targets;
        }

        function getOwnValidChildrenTypes(path) {
            var node = _nodes[path],
                ownMeta;

            if (node) {
                ownMeta = _core.getOwnJsonMeta(node);

                if (ownMeta && ownMeta.children && ownMeta.children.items) {
                    return ownMeta.children.items;
                }
            }

            return [];
        }

        function getOwnValidTargetTypes(path, name) {
            var node = _nodes[path],
                i,
                ownMeta;

            if (node) {
                ownMeta = _core.getOwnJsonMeta(node);
                ownMeta.pointers = ownMeta.pointers || {};
                ownMeta.pointers[name] = ownMeta.pointers[name] || {};

                return ownMeta.pointers[name].items || [];
            }

            return [];
        }

        function getValidAttributeNames(path) {
            var node = _nodes[path];

            if (node) {
                return _core.getValidAttributeNames(node);
            }

            return [];
        }

        function getOwnValidAttributeNames(path) {
            var node = _nodes[path];

            if (node) {
                return _core.getOwnValidAttributeNames(node);
            }
            return [];
        }

        function indexOfPathInRefObjArray(array, path) {
            var index = 0;
            while (index < array.length) {
                if (path === refObjectToPath(array[index])) {
                    return index;
                }
                index++;
            }
            return -1;
        }

        function getChildrenMeta(path) {
            //the returned object structure is : {'min':0,'max':0,'items':[{'id':path,'min':0,'max':0},...]}
            var node = _nodes[path],
                meta, i,
                childrenMeta = {items: []},
                childrenPaths;

            if (node) {
                meta = _core.getChildrenMeta(node);
                if (meta) {
                    childrenMeta = {min: meta.min, max: meta.max, items: []};
                    for (i in meta) {
                        if (i !== 'min' && i !== 'max') {
                            childrenMeta.items.push({
                                id: i,
                                min: meta[i].min === -1 ? undefined : meta[i].min,
                                max: meta[i].max === -1 ? undefined : meta[i].max
                            });
                        }
                    }
                }
                return childrenMeta;
            }

            return null;
        }

        // TODO is it really used?
        function getChildrenMetaAttribute(path/*, attrName*/) {
            var childrenMeta = getChildrenMeta(path);
            if (childrenMeta) {
                return childrenMeta.attrName;
            }
            return null;
        }

        // TODO is it really used?
        function setChildrenMetaAttribute(path, attrName, value) {
            if (attrName !== 'items') {
                var rawMeta = getMeta(path);
                rawMeta.children[attrName] = value;
                setMeta(path, rawMeta);
            }
        }

        function getValidChildrenItems(path) {
            var childrenMeta = getChildrenMeta(path);
            if (childrenMeta) {
                return childrenMeta.items;
            }
            return null;
        }

        function updateValidChildrenItem(path, newTypeObj) {
            var node = _nodes[path],
                i,
                error,
                child;

            if (newTypeObj && newTypeObj.id && node) {
                child = _nodes[newTypeObj.id];
                if (child) {
                    error = _core.setChildMeta(node, child, newTypeObj.min, newTypeObj.max);
                    if (error instanceof Error) {
                        _errorFunc(error);
                        return;
                    }
                    _save(node, 'Meta.updateValidChildrenItem(' + path + ', ' + newTypeObj.id + ')');
                }
            }
        }

        function removeValidChildrenItem(path, typeId) {
            var node = _nodes[path],
                error;

            if (node) {
                error = _core.delChildMeta(node, typeId);
                if (error instanceof Error) {
                    _errorFunc(error);
                    return;
                }
                _save(node, 'Meta.removeValidChildrenItem(' + path + ', ' + typeId + ')');
            }
        }

        function getAttributeSchema(path, name) {
            return _core.getAttributeMeta(_nodes[path], name);
        }

        function setAttributeSchema(path, name, schema) {
            var node = _nodes[path],
                error;

            if (node) {
                error = _core.setAttributeMeta(node, name, schema);
                if (error instanceof Error) {
                    _errorFunc(error);
                    return;
                }
                _save(node, 'Meta.setAttributeSchema(' + path + ', ' + name + ')');
            }
        }

        function removeAttributeSchema(path, name) {
            var node = _nodes[path],
                error;

            if (node) {
                error = _core.delAttributeMeta(node, name);
                if (error instanceof Error) {
                    _errorFunc(error);
                    return;
                }
                _save(node, 'Meta.removeAttributeSchema(' + path + ', ' + name + ')');
            }
        }

        function getPointerMeta(path, name) {
            var node = _nodes[path],
                meta, i,
                pointerMeta;

            if (node) {
                meta = _core.getPointerMeta(node, name);

                if (meta) {
                    pointerMeta = {min: meta.min, max: meta.max, items: []};

                    for (i in meta) {
                        if (i !== 'min' && i !== 'max') {
                            pointerMeta.items.push({
                                id: i,
                                min: meta[i].min === -1 ? undefined : meta[i].min,
                                max: meta[i].max === -1 ? undefined : meta[i].max
                            });
                        }
                    }

                    return pointerMeta;
                }
            }

            return null;
        }

        function _getValidTargetItems(path, name, ownOnly) {
            var node = _nodes[path],
                meta,
                paths,
                items = [],
                i;

            if (node) {
                meta = _core.getPointerMeta(node, name);
                paths = ownOnly ? _core.getOwnJsonMeta(node) : _core.getJsonMeta(node);
                if (paths && paths.pointers && paths.pointers[name]) {
                    paths = paths.pointers[name].items || [];
                } else {
                    paths = [];
                }
                if (meta && paths.length > 0) {
                    delete meta.min;
                    delete meta.max;
                    for (i in meta) {
                        if (paths.indexOf(i) !== -1) {
                            items.push({
                                id: i,
                                min: meta[i].min === -1 ? undefined : meta[i].min,
                                max: meta[i].max === -1 ? undefined : meta[i].max
                            });
                        }
                    }
                    return items;
                }
            }

            return null;
        }

        function getValidTargetItems(path, name) {
            return _getValidTargetItems(path, name, false);
        }

        function getOwnValidTargetItems(path, name) {
            return _getValidTargetItems(path, name, true);
        }

        function updateValidTargetItem(path, name, targetObj) {
            var node = _nodes[path],
                target,
                error;

            if (targetObj && targetObj.id && node) {
                target = _nodes[targetObj.id];
                if (target) {
                    error = _core.setPointerMetaTarget(node, name, target, targetObj.min, targetObj.max);
                    if (error instanceof Error) {
                        _errorFunc(error);
                        return;
                    }
                    _save(node, 'Meta.updateValidTargetItem(' + path + ', ' + name + ', ' + targetObj.id + ')');
                }
            }
        }

        function removeValidTargetItem(path, name, targetId) {
            var node = _nodes[path],
                error;

            if (node) {
                error = _core.delPointerMetaTarget(node, name, targetId);
                if (error instanceof Error) {
                    _errorFunc(error);
                    return;
                }
                _save(node, 'Meta.removeValidTargetItem(' + path + ', ' + name + ', ' + targetId + ')');
            }
        }

        function deleteMetaPointer(path, name) {
            var node = _nodes[path],
                error;

            if (node) {
                error = _core.delPointerMeta(node, name);
                if (error instanceof Error) {
                    _errorFunc(error);
                    return;
                }
                _save(node, 'Meta.deleteMetaPointer(' + path + ', ' + name + ')');
            }
        }

        function setPointerMeta(path, name, meta) {
            var node = _nodes[path],
                target,
                error,
                i;

            if (meta && meta.items && node) {
                for (i = 0; i < meta.items.length; i += 1) {
                    target = _nodes[meta.items[i].id];
                    if (target) {
                        error = _core.setPointerMetaTarget(node, name, target, meta.items[i].min, meta.items[i].max);
                        if (error instanceof Error) {
                            _errorFunc(error);
                            return;
                        }
                    }
                }
                error = _core.setPointerMetaLimits(node, name, meta.min, meta.max);
                if (error instanceof Error) {
                    _errorFunc(error);
                    return;
                }
                _save(node, 'Meta.setPointerMeta(' + path + ', ' + name + ')');
            }
        }

        function setChildrenMeta(path, meta) {
            var node = _nodes[path],
                target,
                error,
                i;

            if (meta && meta.items && node) {
                for (i = 0; i < meta.items.length; i += 1) {
                    target = _node[meta.items[i].id];
                    if (target) {
                        error = _core.setChildMeta(node, target, meta.items[i].min, meta.items[i].max);
                        if (error instanceof Error) {
                            _errorFunc(error);
                            return;
                        }
                    }
                }
                error = _core.setChildrenMetaLimits(node, meta.min, meta.max);
                if (error instanceof Error) {
                    _errorFunc(error);
                    return;
                }
                _save(node, 'Meta.setChildrenMeta(' + path + ')');
            }
        }

        function getMetaAspectNames(path) {
            var node = _nodes[path];

            if (node) {
                return _core.getValidAspectNames(node);
            }

            return [];
        }

        function getOwnMetaAspectNames(path) {
            var node = _nodes[path];

            if (node) {
                return _core.getOwnValidAspectNames(node);
            }

            return [];
        }

        function getMetaAspect(path, name) {
            var node = _nodes[path],
                meta,
                aspectMeta,
                i;

            if (node) {
                meta = _core.getAspectMeta(node, name);

                if (meta) {
                    return {items: meta};
                }
            }

            return null;
        }

        function setMetaAspect(path, name, aspect) {
            var i,
                target,
                node = _nodes[path],
                error;

            if (node) {
                error = _core.delAspectMeta(node, name);
                if (error instanceof Error) {
                    _errorFunc(error);
                    return;
                }
                for (i = 0; i < aspect.length; i += 1) {
                    target = _nodes[aspect[i]];
                    if (target) {
                        error = _core.setAspectMetaTarget(node, name, target);
                        if (error instanceof Error) {
                            _errorFunc(error);
                            return;
                        }
                    }
                }
                _save(node, 'Meta.setMetaAspect(' + path + ', ' + name + ')');
            }
        }

        function getAspectTerritoryPattern(path, name) {
            var aspect = getMetaAspect(path, name);

            if (aspect !== null) {
                aspect.children = 1; //TODO now it is fixed, maybe we can change that in the future
                return aspect;
            }
            return null;
        }

        function deleteMetaAspect(path, name) {
            var node = _nodes[path],
                error;

            if (node) {
                error = _core.delAspectMeta(node, name);
                if (error instanceof Error) {
                    _errorFunc(error);
                    return;
                }
                _save(node, 'Meta.deleteMetaAspect(' + path + ', ' + name + ')');
            }
        }

        return {
            refObjectToPath: refObjectToPath,
            pathToRefObject: pathToRefObject,

            initialize: initialize,
            getMeta: getMeta,
            setMeta: setMeta,
            isTypeOf: isTypeOf,
            hasOwnMetaRules: hasOwnMetaRules,

            //containment
            isValidChild: isValidChild,
            getChildrenMeta: getChildrenMeta,
            setChildrenMeta: setChildrenMeta,
            getChildrenMetaAttribute: getChildrenMetaAttribute,
            setChildrenMetaAttribute: setChildrenMetaAttribute,
            getValidChildrenTypes: getValidChildrenTypes,
            getOwnValidChildrenTypes: getOwnValidChildrenTypes,
            getValidChildrenItems: getValidChildrenItems,
            updateValidChildrenItem: updateValidChildrenItem,
            removeValidChildrenItem: removeValidChildrenItem,

            //attribute
            isValidAttribute: isValidAttribute,
            getAttributeSchema: getAttributeSchema,
            setAttributeSchema: setAttributeSchema,
            removeAttributeSchema: removeAttributeSchema,
            getValidAttributeNames: getValidAttributeNames,
            getOwnValidAttributeNames: getOwnValidAttributeNames,

            //pointer
            isValidTarget: isValidTarget,
            getPointerMeta: getPointerMeta,
            setPointerMeta: setPointerMeta,
            getValidTargetItems: getValidTargetItems,
            getOwnValidTargetItems: getOwnValidTargetItems,
            getValidTargetTypes: getValidTargetTypes,
            getOwnValidTargetTypes: getOwnValidTargetTypes,
            filterValidTarget: filterValidTarget,
            updateValidTargetItem: updateValidTargetItem,
            removeValidTargetItem: removeValidTargetItem,
            deleteMetaPointer: deleteMetaPointer,

            //aspect
            getMetaAspectNames: getMetaAspectNames,
            getOwnMetaAspectNames: getOwnMetaAspectNames,
            getMetaAspect: getMetaAspect,
            setMetaAspect: setMetaAspect,
            getAspectTerritoryPattern: getAspectTerritoryPattern,
            deleteMetaAspect: deleteMetaAspect

        };
    }

    return metaStorage;
});
