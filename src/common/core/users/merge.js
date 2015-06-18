/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define(['common/regexp', 'common/core/core', 'common/storage/constants', 'q'], function (REGEXP, Core, CONSTANTS, Q) {
    'use strict';

    function save(parameters, callback) {
        var deferred = Q.defer(),
            persisted = parameters.core.persist(parameters.root),
            newRootHash;

        if (persisted.hasOwnProperty('objects') === false) {
            parameters.logger.warn('empty patch was inserted - not making commit');
            deferred.resolve({});
            return deferred.promise.nodeify(callback);
        }

        newRootHash = parameters.core.getHash(parameters.root);

        //must use ASYNC version of makeCommit to allow usability from different project sources
        parameters.project.makeCommit(
            parameters.branchName || null,
            parameters.parents,
            newRootHash,
            persisted.objects,
            parameters.msg, function (err, saveResult) {
                if (err) {
                    deferred.reject(err);
                    return;
                }
                saveResult.root = parameters.root;
                saveResult.rootHash = newRootHash;

                deferred.resolve(saveResult);
            });

        return deferred.promise.nodeify(callback);
    }

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

    function diff(parameters, callback) {
        var deferred = Q.defer(),
            core = new Core(parameters.project, {
                globConf: parameters.gmeConfig,
                logger: parameters.logger.fork('core')
            });

        Q.all([
            getRoot({project: parameters.project, core: core, id: parameters.branchOrCommitA}),
            getRoot({project: parameters.project, core: core, id: parameters.branchOrCommitB})
        ])
            .then(function (results) {
                core.generateTreeDiff(results[0].root, results[1].root, function (err, diff) {
                    if (err) {
                        deferred.reject(err);
                        return;
                    }
                    deferred.resolve(diff);
                });
            })
            .catch(deferred.reject);

        return deferred.promise.nodeify(callback);
    }

    function apply(parameters, callback) {
        var core = new Core(parameters.project, {
                globConf: parameters.gmeConfig,
                logger: parameters.logger.fork('core')
            }),
            applyDeferred = Q.defer(),
            branchName = null;

        getRoot({project: parameters.project, core: core, id: parameters.branchOrCommit})
            .then(function (result) {
                var deferred = Q.defer();

                core.applyTreeDiff(result.root, parameters.patch, function (err) {
                    if (err) {
                        deferred.reject(err);
                        return;
                    }

                    if (result.branchName && !parameters.noUpdate) {
                        branchName = result.branchName;
                    }

                    save({
                        project: parameters.project,
                        core: core,
                        root: result.root,
                        parents: parameters.parents || [result.commitHash],
                        branchName: branchName,
                        msg: parameters.msg || 'applying patch'
                    })
                        .then(function (saveResult) {
                            deferred.resolve(saveResult);
                        })
                        .catch(deferred.reject);
                });

                return deferred.promise;
            })
            .then(function (saveResult) {
                applyDeferred.resolve(saveResult);
            })
            .catch(applyDeferred.reject);

        return applyDeferred.promise.nodeify(callback);
    }

    function merge(parameters, callback) {
        var deferred = Q.defer(),
            result = {},
            theirRoot = null,
            myRoot = null,
            core = new Core(parameters.project, {
                globConf: parameters.gmeConfig,
                logger: parameters.logger.fork('core')
            }),
            branchName = REGEXP.HASH.test(parameters.theirBranchOrCommit) ? null : parameters.theirBranchOrCommit;

        Q.all([
            getRoot({project: parameters.project, core: core, id: parameters.myBranchOrCommit}),
            getRoot({project: parameters.project, core: core, id: parameters.theirBranchOrCommit})
        ])
            .then(function (results) {
                myRoot = results[0].root;
                theirRoot = results[1].root;
                result.myCommitHash = results[0].commitHash;
                result.theirCommitHash = results[1].commitHash;

                return Q.nfcall(parameters.project.getCommonAncestorCommit,
                    result.myCommitHash, result.theirCommitHash);
            })
            .then(function (commitHash) {
                result.baseCommitHash = commitHash;
                return Q.all([
                    diff({
                        gmeConfig: parameters.gmeConfig,
                        logger: parameters.logger,
                        project: parameters.project,
                        branchOrCommitA: result.baseCommitHash,
                        branchOrCommitB: parameters.myBranchOrCommit
                    }),
                    diff({
                        gmeConfig: parameters.gmeConfig,
                        logger: parameters.logger,
                        project: parameters.project,
                        branchOrCommitA: result.baseCommitHash,
                        branchOrCommitB: parameters.theirBranchOrCommit
                    })
                ]);
            })
            .then(function (diffs) {
                result.diff = {
                    mine: diffs[0],
                    theirs: diffs[1]
                };

                result.conflict = core.tryToConcatChanges(result.diff.mine, result.diff.theirs);
                if (!parameters.auto) {
                    deferred.resolve(result);
                    return;
                }

                if (!result.conflict) {
                    throw new Error('error during merged patch calculation');
                }

                if (result.conflict.items.length > 0) {
                    //the user will find out that there were no update done
                    deferred.resolve(result);
                    return;
                }

                return apply({
                    gmeConfig: parameters.gmeConfig,
                    logger: parameters.logger,
                    project: parameters.project,
                    branchOrCommit: result.baseCommitHash,
                    noUpdate: true,
                    patch: result.conflict.merge,
                    parents: [result.theirCommitHash, result.myCommitHash]
                });
            })
            .then(function (applyResult) {
                //we made the commit, but now we also have try to update the branch of necessary
                result.finalCommitHash = applyResult.hash;
                if (!branchName) {
                    deferred.resolve(result);
                    return;
                }

                parameters.project.setBranchHash(
                    branchName,
                    result.finalCommitHash,
                    result.theirCommitHash,
                    function (err) {
                        if (!err) {
                            result.updatedBranch = branchName;
                        }
                        deferred.resolve(result);
                    }
                );
            })
            .catch(deferred.reject);

        return deferred.promise.nodeify(callback);
    }

    return {
        merge: merge,
        diff: diff,
        apply: apply
    };
});