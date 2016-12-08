/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author mmaroti / https://github.com/mmaroti
 */

define([
    'common/core/CoreAssert',
    'common/util/key',
    'common/core/tasync',
    'common/util/random',
    'common/regexp',
    'common/core/constants',
    'common/core/convertData'
], function (ASSERT, GENKEY, TASYNC, RANDOM, REGEXP, CONSTANTS, convertData) {

    'use strict';

    var rootCounter = 0;

    function CoreTree(storage, options) {
        ASSERT(typeof options === 'object');
        ASSERT(typeof options.globConf === 'object');
        ASSERT(typeof options.logger !== 'undefined');

        var gmeConfig = options.globConf,
            logger = options.logger.fork('core'),
            ID_NAME = storage.ID_NAME,
            roots = [],
            ticks = 0,
            mutateCount = 0,
            stackedObjects = {},
            self = this;

        storage.loadObject = TASYNC.wrap(storage.loadObject);

        this.loadPaths = TASYNC.wrap(storage.loadPaths);
        this.logger = logger;

        function ASSERT_IS_OBJECT(value) {
            ASSERT(value !== null && typeof value === 'object' && value instanceof Array === false);
        }

        // ------- memory management

        function __detachChildren(node) {
            ASSERT_IS_OBJECT(node.children);
            ASSERT(node.age >= CONSTANTS.MAX_AGE - 1);

            var children = node.children;
            node.children = null;
            node.age = CONSTANTS.MAX_AGE;

            for (var child in children) {
                __detachChildren(children[child]);
            }
        }

        function __ageNodes(nodes) {
            ASSERT_IS_OBJECT(nodes);

            var keys = Object.keys(nodes),
                node,
                i;

            for (i = 0; i < keys.length; i += 1) {
                node = nodes[keys[i]];
                ASSERT(node.age < CONSTANTS.MAX_AGE);
                if (++node.age >= CONSTANTS.MAX_AGE) {
                    delete nodes[keys[i]];
                    __detachChildren(node);
                } else {
                    __ageNodes(node.children);
                }
            }
        }

        function __ageRoots() {
            var root,
                i;
            if (++ticks >= CONSTANTS.MAX_TICKS) {
                ticks = 0;
                i = roots.length;
                while (--i >= 0) {
                    root = roots[i];
                    ASSERT(root.age < CONSTANTS.MAX_AGE);
                    if (++root.age >= CONSTANTS.MAX_AGE) {
                        roots.splice(i, 1);
                        __detachChildren(root);
                    } else {
                        __ageNodes(root.children);
                    }
                }
            }
        }

        function __getChildNode(children, relid) {
            ASSERT_IS_OBJECT(children);
            ASSERT(typeof relid === 'string');

            if (children.hasOwnProperty(relid)) {
                children[relid].age = 0;
                return children[relid];
            }

            return null;
        }

        function __getChildData(data, relid) {
            ASSERT(typeof relid === 'string');

            if (typeof data === 'object' && data !== null) {
                data = data[relid];
                return data === undefined ? __getEmptyData() : data;
            } else {
                return null;
            }
        }

        function __isMutableData(data) {
            return typeof data === 'object' && data !== null && data[CONSTANTS.MUTABLE_PROPERTY] === true;
        }

        function __isEmptyData(data) {
            if (typeof data === 'string') {
                return false;
            } else if (typeof data === 'object' && Object.keys(data).length === 0) {
                return true;
            } else {
                return false;
            }
        }

        function __getEmptyData() {
            return {};
        }

        function __areEquivalent(data1, data2) {
            return data1 === data2 || (typeof data1 === 'string' && data1 === __getChildData(data2, ID_NAME)) ||
                (__isEmptyData(data1) && __isEmptyData(data2));
        }

        function __reloadChildrenData(node) {
            var key,
                child;

            for (key in node.children) {
                child = node.children[key];

                var data = __getChildData(node.data, child.relid);
                if (!REGEXP.DB_HASH.test(data) || data !== __getChildData(child.data, ID_NAME)) {
                    child.data = data;
                    __reloadChildrenData(child);
                }
            }
        }

        function __noUnderscore(relid) {
            ASSERT(typeof relid === 'string');
            return relid.charAt(0) !== '_';
        }

        function __saveData(data, root, path) {
            ASSERT(__isMutableData(data));
            var cleanData;

            var done = __getEmptyData(),
                keys,
                key,
                i, child, sub, hash;

            delete data[CONSTANTS.MUTABLE_PROPERTY];
            keys = Object.keys(data);

            for (i = 0; i < keys.length; i++) {
                key = keys[i];
                child = data[key];
                if (__isMutableData(child)) {
                    sub = __saveData(child, root, path + '/' + key);
                    if (JSON.stringify(sub) === JSON.stringify(__getEmptyData())) {
                        delete data[key];
                    } else {
                        done = sub;
                        if (typeof child[ID_NAME] === 'string') {
                            data[key] = child[ID_NAME];
                        }
                    }
                } else {
                    done = undefined;
                }
            }

            if (done !== __getEmptyData()) {
                hash = data[ID_NAME];
                ASSERT(hash === '' || hash === undefined);

                if (hash === '') {
                    //TODO: This is a temporary fix. We should modify CANON.
                    cleanData = JSON.parse(JSON.stringify(data));
                    hash = '#' + GENKEY(cleanData, gmeConfig);
                    data[ID_NAME] = hash;
                    cleanData[ID_NAME] = hash;

                    done = cleanData;

                    storage.insertObject(cleanData, stackedObjects);
                    stackedObjects[hash] = {
                        newHash: hash,
                        newData: cleanData,
                        oldHash: root.initial[path] && root.initial[path].hash,
                        oldData: root.initial[path] && root.initial[path].data
                    };

                    root.initial[path] = {
                        hash: hash,
                        data: cleanData
                    };
                    //stackedObjects[hash] = data;
                }
            }

            return done;
        }

        function __loadRoot2(data) {
            var root = {
                parent: null,
                relid: null,
                age: 0,
                children: {},
                data: null,
                initial: {
                    '': {
                        hash: data[storage.ID_NAME],
                        data: data
                    }
                },
                rootid: ++rootCounter
            };

            // Ensure we get the correct version of the data.
            root.data = convertData(data);

            roots.push(root);

            __ageRoots();
            return root;
        }

        function __loadChild2(node, newdata) {
            var root = self.getRoot(node),
                path = self.getPath(node);

            node = self.normalize(node);

            // TODO: this is a hack, we should avoid loading it multiple times
            if (REGEXP.DB_HASH.test(node.data)) {
                ASSERT(node.data === newdata[ID_NAME]);

                root.initial[path] = {
                    hash: node.data,
                    data: newdata
                };

                // Ensure we get the correct version of the data.
                node.data = convertData(newdata);
                __reloadChildrenData(node);
            } else {
                // TODO: if this bites you, use the Cache
                /*if(node.data !== newdata){
                 console.log('kecso',node);
                 }
                 ASSERT(node.data === newdata);*/
            }

            return node;
        }

        function __loadDescendantByPath2(node, path, index) {
            if (node === null || index === path.length) {
                return node;
            }

            var child = self.loadChild(node, path[index]);
            return TASYNC.call(__loadDescendantByPath2, child, path, index + 1);
        }

        // function __printNode(node) {
        //     var str = '{';
        //     str += 'age:' + node.age;
        //
        //     if (typeof node.relid === 'string') {
        //         str += ', relid: "' + node.relid + '"';
        //     }
        //
        //     str += ', children:';
        //     if (node.children === null) {
        //         str += 'null';
        //     } else {
        //         str += '[';
        //         for (var i = 0; i < node.children.length; ++i) {
        //             if (i !== 0) {
        //                 str += ', ';
        //             }
        //             str += __printNode(node.children[i]);
        //         }
        //         str += ']';
        //     }
        //
        //     str += '}';
        //     return str;
        // }

        function __test(text, cond) {
            if (!cond) {
                throw new Error(text);
            }
        }

        function isValidNodeThrow(node) {
            __test('object', typeof node === 'object' && node !== null);
            __test('object 2', node.hasOwnProperty('parent') && node.hasOwnProperty('relid'));
            __test('parent', typeof node.parent === 'object');
            __test('relid', typeof node.relid === 'string' || node.relid === null);
            __test('parent 2', (node.parent === null) === (node.relid === null));
            __test('age', node.age >= 0 && node.age <= CONSTANTS.MAX_AGE);
            //__test('children', node.children === null || node.children instanceof Array);
            __test('children 2', (node.age === CONSTANTS.MAX_AGE) === (node.children === null));
            __test('data', typeof node.data === 'object' || typeof node.data === 'string' ||
                typeof node.data === 'number');

            if (node.parent !== null) {
                __test('age 2', node.age >= node.parent.age);
                __test('mutable', !__isMutableData(node.data) || __isMutableData(node.parent.data));
            }
        }

        // ------- static methods
        this.getParent = function (node) {
            ASSERT(typeof node.parent === 'object');

            return node.parent;
        };

        this.getRelid = function (node) {
            ASSERT(node.relid === null || typeof node.relid === 'string');

            return node.relid;
        };

        this.getLevel = function (node) {
            var level = 0;
            while (node.parent !== null) {
                ++level;
                node = node.parent;
            }
            return level;
        };

        this.getRoot = function (node) {
            while (node.parent !== null) {
                node = node.parent;
            }
            return node;
        };

        this.getPath = function (node, base) {
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

        this.isValidPath = function (path) {
            return typeof path === 'string' && (path === '' || path.charAt(0) === '/');
        };

        this.splitPath = function (path) {
            ASSERT(self.isValidPath(path));

            path = path.split('/');
            path.splice(0, 1);

            return path;
        };

        this.buildPath = function (path) {
            ASSERT(path instanceof Array);

            return path.length === 0 ? '' : '/' + path.join('/');
        };

        this.joinPaths = function (first, second) {
            ASSERT(self.isValidPath(first) && self.isValidPath(second));

            return first + second;
        };

        this.getCommonPathPrefixData = function (first, second) {
            ASSERT(typeof first === 'string' && typeof second === 'string');

            first = self.splitPath(first);
            second = self.splitPath(second);

            var common = [];
            for (var i = 0; first[i] === second[i] && i < first.length; ++i) {
                common.push(first[i]);
            }

            return {
                common: self.buildPath(common),
                first: self.buildPath(first.slice(i)),
                firstLength: first.length - i,
                second: self.buildPath(second.slice(i)),
                secondLength: second.length - i
            };
        };

        this.normalize = function (node) {
            ASSERT(self.isValidNode(node));
            // console.log('normalize start', printNode(getRoot(node)));

            var parent;

            if (node.children === null) {
                ASSERT(node.age === CONSTANTS.MAX_AGE);

                if (node.parent !== null) {
                    parent = self.normalize(node.parent);

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
                    parent.children[node.relid] = node;

                    temp = __getChildData(parent.data, node.relid);
                    if (!REGEXP.DB_HASH.test(temp) || temp !== __getChildData(node.data, ID_NAME)) {
                        node.data = temp;
                    }
                } else {
                    roots.push(node);
                }

                node.age = 0;
                node.children = {};
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

        this.getAncestor = function (first, second) {
            ASSERT(self.getRoot(first) === self.getRoot(second));

            first = self.normalize(first);
            second = self.normalize(second);

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

        this.isAncestor = function (node, ancestor) {
            ASSERT(self.getRoot(node) === self.getRoot(ancestor));

            node = self.normalize(node);
            ancestor = self.normalize(ancestor);

            do {
                if (node === ancestor) {
                    return true;
                }

                node = node.parent;
            } while (node !== null);

            return false;
        };

        this.createRoot = function () {
            var root = {
                parent: null,
                relid: null,
                age: 0,
                children: {},
                data: {
                    _mutable: true
                },
                initial: {
                    '': null
                },
                rootid: ++rootCounter
            };
            root.data[ID_NAME] = '';
            roots.push(root);

            __ageRoots();
            return root;
        };

        this.getChild = function (node, relid) {
            ASSERT(typeof relid === 'string' && relid !== ID_NAME);

            node = self.normalize(node);

            var child = __getChildNode(node.children, relid);
            if (child !== null) {
                return child;
            }

            child = {
                parent: node,
                relid: relid,
                age: 0,
                children: {},
                data: __getChildData(node.data, relid)
            };
            node.children[relid] = child;

            __ageRoots();
            return child;
        };

        this.createChild = function (node, takenRelids, minimumLength) {
            node = self.normalize(node);

            if (typeof node.data !== 'object' || node.data === null) {
                throw new Error('invalid node data');
            }

            return self.getChild(node, RANDOM.generateRelid(takenRelids || node.data, minimumLength));
        };

        // ------- data manipulation

        this.isMutable = function (node) {
            node = self.normalize(node);
            return __isMutableData(node.data);
        };

        this.isEmpty = function (node) {
            node = self.normalize(node);
            if (typeof node.data !== 'object' || node.data === null) {
                return false;
            } else if (node.data === __getEmptyData()) {
                return true;
            }

            return __isEmptyData(node.data);
        };

        this.mutate = function (node) {
            ASSERT(self.isValidNode(node));

            node = self.normalize(node);
            var data = node.data;

            if (typeof data !== 'object' || data === null) {
                return false;
            } else if (data[CONSTANTS.MUTABLE_PROPERTY] === true) {
                return true;
            }

            // TODO: infinite cycle if MAX_MUTATE is smaller than depth!
            // gmeConfig.storage.autoPersist is removed and always false
            if (false && ++mutateCount > CONSTANTS.MAX_MUTATE) {
                mutateCount = 0;

                for (var i = 0; i < roots.length; ++i) {
                    if (__isMutableData(roots[i].data)) {
                        __saveData(roots[i].data, roots[i], '');
                    }
                }
            }

            if (node.parent !== null && !self.mutate(node.parent)) {
                // this should never happen
                return false;
            }

            var copy = __getEmptyData();

            for (var key in data) {
                copy[key] = data[key];
            }
            copy[CONSTANTS.MUTABLE_PROPERTY] = true;

            if (typeof data[ID_NAME] === 'string') {
                copy[ID_NAME] = '';
            }

            if (node.parent !== null) {
                //inherited child doesn't have an entry in the parent as long as it has not been modified
                ASSERT(node.parent.data[node.relid] === undefined ||
                    __areEquivalent(__getChildData(node.parent.data, node.relid), node.data));
                node.parent.data[node.relid] = copy;
            }

            node.data = copy;
            return true;
        };

        this.getData = function (node) {
            node = self.normalize(node);

            ASSERT(!__isMutableData(node.data));
            return node.data;
        };

        this.setData = function (node, data) {
            ASSERT(data !== null && typeof data !== 'undefined');

            node = self.normalize(node);
            if (node.parent !== null) {
                if (!self.mutate(node.parent)) {
                    throw new Error('incorrect node data');
                }

                node.parent.data[node.relid] = data;
            }

            node.data = data;
            __reloadChildrenData(node);
        };

        this.deleteData = function (node) {
            node = self.normalize(node);

            if (node.parent !== null) {
                if (!self.mutate(node.parent)) {
                    throw new Error('incorrect node data');
                }

                delete node.parent.data[node.relid];
            }

            var data = node.data;

            node.data = __getEmptyData();
            __reloadChildrenData(node);

            return data;
        };

        this.copyData = function (node) {
            node = self.normalize(node);

            if (typeof node.data !== 'object' || node.data === null) {
                return node.data;
            }

            // TODO: return immutable data without coping
            return JSON.parse(JSON.stringify(node.data));
        };

        this.getProperty = function (node, name) {
            ASSERT(typeof name === 'string' && name !== ID_NAME);

            var data;
            node = self.normalize(node);

            if (typeof node.data === 'object' && node.data !== null) {
                data = node.data[name];
            }

            // TODO: corerel uses getProperty to get the overlay content which can get mutable
            // ASSERT(!__isMutableData(data));
            return data;
        };

        this.setProperty = function (node, name, data) {
            ASSERT(typeof name === 'string' && name !== ID_NAME);
            ASSERT(!__isMutableData(data) /*&& data !== null*/ && data !== undefined);
            //TODO is the 'null' really can be a value of a property???

            node = self.normalize(node);
            if (!self.mutate(node)) {
                throw new Error('incorrect node data');
            }

            node.data[name] = data;

            var child = __getChildNode(node.children, name);
            if (child !== null) {
                child.data = data;
                __reloadChildrenData(child);
            }
        };

        this.deleteProperty = function (node, name) {
            ASSERT(typeof name === 'string' && name !== ID_NAME);

            node = self.normalize(node);
            if (!self.mutate(node)) {
                throw new Error('incorrect node data');
            }

            delete node.data[name];

            var child = __getChildNode(node.children, name);
            if (child !== null) {
                child.data = __getEmptyData();
                __reloadChildrenData(child);
            }
        };

        this.getKeys = function (node, predicate) {
            var result;
            node = self.normalize(node);

            if (typeof node.data !== 'object' || node.data === null) {
                return null;
            }

            result = this.getRawKeys(node.data, predicate);
            return result;
        };

        this.getRawKeys = function (object, predicate) {
            predicate = predicate || __noUnderscore;

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

        this.getHash = function (node) {
            if (node === null) {
                return null;
            }

            var hash;
            node = self.normalize(node);
            if (typeof node.data === 'object' && node.data !== null) {
                hash = node.data[ID_NAME];
            }

            ASSERT(typeof hash === 'string' || hash === undefined);
            return hash;
        };

        this.isHashed = function (node) {
            node = self.normalize(node);
            return typeof node.data === 'object' && node.data !== null && typeof node.data[ID_NAME] === 'string';
        };

        this.setHashed = function (node, hashed, noMutate) {
            ASSERT(typeof hashed === 'boolean');

            node = self.normalize(node);
            if (!noMutate) {
                if (!self.mutate(node)) {
                    throw new Error('incorrect node data');
                }
            }

            if (hashed) {
                node.data[ID_NAME] = '';
            } else {
                delete node.data[ID_NAME];
            }

            ASSERT(node.children[ID_NAME] === undefined);
        };

        this.persist = function (node) {
            var updated = false,
                result;

            node = self.normalize(node);

            //currently there is no reason to call the persist on a non-root object
            node = self.getRoot(node);

            if (!__isMutableData(node.data)) {
                return {rootHash: node.data[ID_NAME], objects: {}};
            }

            updated = __saveData(node.data, node, '');
            if (updated !== __getEmptyData()) {
                result = {};
                result.objects = stackedObjects;
                stackedObjects = {};
                result.rootHash = node.data[ID_NAME];
            } else {
                result = {rootHash: node.data[ID_NAME], objects: {}};
            }

            return result;
        };

        this.loadRoot = function (hash) {
            ASSERT(REGEXP.DB_HASH.test(hash));

            return TASYNC.call(__loadRoot2, storage.loadObject(hash));
        };

        this.loadChild = function (node, relid) {
            ASSERT(self.isValidNode(node));

            node = self.getChild(node, relid);

            if (typeof node.data === 'object') {
                return node.data !== null ? node : null;
            } else if (REGEXP.DB_HASH.test(node.data)) {
                // TODO: this is a hack, we should avoid loading it multiple
                // times
                return TASYNC.call(__loadChild2, node, storage.loadObject(node.data));
            } else {
                return null;
            }
        };

        this.getChildHash = function (node, relid) {
            ASSERT(self.isValidNode(node));

            node = self.getChild(node, relid);

            if (typeof node.data === 'object') {
                return node.data !== null ? self.getHash(node) : null;
            } else if (REGEXP.DB_HASH.test(node.data)) {
                // TODO: this is a hack, we should avoid loading it multiple
                // times
                return node.data;
            } else {
                return null;
            }
        };

        this.loadByPath = function (node, path) {
            ASSERT(self.isValidNode(node));
            ASSERT(path === '' || path.charAt(0) === '/');

            path = path.split('/');
            return __loadDescendantByPath2(node, path, 1);
        };

        // ------- valid -------
        this.isValidNode = function (node) {
            try {
                isValidNodeThrow(node);
                return true;
            } catch (error) {
                logger.error(error.message, {stack: error.stack, node: node});
                return false;
            }
        };

        this.removeChildFromCache = function (node, relid) {
            delete node.children[relid];

            return node;
        };
    }

    return CoreTree;
});
