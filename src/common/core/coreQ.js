/*globals define*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define(['common/core/core', 'q'], function (Core, Q) {

    'use strict';
    /**
     * @param {object} storage
     * @param {object} options - contains logging information
     * @extends Core
     * @constructor
     */
    function CoreQ(storage, options) {
        var self = this;
        Core.call(self, storage, options);

        var loadChildOrg = this.loadChild;
        this.loadChild = function (parent, relativeId, callback) {
            var deferred = Q.defer();
            loadChildOrg(parent, relativeId, function (err, res) {
                if (err) {
                    deferred.reject(err instanceof Error ? err : new Error(err));
                } else {
                    deferred.resolve(res);
                }
            });

            return deferred.promise.nodeify(callback);
        };

        var loadRootOrg = this.loadRoot;
        this.loadRoot = function (hash, callback) {
            var deferred = Q.defer();
            loadRootOrg(hash, function (err, res) {
                if (err) {
                    deferred.reject(err instanceof Error ? err : new Error(err));
                } else {
                    deferred.resolve(res);
                }
            });

            return deferred.promise.nodeify(callback);
        };

        var loadByPathOrg = this.loadByPath;
        this.loadByPath = function (startNode, relativeId, callback) {
            var deferred = Q.defer();
            loadByPathOrg(startNode, relativeId, function (err, res) {
                if (err) {
                    deferred.reject(err instanceof Error ? err : new Error(err));
                } else {
                    deferred.resolve(res);
                }
            });

            return deferred.promise.nodeify(callback);
        };

        var loadChildrenOrg = this.loadChildren;
        this.loadChildren = function (parent, callback) {
            var deferred = Q.defer();
            loadChildrenOrg(parent, function (err, res) {
                if (err) {
                    deferred.reject(err instanceof Error ? err : new Error(err));
                } else {
                    deferred.resolve(res);
                }
            });

            return deferred.promise.nodeify(callback);
        };

        var loadOwnChildrenOrg = this.loadOwnChildren;
        this.loadOwnChildren = function (parent, callback) {
            var deferred = Q.defer();
            loadOwnChildrenOrg(parent, function (err, res) {
                if (err) {
                    deferred.reject(err instanceof Error ? err : new Error(err));
                } else {
                    deferred.resolve(res);
                }
            });

            return deferred.promise.nodeify(callback);
        };

        var loadPointerOrg = this.loadPointer;
        this.loadPointer = function (source, pointerName, callback) {
            var deferred = Q.defer();
            loadPointerOrg(source, pointerName, function (err, res) {
                if (err) {
                    deferred.reject(err instanceof Error ? err : new Error(err));
                } else {
                    deferred.resolve(res);
                }
            });

            return deferred.promise.nodeify(callback);
        };

        var loadCollectionOrg = this.loadCollection;
        this.loadCollection = function (target, pointerName, callback) {
            var deferred = Q.defer();
            loadCollectionOrg(target, pointerName, function (err, res) {
                if (err) {
                    deferred.reject(err instanceof Error ? err : new Error(err));
                } else {
                    deferred.resolve(res);
                }
            });

            return deferred.promise.nodeify(callback);
        };

        var loadSubTreeOrg = this.loadSubTree;
        this.loadSubTree = function (node, callback) {
            var deferred = Q.defer();
            loadSubTreeOrg(node, function (err, res) {
                if (err) {
                    deferred.reject(err instanceof Error ? err : new Error(err));
                } else {
                    deferred.resolve(res);
                }
            });

            return deferred.promise.nodeify(callback);
        };

        var loadOwnSubTreeOrg = this.loadOwnSubTree;
        this.loadOwnSubTree = function (node, callback) {
            var deferred = Q.defer();
            loadOwnSubTreeOrg(node, function (err, res) {
                if (err) {
                    deferred.reject(err instanceof Error ? err : new Error(err));
                } else {
                    deferred.resolve(res);
                }
            });

            return deferred.promise.nodeify(callback);
        };

        var loadTreeOrg = this.loadTree;
        this.loadTree = function (rootHash, callback) {
            var deferred = Q.defer();
            loadTreeOrg(rootHash, function (err, res) {
                if (err) {
                    deferred.reject(err instanceof Error ? err : new Error(err));
                } else {
                    deferred.resolve(res);
                }
            });

            return deferred.promise.nodeify(callback);
        };

        var applyTreeDiffOrg = this.applyTreeDiff;
        this.applyTreeDiff = function (root, patch, callback) {
            var deferred = Q.defer();
            applyTreeDiffOrg(root, patch, function (err, res) {
                if (err) {
                    deferred.reject(err instanceof Error ? err : new Error(err));
                } else {
                    deferred.resolve(res);
                }
            });

            return deferred.promise.nodeify(callback);
        };

        var generateTreeDiffOrg = this.generateTreeDiff;
        this.generateTreeDiff = function (sourceRoot, targetRoot, callback) {
            var deferred = Q.defer();
            generateTreeDiffOrg(sourceRoot, targetRoot, function (err, res) {
                if (err) {
                    deferred.reject(err instanceof Error ? err : new Error(err));
                } else {
                    deferred.resolve(res);
                }
            });

            return deferred.promise.nodeify(callback);
        };

        var setGuidOrg = this.setGuid;
        this.setGuid = function (node, guid, callback) {
            var deferred = Q.defer();
            setGuidOrg(node, guid, deferred.resolve);

            return deferred.promise.nodeify(callback);
        };

        var addLibraryOrg = this.addLibrary;
        this.addLibrary = function (node, name, libraryRootHash, libraryInfo, callback) {
            var deferred = Q.defer();
            addLibraryOrg(node, name, libraryRootHash, libraryInfo, deferred.resolve);

            return deferred.promise.nodeify(callback);
        };

        var updateLibraryOrg = this.updateLibrary;
        this.updateLibrary = function (node, name, updatedLibraryRootHash, libraryInfo, updateInstructions, callback) {
            var deferred = Q.defer();
            updateLibraryOrg(node, name, updatedLibraryRootHash, libraryInfo, updateInstructions, function (err, result) {
                if (err) {
                    deferred.reject(err);
                } else {
                    deferred.resolve(result);
                }
            });

            return deferred.promise.nodeify(callback);
        };

        var traverseOrg = this.traverse;
        this.traverse = function (node, options, visitFn, callback) {
            var deferred = Q.defer();
            traverseOrg(node, options, visitFn, function (err, result) {
                if (err) {
                    deferred.reject(err);
                } else {
                    deferred.resolve(result);
                }
            });
            return deferred.promise.nodeify(callback);
        };

        var loadInstancesOrg = this.loadInstances;
        this.loadInstances = function (node, callback) {
            var deferred = Q.defer();
            loadInstancesOrg(node, function (err, res) {
                if (err) {
                    deferred.reject(err instanceof Error ? err : new Error(err));
                } else {
                    deferred.resolve(res);
                }
            });

            return deferred.promise.nodeify(callback);
        };
    }

    CoreQ.prototype = Object.create(Core.prototype);
    CoreQ.prototype.constructor = CoreQ;

    return CoreQ;
});