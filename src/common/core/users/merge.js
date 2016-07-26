/*globals define*/
/*jshint node: true, browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define([
    'common/regexp',
    'common/core/coreQ',
    'common/storage/constants',
    'q',
    'common/core/users/getroot'
], function (REGEXP,
             Core,
             CONSTANTS,
             Q,
             getRoot) {
    'use strict';

    function save(parameters, callback) {
        var persisted = parameters.core.persist(parameters.root),
            newRootHash;

        if (persisted.hasOwnProperty('objects') === false || Object.keys(persisted.objects).length === 0) {
            parameters.logger.warn('empty patch was inserted - not making commit');
            return Q({
                hash: parameters.parents[0], //if there is no change, we return the first parent!!!
                branchName: parameters.branchName
            })
                .nodeify(callback);
        }

        newRootHash = parameters.core.getHash(parameters.root);

        //must use ASYNC version of makeCommit to allow usability from different project sources
        return parameters.project.makeCommit(
            parameters.branchName || null,
            parameters.parents,
            newRootHash,
            persisted.objects,
            parameters.msg)
            .then(function (saveResult) {
                saveResult.root = parameters.root;
                saveResult.rootHash = newRootHash;

                return saveResult;
            });
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

    /**
     *
     * @param {object} parameters
     * @param {object} parameters.gmeConfig
     * @param {object} parameters.logger
     * @param {object} parameters.project
     * @param {string} parameters.branchOrCommit
     * @param {string} [parameters.branchName]
     * @param {boolean} [parameters.noUpdate=false]
     * @param callback
     * @returns {*}
     */
    function apply(parameters, callback) {
        var core = new Core(parameters.project, {
                globConf: parameters.gmeConfig,
                logger: parameters.logger.fork('core')
            }),
            rootsResult,
            branchName = parameters.branchName;

        return getRoot({project: parameters.project, core: core, id: parameters.branchOrCommit})
            .then(function (result) {
                rootsResult = result;

                return core.applyTreeDiff(rootsResult.root, parameters.patch);
            })
            .then(function () {
                if (rootsResult.branchName && !parameters.noUpdate) {
                    branchName = branchName || rootsResult.branchName;
                }

                return save({
                    project: parameters.project,
                    logger: parameters.logger,
                    core: core,
                    root: rootsResult.root,
                    parents: parameters.parents || [rootsResult.commitHash],
                    branchName: branchName,
                    msg: parameters.msg || 'applying patch'
                });
            })
            .nodeify(callback);
    }

    /**
     *
     * @param parameters
     * @param callback
     * @returns {*}
     */
    function merge(parameters, callback) {
        var deferred = Q.defer(),
            result = {},
            theirRoot = null,
            myRoot = null,
            core = new Core(parameters.project, {
                globConf: parameters.gmeConfig,
                logger: parameters.logger.fork('core')
            }),
            startTime = Date.now(),
            branchName;

        // Allow to tie down commit and still update branch.
        branchName = parameters.branchName ||
        REGEXP.HASH.test(parameters.theirBranchOrCommit) ? null : parameters.theirBranchOrCommit;

        function updateBranch() {
            return parameters.project.setBranchHash(
                branchName,
                result.finalCommitHash,
                result.theirCommitHash)
                .then(function (commitResult) {
                    if (commitResult.status !== CONSTANTS.FORKED) {
                        // Branch was updated
                        result.updatedBranch = branchName;
                    } else {
                        parameters.logger.debug('merged commit forked', commitResult);
                    }
                });
        }

        function doMerge() {
            var mergeDeferred = Q.defer(),
                noApply = false;

            Q.allSettled([
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
            ])
                .then(function (diffs) {
                    if (diffs[0].state === 'rejected') {
                        parameters.logger.error('Initial diff generation failed (base->mine)', diffs[0].reason);
                        throw diffs[0].reason;
                    }
                    if (diffs[1].state === 'rejected') {
                        parameters.logger.error('Initial diff generation failed (base->theirs)', diffs[1].reason);
                        throw diffs[1].reason;
                    }
                    result.diff = {
                        mine: diffs[0].value,
                        theirs: diffs[1].value
                    };

                    result.conflict = core.tryToConcatChanges(result.diff.mine, result.diff.theirs);
                    if (!parameters.auto) {
                        noApply = true;
                        return;
                    }

                    if (!result.conflict) {
                        parameters.logger.error('Initial diff concatenation failed');
                        throw new Error('error during merged patch calculation');
                    }

                    if (result.conflict.items.length > 0) {
                        //the user will find out that there were no update done
                        if (branchName) {
                            result.targetBranchName = branchName;
                        }
                        result.projectId = parameters.project.projectId;
                        noApply = true;
                        return;
                    }

                    return apply({
                        gmeConfig: parameters.gmeConfig,
                        logger: parameters.logger,
                        project: parameters.project,
                        branchOrCommit: result.baseCommitHash,
                        patch: result.conflict.merge,
                        parents: [result.theirCommitHash, result.myCommitHash]
                    });
                })
                .then(function (applyResult) {
                    if (noApply) {
                        return;
                    }
                    //we made the commit, but now we also have try to update the branch of necessary
                    result.finalCommitHash = applyResult.hash;
                    if (branchName) {
                        result.targetBranchName = branchName;
                        return updateBranch();
                    }
                })
                .then(mergeDeferred.resolve)
                .catch(mergeDeferred.reject);

            return mergeDeferred.promise;
        }

        Q.allSettled([
            getRoot({project: parameters.project, core: core, id: parameters.myBranchOrCommit}),
            getRoot({project: parameters.project, core: core, id: parameters.theirBranchOrCommit})
        ])
            .then(function (results) {
                myRoot = results[0].value.root;
                theirRoot = results[1].value.root;
                result.myCommitHash = results[0].value.commitHash;
                result.theirCommitHash = results[1].value.commitHash;

                return Q.nfcall(parameters.project.getCommonAncestorCommit,
                    result.myCommitHash, result.theirCommitHash);
            })
            .then(function (commitHash) {
                result.baseCommitHash = commitHash;

                //no change
                if (result.myCommitHash === result.baseCommitHash) {
                    if (branchName) {
                        result.updatedBranch = branchName;
                    }
                    result.finalCommitHash = result.theirCommitHash;
                    return;
                }

                //check fast-forward
                if (result.theirCommitHash === result.baseCommitHash) {
                    result.finalCommitHash = result.myCommitHash;
                    if (branchName) {
                        return updateBranch();
                    }
                    return;
                }

                return doMerge();
            })
            .then(function () {
                var ms = Date.now() - startTime,
                    min = Math.floor(ms/1000/60),
                    sec = (ms/1000) % 60;
                parameters.logger.debug('Merge exec time', min, 'min', sec, 'sec');
                deferred.resolve(result);
            })
            .catch(deferred.reject);

        return deferred.promise.nodeify(callback);
    }

    function resolve(parameters, callback) {
        var deferred = Q.defer(),
            core = new Core(parameters.project, {
                globConf: parameters.gmeConfig,
                logger: parameters.logger.fork('core')
            }),
            finalPatch = core.applyResolution(parameters.partial.conflict);

        //TODO error handling should be checked - can the applyResolution fail???

        apply({
            gmeConfig: parameters.gmeConfig,
            logger: parameters.logger,
            project: parameters.project,
            branchOrCommit: parameters.partial.baseCommitHash,
            noUpdate: true,
            patch: finalPatch,
            parents: [parameters.partial.theirCommitHash, parameters.partial.myCommitHash],
            msg: 'merge with resolved conflicts'
        })
            .then(function (applyResult) {
                var result = {
                    hash: applyResult.hash
                };
                //we made the commit, but now we also have try to update the branch of necessary
                if (!parameters.partial.targetBranchName) {
                    deferred.resolve(applyResult.hash);
                    return;
                }

                parameters.project.setBranchHash(
                    parameters.partial.targetBranchName,
                    applyResult.hash,
                    parameters.partial.theirCommitHash,
                    function (err) {
                        if (!err) {
                            result.updatedBranch = parameters.partial.targetBranchName;
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
        apply: apply,
        resolve: resolve
    };
});