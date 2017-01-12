/*globals define*/
/*jshint node: true, browser: true*/

/**
 * This class defines the public API of the WebGME-Core
 *
 * @author kecso / https://github.com/kecso
 * @module Core
 */

/**
 * @typedef {object} Node - the object that represents the atomic element of the containment hierarchy.
 */

/**
 * @typedef {object} DataObject - Inner data of {@link module:Core~Node} that can be serialized and saved in the storage.
 */

/**
 * @typedef {object} GmePersisted - the result object of a persist which contains information about the newly
 * created data objects.
 * @prop {module:Core~ObjectHash} rootHash - Hash of the root node.
 * @prop {object.<module:Core~ObjectHash, module:Core~DataObject>} objects - Hash of the root node.
 */

/**
 * @typedef {string} ObjectHash - Unique SHA-1 hash for the node object.
 * @example
 * '#5496cf226542fcceccf89056f0d27564abc88c99'
 */

/**
 * @typedef {string} GUID - Globally unique identifier. A formatted string containing hexadecimal characters. If some
 * projects share some GUIDs that can only be because the node with the given identification represents the same
 * concept.
 * @example
 * 'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045'
 */

/**
 * @typedef {object} Constraint - An object that represents some additional rule regarding some node of the project.
 * @prop {string} script - The script which checks if the constraint is met.
 * @prop {string} info - Short description of the constraint.
 * @prop {string} priority - Gives instructions on how to deal with violations of the constraint.
 */

/**
 * @typedef {object} RelationRule - An object that represents a relational type rule-set (pointer/set).
 * @prop {integer} [min] - The minimum amount of target necessary for the relationship (if not present or '-1'
 * then there is no minimum rule that applies)
 * @prop {integer} [max] - The minimum amount of target necessary for the relationship (if not present or '-1'
 * then there is no minimum rule that applies)
 * @prop {object} [absolutePathOfTarget] - special rules regarding the given type (if the object is empty, it still
 * represents that the type is a valid target of the relationship)
 * @prop {integer} [absolutePathOfTarget.min] - The minimum amount of target necessary for the relationship
 * from the given type (if not present or '-1' then there is no minimum rule that applies)
 * @prop {integer} [absolutePathOfTarget.max] - The minimum amount of target necessary for the relationship
 * from the given type (if not present or '-1' then there is no minimum rule that applies)
 * @example
 * '{
 *  'min': 1,
 *  'max': -1,
 *  'any/path/of/node':{
 *   'min':-1,
 *   'max':2
 *   },
 *   'any/other/valid/path':{
 *   }
 * }'
 */

/**
 * @typedef {object} MixinViolation - An object that has information about a mixin violation in the given node.
 * @prop {string} [severity] - The severity of the given error ('error','warning').
 * @prop {string} [type] - 'missing', 'attribute collision', 'set collision',
 * 'pointer collision', 'containment collision', 'aspect collision', 'constraint collision'
 * @prop {string|undefined} [ruleName] - The name of the affected rule definition  (if available).
 * @prop {string|undefined} [targetInfo] - The path of the target of the violation (if available).
 * @prop {module:Core~Node|undefined} [targetNode] - The target node of the violation (if available).
 * @prop {string[]} [collisionPaths] - The list of paths of colliding nodes (if any).
 * @prop {module:Core~Node[]} [collisionNodes] - The colliding mixin nodes (if any).
 * @prop {string} [message] - The description of the violation.
 * @prop {string} [hint] - Hint on how to resolve the issue.
 * @example
 * '{
 * 'severity': 'error',
 * 'type': 'missing',
 * 'targetInfo': '/E/b',
 * 'message': '[MyObject]: mixin node "E/b" is missing from the Meta',
 * 'hint': 'Remove mixin or add to the Meta'
 * }'
 * @example
 * '{
 * 'severity': 'warning',
 * 'type': 'attribute collision',
 * 'ruleName': 'value',
 * 'collisionPaths': ['/E/a','/E/Z'],
 * 'collisionNodes': [Object,Object],
 * 'message':'[MyObject]: inherits attribute definition "value" from [TypeA] and [TypeB]',
 * 'hint': 'Remove one of the mixin relations'
 * }'
 */

define([
    'common/core/corerel',
    'common/core/setcore',
    'common/core/guidcore',
    'common/core/nullpointercore',
    'common/core/coreunwrap',
    'common/core/coretype',
    'common/core/constraintcore',
    'common/core/coretree',
    'common/core/metacore',
    'common/core/coretreeloader',
    'common/core/corediff',
    'common/core/metacachecore',
    'common/core/mixincore',
    'common/core/metaquerycore',
    'common/regexp',
    'common/core/librarycore',
    'common/core/CoreIllegalArgumentError',
    'common/core/CoreIllegalOperationError',
    'common/core/constants'
], function (CoreRel,
             Set,
             Guid,
             NullPtr,
             UnWrap,
             Type,
             Constraint,
             CoreTree,
             MetaCore,
             TreeLoader,
             CoreDiff,
             MetaCacheCore,
             MixinCore,
             MetaQueryCore,
             REGEXP,
             LibraryCore,
             CoreIllegalArgumentError,
             CoreIllegalOperationError,
             CONSTANTS) {
    'use strict';

    var isValidNode,
        isValidPath;

    function ensureType(input, nameOfInput, type, isAsync) {
        var error;
        if (typeof input !== type) {
            error = new CoreIllegalArgumentError('Parameter \'' + nameOfInput + '\' is not of type ' + type + '.');
            if (isAsync) {
                return error;
            } else {
                throw error;
            }
        }
    }

    function ensureValue(input, nameOfInput, isAsync) {
        var error;
        if (input === undefined) {
            error = new CoreIllegalArgumentError('Parameter \'' + nameOfInput + '\' cannot be undefined.');
            if (isAsync) {
                return error;
            } else {
                throw error;
            }
        }
    }

    function ensureInstanceOf(input, nameOfInput, type, isAsync) {
        var error;
        if (input instanceof type === false) {
            error = new CoreIllegalArgumentError('Parameter \'' + nameOfInput + '\' is not of type ' + type + '.');
            if (isAsync) {
                return error;
            } else {
                throw error;
            }
        }
    }

    function ensurePath(input, nameOfInput, isAsync) {
        var error;
        if (isValidPath(input) === false) {
            error = new CoreIllegalArgumentError('Parameter \'' + nameOfInput + '\' is not a valid path.');
            if (isAsync) {
                return error;
            } else {
                throw error;
            }
        }
    }

    function ensureNode(input, nameOfInput, isAsync) {
        var error;
        if (isValidNode(input) === false) {
            error = new CoreIllegalArgumentError('Parameter \'' + nameOfInput + '\' is not a valid node.');
            if (isAsync) {
                return error;
            } else {
                throw error;
            }
        }
    }

    function ensureHash(input, nameOfInput, isAsync) {
        var error;
        if (REGEXP.DB_HASH.test(input) === false) {
            error = new CoreIllegalArgumentError('Parameter \'' + nameOfInput + '\' is not a valid hash.');
            if (isAsync) {
                return error;
            } else {
                throw error;
            }
        }
    }

    function ensureGuid(input, nameOfInput, isAsync) {
        var error;
        if (REGEXP.GUID.test(input) === false) {
            error = new CoreIllegalArgumentError('Parameter \'' + nameOfInput + '\' is not a valid GUID.');
            if (isAsync) {
                return error;
            } else {
                throw error;
            }
        }
    }

    function ensureMinMax(input, nameOfInput, isAsync) {
        var error;

        if (input === null || input === undefined) {
            return;
        }

        if (typeof input === 'number' && Number.isSafeInteger(input) && input >= -1) {
            return;
        }

        error = new CoreIllegalArgumentError('Parameter ' + nameOfInput + ' is not a safe integer from [-1,∞).');

        if (error) {
            if (isAsync) {
                return error;
            } else {
                throw error;
            }
        }
    }

    function ensureRelationName(input, nameOfInput, isAsync) {
        var error,
            reserved = [
                CONSTANTS.BASE_POINTER,
                CONSTANTS.OVERLAYS_PROPERTY,
                CONSTANTS.MEMBER_RELATION
            ];

        if (typeof input !== 'string') {
            error = new CoreIllegalArgumentError('Parameter ' + nameOfInput + ' is not of type string.');
        } else {
            if (input.indexOf('_') === 0 ||
                reserved.indexOf(input) !== -1) {
                error = new CoreIllegalArgumentError('Parameter ' + nameOfInput + ' cannot start with \'_\'' +
                    ', or be equal with any of the reserved ' + reserved + ' words.');
            }
        }

        if (error) {
            if (isAsync) {
                return error;
            } else {
                throw error;
            }
        }
    }

    /**
     * @param {object} storageObject
     * @param {object} options - contains logging information
     * @alias Core
     * @constructor
     */
    function Core(storage, options) {
        var core,
            coreLayers = [];
        coreLayers.push(CoreRel);
        coreLayers.push(NullPtr);
        coreLayers.push(Type);
        coreLayers.push(NullPtr);
        coreLayers.push(Set);
        coreLayers.push(Guid);
        coreLayers.push(Constraint);
        coreLayers.push(MetaCore);
        coreLayers.push(MetaCacheCore);
        coreLayers.push(MixinCore);
        coreLayers.push(MetaQueryCore);
        coreLayers.push(CoreDiff);

        coreLayers.push(TreeLoader);

        coreLayers.push(LibraryCore);

        // TODO check how we should handle the TASYNC error handling...
        // if (options.usertype !== 'tasync') {
        //     coreLayers.push(UnWrap);
        // }
        coreLayers.push(UnWrap);

        core = coreLayers.reduce(function (inner, Class) {
            return new Class(inner, options);
        }, new CoreTree(storage, options));

        isValidNode = core.isValidNode;
        isValidPath = core.isValidPath;

        /**
         * Returns the parent of the node.
         * @param {module:Core~Node} node - the node in question
         *
         * @return {module:Core~Node|null} Returns the parent of the node or NULL if it has no parent.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getParent = function (node) {
            ensureNode(node, 'node');

            return core.getParent(node);
        };

        /**
         * Returns the parent-relative identifier of the node.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {string|null} Returns the last segment of the node path.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getRelid = function (node) {
            ensureNode(node, 'node');

            return core.getRelid(node);
        };

        /**
         * Returns the root node of the containment tree that node is part of.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {module:Core~Node} Returns the root of the containment hierarchy (it can be the node itself).
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getRoot = function (node) {
            ensureNode(node, 'node');

            return core.getRoot(node);
        };

        /**
         * Returns the complete path of the node in the containment hierarchy.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {string} Returns a path string where each portion is a relative id and they are separated by '/'.
         * The path can be empty as well if the node in question is the  root itself, otherwise it should be a chain
         * of relative ids from the root of the containment hierarchy.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getPath = function (node) {
            ensureNode(node, 'node');

            return core.getPath(node);
        };

        /**
         * Retrieves the child of the input node at the given relative id. It is not an asynchronous load
         * and it automatically creates the child under the given relative id if no child was there beforehand.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} relativeId - the relative id which our child in question has.
         *
         * @return {module:Core~Node} Return an empty node if it was created as a result of the function or
         * return the already existing and loaded node if it found.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getChild = function (node, relativeId) {
            ensureNode(node, 'node');
            ensureType(relativeId, 'relativeId', 'string');

            return core.getChild(node, relativeId);
        };

        /**
         * Checks if the node in question has some actual data.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {bool} Returns true if the node is 'empty' meaning that it is not reserved by real data.
         * Returns false if the node is exists and have some meaningful value.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.isEmpty = function (node) {
            ensureNode(node, 'node');

            return core.isEmpty(node);
        };

        /**
         * Returns the calculated database id of the data of the node.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {module:Core~ObjectHash} Returns the so called Hash value of the data of the given node. If the string is empty,
         * then it means that the node was mutated but not yet saved to the database, so it do not have a hash
         * temporarily.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getHash = function (node) {
            ensureNode(node, 'node');

            return core.getHash(node);
        };

        /**
         * Persists the changes made in memory and computed the data blobs that needs to be saved into the database
         * to make the change and allow other users to see the new state of the project.
         * @param {module:Core~Node} node - some node element of the modified containment hierarchy (usually the root).
         *
         * @return {module:Core~GmePersisted} The function returns an object which collects all the changes
         * on data level and necessary to update the database on server side
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.persist = function (node) {
            ensureNode(node, 'node');

            return core.persist(node);
        };

        /**
         * Loads the data object with the given hash and makes it a root of a containment hierarchy.
         * @param {module:Core~ObjectHash} hash - the hash of the data object we like to load as root.
         * @param {function} [callback]
         * @param {Error|CoreIllegalArgumentError|CoreAssertError|null} callback.error - the result of the execution
         * @param {module:Core~Node} callback.node - the resulting root node
         *
         * @return {External~Promise} If no callback is given, the result will be provided in
         * a promiselike manner.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         */
        this.loadRoot = function (hash, callback) {
            var error = null;

            ensureType(callback, 'callback', 'function');
            error = ensureHash(hash, 'hash', true);

            if (error) {
                callback(error);
            } else {
                core.loadRoot(hash, callback);
            }
        };

        /**
         * Loads the child of the given parent pointed by the relative id. Behind the scenes, it means
         * that it actually loads the data pointed by a hash stored inside the parent under the given id
         * and wraps it in a node object which will be connected to the parent as a child in the containment
         * hierarchy. If there is no such relative id reserved, the call will return with null.
         * @param {module:Core~Node} parent - the container node in question.
         * @param {string} relativeId - the relative id of the child in question.
         * @param {function} [callback]
         * @param {Error|CoreIllegalArgumentError|CoreAssertError|null} callback.error - the result of the execution
         * @param {module:Core~Node} callback.node - the resulting child
         *
         * @return {External~Promise} If no callback is given, the result will be provided in a promise.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         */
        this.loadChild = function (node, relativeId, callback) {
            var error = null;

            ensureType(callback, 'callback', 'function');
            error = ensureNode(node, 'node', true);
            error = error || ensureType(relativeId, 'relativeId', 'string', true);

            if (error) {
                callback(error);
            } else {
                core.loadChild(node, relativeId, callback);
            }
        };

        /**
         * From the given starting node, it loads the path given as a series of relative ids (separated by '/')
         * and returns the node it finds at the ends of the path. If there is no node, the function will return null.
         * @param {module:Core~Node} node - the starting node of our search.
         * @param {string} relativePath - the relative path - built by relative ids - of the node in question.
         * @param {function} [callback]
         * @param {Error|CoreIllegalArgumentError|CoreAssertError|null} callback.error - the result of the execution
         * @param {module:Core~Node} callback.node - the resulting node
         *
         * @return {External~Promise} If no callback is given, the result will be provided in a promise.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         */
        this.loadByPath = function (node, relativePath, callback) {
            var error = null;

            ensureType(callback, 'callback', 'function');
            error = ensureNode(node, 'node', true);
            error = error || ensurePath(relativePath, 'relativePath', true);

            if (error) {
                callback(error);
            } else {
                core.loadByPath(node, relativePath, callback);
            }
        };

        /**
         * Loads all the children of the given parent. As it first checks the already reserved relative ids of
         * the parent, it only loads the already existing children (so no on-demand empty node creation).
         * @param {module:Core~Node} node - the container node in question.
         * @param {function} [callback]
         * @param {Error|CoreIllegalArgumentError|CoreAssertError|null} callback.error - the result of the execution
         * @param {module:Core~Node[]} callback.children - the resulting children
         *
         * @return {External~Promise} If no callback is given, the result will be provided in a promise.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         */
        this.loadChildren = function (node, callback) {
            var error = null;

            ensureType(callback, 'callback', 'function');
            error = ensureNode(node, 'node', true);

            if (error) {
                callback(error);
            } else {
                core.loadChildren(node, callback);
            }
        };

        /**
         * Loads all the children of the given parent that has some data and not just inherited. As it first checks
         * the already reserved relative ids of the parent, it only loads the already existing children
         * (so no on-demand empty node creation).
         * @param {module:Core~Node} node - the container node in question.
         * @param {function} [callback]
         * @param {Error|CoreIllegalArgumentError|CoreAssertError|null} callback.error - the result of the execution
         * @param {module:Core~Node[]} callback.node - the resulting children
         *
         * @return {External~Promise} If no callback is given, the result will be provided in a promise.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         */
        this.loadOwnChildren = function (node, callback) {
            var error = null;

            ensureType(callback, 'callback', 'function');
            error = ensureNode(node, 'node', true);

            if (error) {
                callback(error);
            } else {
                core.loadOwnChildren(node, callback);
            }
        };

        /**
         * Loads the target of the given pointer of the given node. In the callback the node can have three values:
         * if the node is valid, then it is the defined target of a valid pointer,
         * if the returned value is null, then it means that the pointer is defined, but has no real target,
         * finally if the returned value is undefined than there is no such pointer defined for the given node.
         * @param {module:Core~Node} node - the source node in question.
         * @param {string} pointerName - the name of the pointer.
         * @param {function} [callback]
         * @param {Error|CoreIllegalArgumentError|CoreAssertError|null} callback.error - the result of the execution
         * @param {module:Core~Node} callback.node - the resulting target
         *
         * @return {External~Promise} If no callback is given, the result will be provided in a promise.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         */
        this.loadPointer = function (node, pointerName, callback) {
            var error = null;

            ensureType(callback, 'callback', 'function');
            error = ensureNode(node, 'node', true);
            error = error || ensureType(pointerName, 'pointerName', 'string', true);

            if (error) {
                callback(error);
            } else {
                core.loadPointer(node, pointerName, callback);
            }

        };

        /**
         * Loads all the source nodes that has such a pointer and its target is the given node.
         * @param {module:Core~Node} node - the target node in question.
         * @param {string} pointerName - the name of the pointer of the sources.
         * @param {function} [callback]
         * @param {Error|CoreIllegalArgumentError|CoreAssertError|null} callback.error - the result of the execution
         * @param {module:Core~Node[]} callback.node - the resulting sources
         *
         * @return {External~Promise} If no callback is given, the result will be provided in a promise.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         */
        this.loadCollection = function (node, pointerName, callback) {
            var error = null;

            ensureType(callback, 'callback', 'function');
            error = ensureNode(node, 'node', true);
            error = error || ensureType(pointerName, 'pointerName', 'string', true);

            if (error) {
                callback(error);
            } else {
                core.loadCollection(node, pointerName, callback);
            }
        };

        /**
         * Loads a complete sub-tree of the containment hierarchy starting from the given node.
         * @param {module:Core~Node} node - the node that is the root of the sub-tree in question.
         * @param {function} [callback]
         * @param {Error|CoreIllegalArgumentError|CoreAssertError|null} callback.error - the result of the execution
         * @param {module:Core~Node[]} callback.node - the resulting sources
         *
         * @return {External~Promise} If no callback is given, the result will be provided in a promise.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         */
        this.loadSubTree = function (node, callback) {
            var error = null;

            ensureType(callback, 'callback', 'function');
            error = ensureNode(node, 'node', true);

            if (error) {
                callback(error);
            } else {
                core.loadSubTree(node, callback);
            }
        };

        /**
         * Loads a complete sub-tree of the containment hierarchy starting from the given node, but load only those
         * children that has some additional data and not purely inherited.
         * @param {module:Core~Node} node - the container node in question.
         * @param {function} [callback]
         * @param {Error|CoreIllegalArgumentError|CoreAssertError|null} callback.error - the result of the execution
         * @param {module:Core~Node[]} callback.node - the resulting sources
         *
         * @return {External~Promise} If no callback is given, the result will be provided in a promise.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         */
        this.loadOwnSubTree = function (node, callback) {
            var error = null;

            ensureType(callback, 'callback', 'function');
            error = ensureNode(node, 'node', true);

            if (error) {
                callback(error);
            } else {
                core.loadOwnSubTree(node, callback);
            }
        };

        /**
         * Loads a complete containment hierarchy using the data object - pointed by the given hash -
         * as the root.
         * @param {module:Core~ObjectHash} hash - hash of the root node.
         * @param {function} [callback]
         * @param {Error|CoreIllegalArgumentError|CoreAssertError|null} callback.error - the result of the execution.
         * @param {module:Core~Node[]} callback.nodes - the resulting nodes.
         *
         * @return {External~Promise} If no callback is given, the result will be provided in a promise.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         */
        this.loadTree = function (hash, callback) {
            var error = null;

            ensureType(callback, 'callback', 'function');
            error = ensureHash(hash, 'hash', true);

            if (error) {
                callback(error);
            } else {
                core.loadTree(hash, callback);
            }
        };

        /**
         * Collects the relative ids of all the children of the given node.
         * @param {module:Core~Node} node - the container node in question.
         *
         * @return {string[]} The function returns an array of the relative ids.
         */
        this.getChildrenRelids = function (node) {
            ensureNode(node, 'node');

            return core.getChildrenRelids(node);
        };

        /**
         * Collects the relative ids of all the children of the given node that has some data and not just inherited.
         * N.B. Do not mutate the returned array!
         * @param {module:Core~Node} node - the container node in question.
         *
         * @return {string[]} The function returns an array of the relative ids.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getOwnChildrenRelids = function (node) {
            ensureNode(node, 'node');

            return core.getOwnChildrenRelids(node);
        };

        /**
         * Collects the paths of all the children of the given node.
         * @param {module:Core~Node} node - the container node in question.
         *
         *@return {string[]} The function returns an array of the absolute paths of the children.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getChildrenPaths = function (node) {
            ensureNode(node, 'node');

            return core.getChildrenPaths(node);
        };

        /**
         * Collects the paths of all the children of the given node that has some data as well and not just inherited.
         * @param {module:Core~Node} parent - the container node in question.
         *
         *@return {string[]} The function returns an array of the absolute paths of the children.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getOwnChildrenPaths = function (node) {
            ensureNode(node, 'node');

            return core.getOwnChildrenPaths(node);
        };

        /**
         * Creates a node according to the given parameters.
         * @param {object} parameters - the details of the creation.
         * @param {module:Core~Node | null} [parameters.parent] - the parent of the node to be created.
         * @param {module:Core~Node | null} [parameters.base] - the base of the node to be created.
         * @param {string} [parameters.relid] - the relative id of the node to be created (if reserved, the function
         * returns the node behind the relative id)
         * @param {module:Core~GUID} [parameters.guid] - the GUID of the node to be created
         *
         *
         * @return {module:Core~Node} The function returns the created node or null if no node was created
         * or an error if the creation with the given parameters are not allowed.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.createNode = function (parameters) {
            if (parameters) {
                ensureType(parameters, 'parameters', 'object');
                if (parameters.hasOwnProperty('parent') &&
                    parameters.parent !== null && parameters.parent !== undefined) {
                    ensureNode(parameters.parent, 'parameters.parent');
                }
                if (parameters.hasOwnProperty('base') &&
                    parameters.base !== null && parameters.base !== undefined) {
                    ensureNode(parameters.base, 'parameters.base');
                }
                if (parameters.hasOwnProperty('guid') && parameters.guid !== undefined) {
                    ensureGuid(parameters.guid, 'parameters.guid');
                }
            }
            return core.createNode(parameters);
        };

        /**
         * Removes a node from the containment hierarchy.
         * @param {module:Core~Node} node - the node to be removed.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.deleteNode = function (node) {
            ensureNode(node, 'node');
            if (core.getParent(node) === null) {
                throw new CoreIllegalOperationError('Not allowed to delete node without a parent.');
            }

            return core.deleteNode(node, false);
        };

        /**
         * Copies the given node into parent.
         * @param {module:Core~Node} node - the node to be copied.
         * @param {module:Core~Node} parent - the parent node of the copy.
         *
         * @return {module:Core~Node} The function returns the copied node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.copyNode = function (node, parent) {
            ensureNode(node, 'node');
            ensureNode(parent, 'parent');

            return core.copyNode(node, parent);
        };

        /**
         * Copies the given nodes into parent.
         * @param {module:Core~Node[]} nodes - the nodes to be copied.
         * @param {module:Core~Node} parent - the parent node of the copy.
         *
         * @return {module:Core~Node[]} The function returns an array of the copied nodes.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.copyNodes = function (nodes, parent) {
            var i;
            ensureInstanceOf(nodes, 'nodes', Array);
            for (i = 0; i < nodes.length; i += 1) {
                ensureNode(nodes[i], 'nodes[' + i + ']');
            }
            ensureNode(parent, 'parent');

            return core.copyNodes(nodes, parent);
        };

        /**
         * Checks if parent can be the new parent of node.
         * @param {module:Core~Node} node - the node in question.
         * @param {module:Core~Node} parent - the new parent.
         *
         * @return {boolean} True if the supplied parent is a valid parent for the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.isValidNewParent = function (node, parent) {
            ensureNode(node, 'node');
            ensureNode(parent, 'parent');

            return core.isValidNewParent(node, parent);
        };

        /**
         * Moves the given node under the given parent.
         * @param {module:Core~Node} node - the node to be moved.
         * @param {module:Core~Node} parent - the parent node of the copy.
         *
         * @return {module:Core~Node} The function returns the node after the move.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.moveNode = function (node, parent) {
            ensureNode(node, 'node');
            ensureNode(parent, 'parent');

            return core.moveNode(node, parent);
        };

        /**
         * Returns the names of the defined attributes of the node.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {string[]} The function returns an array of the names of the attributes of the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getAttributeNames = function (node) {
            ensureNode(node, 'node');

            return core.getAttributeNames(node);
        };

        /**
         * Retrieves the value of the given attribute of the given node.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the attribute.
         *
         * @return {object | primitive | null | undefined} The function returns the value of the attribute of the node.
         * The value can be an object or any primitive type. If the value is undefined that means the node do not have
         * such attribute defined. [The retrieved attribute should not be modified as is - it should be copied first!!]
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getAttribute = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');

            return core.getAttribute(node, name);
        };

        /**
         * Sets the value of the given attribute of the given node. It defines the attribute on demand, means that it
         * will set the given attribute even if was ot defined for the node beforehand.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the attribute.
         * @param {object | primitive | null} value - the new of the attribute. Can be any primitive type or object.
         * Undefined is not allowed.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.setAttribute = function (node, name, value) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');
            ensureValue(value, 'value');

            return core.setAttribute(node, name, value);
        };

        /**
         * Removes the given attributes from the given node.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the attribute.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.delAttribute = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');

            return core.delAttribute(node, name);
        };

        /**
         * Returns the names of the defined registry entries of the node.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {string[]} The function returns an array of the names of the registry entries of the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getRegistryNames = function (node) {
            ensureNode(node, 'node');

            return core.getRegistryNames(node);
        };

        /**
         * Retrieves the value of the given registry entry of the given node.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the registry entry.
         *
         * @return {object | primitive | null | undefined} The function returns the value of the registry entry
         * of the node. The value can be an object or any primitive type. If the value is undefined that means
         * the node do not have such attribute defined. [The retrieved registry value should
         * not be modified as is - it should be copied first!!]
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getRegistry = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');

            return core.getRegistry(node, name);
        };

        /**
         * Sets the value of the given registry entry of the given node. It defines the registry entry on demand,
         * means that it will set the given registry entry even if was ot defined for the node beforehand.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the registry entry.
         * @param {object | primitive | null} value - the new of the registry entry. Can be any primitive
         * type or object. Undefined is not allowed.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.setRegistry = function (node, name, value) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');
            ensureValue(value, 'value');

            return core.setRegistry(node, name, value);
        };

        /**
         * Removes the given registry entry from the given node.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the registry entry.
         *
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.delRegistry = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');

            return core.delRegistry(node, name);
        };

        /**
         * Retrieves a list of the defined pointer names of the node.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {string[]} The function returns an array of the names of the pointers of the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getPointerNames = function (node) {
            ensureNode(node, 'node');

            return core.getPointerNames(node);
        };

        /**
         * Retrieves the path of the target of the given pointer of the given node.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the pointer in question.
         *
         * @return {string | null | undefined} The function returns the absolute path of the target node
         * if there is a valid target. It returns null if though the pointer is defined it does not have any
         * valid target. Finally, it return undefined if there is no pointer defined for the node under the given name.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getPointerPath = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');

            return core.getPointerPath(node, name);
        };

        /**
         * Removes the pointer from the node.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the pointer in question.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.deletePointer = this.delPointer = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');

            return core.deletePointer(node, name);
        };

        /**
         * Sets the target of the pointer of the node.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the pointer in question.
         * @param {module:Core~Node|null} target - the new target of the pointer.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.setPointer = function (node, name, target) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');
            if (target !== null) {
                ensureNode(target, 'target');
            }

            return core.setPointer(node, name, target);
        };

        /**
         * Retrieves a list of the defined pointer names that has the node as target.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {string[]} The function returns an array of the names of the pointers pointing to the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getCollectionNames = function (node) {
            ensureNode(node, 'node');

            return core.getCollectionNames(node);
        };

        /**
         * Retrieves a list of absolute paths of nodes that has a given pointer which points to the given node.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the pointer.
         *
         * @return {string[]} The function returns an array of absolute paths of nodes that
         * has the pointer pointing to the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getCollectionPaths = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');

            return core.getCollectionPaths(node, name);
        };

        /**
         * Collects the data hash values of the children of the node.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {Object<string, module:Core~ObjectHash>} The function returns a dictionary of {@link module:Core~ObjectHash} that stored in pair
         * with the relative id of the corresponding child of the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getChildrenHashes = function (node) {
            ensureNode(node, 'node');

            return core.getChildrenHashes(node);
        };

        /**
         * Returns the base node.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {module:Core~Node | null} Returns the base of the given node or null if there is no such node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getBase = function (node) {
            ensureNode(node, 'node');

            return core.getBase(node);
        };

        /**
         * Returns the root of the inheritance chain of the given node.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {module:Core~Node} Returns the root of the inheritance chain (usually the FCO).
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getBaseRoot = function (node) {
            ensureNode(node, 'node');

            return core.getBaseRoot(node);
        };

        /**
         * Returns the names of the attributes of the node that have been first defined for the node and not for its
         * bases.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {string[]} The function returns an array of the names of the own attributes of the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getOwnAttributeNames = function (node) {
            ensureNode(node, 'node');

            return core.getOwnAttributeNames(node);
        };

        /**
         * Returns the names of the registry enrties of the node that have been first defined for the node
         * and not for its bases.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {string[]} The function returns an array of the names of the own registry entries of the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getOwnRegistryNames = function (node) {
            ensureNode(node, 'node');

            return core.getOwnRegistryNames(node);
        };

        /**
         * Returns the value of the attribute defined for the given node.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the attribute.
         *
         * @return {object | primitive | null | undefined} Returns the value of the attribute defined specifically for
         * the node. If undefined then it means that there is no such attribute defined directly for the node, meaning
         * that it either inherits some value or there is no such attribute at all.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getOwnAttribute = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');

            return core.getOwnAttribute(node, name);
        };

        /**
         * Returns the value of the registry entry defined for the given node.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the registry entry.
         *
         * @return {object | primitive | null | undefined} Returns the value of the registry entry defined specifically
         * for the node. If undefined then it means that there is no such registry entry defined directly for the node,
         * meaning that it either inherits some value or there is no such registry entry at all.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getOwnRegistry = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');

            return core.getOwnRegistry(node, name);
        };

        /**
         * Returns the list of the names of the pointers that were defined specifically for the node.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {string[]} Returns an array of names of pointers defined specifically for the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getOwnPointerNames = function (node) {
            ensureNode(node, 'node');

            return core.getOwnPointerNames(node);
        };

        /**
         * Returns the absolute path of the target of the pointer specifically defined for the node.
         * @param {module:Core~Node} node - the node in question
         * @param {string} name - the name of the pointer
         *
         * @return {string | null | undefined} Returns the absolute path. If the path is null, then it means that
         * 'no-target' was defined specifically for this node for the pointer. If undefined it means that the node
         * either inherits the target of the pointer or there is no pointer defined at all.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getOwnPointerPath = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');

            return core.getOwnPointerPath(node, name);
        };

        /**
         * Checks if base can be the new base of node.
         * @param {module:Core~Node} node - the node in question.
         * @param {module:Core~Node | null | undefined} base - the new base.
         *
         * @return {boolean} True if the supplied base is a valid base for the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.isValidNewBase = function (node, base) {
            ensureNode(node, 'node');
            if (base !== null) {
                ensureNode(base, 'base');
            }

            return core.isValidNewBase(node, base);
        };

        /**
         * Sets the base node of the given node. The function doesn't touches the properties or the children of the node
         * so it can cause META rule violations that needs to be corrected manually.
         * @param {module:Core~Node} node - the node in question.
         * @param {module:Core~Node | null} base - the new base.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.setBase = function (node, base) {
            ensureNode(node, 'node');
            if (base !== null) {
                ensureNode(base, 'base');
            }

            return core.setBase(node, base);
        };

        /**
         * Returns the root of the inheritance chain (cannot be the node itself).
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {module:Core~Node | null} Returns the root of the inheritance chain of the node. If returns null,
         * that means the node in question is the root of the chain.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getTypeRoot = function (node) {
            ensureNode(node, 'node');

            return core.getTypeRoot(node);
        };

        /**
         * Returns the names of the sets of the node.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {string[]} Returns an array of set names that the node has.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getSetNames = function (node) {
            ensureNode(node, 'node');

            return core.getSetNames(node);
        };

        /**
         * Returns the names of the sets created specifically at the node.
         * N.B. When adding a member to a set of a node, the set is automatically created at the node.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {string[]} Returns an array of set names that were specifically created at the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getOwnSetNames = function (node) {
            ensureNode(node, 'node');

            return core.getOwnSetNames(node);
        };

        /**
         * Creates a set for the node.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} name - the name of the set.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.createSet = function (node, name) {
            ensureNode(node, 'node');
            ensureRelationName(name, 'name');

            return core.createSet(node, name);
        };

        /**
         * Removes a set from the node.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} name - the name of the set.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.deleteSet = this.delSet = function (node, name) {
            ensureNode(node, 'node');
            ensureRelationName(name, 'name');

            return core.deleteSet(node, name);
        };

        /**
         * Return the names of the attribute entries for the set.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} name - the name of the set.
         *
         * @return {string[]} Returns the array of names of attribute entries in the set.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getSetAttributeNames = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');
            var names = core.getSetNames(node);
            if (names.indexOf(name) === -1) {
                throw new CoreIllegalOperationError('Cannot access attributes of unknown set.');
            }

            return core.getSetAttributeNames(node, name);
        };

        /**
         * Return the names of the attribute entries specifically set for the set at the node.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} name - the name of the set.
         *
         * @return {string[]} Returns the array of names of attribute entries defined in the set at the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getOwnSetAttributeNames = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');
            var names = core.getSetNames(node);
            if (names.indexOf(name) === -1) {
                throw new CoreIllegalOperationError('Cannot access attributes of unknown set.');
            }

            return core.getOwnSetAttributeNames(node, name);
        };

        /**
         * Get the value of the attribute entry in the set.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} setName - the name of the set.
         * @param {string} attrName - the name of the attribute entry.
         *
         * @return {object|primitive|null|undefined} Return the value of the attribute. If it is undefined, than there
         * is no such attribute at the set.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getSetAttribute = function (node, setName, attrName) {
            ensureNode(node, 'node');
            ensureType(setName, 'setName', 'string');
            ensureType(attrName, 'attrName', 'string');
            var names = core.getSetNames(node);
            if (names.indexOf(setName) === -1) {
                throw new CoreIllegalOperationError('Cannot access attributes of unknown set.');
            }

            return core.getSetAttribute(node, setName, attrName);
        };

        /**
         * Get the value of the attribute entry specifically set for the set at the node.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} setName - the name of the set.
         * @param {string} attrName - the name of the attribute entry.
         *
         * @return {object|primitive|null|undefined} Return the value of the attribute. If it is undefined, than there
         * is no such attribute at the set.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getOwnSetAttribute = function (node, setName, attrName) {
            ensureNode(node, 'node');
            ensureType(setName, 'setName', 'string');
            ensureType(attrName, 'attrName', 'string');
            var names = core.getSetNames(node);
            if (names.indexOf(setName) === -1) {
                throw new CoreIllegalOperationError('Cannot access attributes of unknown set.');
            }

            return core.getOwnSetAttribute(node, setName, attrName);
        };

        /**
         * Sets the attribute entry value for the set at the node.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} setName - the name of the set.
         * @param {string} attrName - the name of the attribute entry.
         * @param {object|primitive|null} value - the new value of the attribute.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.setSetAttribute = function (node, setName, attrName, value) {
            ensureNode(node, 'node');
            ensureType(setName, 'setName', 'string');
            ensureType(attrName, 'attrName', 'string');
            ensureValue(value, 'value');
            var names = core.getSetNames(node);
            if (names.indexOf(setName) === -1) {
                throw new CoreIllegalOperationError('Cannot access attributes of unknown set.');
            }

            return core.setSetAttribute(node, setName, attrName, value);
        };

        /**
         * Removes the attribute entry for the set at the node.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} setName - the name of the set.
         * @param {string} attrName - the name of the attribute entry.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.delSetAttribute = function (node, setName, attrName) {
            ensureNode(node, 'node');
            ensureType(setName, 'setName', 'string');
            ensureType(attrName, 'attrName', 'string');
            var names = core.getSetNames(node);
            if (names.indexOf(setName) === -1) {
                throw new CoreIllegalOperationError('Cannot access attributes of unknown set.');
            }

            return core.delSetAttribute(node, setName, attrName);
        };

        //Regs

        /**
         * Return the names of the registry entries for the set.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} name - the name of the set.
         *
         * @return {string[]} Returns the array of names of registry entries in the set.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getSetRegistryNames = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');
            var names = core.getSetNames(node);
            if (names.indexOf(name) === -1) {
                throw new CoreIllegalOperationError('Cannot access attributes of unknown set.');
            }

            return core.getSetRegistryNames(node, name);
        };

        /**
         * Return the names of the registry entries specifically set for the set at the node.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} name - the name of the set.
         *
         * @return {string[]} Returns the array of names of registry entries defined in the set at the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getOwnSetRegistryNames = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');
            var names = core.getSetNames(node);
            if (names.indexOf(name) === -1) {
                throw new CoreIllegalOperationError('Cannot access attributes of unknown set.');
            }

            return core.getOwnSetRegistryNames(node, name);
        };

        /**
         * Get the value of the registry entry in the set.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} setName - the name of the set.
         * @param {string} regName - the name of the registry entry.
         *
         * @return {object|primitive|null|undefined} Return the value of the registry. If it is undefined, than there
         * is no such registry at the set.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getSetRegistry = function (node, setName, regName) {
            ensureNode(node, 'node');
            ensureType(setName, 'setName', 'string');
            ensureType(regName, 'regName', 'string');
            var names = core.getSetNames(node);
            if (names.indexOf(setName) === -1) {
                throw new CoreIllegalOperationError('Cannot access attributes of unknown set.');
            }

            return core.getSetRegistry(node, setName, regName);
        };

        /**
         * Get the value of the registry entry specifically set for the set at the node.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} setName - the name of the set.
         * @param {string} regName - the name of the registry entry.
         *
         * @return {object|primitive|null|undefined} Return the value of the registry. If it is undefined, than there
         * is no such registry at the set.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getOwnSetRegistry = function (node, setName, regName) {
            ensureNode(node, 'node');
            ensureType(setName, 'setName', 'string');
            ensureType(regName, 'regName', 'string');
            var names = core.getSetNames(node);
            if (names.indexOf(setName) === -1) {
                throw new CoreIllegalOperationError('Cannot access attributes of unknown set.');
            }

            return core.getOwnSetRegistry(node, setName, regName);
        };

        /**
         * Sets the registry entry value for the set at the node.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} setName - the name of the set.
         * @param {string} regName - the name of the registry entry.
         * @param {object|primitive|null} value - the new value of the registry.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.setSetRegistry = function (node, setName, regName, value) {
            ensureNode(node, 'node');
            ensureType(setName, 'setName', 'string');
            ensureType(regName, 'regName', 'string');
            ensureValue(value, 'value');
            var names = core.getSetNames(node);
            if (names.indexOf(setName) === -1) {
                throw new CoreIllegalOperationError('Cannot access attributes of unknown set.');
            }

            return core.setSetRegistry(node, setName, regName, value);
        };

        /**
         * Removes the registry entry for the set at the node.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} setName - the name of the set.
         * @param {string} regName - the name of the registry entry.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.delSetRegistry = function (node, setName, regName) {
            ensureNode(node, 'node');
            ensureType(setName, 'setName', 'string');
            ensureType(regName, 'regName', 'string');
            var names = core.getSetNames(node);
            if (names.indexOf(setName) === -1) {
                throw new CoreIllegalOperationError('Cannot access attributes of unknown set.');
            }

            return core.delSetRegistry(node, setName, regName);
        };

        /**
         * Returns the list of absolute paths of the members of the given set of the given node.
         * @param {module:Core~Node} node - the set owner.
         * @param {string} name - the name of the set.
         *
         * @return {string[]} Returns an array of absolute path strings of the member nodes of the set.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getMemberPaths = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');
            var names = core.getSetNames(node).concat(core.getValidSetNames(node));
            if (names.indexOf(name) === -1) {
                throw new CoreIllegalOperationError('Cannot access member information of unknown set.');
            }

            return core.getMemberPaths(node, name);
        };

        /**
         * Returns the list of absolute paths of the members of the given set of the given node that not simply
         * inherited.
         * @param {module:Core~Node} node - the set owner.
         * @param {string} name - the name of the set.
         *
         * @return {string[]} Returns an array of absolute path strings of the member nodes of the set that has
         * information on the node's inheritance level.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getOwnMemberPaths = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');
            var names = core.getSetNames(node).concat(core.getValidSetNames(node));;
            if (names.indexOf(name) === -1) {
                throw new CoreIllegalOperationError('Cannot access member information of unknown set.');
            }

            return core.getOwnMemberPaths(node, name);
        };

        /**
         * Removes a member from the set. The functions doesn't remove the node itself.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} name - the name of the set.
         * @param {string} path - the absolute path of the member to be removed.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.delMember = function (node, name, path) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');
            ensurePath(path, 'path');
            var names = core.getSetNames(node);
            if (names.indexOf(name) === -1) {
                throw new CoreIllegalOperationError('Cannot access member information of unknown set.');
            }

            return core.delMember(node, name, path);
        };

        /**
         * Adds a member to the given set.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} name - the name of the set.
         * @param {module:Core~Node} member - the new member of the set.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.addMember = function (node, name, member) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');
            ensureNode(member, 'member');
            return core.addMember(node, name, member);
        };

        /**
         * Return the names of the attributes defined for the set membership to the member node.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} name - the name of the set.
         * @param {string} path - the absolute path of the member.
         *
         * @return {string[]} Returns the array of names of attributes that represents some property of the membership.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getMemberAttributeNames = function (node, name, path) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');
            ensurePath(path, 'path');
            var names = core.getSetNames(node);
            if (names.indexOf(name) === -1) {
                throw new CoreIllegalOperationError('Cannot access member information of unknown set.');
            }
            var paths = core.getMemberPaths(node, name);
            if (paths.indexOf(path) === -1) {
                throw new CoreIllegalOperationError('Cannot access attributes of an unknown member.');
            }

            return core.getMemberAttributeNames(node, name, path);
        };

        /**
         * Return the names of the attributes defined for the set membership specifically defined to the member node.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} name - the name of the set.
         * @param {string} path - the absolute path of the member.
         *
         * @return {string[]} Returns the array of names of attributes that represents some property of the membership.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getMemberOwnAttributeNames = function (node, name, path) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');
            ensurePath(path, 'path');
            var names = core.getSetNames(node);
            if (names.indexOf(name) === -1) {
                throw new CoreIllegalOperationError('Cannot access member information of unknown set.');
            }
            var paths = core.getMemberPaths(node, name);
            if (paths.indexOf(path) === -1) {
                throw new CoreIllegalOperationError('Cannot access attributes of an unknown member.');
            }

            return core.getMemberOwnAttributeNames(node, name, path);
        };

        /**
         * Get the value of the attribute in relation with the set membership.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} setName - the name of the set.
         * @param {string} path - the absolute path of the member node.
         * @param {string} attrName - the name of the attribute.
         *
         * @return {object|primitive|null|undefined} Return the value of the attribute. If it is undefined, than there
         * is no such attributed connected to the given set membership.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getMemberAttribute = function (node, setName, path, attrName) {
            ensureNode(node, 'node');
            ensureType(setName, 'setName', 'string');
            ensurePath(path, 'path');
            ensureType(attrName, 'attrName', 'string');
            var names = core.getSetNames(node);
            if (names.indexOf(setName) === -1) {
                throw new CoreIllegalOperationError('Cannot access member information of unknown set.');
            }
            var paths = core.getMemberPaths(node, setName);
            if (paths.indexOf(path) === -1) {
                throw new CoreIllegalOperationError('Cannot access attributes of an unknown member.');
            }

            return core.getMemberAttribute(node, setName, path, attrName);
        };

        /**
         * Get the value of the attribute for the set membership specifically defined to the member node.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} setName - the name of the set.
         * @param {string} path - the absolute path of the member node.
         * @param {string} attrName - the name of the attribute.
         *
         * @return {object|primitive|null|undefined} Return the value of the attribute. If it is undefined, than there
         * is no such attributed connected to the given set membership.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getMemberOwnAttribute = function (node, setName, path, attrName) {
            ensureNode(node, 'node');
            ensureType(setName, 'setName', 'string');
            ensurePath(path, 'path');
            ensureType(attrName, 'attrName', 'string');
            var names = core.getSetNames(node);
            if (names.indexOf(setName) === -1) {
                throw new CoreIllegalOperationError('Cannot access member information of unknown set.');
            }
            var paths = core.getMemberPaths(node, setName);
            if (paths.indexOf(path) === -1) {
                throw new CoreIllegalOperationError('Cannot access attributes of an unknown member.');
            }

            return core.getMemberOwnAttribute(node, setName, path, attrName);
        };

        /**
         * Sets the attribute value which represents a property of the membership.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} setName - the name of the set.
         * @param {string} path - the absolute path of the member node.
         * @param {string} attrName - the name of the attribute.
         * @param {object|primitive|null} value - the new value of the attribute.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.setMemberAttribute = function (node, setName, path, attrName, value) {
            ensureNode(node, 'node');
            ensureType(setName, 'setName', 'string');
            ensurePath(path, 'path');
            ensureType(attrName, 'attrName', 'string');
            ensureValue(value, 'value');
            var names = core.getSetNames(node);
            if (names.indexOf(setName) === -1) {
                throw new CoreIllegalOperationError('Cannot access member information of unknown set.');
            }
            var paths = core.getMemberPaths(node, setName);
            if (paths.indexOf(path) === -1) {
                throw new CoreIllegalOperationError('Cannot access attributes of an unknown member.');
            }

            return core.setMemberAttribute(node, setName, path, attrName, value);
        };

        /**
         * Removes an attribute which represented a property of the given set membership.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} setName - the name of the set.
         * @param {string} memberPath - the absolute path of the member node.
         * @param {string} attrName - the name of the attribute.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.delMemberAttribute = function (node, setName, path, attrName) {
            ensureNode(node, 'node');
            ensureType(setName, 'setName', 'string');
            ensurePath(path, 'path');
            ensureType(attrName, 'attrName', 'string');
            var names = core.getSetNames(node);
            if (names.indexOf(setName) === -1) {
                throw new CoreIllegalOperationError('Cannot access member information of unknown set.');
            }
            var paths = core.getMemberPaths(node, setName);
            if (paths.indexOf(path) === -1) {
                throw new CoreIllegalOperationError('Cannot access attributes of an unknown member.');
            }

            return core.delMemberAttribute(node, setName, path, attrName);
        };

        /**
         * Return the names of the registry entries defined for the set membership to the member node.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} name - the name of the set.
         * @param {string} path - the absolute path of the member.
         *
         * @return {string[]} Returns the array of names of registry entries that represents some property of the
         * membership.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getMemberRegistryNames = function (node, name, path) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');
            ensurePath(path, 'path');
            var names = core.getSetNames(node);
            if (names.indexOf(name) === -1) {
                throw new CoreIllegalOperationError('Cannot access member information of unknown set.');
            }
            var paths = core.getMemberPaths(node, name);
            if (paths.indexOf(path) === -1) {
                throw new CoreIllegalOperationError('Cannot access registry of an unknown member.');
            }

            return core.getMemberRegistryNames(node, name, path);
        };

        /**
         * Return the names of the registry entries defined for the set membership specifically defined to
         * the member node.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} name - the name of the set.
         * @param {string} path - the absolute path of the member.
         *
         * @return {string[]} Returns the array of names of registry entries that represents some property of the
         * membership.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getMemberOwnRegistryNames = function (node, name, path) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');
            ensurePath(path, 'path');
            var names = core.getSetNames(node);
            if (names.indexOf(name) === -1) {
                throw new CoreIllegalOperationError('Cannot access member information of unknown set.');
            }
            var paths = core.getMemberPaths(node, name);
            if (paths.indexOf(path) === -1) {
                throw new CoreIllegalOperationError('Cannot access registry of an unknown member.');
            }

            return core.getMemberOwnRegistryNames(node, name, path);
        };

        /**
         * Get the value of the registry entry in relation with the set membership.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} setName - the name of the set.
         * @param {string} path - the absolute path of the member node.
         * @param {string} regName - the name of the registry entry.
         *
         * @return {object|primitive|null|undefined} Return the value of the registry. If it is undefined, than there
         * is no such registry connected to the given set membership.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getMemberRegistry = function (node, setName, path, regName) {
            ensureNode(node, 'node');
            ensureType(setName, 'setName', 'string');
            ensurePath(path, 'path');
            ensureType(regName, 'regName', 'string');
            var names = core.getSetNames(node);
            if (names.indexOf(setName) === -1) {
                throw new CoreIllegalOperationError('Cannot access member information of unknown set.');
            }
            var paths = core.getMemberPaths(node, setName);
            if (paths.indexOf(path) === -1) {
                throw new CoreIllegalOperationError('Cannot access registry of an unknown member.');
            }

            return core.getMemberRegistry(node, setName, path, regName);
        };

        /**
         * Get the value of the registry entry for the set membership specifically defined to the member node.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} setName - the name of the set.
         * @param {string} path - the absolute path of the member node.
         * @param {string} regName - the name of the registry entry.
         *
         * @return {object|primitive|null|undefined} Return the value of the registry. If it is undefined, than there
         * is no such registry connected to the given set membership.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getMemberOwnRegistry = function (node, setName, path, regName) {
            ensureNode(node, 'node');
            ensureType(setName, 'setName', 'string');
            ensurePath(path, 'path');
            ensureType(regName, 'regName', 'string');
            var names = core.getSetNames(node);
            if (names.indexOf(setName) === -1) {
                throw new CoreIllegalOperationError('Cannot access member information of unknown set.');
            }
            var paths = core.getMemberPaths(node, setName);
            if (paths.indexOf(path) === -1) {
                throw new CoreIllegalOperationError('Cannot access registry of an unknown member.');
            }

            return core.getMemberOwnRegistry(node, setName, path, regName);
        };

        /**
         * Sets the registry entry value which represents a property of the membership.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} setName - the name of the set.
         * @param {string} path - the absolute path of the member node.
         * @param {string} regName - the name of the registry entry.
         * @param {object|primitive|null} value - the new value of the registry.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.setMemberRegistry = function (node, setName, path, regName, value) {
            ensureNode(node, 'node');
            ensureType(setName, 'setName', 'string');
            ensurePath(path, 'path');
            ensureType(regName, 'regName', 'string');
            ensureValue(value, 'value');
            var names = core.getSetNames(node);
            if (names.indexOf(setName) === -1) {
                throw new CoreIllegalOperationError('Cannot access member information of unknown set.');
            }
            var paths = core.getMemberPaths(node, setName);
            if (paths.indexOf(path) === -1) {
                throw new CoreIllegalOperationError('Cannot access registry of an unknown member.');
            }

            return core.setMemberRegistry(node, setName, path, regName, value);
        };

        /**
         * Removes a registry entry which represented a property of the given set membership.
         * @param {module:Core~Node} node - the owner of the set.
         * @param {string} setName - the name of the set.
         * @param {string} path - the absolute path of the member node.
         * @param {string} regName - the name of the registry entry.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.delMemberRegistry = function (node, setName, path, regName) {
            ensureNode(node, 'node');
            ensureType(setName, 'setName', 'string');
            ensurePath(path, 'path');
            ensureType(regName, 'regName', 'string');
            var names = core.getSetNames(node);
            if (names.indexOf(setName) === -1) {
                throw new CoreIllegalOperationError('Cannot access member information of unknown set.');
            }
            var paths = core.getMemberPaths(node, setName);
            if (paths.indexOf(path) === -1) {
                throw new CoreIllegalOperationError('Cannot access registry of an unknown member.');
            }

            return core.delMemberRegistry(node, setName, path, regName);
        };

        /**
         * Returns all membership information of the given node.
         * @param {module:Core~Node} node - the node in question
         *
         * @return {object} Returns a dictionary where every the key of every entry is an absolute path of a set owner
         * node. The value of each entry is an array with the set names in which the node can be found as a member.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.isMemberOf = function (node) {
            ensureNode(node, 'node');

            return core.isMemberOf(node);
        };

        /**
         * Get the GUID of a node.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {module:Core~GUID} Returns the globally unique identifier.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getGuid = function (node) {
            ensureNode(node, 'node');

            return core.getGuid(node);
        };

        //TODO this is only used in import - export use-cases, probably could be removed...
        /**
         * Set the GUID of a node. As the Core itself do not checks whether the GUID already exists. The use of
         * this function is only advised during the creation of the node.
         * @param {module:Core~Node} node - the node in question.
         * @param {module:Core~GUID} guid - the new globally unique identifier.
         * @param {function} [callback]
         * @param {Error|CoreIllegalArgumentError|CoreIllegalOperationError|CoreAssertError|null} callback.error - the
         * result of the execution.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         */
        this.setGuid = function (node, guid, callback) {
            var error = null;
            ensureType(callback, 'callback', 'function');
            error = ensureNode(node, 'node', true);
            error = error || ensureGuid(guid, 'guid', true);

            if (error) {
                callback(error);
            } else {
                core.setGuid(node, guid, callback);
            }

        };

        /**
         * Gets a constraint object of the node.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the constraint.
         *
         * @return {module:Core~Constraint | null} Returns the defined constraint or null if it was not
         * defined for the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         *
         * @example
         * {
         *   script: "function (core, node, callback) {callback(null, {hasViolation: false, message: ''});}",
         *   priority: 1,
         *   info: "Should check unique name"
         * }
         */
        this.getConstraint = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');

            return core.getConstraint(node, name);
        };

        /**
         * Sets a constraint object of the node.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the constraint.
         * @param {module:Core~Constraint} constraint  - the constraint to be set.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.setConstraint = function (node, name, constraint) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');
            ensureType(constraint, 'constraint', 'object');

            return core.setConstraint(node, name, constraint);
        };

        /**
         * Removes a constraint from the node.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the constraint.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.delConstraint = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');

            return core.delConstraint(node, name);
        };

        /**
         * Retrieves the list of constraint names defined for the node.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {string[]} Returns the array of names of constraints available for the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getConstraintNames = function (node) {
            ensureNode(node, 'node');

            return core.getConstraintNames(node);
        };

        /**
         * Retrieves the list of constraint names defined specifically for the node.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {string[]} Returns the array of names of constraints for the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getOwnConstraintNames = function (node) {
            ensureNode(node, 'node');

            return core.getOwnConstraintNames(node);
        };

        /**
         * Checks if the given typeNode is really a base of the node.
         * @param {module:Core~Node} node - the node in question.
         * @param {module:Core~Node} type - the type node we want to check.
         *
         * @return {bool} The function returns true if the type is in the inheritance chain of the node or false
         * otherwise. Every node is type of itself.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.isTypeOf = function (node, type) {
            ensureNode(node, 'node');
            ensureNode(type, 'type');

            return core.isTypeOf(node, type);
        };

        /**
         * Checks if according to the META rules the given node can be a child of the parent.
         * @param {module:Core~Node} node - the node in question
         * @param {module:Core~Node} parent - the parent we like to test.
         *
         * @return {bool} The function returns true if according to the META rules the node can be a child of the
         * parent. The check does not cover multiplicity (so if the parent can only have twi children and it already
         * has them, this function will still returns true).
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.isValidChildOf = function (node, parent) {
            ensureNode(node, 'node');
            ensureNode(parent, 'parent');

            return core.isValidChildOf(node, parent);
        };

        /**
         * Returns the list of the META defined pointer names of the node.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {string[]} The function returns all the pointer names that are defined among the META rules of the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getValidPointerNames = function (node) {
            ensureNode(node, 'node');

            return core.getValidPointerNames(node);
        };

        /**
         * Returns the list of the META defined set names of the node.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {string[]} The function returns all the set names that are defined among the META rules of the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getValidSetNames = function (node) {
            ensureNode(node, 'node');

            return core.getValidSetNames(node);
        };

        /**
         * Returns the list of the META defined pointers of the node.
         * @param {module:Core~Node} node - the node in question.
         * @param {module:Core~Node} source - the source to test.
         * @param {string} name - the name of the pointer.
         *
         * @return {bool} The function returns true if according to the META rules, the given node is a valid
         * target of the given pointer of the source.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.isValidTargetOf = function (node, source, name) {
            ensureNode(node, 'node');
            ensureNode(source, 'source');
            ensureType(name, 'name', 'string');

            return core.isValidTargetOf(node, source, name);
        };

        /**
         * Returns the list of the META defined attribute names of the node.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {string[]} The function returns all the attribute names that are defined among the META rules of the
         * node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getValidAttributeNames = function (node) {
            ensureNode(node, 'node');

            return core.getValidAttributeNames(node);
        };

        /**
         * Returns the list of the META defined attribute names of the node that were specifically defined for the node.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {string[]} The function returns the attribute names that are defined specifically for the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getOwnValidAttributeNames = function (node) {
            ensureNode(node, 'node');

            return core.getOwnValidAttributeNames(node);
        };

        /**
         * Checks if the given value is of the necessary type, according to the META rules.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the attribute.
         * @param {object|primitive|null} value - the value to test.
         *
         * @return {bool} Returns true if the value matches the META definitions.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.isValidAttributeValueOf = function (node, name, value) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');
            ensureValue(value, 'value');

            return core.isValidAttributeValueOf(node, name, value);
        };

        /**
         * Returns the list of the META defined aspect names of the node.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {string[]} The function returns all the aspect names that are defined among the META rules of the
         * node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getValidAspectNames = function (node) {
            ensureNode(node, 'node');

            return core.getValidAspectNames(node);
        };

        /**
         * Returns the list of the META defined aspect names of the node that were specifically defined for the node.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {string[]} The function returns the aspect names that are specifically defined for the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getOwnValidAspectNames = function (node) {
            ensureNode(node, 'node');

            return core.getOwnValidAspectNames(node);
        };

        /**
         * Returns the list of valid children types of the given aspect.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the aspect.
         *
         * @return {string[]} The function returns a list of absolute paths of nodes that are valid children of the node
         * and fits to the META rules defined for the aspect. Any children, visible under the given aspect of the node
         * must be an instance of at least one node represented by the absolute paths.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getAspectMeta = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');

            return core.getAspectMeta(node, name);
        };

        /**
         * Gives a JSON representation of the META rules of the node.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {object} Returns an object that represents all the META rules of the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         *
         * @example
         * {
         *   children: {
         *     items: [ "/1", "/c" ],
         *     minItems: [ -1, -1 ],
         *     maxItems: [ -1, -1 ]
         *   },
         *   attributes: {
         *     name: { type: "string" },
         *     level: { type: "integer"}
         *   },
         *   pointers: {
         *     ptr: {
         *       min: 1,
         *       max: 1,
         *       items: [ "/1" ],
         *       minItems: [ -1 ],
         *       maxItems: [ 1 ]
         *     },
         *     set: {
         *       min: -1,
         *       max: -1,
         *       items: [ "/c" ],
         *       minItems: [ -1 ],
         *       maxItems: [ -1 ]
         *     }
         *   },
         *   aspects: {
         *     filter: [ "/8", "/c" ]
         *   },
         *   constraints: {
         *     myConstraint: {
         *       script: "function (core, node, callback) {callback(null, {hasViolation: false, message: ''});}",
         *       priority: 1,
         *       info: "Should check unique name"
         *     }
         *   }
         * }
         * @example
         * {
         *   children: {},
         *   attributes: {
         *      name: { type: "string" },
         *   },
         *   pointers: {},
         *   aspects: {},
         *   constraints: {}
         */
        this.getJsonMeta = function (node) {
            ensureNode(node, 'node');

            return core.getJsonMeta(node);
        };

        /**
         * Returns the META rules specifically defined for the given node.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {object} The function returns an object that represent the META rules that were defined
         * specifically for the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getOwnJsonMeta = function (node) {
            ensureNode(node, 'node');

            return core.getOwnJsonMeta(node);
        };

        /**
         * Removes all META rules that were specifically defined for the node (so the function do not touches
         * inherited rules).
         * @param {module:Core~Node} node - the node in question.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.clearMetaRules = function (node) {
            ensureNode(node, 'node');

            return core.clearMetaRules(node);
        };

        /**
         * Sets the META rules of the attribute of the node.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the attribute.
         * @param {object} rule - the rules that defines the attribute
         * @param {'string'|'integer'|'float'|'boolean'|'asset'} rule.type - the type of the attribute (valid types see
         * CONSTANTS.ATTRIBUTE_TYPES).
         * @param {string[]} [rule.enum] - if the attribute is an enumeration, this array contains the possible values
         * @param {string|number|boolean} [rule.default] - The value the attribute should have at the node. If not given
         * it should be set at some point.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.setAttributeMeta = function (node, name, rule) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');
            ensureType(rule, 'rule', 'object');
            ensureType(rule.type, 'rule.type', 'string');

            return core.setAttributeMeta(node, name, rule);
        };

        /**
         * Removes an attribute definition from the META rules of the node.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the attribute.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.delAttributeMeta = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');

            return core.delAttributeMeta(node, name);
        };

        /**
         * Returns the definition object of an attribute from the META rules of the node.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the attribute.
         *
         * @return {object} The function returns the definition object, where type is always defined.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         *
         * @example
         * {
         *    type: "string"
         * }
         * @example
         * {
         *    type: "string",
         *    regexp: "^win"
         * }
         * @example
         * {
         *    type: "string",
         *    enum: [ "value1", "value2" ]
         * }
         * @example
         * {
         *    type: "boolean"
         * }
         * @example
         * {
         *    type: "integer"
         * }
         * @example
         * {
         *    type: "integer",
         *    min: 0,
         *    max: 10
         * }
         * @example
         * {
         *    type: "integer",
         *    enum: [ 3, 8 ]
         * }
         * @example
         * {
         *    type: "float",
         *    min: 0,
         *    max: 9.9
         * }
         * @example
         * {
         *    type: "asset"
         * }
         */
        this.getAttributeMeta = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');

            return core.getAttributeMeta(node, name);
        };

        /**
         * Returns the list of absolute path of the valid children types of the node.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {string[]} The function returns an array of absolute paths of the nodes that was defined as valid
         * children for the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getValidChildrenPaths = function (node) {
            ensureNode(node, 'node');

            return core.getValidChildrenPaths(node);
        };

        /**
         * Return a JSON representation of the META rules regarding the valid children of the given node.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {module:Core~RelationRule} The function returns a detailed JSON structure that represents the META
         * rules regarding the possible children of the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         *
         * @example
         * {
         *   '/5': { max: 1, min: -1 },
         *   '/c': { max: -1, min: 2 },
         *   max: 10,
         *   min: undefined
         * }
         * @func
         */
        this.getChildrenMeta = function (node) {
            ensureNode(node, 'node');

            return core.getChildrenMeta(node);
        };

        /**
         * Sets the given child as a valid children type for the node.
         * @param {module:Core~Node} node - the node in question.
         * @param {module:Core~Node} child - the valid child node.
         * @param {integer} [min] - the allowed minimum number of children from this given node type (if not given or
         * -1 is set, then there will be no minimum rule according this child type)
         * @param {integer} [max] - the allowed maximum number of children from this given node type (if not given or
         * -1 is set, then there will be no minimum rule according this child type)
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.setChildMeta = function (node, child, min, max) {
            ensureNode(node, 'node');
            ensureNode(child, 'child');
            ensureMinMax(min, 'min');
            ensureMinMax(max, 'max');

            return core.setChildMeta(node, child, min, max);
        };

        /**
         * Removes the given child rule from the node.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} path - the absolute path of the child which rule is to be removed from the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.delChildMeta = function (node, path) {
            ensureNode(node, 'node');
            ensurePath(path, 'path');

            return core.delChildMeta(node, path);
        };

        /**
         * Sets the global containment limits for the node.
         *
         * @param {integer} [min] - the allowed minimum number of children (if not given or
         * -1 is set, then there will be no minimum rule according children)
         * @param {integer} [max] - the allowed maximum number of children (if not given or
         * -1 is set, then there will be no maximum rule according children)
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.setChildrenMetaLimits = function (node, min, max) {
            ensureNode(node, 'node');
            ensureMinMax(min, 'min');
            ensureMinMax(max, 'max');

            return core.setChildrenMetaLimits(node, min, max);
        };

        /**
         * Sets the given target as a valid target type for the pointer/set of the node.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the pointer/set.
         * @param {module:Core~Node} target - the valid target/member node.
         * @param {integer} [min] - the allowed minimum number of target/member from this given node type (if not
         * given or -1 is set, then there will be no minimum rule according this target type)
         * @param {integer} [max] - the allowed maximum number of target/member from this given node type (if not
         * given or -1 is set, then there will be no minimum rule according this target type)
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.setPointerMetaTarget = function (node, name, target, min, max) {
            ensureNode(node, 'node');
            ensureRelationName(name, 'name');
            ensureNode(target, 'target');
            ensureMinMax(min, 'min');
            ensureMinMax(max, 'max');

            return core.setPointerMetaTarget(node, name, target, min, max);
        };

        /**
         * Removes a possible target type from the pointer/set of the node.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the pointer/set
         * @param {string} path - the absolute path of the possible target type.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.delPointerMetaTarget = function (node, name, path) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');
            ensurePath(path, 'path');
            var names = core.getValidPointerNames(node).concat(core.getValidSetNames(node));
            if (names.indexOf(name) === -1) {
                throw new CoreIllegalOperationError('Cannot access definition of unknown pointer.');
            }

            return core.delPointerMetaTarget(node, name, path);
        };

        /**
         * Sets the global target limits for pointer/set of the node. On META level the only distinction between
         * pointer and sets is the global multiplicity which has to maximize the number of possible targets to 1 in
         * case of 'pure' pointer definitions.
         *
         * @param {integer} [min] - the allowed minimum number of children (if not given or
         * -1 is set, then there will be no minimum rule according targets)
         * @param {integer} [max] - the allowed maximum number of children (if not given or
         * -1 is set, then there will be no maximum rule according targets)
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.setPointerMetaLimits = function (node, name, min, max) {
            ensureNode(node, 'node');
            ensureRelationName(name, 'name');
            ensureMinMax(min, 'min');
            ensureMinMax(max, 'max');

            return core.setPointerMetaLimits(node, name, min, max);
        };

        /**
         * Removes the complete META rule regarding the given pointer/set of the node.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the pointer/set.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.delPointerMeta = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');

            return core.delPointerMeta(node, name);
        };

        /**
         * Return a JSON representation of the META rules regarding the given pointer/set of the given node.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the pointer/set.
         *
         * @return {module:Core~RelationRule|undefined} The function returns a detailed JSON structure that
         * represents the META rules regarding the given pointer/set of the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         *
         * @example
         * pointer
         * {
         *   '/a': { max: 1, min: -1 },
         *   max: 1,
         *   min: 1
         * }
         * @example
         * set
         * {
         *   '/G': { max: -1, min: -1},
         *   '/i': { max: -1, min: -1},
         *   max: -1
         *   min: -1
         * }
         */
        this.getPointerMeta = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');

            return core.getPointerMeta(node, name);
        };

        /**
         * Sets a valid type for the given aspect of the node.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the aspect.
         * @param {module:Core~Node} target - the valid type for the aspect.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.setAspectMetaTarget = function (node, name, target) {
            ensureNode(node, 'node');
            ensureRelationName(name, 'name');
            ensureNode(target, 'target');

            return core.setAspectMetaTarget(node, name, target);
        };

        /**
         * Removes a valid type from the given aspect of the node.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the aspect.
         * @param {string} path - the absolute path of the valid type of the aspect.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.delAspectMetaTarget = function (node, name, path) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');
            ensurePath(path, 'path');
            var names = core.getValidAspectNames(node);
            if (names.indexOf(name) === -1) {
                throw new CoreIllegalOperationError('Cannot change definition of unknown aspect.');
            }

            return core.delAspectMetaTarget(node, name, path);
        };

        /**
         * Removes the given aspect rule of the node.
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the aspect.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.delAspectMeta = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');

            return core.delAspectMeta(node, name);
        };

        /**
         * Searches for the closest META node of the node in question.
         * @param {module:Core~Node} node - the node in question
         *
         * @return {module:Core~Node | null} Returns the first node (including itself) among the inheritance chain
         * that is a META node. It returns null if it does not find such node (ideally the only node with this result
         * is the ROOT).
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getBaseType = this.getMetaType = function (node) {
            ensureNode(node, 'node');

            return core.getBaseType(node);
        };

        /**
         * Checks if there is a node with the given name in the nodes inheritance chain (excluding itself).
         * @param {module:Core~Node} node - the node in question.
         * @param {string} name - the name of the base node.
         *
         * @return {bool} The function returns true if it finds an ancestor with the given name attribute.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.isInstanceOf = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');

            return core.isInstanceOf(node, name);
        };

        /**
         * Generates a differential tree among the two states of the project that contains the necessary changes
         * that can modify the source to be identical to the target. The result is in form of a json object.
         * @param {module:Core~Node} sourceRoot - the root node of the source state.
         * @param {module:Core~Node} targetRoot - the root node of the target state.
         * @param {function} [callback]
         * @param {Error|CoreIllegalArgumentError|CoreAssertError|null} callback.error - the status of the exectuion.
         * @param {object} callback.treeDiff - the difference between the two containment hierarchies in
         * a special JSON object
         *
         * @return {External~Promise} - if the callback is not defined, the result is provided in a promise
         * like manner.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         */
        this.generateTreeDiff = function (sourceRoot, targetRoot, callback) {
            var error;

            ensureType(callback, 'callback', 'function');
            error = ensureNode(sourceRoot, 'sourceRoot', true);
            error = error || ensureNode(targetRoot, 'targetRoot', true);
            if (error) {
                callback(error);
            } else {
                core.generateTreeDiff(sourceRoot, targetRoot, callback);
            }
        };

        /**
         * Apply changes to the current project.
         * @param {module:Core~Node} node - the root of the containment hierarchy where we wish to apply the changes
         * @param {object} patch - the tree structured collection of changes represented with a special JSON object
         * @param {function} [callback]
         * @param {Error|CoreIllegalArgumentError|CoreAssertError|null} callback.error - the result of the execution.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         */
        this.applyTreeDiff = function (node, patch, callback) {
            var error;

            ensureType(callback, 'callback', 'function');
            error = ensureNode(node, 'node', true);
            error = error || ensureType(patch, 'patch', 'object', true);
            if (error) {
                callback(error);
            } else {
                core.applyTreeDiff(node, patch, callback);
            }
        };

        /**
         * Tries to merge two patch object. The patches ideally represents changes made by two parties. They represents
         * changes from the same source ending in different states. Our aim is to generate a single patch that could
         * cover the changes of both party.
         * @param {object} mine - the tree structured JSON patch that represents my changes.
         * @param {object} theirs - the tree structured JSON patch that represents the changes of the other party.
         *
         * @return {object} The function returns with an object that contains the conflicts (if any) and the merged
         * patch.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.tryToConcatChanges = function (mine, theirs) {
            ensureType(mine, 'mine', 'object');
            ensureType(theirs, 'theirs', 'object');

            return core.tryToConcatChanges(mine, theirs);
        };

        /**
         * When our attempt to merge two patches ended in some conflict, then we can modify that result highlighting
         * that in case of every conflict, which side we prefer (mine vs. theirs). If we give that object as an input
         * to this function, it will finish the merge resolving the conflict according our settings and present a final
         * patch.
         * @param {object} conflict - the object that represents our settings for every conflict and the so-far-merged
         * patch.
         *
         * @return {object} The function results in a tree structured patch object that contains the changesthat cover
         * both parties modifications (and the conflicts are resolved according the input settings).
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.applyResolution = function (conflict) {
            ensureType(conflict, 'conflict', 'object');

            return core.applyResolution(conflict);
        };

        /**
         * Checks if the node is abstract.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {bool} The function returns true if the registry entry 'isAbstract' of the node if true hence
         * the node is abstract.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.isAbstract = function (node) {
            ensureNode(node, 'node');

            return core.isAbstract(node);
        };

        /**
         * Check is the node is a connection-like node.
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {bool} Returns true if both the 'src' and 'dst' pointer are defined as valid for the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.isConnection = function (node) {
            ensureNode(node, 'node');

            return core.isConnection(node);
        };

        /**
         * Retrieves the valid META nodes that can be base of a child of the node.
         * @param {object} parameters - the input parameters of the query.
         * @param {module:Core~Node} parameters.node - the node in question.
         * @param {module:Core~Node[]} [parameters.children] - the children of the node in question.
         * @param {bool} - [parameters.sensitive] - if true, the query filters out the abstract and connection-like
         * nodes (the default value is false)
         * @param {bool} - [parameters.multiplicity] - if true, the query tries to filter out even more nodes according
         * to the multiplicity rules (the default value is false, the check is only meaningful if all the children were
         * passed)
         * @param {string|null} - [parameters.aspect] - if given, the query filters to contain only types that are visible
         * in the given aspect.
         * @return {module:Core~Node[]} The function returns a list of valid nodes that can be instantiated as a
         * child of the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getValidChildrenMetaNodes = function (parameters) {
            ensureType(parameters, 'parameters', 'object');
            ensureNode(parameters.node, 'parameters.node');
            if (parameters.hasOwnProperty('children') && parameters.children !== undefined) {
                ensureInstanceOf(parameters.children, 'parameters.children', Array);
                for (var i = 0; i < parameters.children.length; i += 1) {
                    ensureNode(parameters.children[i], 'parameters.children[i]');
                }
            }
            if (parameters.hasOwnProperty('sensitive') && parameters.sensitive !== undefined) {
                ensureType(parameters.sensitive, 'parameters.sensitive', 'boolean');
            }
            if (parameters.hasOwnProperty('multiplicity')) {
                ensureType(parameters.multiplicity, 'parameters.multiplicity', 'boolean');
            }
            if (parameters.hasOwnProperty('aspect') && parameters.aspect !== undefined && parameters.aspect !== null) {
                ensureType(parameters.aspect, 'parameters.aspect', 'string');
            }

            return core.getValidChildrenMetaNodes(parameters);
        };

        /**
         * Retrieves the valid META nodes that can be base of a member of the set of the node.
         * @param {object} parameters - the input parameters of the query.
         * @param {module:Core~Node} parameters.node - the node in question.
         * @param {string} parameters.name - the name of the set.
         * @param {module:Core~Node[]} [parameters.members] - the members of the set of the node in question.
         * @param {bool} - [parameters.sensitive] - if true, the query filters out the abstract and connection-like
         * nodes (the default value is false)
         * @param {bool} - [parameters.multiplicity] - if true, the query tries to filter out even more nodes according
         * to the multiplicity rules (the default value is false, the check is only meaningful if all the members were
         * passed)
         *
         * @return {module:Core~Node[]} The function returns a list of valid nodes that can be instantiated as a
         * member of the set of the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getValidSetElementsMetaNodes = function (parameters) {
            ensureType(parameters, 'parameters', 'object');
            ensureNode(parameters.node, 'parameters.node');
            if (parameters.hasOwnProperty('members')) {
                ensureInstanceOf(parameters.members, 'parameters.members', Array);
                for (var i = 0; i < parameters.members.length; i += 1) {
                    ensureNode(parameters.members[i], 'parameters.members[i]');
                }
            }
            if (parameters.hasOwnProperty('sensitive')) {
                ensureType(parameters.sensitive, 'parameters.sensitive', 'boolean');
            }
            if (parameters.hasOwnProperty('multiplicity')) {
                ensureType(parameters.multiplicity, 'parameters.multiplicity', 'boolean');
            }

            return core.getValidSetElementsMetaNodes(parameters);
        };

        /**
         * Returns all META nodes.
         * @param {module:Core~Node} node - any node of the containment hierarchy.
         *
         * @return {Object<string, module:Core~Node>} The function returns a dictionary. The keys of the dictionary are the absolute paths of
         * the META nodes of the project. Every value of the dictionary is a {@link module:Core~Node}.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getAllMetaNodes = function (node) {
            ensureNode(node, 'node');

            return core.getAllMetaNodes(node);
        };

        /**
         * Checks if the node is a META node.
         * @param {module:Core~Node} node - the node to test.
         *
         * @return {bool} Returns true if the node is a member of the METAAspectSet of the ROOT node hence can be
         * seen as a META node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.isMetaNode = function (node) {
            ensureNode(node, 'node');

            return core.isMetaNode(node);
        };

        /**
         * Checks if the member is completely overridden in the set of the node.
         * @param {module:Core~Node} node - the node to test.
         * @param {string} name - the name of the set of the node.
         * @param {string} path - the path of the member in question.
         *
         * @return {bool} Returns true if the member exists in the base of the set, but was
         * added to the given set as well, which means a complete override. If the set does not exist
         * or the member do not have a 'base' member or just some property was overridden, the function returns
         * false.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.isFullyOverriddenMember = function (node, name, path) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');
            ensurePath(path, 'path');
            var names = core.getSetNames(node);
            if (names.indexOf(name) === -1) {
                throw new CoreIllegalOperationError('Cannot access member information of unknown set.');
            }

            return core.isFullyOverriddenMember(node, name, path);
        };

        /**
         * Checks if the mixins allocated with the node can be used.
         * Every mixin node should be on the Meta.
         * Every rule (attribute/pointer/set/aspect/containment/constraint) should be defined only in one mixin.
         *
         * @param {module:Core~Node} node - the node to test.
         *
         * @return {module:Core~MixinViolation[]} Returns the array of violations. If the array is empty,
         * there is no violation.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getMixinErrors = function (node) {
            ensureNode(node, 'node');

            return core.getMixinErrors(node);
        };

        /**
         * Gathers the paths of the mixin nodes associated with the node.
         *
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {string[]} The paths of the mixins in an array.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getMixinPaths = function (node) {
            ensureNode(node, 'node');

            return core.getMixinPaths(node);
        };

        /**
         * Gathers the mixin nodes associated with the node.
         *
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {Object<string, module:Core~Node>} The dictionary of the mixin nodes keyed by their paths.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getMixinNodes = function (node) {
            ensureNode(node, 'node');

            return core.getMixinNodes(node);
        };

        /**
         * Removes a mixin from the mixin set of the node.
         *
         * @param {module:Core~Node} node - the node in question.
         * @param {string} path - the path of the mixin node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.delMixin = function (node, path) {
            ensureNode(node, 'node');
            ensurePath(path, 'path');

            return core.delMixin(node, path);
        };

        /**
         * Adds a mixin to the mixin set of the node.
         *
         * @param {module:Core~Node} node - the node in question.
         * @param {string} path - the path of the mixin node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.addMixin = function (node, path) {
            ensureNode(node, 'node');
            ensurePath(path, 'path');

            return core.addMixin(node, path);
        };

        /**
         * Removes all mixins for a given node.
         *
         * @param {module:Core~Node} node - the node in question.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.clearMixins = function (node) {
            ensureNode(node, 'node');

            return core.clearMixins(node);
        };

        /**
         * Searches for the closest META node of the node in question and the direct mixins of that node.
         * @param {module:Core~Node} node - the node in question
         *
         * @return {Object<string, module:Core~Node>} Returns the closest Meta node that is a base of the given node
         * plus it returns all the mixin nodes associated with the base in a path-node dictionary.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getBaseTypes = function (node) {
            ensureNode(node, 'node');

            return core.getBaseTypes(node);
        };

        /**
         * Checks if the given path can be added as a mixin to the given node.
         *
         * @param {module:Core~Node} node - the node in question.
         * @param {string} path - the path of the mixin node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.canSetAsMixin = function (node, path) {
            ensureNode(node, 'node');
            ensurePath(path, 'path');

            return core.canSetAsMixin(node, path);
        };

        //library function TODO checking everything and adding all new functions

        /**
         * It adds a project as library to your project by copying it over. The library will be a node
         * with the given name directly under your project's ROOT. It becomes a read-only portion of your project.
         * You will only be able to manipulate it with library functions, but cannot edit the individual nodes inside.
         * However you will be able to instantiate or copy the nodes into other places of your project. Every node
         * that was part of the META in the originating project becomes part of your project's meta.
         * @param {module:Core~Node} node - any regular node in your project.
         * @param {string} name - the name of the library you wish to use as a namespace in your project.
         * @param {string} libraryRootHash - the hash of your library's root
         * (must exist in the project's collection at the time of call).
         * @param {object} [libraryInfo] - information about your project.
         * @param {string} [libraryInfo.projectId] - the projectId of your library.
         * @param {string} [libraryInfo.branchName] - the branch that your library follows in the origin project.
         * @param {string} [libraryInfo.commitHash] - the version of your library.
         * @param {function} [callback]
         * @param {Error|CoreIllegalArgumentError|CoreIllegalOperationError|CoreAssertError|null} callback.error - the
         * result of the execution.
         *
         * @return {External~Promise} If no callback is given, the result is provided in a promise like manner.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         */
        this.addLibrary = function (node, name, libraryRootHash, libraryInfo, callback) {
            ensureType(callback, 'callback', 'function');
            var error = ensureNode(node, 'node', true);
            error = error || ensureType(name, 'name', 'string');
            error = error || ensureHash(libraryRootHash, 'libraryRootHash', true);
            if (libraryInfo) {
                error = error || ensureType(libraryInfo, 'libraryInfo', 'object', true);
                if (libraryInfo.hasOwnProperty('projectId') && libraryInfo.projectId !== undefined) {
                    error = error || ensureType(libraryInfo.projectId, 'libraryInfo.projectId', 'string', true);
                }
                if (libraryInfo.hasOwnProperty('branchName') && libraryInfo.branchName !== undefined) {
                    error = error || ensureType(libraryInfo.branchName, 'libraryInfo.branchName', 'string', true);
                }
                if (libraryInfo.hasOwnProperty('commitHash') && libraryInfo.commitHash !== undefined) {
                    error = error || ensureHash(libraryInfo.commitHash, 'libraryInfo.commitHash', true);
                }
            }
            if (error) {
                callback(error);
            } else {
                core.addLibrary(node, name, libraryRootHash, libraryInfo, callback);
            }
        };

        /**
         * It updates a library in your project based on the input information. It will 'reaplace' the old
         * version, keeping as much information as possible regarding the instances.
         * @param {module:Core~Node} node - any regular node in your project.
         * @param {string} name - the name of the library you want to update.
         * @param {string} libraryRootHash - the hash of your library's new root
         * (must exist in the project's collection at the time of call).
         * @param {object} [libraryInfo] - information about your project.
         * @param {string} [libraryInfo.projectId] - the projectId of your library.
         * @param {string} [libraryInfo.branchName] - the branch that your library follows in the origin project.
         * @param {string} [libraryInfo.commitHash] - the version of your library.
         * @param updateInstructions - not yet used parameter.
         * @param {function} [callback]
         * @param {Error|CoreIllegalArgumentError|CoreIllegalOperationError|CoreAssertError|null} callback.error - the
         * status of the execution.
         *
         * @return {External~Promise} If no callback is given, the result is presented in a promise like manner.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         */
        this.updateLibrary = function (node, name, libraryRootHash, libraryInfo, updateInstructions, callback) {
            ensureType(callback, 'callback', 'function');
            var error = ensureNode(node, 'node', true);
            error = error || ensureType(name, 'name', 'string');
            error = error || ensureHash(libraryRootHash, 'libraryRootHash', true);
            if (libraryInfo) {
                error = error || ensureType(libraryInfo, 'libraryInfo', 'object', true);
                if (libraryInfo.hasOwnProperty('projectId') && libraryInfo.projectId !== undefined) {
                    error = error || ensureType(libraryInfo.projectId, 'libraryInfo.projectId', 'string', true);
                }
                if (libraryInfo.hasOwnProperty('branchName') && libraryInfo.branchName !== undefined) {
                    error = error || ensureType(libraryInfo.branchName, 'libraryInfo.branchName', 'string', true);
                }
                if (libraryInfo.hasOwnProperty('commitHash') && libraryInfo.commitHash !== undefined) {
                    error = error || ensureHash(libraryInfo.commitHash, 'libraryInfo.commitHash', true);
                }
            }
            if (error) {
                callback(error);
            } else {
                core.updateLibrary(node, name, libraryRootHash, libraryInfo, callback);
            }

        };

        /**
         * Gives back the list of libraries in your project.
         *
         * @param {module:Core~Node} node - any node in your project.
         *
         * @return {string[]} - Returns the fully qualified names of all the libraries in your project
         * (even embedded ones).
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getLibraryNames = function (node) {
            ensureNode(node, 'node');

            return core.getLibraryNames(node);
        };

        /**
         * Return the root of the inheritance chain of your Meta nodes.
         *
         * @param {module:Core~Node} node - any node in your project.
         *
         * @return {module:Core~Node} - Returns the acting FCO of your project.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getFCO = function (node) {
            ensureNode(node, 'node');

            return core.getFCO(node);
        };

        /**
         * Returns true if the node in question is a library root..
         *
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {bool} - Returns true if your node is a library root (even if it is embedded in other library),
         * false otherwise.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.isLibraryRoot = function (node) {
            ensureNode(node, 'node');

            return core.isLibraryRoot(node);
        };

        /**
         * Returns true if the node in question is a library element..
         *
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {bool} - Returns true if your node is a library element, false otherwise.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.isLibraryElement = function (node) {
            ensureNode(node, 'node');

            return core.isLibraryElement(node);
        };

        /**
         * Returns the resolved namespace for the node. If node is not in a library it returns the
         * empty string. If the node is in a library of a library -
         * the full name space is the library names joined together by dots.
         *
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {string} - Returns the name space of the node.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         *
         * @example NS1.NS2
         */
        this.getNamespace = function (node) {
            ensureNode(node, 'node');

            return core.getNamespace(node);
        };

        /**
         * Returns the fully qualified name of the node, which is the list of its namespaces separated
         * by dot and followed by the name of the node.
         *
         * @param {module:Core~Node} node - the node in question.
         *
         * @return {string} - Returns the fully qualified name of the node,
         * i.e. its namespaces and name join together by dots.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         *
         * @example NS1.NS2.name
         */
        this.getFullyQualifiedName = function (node) {
            ensureNode(node, 'node');

            return core.getFullyQualifiedName(node);
        };

        /**
         * Removes a library from your project. It will also remove any remaining instances of the specific library.
         *
         * @param {module:Core~Node} node - any node in your project.
         * @param {string} name - the name of your library.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.removeLibrary = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');
            var names = core.getLibraryNames(node);
            if (names.indexOf(name) === -1) {
                throw new CoreIllegalOperationError('Cannot remove unknown library');
            }

            return core.removeLibrary(node, name);
        };

        /**
         * Returns the origin GUID of any library node.
         *
         * @param {module:Core~Node} node - the node in question.
         * @param {undefined | string} [name] - name of the library where we want to deduct the GUID from. If not given,
         * than the GUID is computed from the direct library root of the node
         *
         * @return {module:Core~GUID | Error} - Returns the origin GUID of the node or
         * error if the query cannot be fulfilled.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getLibraryGuid = function (node, name) {
            ensureNode(node, 'node');
            if (name !== undefined && name !== null) {
                ensureType(name, 'name', 'string');
            }

            return core.getLibraryGuid(node, name);
        };

        /**
         * Rename a library in your project.
         *
         * @param {module:Core~Node} node - any node in your project.
         * @param {string} oldName - the current name of the library.
         * @param {string} newName - the new name of the project.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.renameLibrary = function (node, oldName, newName) {
            ensureNode(node, 'node');
            ensureType(oldName, 'oldName', 'string');
            ensureType(newName, 'newName', 'string');

            return core.renameLibrary(node, oldName, newName);
        };

        /**
         * Returns the info associated with the library.
         *
         * @param {module:Core~Node} node - any node in the project.
         * @param {string} name - the name of the library.
         *
         * @return {object} - Returns the information object, stored alongside the library (that basically
         * carries metaData about the library).
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getLibraryInfo = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');

            return core.getLibraryInfo(node, name);
        };

        /**
         * Returns the root node of the given library.
         *
         * @param {module:Core~Node} node - any node in the project.
         * @param {string} name - the name of the library.
         *
         * @return {module:Core~Node | null} - Returns the library root node or null, if the library is unknown.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getLibraryRoot = function (node, name) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');

            return core.getLibraryRoot(node, name);
        };

        /**
         * Returns all the Meta nodes within the given library.
         * By default it will include nodes defined in any library within the given library.
         *
         * @param {module:Core~Node} node - any node of your project.
         * @param {string} name - name of your library.
         * @param {bool} [onlyOwn] - if true only returns with Meta nodes defined in the library itself.
         *
         * @return {module:Core~Node[]} - Returns an array of core nodes that are part of your meta from
         * the given library.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getLibraryMetaNodes = function (node, name, onlyOwn) {
            ensureNode(node, 'node');
            ensureType(name, 'name', 'string');
            if (onlyOwn !== null && onlyOwn !== undefined) {
                ensureType(onlyOwn, 'onlyOwn', 'boolean');
            }

            return core.getLibraryMetaNodes(node, name, onlyOwn);
        };

        /**
         * The function traverses the sub-tree of the project starting with the given root and calls the
         * visit function for every node.
         *
         * @param {module:Core~Node} root - the root node of the sub-tree that needs to be traversed.
         * @param {object} options - parameters to control the traversing.
         * @param {bool} [options.excludeRoot = false] - controls whether the root should be excluded from visit.
         * @param {'BFS'|'DFS'} [options.order = 'BFS'] - controls if the traversal order should be breadth first
         * or depth first.
         * @param {integer} [options.maxParallelLoad = 100]- the maximum number of parallel loads allowed.
         * @param {bool} [options.stopOnError = true]- controls if the traverse should stop in case of error.
         * @param {function} visitFn - the visitation function that will be called for
         * every node in the sub-tree, the second parameter of the function is a callback that should be called to
         * note to the traversal function that the visitation for a given node finished.
         * @param {module:Core~Node} visitFn.node - the node that is being visited.
         * @param {function} visitFn.next - the callback function of the visit function that marks the end
         * of visitation.
         * @param {function} [callback]
         * @param {Error|CoreIllegalArgumentError|CoreAssertError|null} callback.error - the status of the execution.
         *
         * @return {External~Promise} If no callback is given, the end of traverse is marked in a promise like
         * manner.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         */
        this.traverse = function (root, options, visitFn, callback) {
            ensureType(callback, 'callback', 'function');
            var error = ensureNode(root, 'root', true);
            if (options) {
                error = error || ensureType(options, 'options', 'object');
                if (options.hasOwnProperty('excludeRoot')) {
                    error = error || ensureType(options.excludeRoot, 'options.excludeRoot', 'boolean', true);
                }
                if (options.hasOwnProperty('order')) {
                    error = error || ensureType(options.order, 'options.order', 'string', true);
                    if (options.order !== 'BFS' && options.order !== 'DFS') {
                        error = error ||
                            new CoreIllegalArgumentError('Parameter options.order must be either \'BFS\' or \'DFS\'.');
                    }
                }
                if (options.hasOwnProperty('stopOnError')) {
                    error = error || ensureType(options.stopOnError, 'options.stopOnError', 'boolean', true);
                }
            }
            error = error || ensureType(visitFn, 'visitFn', 'function');

            if (error) {
                callback(error);
            } else {
                core.traverse(root, options, visitFn, callback);
            }
        };

        /**
         * Collects the necessary information to export the set of input nodes and use it in other
         * - compatible - projects.
         * @private
         *
         * @param {module:Core~Node[]} nodes - the set of nodes that we want to export
         *
         * @return {object} If the closure is available for export, the returned special JSON object
         * will contain information about the necessary data that needs to be exported as well as relations
         * that will need to be recreated in the destination project to preserve the structure of nodes.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreIllegalOperationError} If the context of the operation is not allowed.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getClosureInformation = function (nodes) {
            ensureInstanceOf(nodes, 'nodes', Array);
            for (var i = 0; i < nodes.length; i += 1) {
                ensureNode(nodes[i], 'nodes[i]');
            }

            return core.getClosureInformation(nodes);
        };

        /**
         * Imports the set of nodes in the closureInformation - that has the format created by
         * [getClosureInformation]{@link Core#getClosureInformation} - as direct children of the parent node.
         * All data necessary for importing the closure has to be imported beforehand!
         * @private
         *
         * @param {module:Core~Node} node - the parent node where the closure will be imported.
         * @param {object} closureInformation - the information about the closure.
         *
         * @return {object} If the closure cannot be imported the resulting error highlights the causes,
         * otherwise a specific object will be returned that holds information about the closure.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.importClosure = function (node, closureInformation) {
            ensureNode(node, 'node');
            ensureType(closureInformation, 'closureInformation', 'object');

            return core.importClosure(node, closureInformation);
        };

        /**
         * Collects the paths of all the instances of the given node.
         * @param {module:Core~Node} node - the node in question.
         *
         *@return {string[]} The function returns an array of the absolute paths of the instances.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         * @throws {CoreAssertError} If some internal error took place inside the core layers.
         */
        this.getInstancePaths = function (node) {
            ensureNode(node, 'node');

            return core.getInstancePaths(node);
        };

        /**
         * Loads all the instances of the given node.
         * @param {module:Core~Node} node - the node in question.
         * @param {function} [callback]
         * @param {Error|CoreIllegalArgumentError|CoreAssertError|null} callback.error - the status of the execution.
         * @param {module:Core~Node[]} callback.nodes - the found instances of the node.
         *
         * @return {External~Promise} If no callback is given, the result will be provided in a promise
         * like manner.
         *
         * @throws {CoreIllegalArgumentError} If some of the parameters doesn't match the input criteria.
         */
        this.loadInstances = function (node, callback) {
            ensureType(callback, 'callback', 'function');
            var error = ensureNode(node, 'node', true);
            if (error) {
                callback(error);
            } else {
                core.loadInstances(node, callback);
            }
        };
    }

    return Core;
});
