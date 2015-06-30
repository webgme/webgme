/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define(['common/regexp', 'q'], function (REGEXP, Q) {
    'use strict';

    function getRoot(parameters, callback) {
        var deferred = Q.defer(),
            loadRoot = function (hash) {
                parameters.core.loadRoot(hash, function (err, root) {
                    if (err) {
                        deferred.reject(err);
                        return;
                    }

                    result.root = root;
                    deferred.resolve(result);
                });
            },
            loadCommit = function (hash) {
                result.commitHash = hash;
                parameters.project.loadObject(hash, function (err, commitObj) {
                    if (err) {
                        deferred.reject(err);
                        return;
                    }

                    result.rootHash = commitObj.root;
                    loadRoot(commitObj.root);
                });
            },
            result = {};

        if (REGEXP.HASH.test(parameters.id)) {
            loadCommit(parameters.id);
        } else {
            parameters.project.getBranches(function (err, branches) {
                if (err) {
                    deferred.reject(err);
                    return;
                }
                if (branches[parameters.id]) {
                    result.branchName = parameters.id;
                    loadCommit(branches[parameters.id]);
                } else {
                    deferred.reject(new Error('there is no branch [' + parameters.id + '] in the project'));
                    return;
                }
            });
        }

        return deferred.promise.nodeify(callback);
    }

    return getRoot;
});