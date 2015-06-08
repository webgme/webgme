/*globals define, console*/
/*jshint browser: true*/
/**
 * @author kecso / https://github.com/kecso
 */

//TODO this module has all the merge related functions and is not used in the client right now.
define(['common/util/assert'], function (ASSERT) {
    'use strict';
    function Merge(_clientGlobal) {
        function merge(whereBranch, whatCommit, whereCommit, callback) {
            ASSERT(_clientGlobal.project &&
                typeof whatCommit === 'string' &&
                typeof whereCommit === 'string' &&
                typeof callback === 'function');
            _clientGlobal.project.getCommonAncestorCommit(whatCommit, whereCommit, function (err, baseCommit) {
                if (!err && baseCommit) {
                    var base, what, where, baseToWhat, baseToWhere, rootNeeds = 3,
                        error = null,
                        rootsLoaded = function () {
                            var needed = 2,
                                error = null;
                            _clientGlobal.core.generateTreeDiff(base, what, function (err, diff) {
                                error = error || err;
                                baseToWhat = diff;
                                if (--needed === 0) {
                                    if (!error) {
                                        diffsGenerated();
                                    } else {
                                        callback(error);
                                    }
                                }
                            });
                            _clientGlobal.core.generateTreeDiff(base, where, function (err, diff) {
                                error = error || err;
                                baseToWhere = diff;
                                if (--needed === 0) {
                                    if (!error) {
                                        diffsGenerated();
                                    } else {
                                        callback(error);
                                    }
                                }
                            });
                        },
                        diffsGenerated = function () {
                            var conflict = _clientGlobal.core.tryToConcatChanges(baseToWhere, baseToWhat);
                            console.log('conflict object', conflict);
                            if (conflict.items.length === 0) {
                                //no conflict
                                callback(null, conflict);
                                /*
                                 _clientGlobal.core.applyTreeDiff(base,conflict.merge,function(err){
                                 if(err){
                                 return callback(err);
                                 }
                                 _clientGlobal.core.persist(base,function(err){
                                 if(err){
                                 callback(err);
                                 } else {
                                 var newHash = _project.makeCommit([whatCommit,whereCommit],
                                 _clientGlobal.core.getHash(base), 'merging', function(err){
                                 if(err){
                                 callback(err);
                                 } else {
                                 _project.setBranchHash(whereBranch,whereCommit,newHash,callback);
                                 }
                                 });
                                 }
                                 });
                                 });*/
                            } else {
                                callback(null, conflict);
                            }
                            /*var endingWhatDiff = _clientGlobal.core.concatTreeDiff(baseToWhere,baseToWhat),
                             endingWhereDiff = _clientGlobal.core.concatTreeDiff(baseToWhat,baseToWhere);
                             console.log('kecso endingwhatdiff',endingWhatDiff);
                             console.log('kecso endingwherediff',endingWhereDiff);
                             if(_clientGlobal.core.isEqualDifferences(endingWhereDiff,endingWhatDiff)){
                             _clientGlobal.core.applyTreeDiff(base,endingWhatDiff,function(err){
                             if(err){
                             callback(err);
                             } else {
                             _clientGlobal.core.persist(base,function(err){
                             if(err){
                             callback(err);
                             } else {
                             var newHash = _project.makeCommit([whatCommit,whereCommit],
                             _clientGlobal.core.getHash(base), 'merging', function(err){
                             if(err){
                             callback(err);
                             } else {
                             console.log('setting branch hash after merge');
                             _project.setBranchHash(whereBranch,whereCommit,newHash,callback);
                             }
                             });
                             }
                             });
                             }

                             });
                             } else {
                             callback(new Error('there is a conflict...'),{
                             baseObject:base,
                             baseCommit:baseCommit,
                             branch: whereBranch,
                             mine:endingWhereDiff,
                             mineCommit: whereCommit,
                             theirs:endingWhatDiff,
                             theirsCommit:whatCommit,
                             conflictItems:_clientGlobal.core.getConflictItems(endingWhereDiff,endingWhatDiff)});
                             }*/
                        };

                    _clientGlobal.project.loadObject(baseCommit, function (err, baseCommitObject) {
                        error = error || err;
                        if (!error && baseCommitObject) {
                            _clientGlobal.core.loadRoot(baseCommitObject.root, function (err, r) {
                                error = error || err;
                                base = r;
                                if (--rootNeeds === 0) {
                                    if (!error) {
                                        rootsLoaded();
                                    } else {
                                        callback(error);
                                    }
                                }
                            });
                        } else {
                            error = error || new Error('cannot load common ancestor commit');
                            if (--rootNeeds === 0) {
                                callback(error);
                            }
                        }
                    });
                    _clientGlobal.project.loadObject(whatCommit, function (err, whatCommitObject) {
                        error = error || err;
                        if (!error && whatCommitObject) {
                            _clientGlobal.core.loadRoot(whatCommitObject.root, function (err, r) {
                                error = error || err;
                                what = r;
                                if (--rootNeeds === 0) {
                                    if (!error) {
                                        rootsLoaded();
                                    } else {
                                        callback(error);
                                    }
                                }
                            });
                        } else {
                            error = error || new Error('cannot load the commit to merge');
                            if (--rootNeeds === 0) {
                                callback(error);
                            }
                        }
                    });
                    _clientGlobal.project.loadObject(whereCommit, function (err, whereCommitObject) {
                        error = error || err;
                        if (!error && whereCommitObject) {
                            _clientGlobal.core.loadRoot(whereCommitObject.root, function (err, r) {
                                error = error || err;
                                where = r;
                                if (--rootNeeds === 0) {
                                    if (!error) {
                                        rootsLoaded();
                                    } else {
                                        callback(error);
                                    }
                                }
                            });
                        } else {
                            error = error || new Error('cannot load the commit to merge into');
                            if (--rootNeeds === 0) {
                                callback(error);
                            }
                        }
                    });
                } else {
                    callback(err || new Error('we cannot locate common ancestor commit!!!'));
                }
            });
        }

        function resolve(baseObject, mineDiff, branch, mineCommit, theirsCommit, resolvedConflictItems, callback) {
            mineDiff = _clientGlobal.core.applyResolution(mineDiff, resolvedConflictItems);
            _clientGlobal.core.applyTreeDiff(baseObject, mineDiff, function (err) {
                if (err) {
                    callback(err);
                } else {
                    _clientGlobal.core.persist(baseObject, function (err) {
                        if (err) {
                            callback(err);
                        } else {
                            var newHash = _clientGlobal.project.makeCommit([theirsCommit, mineCommit],
                                _clientGlobal.core.getHash(baseObject),
                                'merging',
                                function (err) {
                                    if (err) {
                                        callback(err);
                                    } else {
                                        console.log('setting branch hash after merge');
                                        _clientGlobal.project.setBranchHash(branch, mineCommit, newHash, callback);
                                    }
                                }
                            );
                        }
                    });
                }
            });
        }

        //TODO these functions or some successors will be needed when the UI will handle merge tasks!!!
        //TODO probably it would be a good idea to put this functionality to server
        function getBaseOfCommits(one, other, callback) {
            _clientGlobal.project.getCommonAncestorCommit(one, other, callback);
        }

        //TODO probably this would also beneficial if this would work on server as well
        function getDiffTree(from, to, callback) {
            var needed = 2,
                error = null,
                core = _clientGlobal.functions.getNewCore(_clientGlobal.project, _clientGlobal.gmeConfig),
                fromRoot = {root: {}, commit: from},
                toRoot = {root: {}, commit: to},
                rootsLoaded = function () {
                    if (error) {
                        return callback(error, {});
                    }
                    _clientGlobal.core.generateTreeDiff(fromRoot.root, toRoot.root, callback);
                },
                loadRoot = function (root) {
                    _clientGlobal.project.loadObject(root.commit, function (err, c) {
                        error = error || ( err || c ? null : new Error('no commit object was found'));
                        if (!err && c) {
                            core.loadRoot(c.root, function (err, r) {
                                error = error || ( err || r ? null : new Error('no root was found'));
                                root.root = r;
                                if (--needed === 0) {
                                    rootsLoaded();
                                }
                            });
                        } else {
                            if (--needed === 0) {
                                rootsLoaded();
                            }
                        }
                    });
                };
            loadRoot(fromRoot);
            loadRoot(toRoot);

        }

        function getConflictOfDiffs(base, extension) {
            return _clientGlobal.core.tryToConcatChanges(base, extension);
        }

        function getResolve(resolveObject) {
            return _clientGlobal.core.applyResolution(resolveObject);
        }

        //TODO move to server
        function applyDiff(branch, baseCommitHash, branchCommitHash, parents, diff, callback) {
            _clientGlobal.project.loadObject(baseCommitHash, function (err, cObject) {
                var core = _clientGlobal.functions.getNewCore(_clientGlobal.project, _clientGlobal.gmeConfig);
                if (!err && cObject) {
                    core.loadRoot(cObject.root, function (err, root) {
                        if (!err && root) {
                            core.applyTreeDiff(root, diff, function (err) {
                                if (err) {
                                    return callback(err);
                                }

                                core.persist(root, function (err) {
                                    if (err) {
                                        return callback(err);
                                    }

                                    var newHash = _clientGlobal.project.makeCommit(parents,
                                        core.getHash(root), 'merging', function (err) {
                                        if (err) {
                                            return callback(err);
                                        }
                                        _clientGlobal.project.setBranchHash(branch,
                                            branchCommitHash, newHash, callback);
                                    });
                                });
                            });
                        } else {
                            callback(err || new Error('no root was found'));
                        }
                    });
                } else {
                    callback(err || new Error('no commit object was found'));
                }
            });
        }

        return {
            merge: merge,
            resolve: resolve,
            applyDiff: applyDiff,
            getResolve: getResolve,
            getConflictOfDiffs: getConflictOfDiffs,
            getDiffTree: getDiffTree,
            getBaseOfCommits: getBaseOfCommits
        };
    }

    return Merge;
});