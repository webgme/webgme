/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define([], function () {
    'use strict';

    function metaStorage() {
        var _core = null,
            _state = null,
            _saveFunc = function () {
            },
            _errorFunc = function () {

            },
            _initialized = false;

        function initialize(core, state, save, printCoreError) {
            _core = core;
            _state = state;
            _saveFunc = save;
            _errorFunc = printCoreError;
            _initialized = true;
        }

        //getter setter functions
        function getMeta(path) {
            var node = _state.nodes[path] && _state.nodes[path].node,
                meta = {children: {}, attributes: {}, pointers: {}, aspects: {}};

            if (!node) {
                return null;
            }

            meta = _core.getJsonMeta(node);

            return meta;
        }

        function isTypeOf(path, typePath) {
            var node = _state.nodes[path] && _state.nodes[path].node,
                typeNode = _state.nodes[typePath] && _state.nodes[typePath].node;

            if (node && typeNode) {
                return _core.isTypeOf(node, typeNode);
            }

            return false;
        }

        function isValidChild(path, childPath) {
            var node = _state.nodes[path] && _state.nodes[path].node,
                child = _state.nodes[childPath] && _state.nodes[childPath].node;

            if (node && child) {
                return _core.isValidChildOf(child, node);
            }

            return false;
        }

        function isValidTarget(path, name, targetPath) {
            var node = _state.nodes[path] && _state.nodes[path].node,
                target = _state.nodes[targetPath] && _state.nodes[targetPath].node;

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
            var node = _state.nodes[path] && _state.nodes[path].node;

            if (node) {
                return _core.getValidChildrenPaths(node);
            }

            return [];
        }

        function getValidTargetTypes(path, name) {
            var node = _state.nodes[path] && _state.nodes[path].node,
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
            var node = _state.nodes[path] && _state.nodes[path].node,
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
            var node = _state.nodes[path] && _state.nodes[path].node,
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
            var node = _state.nodes[path] && _state.nodes[path].node,
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
            var node = _state.nodes[path] && _state.nodes[path].node;

            if (node) {
                return _core.getValidAttributeNames(node);
            }

            return [];
        }

        function getOwnValidAttributeNames(path) {
            var node = _state.nodes[path] && _state.nodes[path].node;

            if (node) {
                return _core.getOwnValidAttributeNames(node);
            }

            return [];
        }

        function getChildrenMeta(path) {
            //the returned object structure is : {'min':0,'max':0,'items':[{'id':path,'min':0,'max':0},...]}
            var node = _state.nodes[path] && _state.nodes[path].node,
                meta, i,
                childrenMeta = {items: []};

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

        function getChildrenMetaAttribute(path/*, attrName*/) {
            var childrenMeta = getChildrenMeta(path);
            if (childrenMeta) {
                return childrenMeta.attrName;
            }
            return null;
        }

        function getValidChildrenItems(path) {
            var childrenMeta = getChildrenMeta(path);
            if (childrenMeta) {
                return childrenMeta.items;
            }
            return null;
        }

        function getAttributeSchema(path, name) {
            return _core.getAttributeMeta(_state.nodes[path].node, name);
        }

        function getPointerMeta(path, name) {
            var node = _state.nodes[path] && _state.nodes[path].node,
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
            var node = _state.nodes[path] && _state.nodes[path].node,
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

        function getMetaAspectNames(path) {
            var node = _state.nodes[path] && _state.nodes[path].node;

            if (node) {
                return _core.getValidAspectNames(node);
            }

            return [];
        }

        function getOwnMetaAspectNames(path) {
            var node = _state.nodes[path] && _state.nodes[path].node;

            if (node) {
                return _core.getOwnValidAspectNames(node);
            }

            return [];
        }

        function getMetaAspect(path, name) {
            var node = _state.nodes[path] && _state.nodes[path].node,
                meta;

            if (node) {
                meta = _core.getAspectMeta(node, name);

                if (meta) {
                    return {items: meta};
                }
            }

            return null;
        }

        function getAspectTerritoryPattern(path, name) {
            var aspect = getMetaAspect(path, name);

            if (aspect !== null) {
                aspect.children = 1; //TODO now it is fixed, maybe we can change that in the future
                return aspect;
            }
            return null;
        }

        return {
            initialize: initialize,
            getMeta: getMeta,
            isTypeOf: isTypeOf,
            hasOwnMetaRules: hasOwnMetaRules,

            //containment
            isValidChild: isValidChild,
            getChildrenMeta: getChildrenMeta,
            getChildrenMetaAttribute: getChildrenMetaAttribute,
            getValidChildrenTypes: getValidChildrenTypes,
            getOwnValidChildrenTypes: getOwnValidChildrenTypes,
            getValidChildrenItems: getValidChildrenItems,

            //attribute
            isValidAttribute: isValidAttribute,
            getAttributeSchema: getAttributeSchema,
            getValidAttributeNames: getValidAttributeNames,
            getOwnValidAttributeNames: getOwnValidAttributeNames,

            //pointer
            isValidTarget: isValidTarget,
            getPointerMeta: getPointerMeta,
            getValidTargetItems: getValidTargetItems,
            getOwnValidTargetItems: getOwnValidTargetItems,
            getValidTargetTypes: getValidTargetTypes,
            getOwnValidTargetTypes: getOwnValidTargetTypes,
            filterValidTarget: filterValidTarget,

            //aspect
            getMetaAspectNames: getMetaAspectNames,
            getOwnMetaAspectNames: getOwnMetaAspectNames,
            getMetaAspect: getMetaAspect,
            getAspectTerritoryPattern: getAspectTerritoryPattern,
        };
    }

    return metaStorage;
});
