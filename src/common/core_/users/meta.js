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
            _save = function () {
            },
            _initialized = false;

        function initialize(core, nodes, save) {
            _core = core;
            _nodes = nodes;
            _save = save;
            _initialized = true;
        }

        function isValidMeta(/*meta*/) {
            /*if( typeof meta === 'object'){
             if(
             //children
             typeof meta.children === 'object' &&
             (meta.children.types === null || typeof meta.children.types === 'array') &&
             (typeof meta.children.min === 'undefined' || typeof meta.children.min === 'number') &&
             (typeof meta.children.max === 'undefined' || typeof meta.children.max === 'number')){

             //attributes
             }
             }

             return false;*/
            //TODO implement it :)
            return true;
        }

        //function isValidAttributeSchema(atrSchema) {
        //    //TODO implement :)
        //    return true;
        //}

        //TODO this may change
        function pathToRefObject(path) {
            var ref = {};
            ref.$ref = path;
            return ref;
        }

        //TODO this may change
        function refObjectToPath(ref) {
            if (typeof ref.$ref === 'string') {
                return ref.$ref/*.substring(1)*/;
            } else {
                return null;
            }
        }

        //getter setter functions
        function getMeta(path) {
            var i, j,
                meta = {children: {}, attributes: {}, pointers: {}, aspects: {}};

            if (_nodes === null || _nodes === undefined) {
                return meta;
            }
            var node = _nodes[path] || null;
            if (!node) {
                return null;
            }

            var metaNode = _core.getChild(node, '_meta');
            var childrenNode = _core.getChild(metaNode, 'children');
            //children
            meta.children = {};
            meta.children.minItems = [];
            meta.children.maxItems = [];
            meta.children.items = _core.getMemberPaths(childrenNode, 'items');
            for (i = 0; i < meta.children.items.length; i++) {
                meta.children.minItems.push(
                    _core.getMemberAttribute(childrenNode, 'items', meta.children.items[i], 'min') || -1);

                meta.children.maxItems.push(
                    _core.getMemberAttribute(childrenNode, 'items', meta.children.items[i], 'max') || -1);

                meta.children.items[i] = pathToRefObject(meta.children.items[i]);
            }
            meta.children.min = _core.getAttribute(childrenNode, 'min');
            meta.children.max = _core.getAttribute(childrenNode, 'max');

            //attributes - they are simple json objects from our point of view
            var atrNames = _core.getAttributeNames(metaNode);
            for (i = 0; i < atrNames.length; i++) {
                meta.attributes[atrNames[i]] = JSON.parse(JSON.stringify(
                    _core.getAttribute(metaNode, atrNames[i])));
            }

            //pointers and pointer lists
            var pointerNames = _core.getPointerNames(metaNode) || [];
            for (i = 0; i < pointerNames.length; i++) {
                var pointerNode = _core.getChild(metaNode, '_p_' + pointerNames[i]);
                var pointer = {};
                pointer.items = _core.getMemberPaths(pointerNode, 'items');
                pointer.min = _core.getAttribute(pointerNode, 'min');
                pointer.max = _core.getAttribute(pointerNode, 'max');
                pointer.minItems = [];
                pointer.maxItems = [];

                for (j = 0; j < pointer.items.length; j++) {
                    pointer.minItems.push(
                        _core.getMemberAttribute(pointerNode, 'items', pointer.items[j], 'min') || -1);

                    pointer.maxItems.push(
                        _core.getMemberAttribute(pointerNode, 'items', pointer.items[j], 'max') || -1);

                    pointer.items[j] = pathToRefObject(pointer.items[j]);

                }

                meta.pointers[pointerNames[i]] = pointer;
            }

            //aspects
            var aspectsNode = _core.getChild(metaNode, 'aspects');
            var aspectNames = _core.getPointerNames(aspectsNode);
            if (aspectNames.length > 0) {
                meta.aspects = {};
                for (i = 0; i < aspectNames.length; i++) {
                    var aspectNode = _core.getChild(aspectsNode, '_a_' + aspectNames[i]);
                    meta.aspects[aspectNames[i]] = {items: []};
                    var items = _core.getMemberPaths(aspectNode, 'items');
                    for (j = 0; j < items.length; j++) {
                        meta.aspects[aspectNames[i]].items.push(pathToRefObject(items[j]));
                    }
                }
            }

            return meta;
        }

        function setMeta(path, meta) {
            var i,
                j,
                aspectNode,
                targetPath;
            if (!isValidMeta) {
                return;
            }
            var node = _nodes[path] || null;
            if (node) {
                var metaNode = _core.getChild(node, '_meta');
                _core.deleteNode(metaNode, true);
                metaNode = _core.getChild(node, '_meta');
                if (meta.children) {
                    var childrenNode = _core.getChild(metaNode, 'children');
                    if (meta.children.items && meta.children.items.length) {
                        if (meta.children.min) {
                            _core.setAttribute(childrenNode, 'min', meta.children.min);
                        }
                        if (meta.children.max) {
                            _core.setAttribute(childrenNode, 'max', meta.children.max);
                        }

                        for (i = 0; i < meta.children.items.length; i++) {
                            targetPath = refObjectToPath(meta.children.items[i]);
                            if (typeof targetPath === 'string' && _nodes[targetPath]) {
                                _core.addMember(childrenNode, 'items', _nodes[targetPath]);
                                if (meta.children.minItems[i] !== -1) {
                                    _core.setMemberAttribute(childrenNode, 'items', targetPath, 'min',
                                        meta.children.minItems[i]);
                                }
                                if (meta.children.maxItems[i] !== -1) {
                                    _core.setMemberAttribute(childrenNode, 'items', targetPath, 'max',
                                        meta.children.maxItems[i]);
                                }
                            }
                        }

                    } else {
                        _core.deleteNode(childrenNode, true);
                    }
                }

                if (meta.attributes) {
                    for (i in meta.attributes) {
                        _core.setAttribute(metaNode, i, meta.attributes[i]);
                    }
                }

                if (meta.pointers) {
                    for (i in meta.pointers) {
                        _core.setPointer(metaNode, i, null);
                        var pointerNode = _core.getChild(metaNode, '_p_' + i);
                        if (meta.pointers[i].items && meta.pointers[i].items.length) {
                            if (meta.pointers[i].min) {
                                _core.setAttribute(pointerNode, 'min', meta.pointers[i].min);
                            }
                            if (meta.pointers[i].max) {
                                _core.setAttribute(pointerNode, 'max', meta.pointers[i].max);
                            }

                            for (j = 0; j < meta.pointers[i].items.length; j++) {
                                targetPath = refObjectToPath(meta.pointers[i].items[j]);
                                if (typeof targetPath === 'string' && _nodes[targetPath]) {
                                    _core.addMember(pointerNode, 'items', _nodes[targetPath]);
                                    if (meta.pointers[i].minItems[j] !== -1) {
                                        _core.setMemberAttribute(pointerNode, 'items', targetPath, 'min',
                                            meta.pointers[i].minItems[j]);
                                    }
                                    if (meta.pointers[i].maxItems[j] !== -1) {
                                        _core.setMemberAttribute(pointerNode, 'items', targetPath, 'max',
                                            meta.pointers[i].maxItems[j]);
                                    }
                                }
                            }

                        }
                    }
                }

                if (meta.aspects) {
                    var aspectsNode = _core.getChild(metaNode, 'aspects'),
                        aspectNames = [];
                    for (i in meta.aspects) {
                        _core.setPointer(aspectsNode, i, null);
                        aspectNode = _core.getChild(aspectsNode, '_a_' + i);
                        if (meta.aspects[i].items) {
                            for (j = 0; j < meta.aspects[i].items.length; j++) {
                                var member = _nodes[refObjectToPath(meta.aspects[i].items[j])];
                                if (member) {
                                    _core.addMember(aspectNode, 'items', member);
                                }
                            }
                        }
                        aspectNames.push(i);
                    }
                    if (aspectNames.length > 0) {
                        meta.aspects = {};
                        for (i = 0; i < aspectNames.length; i++) {
                            aspectNode = _core.getChild(aspectsNode, '_a_' + aspectNames[i]);
                            meta.aspects[aspectNames[i]] = {items: []};
                            var items = _core.getMemberPaths(aspectNode, 'items');
                            for (j = 0; j < items.length; j++) {
                                meta.aspects[aspectNames[i]].items.push(pathToRefObject(items[j]));
                            }
                        }
                    }
                }

                var metaEvent = _core.getRegistry(node, '_meta_event_') || 0;
                _core.setRegistry(node, '_meta_event_', metaEvent + 1);
                _save('setMeta(' + path + ')');
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
            var node = _nodes[path];
            if (node) {
                var chain = getBaseChain(path);
                if (chain.indexOf(typePath) !== -1) {
                    return true;
                }
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
            var node = _nodes[path];
            var child = _nodes[childPath];
            if (node && child) {
                var metaNode = _core.getChild(node, '_meta');
                var childrenNode = _core.getChild(metaNode, 'children');
                var items = _core.getMemberPaths(childrenNode, 'items');
                return isValidTypeOfArray(childPath, items);
            }
            return false;
        }

        function isValidTarget(path, name, targetPath) {
            var node = _nodes[path];
            var target = _nodes[targetPath];
            if (node && target) {
                var meta = _core.getChild(node, '_meta');
                var pointer = _core.getChild(meta, '_p_' + name);
                var items = _core.getMemberPaths(pointer, 'items');
                return isValidTypeOfArray(targetPath, items);
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
                return _core.getMemberPaths(_core.getChild(_core.getChild(node, '_meta'), 'children'), 'items');
            }
            return [];
        }

        function getValidTargetTypes(path, name) {
            var node = _nodes[path];
            if (node) {
                return _core.getMemberPaths(_core.getChild(_core.getChild(node, '_meta'), '_p_' + name), 'items');
            }
            return [];
        }

        function hasOwnMetaRules(path) {
            var node = _nodes[path];
            if (node) {
                var own = getMeta(path);
                var base = getMeta(_core.getPath(_core.getBase(node)));
                return own === base;
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
            var node = _nodes[path];
            var items = [];
            if (node) {
                var own = getValidChildrenTypes(path);
                var base = getValidChildrenTypes(_core.getPath(_core.getBase(node)));
                for (var i = 0; i < own.length; i++) {
                    if (base.indexOf(own[i]) === -1) {
                        items.push(own[i]);
                    }
                }
            }
            return items;
        }

        function getOwnValidTargetTypes(path, name) {
            var node = _nodes[path];
            var items = [];
            if (node) {
                var own = getValidTargetTypes(path, name);
                var base = getValidTargetTypes(_core.getPath(_core.getBase(node)), name);
                for (var i = 0; i < own.length; i++) {
                    if (base.indexOf(own[i]) === -1) {
                        items.push(own[i]);
                    }
                }
            }
            return items;
        }

        function getValidAttributeNames(path) {
            var rawMeta = getMeta(path),
                names = [];
            if (rawMeta) {
                for (var i in rawMeta.attributes) {
                    names.push(i);
                }
            }
            return names;
        }

        function getOwnValidAttributeNames(path) {
            var names = [],
                node = _nodes[path];

            if (node) {
                var own = getValidAttributeNames(path);
                var base = getValidAttributeNames(_core.getPath(_core.getBase(node)));
                for (var i = 0; i < own.length; i++) {
                    if (base.indexOf(own[i]) === -1) {
                        names.push(own[i]);
                    }
                }
            }
            return names;
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
            var rawMeta = getMeta(path);
            if (rawMeta) {
                var childrenMeta = {};
                childrenMeta.min = rawMeta.children.min;
                childrenMeta.max = rawMeta.children.max;
                childrenMeta.items = rawMeta.children.items;
                if (childrenMeta.items !== null) {
                    for (var i = 0; i < childrenMeta.items.length; i++) {
                        var child = {};
                        child.id = refObjectToPath(childrenMeta.items[i]);
                        if (rawMeta.children.minItems) {
                            child.min = rawMeta.children.minItems[i] === -1 ? undefined : rawMeta.children.minItems[i];
                        }
                        if (rawMeta.children.maxItems) {
                            child.max = rawMeta.children.maxItems[i] === -1 ? undefined : rawMeta.children.maxItems[i];
                        }

                        childrenMeta.items[i] = child;
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
            var i,
                rawMeta;
            if (newTypeObj && newTypeObj.id) {
                rawMeta = getMeta(path);
                if (rawMeta) {
                    if (rawMeta.children.minItems === null || rawMeta.children.minItems === undefined) { //TODO: use ! ?
                        rawMeta.children.minItems = [];
                        for (i = 0; i < rawMeta.children.items.length; i++) {
                            rawMeta.children.minItems.push(-1);
                        }
                    }
                    if (rawMeta.children.maxItems === null || rawMeta.children.maxItems === undefined) { //TODO: use ! ?
                        rawMeta.children.maxItems = [];
                        for (i = 0; i < rawMeta.children.items.length; i++) {
                            rawMeta.children.maxItems.push(-1);
                        }
                    }
                    var refObj = pathToRefObject(newTypeObj.id);
                    var index = indexOfPathInRefObjArray(rawMeta.children.items, newTypeObj.id);
                    if (index === -1) {
                        index = rawMeta.children.items.length;
                        rawMeta.children.items.push(refObj);
                        rawMeta.children.minItems.push(-1);
                        rawMeta.children.maxItems.push(-1);
                    }
                    // jshint expr:true
                    (newTypeObj.min === null || newTypeObj.min === undefined) ?
                        rawMeta.children.minItems[index] = -1 : rawMeta.children.minItems[index] = newTypeObj.min;

                    (newTypeObj.max === null || newTypeObj.max === undefined) ?
                        rawMeta.children.maxItems[index] = -1 : rawMeta.children.maxItems[index] = newTypeObj.max;
                    // jshint expr:false
                    setMeta(path, rawMeta);
                }
            }
        }

        function removeValidChildrenItem(path, typeId) {
            var rawMeta = getMeta(path);
            if (rawMeta) {
                //var refObj = pathToRefObject(typeId);
                var index = indexOfPathInRefObjArray(rawMeta.children.items, typeId);
                if (index !== -1) {
                    rawMeta.children.items.splice(index, 1);
                    if (rawMeta.children.minItems) {
                        rawMeta.children.minItems.splice(index, 1);
                    }
                    if (rawMeta.children.maxItems) {
                        rawMeta.children.maxItems.splice(index, 1);
                    }
                    setMeta(path, rawMeta);
                }
            }
        }

        function getAttributeSchema(path, name) {
            var rawMeta = getMeta(path);
            if (rawMeta) {
                if (rawMeta.attributes[name]) {
                    return rawMeta.attributes[name];
                }
            }
            return null;
        }

        function setAttributeSchema(path, name, schema) {
            var rawMeta = getMeta(path);
            if (rawMeta) {
                //TODO check schema validity - but it is also viable to check it only during setMeta
                rawMeta.attributes[name] = schema;
                setMeta(path, rawMeta);
            }
        }

        function removeAttributeSchema(path, name) {
            var rawMeta = getMeta(path);
            if (rawMeta) {
                delete rawMeta.attributes[name];
                setMeta(path, rawMeta);
            }
        }

        function getPointerMeta(path, name) {
            //the returned object structure is : {'min':0,'max':0,'items':[{'id':path,'min':0,'max':0},...]}
            var rawMeta = getMeta(path);
            if (rawMeta && rawMeta.pointers[name]) {
                var pointerMeta = {};
                pointerMeta.min = rawMeta.pointers[name].min;
                pointerMeta.max = rawMeta.pointers[name].max;
                pointerMeta.items = rawMeta.pointers[name].items;
                if (pointerMeta.items !== null) {
                    for (var i = 0; i < pointerMeta.items.length; i++) {
                        var child = {};
                        child.id = refObjectToPath(pointerMeta.items[i]);
                        if (rawMeta.pointers[name].minItems) {
                            child.min = rawMeta.pointers[name].minItems[i] === -1 ?
                                undefined : rawMeta.pointers[name].minItems[i]; //FIXME: avoid assigning undefined
                        }
                        if (rawMeta.pointers[name].maxItems) {
                            child.max = rawMeta.pointers[name].maxItems[i] === -1 ?
                                undefined : rawMeta.pointers[name].maxItems[i]; //FIXME: avoid assigning undefined
                        }
                        pointerMeta.items[i] = child;
                    }
                }
                return pointerMeta;
            }
            return null;
        }

        function getValidTargetItems(path, name) {
            var pointerMeta = getPointerMeta(path, name);
            if (pointerMeta) {
                return pointerMeta.items;
            }
            return null;
        }

        function updateValidTargetItem(path, name, targetObj) {
            var rawMeta = getMeta(path);
            if (rawMeta && targetObj && targetObj.id) {
                var pointer = rawMeta.pointers[name] || null;
                if (pointer === null) {
                    rawMeta.pointers[name] = {items: [], minItems: [], maxItems: []};
                    pointer = rawMeta.pointers[name];
                }
                var refObj = pathToRefObject(targetObj.id);
                var index = indexOfPathInRefObjArray(pointer.items, targetObj.id);
                if (index === -1) {
                    index = pointer.items.length;
                    pointer.items.push(refObj);
                    pointer.minItems.push(-1);
                    pointer.maxItems.push(-1);
                }
                // jshint expr:true
                (targetObj.min === null || targetObj.min === undefined) ?
                    pointer.minItems[index] = -1 : pointer.minItems[index] = targetObj.min;

                (targetObj.max === null || targetObj.max === undefined) ?
                    pointer.maxItems[index] = -1 : pointer.maxItems[index] = targetObj.max;
                // jshint expr:false
                setMeta(path, rawMeta);
            }
        }

        function removeValidTargetItem(path, name, targetId) {
            var rawMeta = getMeta(path);
            if (rawMeta) {
                var pointer = rawMeta.pointers[name] || null;
                if (pointer !== null) {
                    //var refObj = pathToRefObject(targetId);
                    var index = indexOfPathInRefObjArray(pointer.items, targetId);
                    if (index !== -1) {
                        pointer.items.splice(index, 1);
                        if (pointer.minItems) {
                            pointer.minItems.splice(index, 1);
                        }
                        if (pointer.maxItems) {
                            pointer.maxItems.splice(index, 1);
                        }
                        setMeta(path, rawMeta);
                    }
                }
            }
        }

        function deleteMetaPointer(path, name) {
            var rawMeta = getMeta(path);
            if (rawMeta) {
                delete rawMeta.pointers[name];
                setMeta(path, rawMeta);
            }
        }

        function setPointerMeta(path, name, meta) {
            var rawMeta = getMeta(path);
            if (rawMeta) {
                var pointer = rawMeta.pointers[name] || null;
                if (pointer === null) {
                    rawMeta.pointers[name] = {items: [], minItems: [], maxItems: []};
                    pointer = rawMeta.pointers[name];
                }
                pointer.min = meta.min;
                pointer.max = meta.max;
                if (meta.items && meta.items.length) {
                    for (var i = 0; i < meta.items.length; i++) {
                        pointer.items.push(pathToRefObject(meta.items[i].id));
                        pointer.minItems.push(meta.items[i].min || -1);
                        pointer.maxItems.push(meta.items[i].max || -1);
                    }
                }
                setMeta(path, rawMeta);
            }
        }

        function setChildrenMeta(path, name, meta) {
            var rawMeta = getMeta(path);
            if (rawMeta) {
                var children = rawMeta.children;

                children.min = meta.min;
                children.max = meta.max;
                if (meta.items && meta.items.length) {
                    for (var i = 0; i < meta.items.length; i++) {
                        children.items.push(pathToRefObject(meta.items[i].id));
                        children.minItems.push(meta.items[i].min || -1);
                        children.maxItems.push(meta.items[i].max || -1);
                    }
                }
                setMeta(path, rawMeta);
            }
        }

        function getMetaAspectNames(path) {
            var rawMeta = getMeta(path),
                names = [];

            if (rawMeta && rawMeta.aspects) {
                for (var i in rawMeta.aspects) {
                    names.push(i);
                }
            }
            return names;
        }

        function getOwnMetaAspectNames(path) {
            var names = getMetaAspectNames(path),
                ownNames = [];
            if (_nodes[path]) {
                var baseNames = getMetaAspectNames(_core.getPath(_core.getBase(_nodes[path])));
                for (var i = 0; i < names.length; i++) {
                    if (baseNames.indexOf(names[i]) === -1) {
                        ownNames.push(names[i]);
                    }
                }
            }
            return ownNames;
        }

        function getMetaAspect(path, name) {
            var rawMeta = getMeta(path);
            if (rawMeta) {
                if (rawMeta.aspects[name]) {
                    var aspect = {items: []};
                    for (var i = 0; i < rawMeta.aspects[name].items.length; i++) {
                        aspect.items.push(refObjectToPath(rawMeta.aspects[name].items[i]));
                    }
                    if (aspect.items.length === 0) {
                        delete aspect.items;
                    }
                    return aspect;
                }
                return null;
            }
            return null;
        }

        function setMetaAspect(path, name, aspect) {
            var rawMeta = getMeta(path);
            if (rawMeta) {

                rawMeta.aspects = rawMeta.aspects || {};
                rawMeta.aspects[name] = {items: []};
                for (var i = 0; i < aspect.items.length; i++) {
                    rawMeta.aspects[name].items.push(pathToRefObject(aspect.items[i]));
                }
                setMeta(path, rawMeta);
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
            var rawMeta = getMeta(path);
            if (rawMeta) {
                if (rawMeta.aspects && rawMeta.aspects[name]) {
                    delete rawMeta.aspects[name];
                    setMeta(path, rawMeta);
                }
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
