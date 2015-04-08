/*jshint node: true*/
/**
 * @author kecso / https://github.com/kecso
 */

var HASH_REGEXP = new RegExp('^#[0-9a-zA-Z_]*$'),
    BRANCH_REGEXP = new RegExp('^[0-9a-zA-Z_]*$'),
    Q = require('q'),
    WebGME = require('../../webgme'),
    FS = require('fs'),
    path = require('path'),
    gmeConfig = require(path.join(process.cwd(), 'config')),
    Core = WebGME.core,
    Storage = WebGME.serverUserStorage;

var merge = function (mongoUri, projectId, sourceBranchOrCommit, targetBranchOrCommit, autoMerge, callback) {
        'use strict';
        gmeConfig.mongo.uri = mongoUri || gmeConfig.mongo.uri;

        var logger = WebGME.Logger.create('gme:bin:merge', gmeConfig.bin.log),
            database = new Storage({ globConf: gmeConfig, logger: logger.fork('storage') }),
            project,
            core,
            myCommitHash,
            theirCommitHash,
            baseCommitHash,
            myDiff,
            theirDiff,
            baseRoot,
            myRoot,
            theirRoot,
            conflict,
            error = null,
            result = {},
            getRoot = function (commitHash, next) {
                project.loadObject(commitHash, function (err, commit) {
                    if (err || !commit) {
                        next(err || new Error('unknown commit hash: ', commitHash));
                        return;
                    }
                    core.loadRoot(commit.root, next);
                });
            },
            finishUp = function () {
                try {
                    project.closeProject(function (err) {
                        if (err) {
                            callback(error || err, result);
                            return;
                        }
                        database.closeDatabase(function (err) {
                            callback(error || err, result);
                        });
                    });
                } catch (err) {
                    try {
                        database.closeDatabase(function (err) {
                            callback(error || err, result);
                        });
                    } catch (err) {
                        callback(error || err, result);
                    }
                }
            };

        database.openDatabase(function (err) {
            if (err) {
                error = err;
                finishUp();
                return;
            }
            database.openProject(projectId, function (err, p) {
                var baseCommitCalculated = function (err, bc) {
                        if (err) {
                            error = error || err;
                            finishUp();
                            return;
                        }
                        baseCommitHash = bc;
                        result.baseCommitHash = bc;
                        needed = 2;

                        getRoot(baseCommitHash, function (err, root) {
                            if (err || !root) {
                                error = error || err || new Error('unknown root object');
                                finishUp();
                                return;
                            }
                            baseRoot = root;

                            calculateDiff(true, diffCalculated);
                            calculateDiff(false, diffCalculated);
                        });

                    },
                    diffCalculated = function (err) {
                        error = error || err;
                        if (--needed === 0) {
                            if (error) {
                                finishUp();
                                return;
                            }
                            diffsGenerated();
                        }
                    },
                    calculateDiff = function (isMine, next) {
                        var commitHash = isMine ? myCommitHash : theirCommitHash;

                        getRoot(commitHash, function (err, root) {
                            if (err || !root) {
                                next(err || new Error('unknown object'));
                                return;
                            }
                            if (isMine) {
                                myRoot = root;
                            } else {
                                theirRoot = root;
                            }
                            core.generateTreeDiff(baseRoot, root, function (err, diff) {
                                if (err) {
                                    next(err);
                                    return;
                                }

                                if (isMine) {
                                    myRoot = root;
                                    myDiff = diff;
                                    result.diff = result.diff || {};
                                    result.diff.mine = diff;
                                } else {
                                    theirRoot = root;
                                    theirDiff = diff;
                                    result.diff = result.diff || {};
                                    result.diff.theirs = diff;
                                }
                                next();
                            });
                        });
                    },
                    diffsGenerated = function () {
                        //so we are ready with the first phase, let's create the conflict object
                        conflict = core.tryToConcatChanges(myDiff, theirDiff);
                        result.confilct = conflict;
                        var autoFailureReason;

                        if (autoMerge === true && conflict !== null && conflict.items.length === 0) {
                            //we try to apply our merge if possible
                            core.applyTreeDiff(baseRoot, conflict.merge, function (err) {
                                if (err) {
                                    error = err;
                                    finishUp();
                                    return;
                                }
                                core.persist(baseRoot, function (err) {
                                    if (err) {
                                        error = err;
                                        finishUp();
                                        return;
                                    }
                                    var newHash = core.getHash(baseRoot),
                                        newCommitHash = project.makeCommit([myCommitHash, theirCommitHash], newHash, 'merging [' +
                                        sourceBranchOrCommit + '] into [' + targetBranchOrCommit + ']', function (err) {
                                            if (err) {
                                                error = err;
                                                finishUp();
                                                return;
                                            }
                                            result.finalCommitHash = newCommitHash;

                                            if (BRANCH_REGEXP.test(targetBranchOrCommit)) {
                                                //we updates the branch as well
                                                project.setBranchHash(targetBranchOrCommit, theirCommitHash, newCommitHash, function (err) {
                                                    if (err) {
                                                        error = err;
                                                        finishUp();
                                                        return;
                                                    }
                                                    result.updatedBranch = targetBranchOrCommit;
                                                    finishUp();
                                                });
                                            } else {
                                                finishUp();
                                            }
                                        });
                                });
                            });

                        } else {
                            if (autoMerge === true) {
                                if (conflict === null) {
                                    autoFailureReason = ' cannot do automatic merge as empty conflict object was generated';
                                } else if (conflict.item.length > 0) {
                                    autoFailureReason = 'cannot do automatic merge as there are conflicts that cannot be resolved';
                                }
                                error = error || new Error(autoFailureReason);
                                finishUp();
                            }
                        }
                    },
                    needed,
                    commitSearched = function (err) {
                        error = error || err;
                        if (--needed === 0) {
                            //we can go to the next step
                            if (error) {
                                finishUp();
                                return;
                            }
                            project.getCommonAncestorCommit(myCommitHash, theirCommitHash, baseCommitCalculated);
                        }
                    },
                    getCommitHash = function (isMine, inputIdentifier, next) {
                        if (HASH_REGEXP.test(inputIdentifier)) {
                            if (isMine) {
                                myCommitHash = inputIdentifier;
                            } else {
                                theirCommitHash = inputIdentifier;
                            }
                            next();
                        } else if (BRANCH_REGEXP.test(inputIdentifier)) {
                            project.getBranchNames(function (err, names) {
                                if (err) {
                                    next(err);
                                    return;
                                }
                                if (!names[inputIdentifier]) {
                                    next('unknown branch [' + inputIdentifier + ']');
                                    return;
                                }

                                if (isMine) {
                                    myCommitHash = names[inputIdentifier];
                                } else {
                                    theirCommitHash = names[inputIdentifier];
                                }
                                next();
                            });
                        }
                    };

                if (err) {
                    callback(err, result);
                    return;
                }
                project = p;
                core = new Core(project, {globConf: gmeConfig});

                needed = 2;
                getCommitHash(true, sourceBranchOrCommit, commitSearched);
                getCommitHash(false, targetBranchOrCommit, commitSearched);
            });
        });
    },
    main = function (argv) {
        'use strict';
        var Command = require('commander').Command,
            program = new Command(),
            mainDeferred = Q.defer();

        console.log(argv);
        program
            .version('0.1.0')
            .option('-m, --mongo-database-uri [uri]', 'URI to connect to mongoDB where the project is stored')
            .option('-p, --project-identifier [value]', 'project identifier')
            .option('-M, --mine [branch/commit]', 'my version of the project')
            .option('-T, --theirs [branch/commit]', 'their version of the project')
            .option('-P, --path-prefix [value]', 'path prefix for the output diff files')
            .option('-a, --auto-merge', 'if given then we try to automatically merge into their branch/commit')
            .parse(argv);

        //check necessary arguments
        if (!program.mongoDatabaseUri && !gmeConfig.mongo.uri) {
            console.log('there is no preconfigured mongoDb commection so the mongo-database-uri parameter is mandatory');
            program.outputHelp();
            mainDeferred.reject(new SyntaxError('invalid mongo database connection parameter'));
            return;
        }
        if (!program.projectIdentifier) {
            program.outputHelp();
            mainDeferred.reject(new SyntaxError('project identifier is a mandatory parameter!'));
            return mainDeferred.promise;
        }
        if (!program.mine) {
            program.outputHelp();
            mainDeferred.reject(new SyntaxError('my branch/commit parameter is mandatory!'));
            return mainDeferred.promise;
        } else if (!(HASH_REGEXP.test(program.mine) || BRANCH_REGEXP.test(program.mine))) {
            program.outputHelp();
            mainDeferred.reject(new SyntaxError('invalid \'mine\' parameter!'));
            return mainDeferred.promise;
        }
        if (!program.theirs) {
            program.outputHelp();
            mainDeferred.reject(new SyntaxError('their branch/commit parameter is mandatory!'));
            return mainDeferred.promise;
        } else if (!(HASH_REGEXP.test(program.theirs) || BRANCH_REGEXP.test(program.theirs))) {
            program.outputHelp();
            mainDeferred.reject(new SyntaxError('invalid \'theirs\' parameter!'));
            return mainDeferred.promise;
        }

        merge(program.mongoDatabaseUri, program.projectIdentifier, program.mine, program.theirs, program.autoMerge, function (err, result) {
            if (err) {
                console.warn('merging failed: ', err);
            }
            //it is possible that we have enough stuff to still print some results to the screen or to some file
            if (result.updatedBranch) {
                console.log('branch [' + result.updatedBranch + '] was successfully updated with the merged result');
            } else if (result.finalCommitHash) {
                console.log('merge was successfully saved to commit [' + result.finalCommitHash + ']');
            } else if (result.baseCommitHash && result.diff.mine && result.diff.theirs) {
                console.log('to finish merge you have to apply your changes to commit[' + result.baseCommitHash + ']');
            }

            if (program.pathPrefix) {
                if (result.diff.mine && result.diff.theirs) {
                    FS.writeFileSync(program.pathPrefix + '.mine', JSON.stringify(result.diff.mine, null, 2));
                    FS.writeFileSync(program.pathPrefix + '.theirs', JSON.stringify(result.diff.theirs, null, 2));
                    if (result.conflict) {
                        FS.writeFileSync(program.pathPrefix + '.conflict', JSON.stringify(result.conflict, null, 2));
                    }
                }
            } else if (!result.updatedBranch && !result.finalCommitHash) {
                //if there were no prefix given we put anything to console only if the merge failed at some point or was not even tried
                if (result.diff.mine && result.diff.theirs) {
                    console.log('diff base->mine:');
                    console.log(JSON.stringify(result.diff.mine, null, 2));
                    console.log('diff base->theirs:');
                    console.log(JSON.stringify(result.diff.theirs, null, 2));
                    if (result.conflict) {
                        console.log('conflict object:');
                        console.log(JSON.stringify(result.conflict, null, 2));
                    }
                }
            }
            mainDeferred.resolve();
        });
        return mainDeferred.promise;
    };

module.exports = {
    main: main,
    merge: merge
};
if (require.main === module) {
    main(process.argv)
        .then(function () {
            'use strict';
            console.log('Done');
        })
        .catch(function (err) {
            'use strict';
            console.error('ERROR : ' + err);
        });
}
