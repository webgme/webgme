/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author mmaroti / https://github.com/mmaroti
 */

define([
    'common/util/assert',
    'common/util/key',
    'common/core/future',
    'common/core/tasync'
], function (ASSERT, GENKEY, FUTURE, TASYNC) {

    'use strict';

    var HASH_REGEXP = new RegExp('#[0-9a-f]{40}');
    var isValidHash = function (key) {
        return typeof key === 'string' && key.length === 41 && HASH_REGEXP.test(key);
    };

    var MAX_RELID = Math.pow(2, 31);
    var createRelid = function (data) {
        ASSERT(data && typeof data === 'object');

        var relid;
        do {
            relid = Math.floor(Math.random() * MAX_RELID);
            // relid = relid.toString();
        } while (data[relid] !== undefined);

        return '' + relid;
    };

    // make relids deterministic
    if (false) {
        var nextRelid = 0;
        createRelid = function (data) {
            ASSERT(data && typeof data === 'object');

            var relid;
            do {
                relid = (nextRelid += -1);
            } while (data[relid] !== undefined);

            return '' + relid;
        };
    }

    var rootCounter = 0;

    return function (storage, options) {
        ASSERT(typeof options === 'object');
        ASSERT(typeof options.globConf === 'object');
        ASSERT(typeof options.logger !== 'undefined');

        var gmeConfig = options.globConf;
        //var logger = options.logger.fork('coretree');

        var MAX_AGE = 3; // MAGIC NUMBER
        var MAX_TICKS = 2000; // MAGIC NUMBER
        var MAX_MUTATE = 30000; // MAGIC NUMBER

        var ID_NAME = storage.ID_NAME;
        //var EMPTY_DATA = {};
        var __getEmptyData = function () {
            return {};
        };

        var roots = [];
        var ticks = 0;

        storage.loadObject = TASYNC.wrap(storage.loadObject);
        storage.insertObject = FUTURE.adapt(storage.insertObject);
        storage.fsyncDatabase = FUTURE.adapt(storage.fsyncDatabase);

        // ------- static methods

        var getParent = function (node) {
            ASSERT(typeof node.parent === 'object');

            return node.parent;
        };

        var getRelid = function (node) {
            ASSERT(node.relid === null || typeof node.relid === 'string');

            return node.relid;
        };

        var getLevel = function (node) {
            var level = 0;
            while (node.parent !== null) {
                ++level;
                node = node.parent;
            }
            return level;
        };

        var getRoot = function (node) {
            while (node.parent !== null) {
                node = node.parent;
            }
            return node;
        };

        var getPath = function (node, base) {
            if (node === null) {
                return null;
            }

            var path = '';
            while (node.relid !== null && node !== base) {
                path = '/' + node.relid + path;
                node = node.parent;
            }
            return path;
        };

        var isValidPath = function (path) {
            return typeof path === 'string' && (path === '' || path.charAt(0) === '/');
        };

        var splitPath = function (path) {
            ASSERT(isValidPath(path));

            path = path.split('/');
            path.splice(0, 1);

            return path;
        };

        var buildPath = function (path) {
            ASSERT(path instanceof Array);

            return path.length === 0 ? '' : '/' + path.join('/');
        };

        var joinPaths = function (first, second) {
            ASSERT(isValidPath(first) && isValidPath(second));

            return first + second;
        };

        var getCommonPathPrefixData = function (first, second) {
            ASSERT(typeof first === 'string' && typeof second === 'string');

            first = splitPath(first);
            second = splitPath(second);

            var common = [];
            for (var i = 0; first[i] === second[i] && i < first.length; ++i) {
                common.push(first[i]);
            }

            return {
                common: buildPath(common),
                first: buildPath(first.slice(i)),
                firstLength: first.length - i,
                second: buildPath(second.slice(i)),
                secondLength: second.length - i
            };
        };

        // ------- memory management

        var __detachChildren = function (node) {
            ASSERT(node.children instanceof Array && node.age >= MAX_AGE - 1);

            var children = node.children;
            node.children = null;
            node.age = MAX_AGE;

            for (var i = 0; i < children.length; ++i) {
                __detachChildren(children[i]);
            }
        };

        var __ageNodes = function (nodes) {
            ASSERT(nodes instanceof Array);

            var i = nodes.length;
            while (--i >= 0) {
                var node = nodes[i];

                ASSERT(node.age < MAX_AGE);
                if (++node.age >= MAX_AGE) {
                    nodes.splice(i, 1);
                    __detachChildren(node);
                } else {
                    __ageNodes(node.children);
                }
            }
        };

        var __ageRoots = function () {
            if (++ticks >= MAX_TICKS) {
                ticks = 0;
                __ageNodes(roots);
            }
        };

        var __getChildNode = function (children, relid) {
            ASSERT(children instanceof Array && typeof relid === 'string');

            for (var i = 0; i < children.length; ++i) {
                var child = children[i];
                if (child.relid === relid) {
                    ASSERT(child.parent.age === 0);

                    child.age = 0;
                    return child;
                }
            }

            return null;
        };

        var __getChildData = function (data, relid) {
            ASSERT(typeof relid === 'string');

            if (typeof data === 'object' && data !== null) {
                data = data[relid];
                return typeof data === 'undefined' ? __getEmptyData() : data;
            } else {
                return null;
            }
        };

        var normalize = function (node) {
            ASSERT(isValidNode(node));
            // console.log('normalize start', printNode(getRoot(node)));

            var parent;

            if (node.children === null) {
                ASSERT(node.age === MAX_AGE);

                if (node.parent !== null) {
                    parent = normalize(node.parent);

                    var temp = __getChildNode(parent.children, node.relid);
                    if (temp !== null) {
                        // TODO: make the current node close to the returned one

                        // console.log('normalize end1',
                        // printNode(getRoot(temp)));
                        return temp;
                    }

                    ASSERT(node.parent.children === null || __getChildNode(node.parent.children, node.relid) === null);
                    ASSERT(__getChildNode(parent.children, node.relid) === null);

                    node.parent = parent;
                    parent.children.push(node);

                    temp = __getChildData(parent.data, node.relid);
                    if (!isValidHash(temp) || temp !== __getChildData(node.data, ID_NAME)) {
                        node.data = temp;
                    }
                } else {
                    roots.push(node);
                }

                node.age = 0;
                node.children = [];
            } else if (node.age !== 0) {
                parent = node;
                do {
                    parent.age = 0;
                    parent = parent.parent;
                } while (parent !== null && parent.age !== 0);
            }

            // console.log('normalize end2', printNode(getRoot(node)));
            return node;
        };

        // ------- hierarchy

        var getAncestor = function (first, second) {
            ASSERT(getRoot(first) === getRoot(second));

            first = normalize(first);
            second = normalize(second);

            var a = [];
            do {
                a.push(first);
                first = first.parent;
            } while (first !== null);

            var b = [];
            do {
                b.push(second);
                second = second.parent;
            } while (second !== null);

            var i = a.length - 1;
            var j = b.length - 1;
            while (i !== 0 && j !== 0 && a[i - 1] === b[j - 1]) {
                --i;
                --j;
            }

            ASSERT(a[i] === b[j]);
            return a[i];
        };

        var isAncestor = function (node, ancestor) {
            ASSERT(getRoot(node) === getRoot(ancestor));

            node = normalize(node);
            ancestor = normalize(ancestor);

            do {
                if (node === ancestor) {
                    return true;
                }

                node = node.parent;
            } while (node !== null);

            return false;
        };

        var createRoot = function () {
            var root = {
                parent: null,
                relid: null,
                age: 0,
                children: [],
                data: {
                    _mutable: true
                },
                rootid: ++rootCounter
            };
            root.data[ID_NAME] = '';
            roots.push(root);

            __ageRoots();
            return root;
        };

        var getChild = function (node, relid) {
            ASSERT(typeof relid === 'string' && relid !== ID_NAME);

            node = normalize(node);

            var child = __getChildNode(node.children, relid);
            if (child !== null) {
                return child;
            }

            child = {
                parent: node,
                relid: relid,
                age: 0,
                children: [],
                data: __getChildData(node.data, relid)
            };
            node.children.push(child);

            __ageRoots();
            return child;
        };

        var createChild = function (node) {
            node = normalize(node);

            if (typeof node.data !== 'object' || node.data === null) {
                throw new Error('invalid node data');
            }

            var relid = createRelid(node.data);
            var child = {
                parent: node,
                relid: relid,
                age: 0,
                children: [],
                data: __getEmptyData()
            };

            // TODO: make sure that it is not on the list
            node.children.push(child);

            __ageRoots();
            return child;
        };

        var getDescendant = function (node, head, base) {
            ASSERT(typeof base === 'undefined' || isAncestor(head, base));

            node = normalize(node);
            head = normalize(head);
            base = typeof base === 'undefined' ? null : normalize(base.parent);

            var path = [];
            while (head.parent !== base) {
                path.push(head.relid);
                head = head.parent;
            }

            var i = path.length;
            while (--i >= 0) {
                node = getChild(node, path[i]);
            }

            return node;
        };

        var getDescendantByPath = function (node, path) {
            ASSERT(path === '' || path.charAt(0) === '/');

            path = path.split('/');

            for (var i = 1; i < path.length; ++i) {
                node = getChild(node, path[i]);
            }

            return node;
        };

        // ------- data manipulation

        var __isMutableData = function (data) {
            return typeof data === 'object' && data !== null && data._mutable === true;
        };

        var isMutable = function (node) {
            node = normalize(node);
            return __isMutableData(node.data);
        };

        var isObject = function (node) {
            node = normalize(node);
            return typeof node.data === 'object' && node.data !== null;
        };

        var isEmpty = function (node) {
            node = normalize(node);
            if (typeof node.data !== 'object' || node.data === null) {
                return false;
            } else if (node.data === __getEmptyData()) {
                return true;
            }

            return __isEmptyData(node.data);
        };

        var __isEmptyData = function (data) {
            // TODO: better way to check if object has keys?
            for (var keys in data) {
                return false;
            }
            return true;
        };

        var __areEquivalent = function (data1, data2) {
            return data1 === data2 || (typeof data1 === 'string' && data1 === __getChildData(data2, ID_NAME)) ||
                (__isEmptyData(data1) && __isEmptyData(data2));
        };

        var mutateCount = 0;
        var mutate = function (node) {
            ASSERT(isValidNode(node));

            node = normalize(node);
            var data = node.data;

            if (typeof data !== 'object' || data === null) {
                return false;
            } else if (data._mutable === true) {
                return true;
            }

            // TODO: infinite cycle if MAX_MUTATE is smaller than depth!
            if (gmeConfig.storage.autoPersist && ++mutateCount > MAX_MUTATE) {
                mutateCount = 0;

                for (var i = 0; i < roots.length; ++i) {
                    if (__isMutableData(roots[i].data)) {
                        __saveData(roots[i].data);
                    }
                }
            }

            if (node.parent !== null && !mutate(node.parent)) {
                // this should never happen
                return false;
            }

            var copy = {
                _mutable: true
            };

            for (var key in data) {
                copy[key] = data[key];
            }

            ASSERT(copy._mutable === true);

            if (typeof data[ID_NAME] === 'string') {
                copy[ID_NAME] = '';
            }

            if (node.parent !== null) {
                ASSERT(__areEquivalent(__getChildData(node.parent.data, node.relid), node.data));
                node.parent.data[node.relid] = copy;
            }

            node.data = copy;
            return true;
        };

        var getData = function (node) {
            node = normalize(node);

            ASSERT(!__isMutableData(node.data));
            return node.data;
        };

        var __reloadChildrenData = function (node) {
            for (var i = 0; i < node.children.length; ++i) {
                var child = node.children[i];

                var data = __getChildData(node.data, child.relid);
                if (!isValidHash(data) || data !== __getChildData(child.data, ID_NAME)) {
                    child.data = data;
                    __reloadChildrenData(child);
                }
            }
        };

        var setData = function (node, data) {
            ASSERT(data !== null && typeof data !== 'undefined');

            node = normalize(node);
            if (node.parent !== null) {
                if (!mutate(node.parent)) {
                    throw new Error('incorrect node data');
                }

                node.parent.data[node.relid] = data;
            }

            node.data = data;
            __reloadChildrenData(node);
        };

        var deleteData = function (node) {
            node = normalize(node);

            if (node.parent !== null) {
                if (!mutate(node.parent)) {
                    throw new Error('incorrect node data');
                }

                delete node.parent.data[node.relid];
            }

            var data = node.data;

            node.data = __getEmptyData();
            __reloadChildrenData(node);

            return data;
        };

        var copyData = function (node) {
            node = normalize(node);

            if (typeof node.data !== 'object' || node.data === null) {
                return node.data;
            }

            // TODO: return immutable data without coping
            return JSON.parse(JSON.stringify(node.data));
        };

        var getProperty = function (node, name) {
            ASSERT(typeof name === 'string' && name !== ID_NAME);

            var data;
            node = normalize(node);

            if (typeof node.data === 'object' && node.data !== null) {
                data = node.data[name];
            }

            // TODO: corerel uses getProperty to get the overlay content which can get mutable
            // ASSERT(!__isMutableData(data));
            return data;
        };

        var setProperty = function (node, name, data) {
            ASSERT(typeof name === 'string' && name !== ID_NAME);
            ASSERT(!__isMutableData(data) /*&& data !== null*/ && data !== undefined);
            //TODO is the 'null' really can be a value of a property???

            node = normalize(node);
            if (!mutate(node)) {
                throw new Error('incorrect node data');
            }

            node.data[name] = data;

            var child = __getChildNode(node.children, name);
            if (child !== null) {
                child.data = data;
                __reloadChildrenData(child);
            }
        };

        var deleteProperty = function (node, name) {
            ASSERT(typeof name === 'string' && name !== ID_NAME);

            node = normalize(node);
            if (!mutate(node)) {
                throw new Error('incorrect node data');
            }

            delete node.data[name];

            var child = __getChildNode(node.children, name);
            if (child !== null) {
                child.data = __getEmptyData();
                __reloadChildrenData(child);
            }
        };

        var noUnderscore = function (relid) {
            ASSERT(typeof relid === 'string');
            return relid.charAt(0) !== '_';
        };

        var getKeys = function (node, predicate) {
            ASSERT(typeof predicate === 'undefined' || typeof predicate === 'function');

            node = normalize(node);
            predicate = predicate || noUnderscore;

            if (typeof node.data !== 'object' || node.data === null) {
                return null;
            }

            var keys = Object.keys(node.data);

            var i = keys.length;
            while (--i >= 0 && !predicate(keys[i])) {
                keys.pop();
            }

            while (--i >= 0) {
                if (!predicate(keys[i])) {
                    keys[i] = keys.pop();
                }
            }

            return keys;
        };

        var getRawKeys = function (object, predicate) {
            ASSERT(typeof predicate === 'undefined' || typeof predicate === 'function');
            predicate = predicate || noUnderscore;

            var keys = Object.keys(object);

            var i = keys.length;
            while (--i >= 0 && !predicate(keys[i])) {
                keys.pop();
            }

            while (--i >= 0) {
                if (!predicate(keys[i])) {
                    keys[i] = keys.pop();
                }
            }

            return keys;
        };

        // ------- persistence

        var getHash = function (node) {
            if (node === null) {
                return null;
            }

            var hash;
            node = normalize(node);
            if (typeof node.data === 'object' && node.data !== null) {
                hash = node.data[ID_NAME];
            }

            ASSERT(typeof hash === 'string' || typeof hash === 'undefined');
            return hash;
        };

        var isHashed = function (node) {
            node = normalize(node);
            return typeof node.data === 'object' && node.data !== null && typeof node.data[ID_NAME] === 'string';
        };

        var setHashed = function (node, hashed, noMutate) {
            ASSERT(typeof hashed === 'boolean');

            node = normalize(node);
            if (!noMutate) {
                if (!mutate(node)) {
                    throw new Error('incorrect node data');
                }
            }

            if (hashed) {
                node.data[ID_NAME] = '';
            } else {
                delete node.data[ID_NAME];
            }

            ASSERT(typeof node.children[ID_NAME] === 'undefined');
        };

        var __saveData = function (data) {
            ASSERT(__isMutableData(data));

            var done = __getEmptyData();
            delete data._mutable;

            for (var relid in data) {
                var child = data[relid];
                if (__isMutableData(child)) {
                    var sub = __saveData(child);
                    if (sub === __getEmptyData()) {
                        delete data[relid];
                    } else {
                        done = FUTURE.join(done, sub);
                        if (typeof child[ID_NAME] === 'string') {
                            data[relid] = child[ID_NAME];
                        }
                    }
                } else {
                    done = undefined;
                }
            }

            if (done !== __getEmptyData()) {
                var hash = data[ID_NAME];
                ASSERT(hash === '' || typeof hash === 'undefined');

                if (hash === '') {
                    hash = '#' + GENKEY(data, gmeConfig);
                    data[ID_NAME] = hash;

                    done = FUTURE.join(done, storage.insertObject(data));
                }
            }

            return done;
        };

        var persist = function (node) {
            node = normalize(node);

            if (!__isMutableData(node.data)) {
                return false;
            }

            var done = __saveData(node.data);
            return FUTURE.join(done, storage.fsyncDatabase());
        };

        var loadRoot = function (hash) {
            ASSERT(isValidHash(hash));

            return TASYNC.call(__loadRoot2, storage.loadObject(hash));
        };

        var __loadRoot2 = function (data) {
            var root = {
                parent: null,
                relid: null,
                age: 0,
                children: [],
                data: data,
                rootid: ++rootCounter
            };
            roots.push(root);

            __ageRoots();
            return root;
        };

        var loadChild = function (node, relid) {
            ASSERT(isValidNode(node));

            node = getChild(node, relid);

            if (isValidHash(node.data)) {
                // TODO: this is a hack, we should avoid loading it multiple
                // times
                return TASYNC.call(__loadChild2, node, storage.loadObject(node.data));
            } else {
                return typeof node.data === 'object' && node.data !== null ? node : null;
            }
        };

        var getChildHash = function (node, relid) {
            ASSERT(isValidNode(node));

            node = getChild(node, relid);

            if (isValidHash(node.data)) {
                // TODO: this is a hack, we should avoid loading it multiple
                // times
                return node.data;
            } else {
                return typeof node.data === 'object' && node.data !== null ? getHash(node) : null;
            }
        };


        var __loadChild2 = function (node, newdata) {
            node = normalize(node);

            // TODO: this is a hack, we should avoid loading it multiple times
            if (isValidHash(node.data)) {
                ASSERT(node.data === newdata[ID_NAME]);

                node.data = newdata;
                __reloadChildrenData(node);
            } else {
                // TODO: if this bites you, use the Cache
                /*if(node.data !== newdata){
                 console.log('kecso',node);
                 }
                 ASSERT(node.data === newdata);*/
            }

            return node;
        };

        var loadByPath = function (node, path) {
            ASSERT(isValidNode(node));
            ASSERT(path === '' || path.charAt(0) === '/');

            path = path.split('/');
            return __loadDescendantByPath2(node, path, 1);
        };

        var __loadDescendantByPath2 = function (node, path, index) {
            if (node === null || index === path.length) {
                return node;
            }

            var child = loadChild(node, path[index]);
            return TASYNC.call(__loadDescendantByPath2, child, path, index + 1);
        };

        // ------- valid -------

        var printNode = function (node) {
            var str = '{';
            str += 'age:' + node.age;

            if (typeof node.relid === 'string') {
                str += ', relid: "' + node.relid + '"';
            }

            str += ', children:';
            if (node.children === null) {
                str += 'null';
            } else {
                str += '[';
                for (var i = 0; i < node.children.length; ++i) {
                    if (i !== 0) {
                        str += ', ';
                    }
                    str += printNode(node.children[i]);
                }
                str += ']';
            }

            str += '}';
            return str;
        };

        var __test = function (text, cond) {
            if (!cond) {
                throw new Error(text);
            }
        };

        var checkValidTree = function (node) {
            if (isValidNode(node)) {
                if (node.children instanceof Array) {
                    for (var i = 0; i < node.children.length; ++i) {
                        checkValidTree(node.children[i]);
                    }
                }
            }
        };

        // disable checking for now
        var checkValidTreeRunning = true;

        var isValidNode = function (node) {
            try {
                __test('object', typeof node === 'object' && node !== null);
                __test('object 2', node.hasOwnProperty('parent') && node.hasOwnProperty('relid'));
                __test('parent', typeof node.parent === 'object');
                __test('relid', typeof node.relid === 'string' || node.relid === null);
                __test('parent 2', (node.parent === null) === (node.relid === null));
                __test('age', node.age >= 0 && node.age <= MAX_AGE);
                __test('children', node.children === null || node.children instanceof Array);
                __test('children 2', (node.age === MAX_AGE) === (node.children === null));
                __test('data', typeof node.data === 'object' || typeof node.data === 'string' ||
                    typeof node.data === 'number');

                if (node.parent !== null) {
                    __test('age 2', node.age >= node.parent.age);
                    __test('mutable', !__isMutableData(node.data) || __isMutableData(node.parent.data));
                }

                if (!checkValidTreeRunning) {
                    checkValidTreeRunning = true;
                    checkValidTree(getRoot(node));
                    checkValidTreeRunning = false;
                }

                return true;
            } catch (error) {
                console.log('Wrong node', error.stack);
                return false;
            }
        };

        return {
            getParent: getParent,
            getRelid: getRelid,
            getLevel: getLevel,
            getRoot: getRoot,
            getPath: getPath,
            isValidPath: isValidPath,
            splitPath: splitPath,
            buildPath: buildPath,
            joinPaths: joinPaths,
            getCommonPathPrefixData: getCommonPathPrefixData,

            normalize: normalize,
            getAncestor: getAncestor,
            isAncestor: isAncestor,
            createRoot: createRoot,
            createChild: createChild,
            getChild: getChild,
            getDescendant: getDescendant,
            getDescendantByPath: getDescendantByPath,

            isMutable: isMutable,
            isObject: isObject,
            isEmpty: isEmpty,
            mutate: mutate,
            getData: getData,
            setData: setData,
            deleteData: deleteData,
            copyData: copyData,
            getProperty: getProperty,
            setProperty: setProperty,
            deleteProperty: deleteProperty,
            getKeys: getKeys,
            getRawKeys: getRawKeys,

            isHashed: isHashed,
            setHashed: setHashed,
            getHash: getHash,
            persist: TASYNC.wrap(FUTURE.unadapt(persist)),
            loadRoot: loadRoot,
            loadChild: loadChild,
            loadByPath: loadByPath,

            isValidNode: isValidNode,

            getChildHash: getChildHash
        };
    };
});
