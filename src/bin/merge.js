/**
 * Created by tamas on 2/17/15.
 */
/**
 * Created by tamas on 2/17/15.
 */

var program = require('commander'),
    HASH_REGEXP = new RegExp("^#[0-9a-zA-Z_]*$"),
    BRANCH_REGEXP = new RegExp("^[0-9a-zA-Z_]*$"),
    requirejs = require('requirejs'),
    FS = require('fs'),
    Core,
    Storage,
    TASYNC;
requirejs.config({
    paths:{
        'core': './../../src/common/core',
        'storage': './../../src/common/storage',
        'util': './../../src/common/util'
    }
});
Core = requirejs('core/core');
Storage = requirejs('storage/serveruserstorage');

program
    .version('0.1.0')
    .option('-m, --mongo-database-uri [url]', 'URI to connect to mongoDB where the project is stored')
    .option('-p, --project-identifier [value]', 'project identifier')
    .option('-M, --mine [branch/commit]', 'my version of the project')
    .option('-T, --theirs [branch/commit]', 'their version of the project')
    .option('-P, --path-prefix [value]', 'path prefix for the output diff files')
    .option('-a, --auto-merge', 'if given then we try to automatically merge into their branch/commit')
    .parse(process.argv);
//check necessary arguments
if(!program.mongoDatabaseUri){
    console.warn('mongoDB URL is a mandatory parameter!');
    process.exit(0);
}
if(!program.projectIdentifier){
    console.warn('project identifier is a mandatory parameter!');
    process.exit(0);
}
if(!program.mine){
    console.warn('my branch/commit is a mandatory parameter!');
    process.exit(0);
}
if(!program.theirs){
    console.warn('their branch/commit is a mandatory parameter!');
    process.exit(0);
}

//connecting to mongoDB and opening project
var database = new Storage({uri:program.mongoDatabaseUri,log:{debug:function(msg){},error:function(msg){}}}), //we do not want debugging
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
    getRoot = function(commitHash,next){
        project.loadObject(commitHash,function(err,commit){
            if(err || !commit){
                next(err || new Error('unknown commit hash: ',commitHash));
                return;
            }
            core.loadRoot(commit.root,next);
        });
    },
    finishUp = function(){
        try{
            project.closeProject(function(err){
                if(err){
                    console.warn(err);
                    process.exit(0);
                }
                database.closeDatabase(function(err){
                    if(err){
                        console.warn(err);
                    }
                    process.exit(0);
                });
            });
        } catch(err) {
            try{
                database.closeDatabase(function(err){
                    if(err){
                        console.warn(err);
                    }
                    process.exit(0);
                });
            } catch(err) {
                //TODO should we do something here???
            }
        }
    };

database.openDatabase(function(err){
    if(err){
        console.warn(err);
        process.exit(0);
    }
    database.openProject(program.projectIdentifier,function(err,p){
        var baseCommitCalculated = function(err,bc){
                if(err){
                    console.warn('error during common ancestor commit search:',err);
                    finishUp();
                }
                baseCommitHash = bc;
                needed = 2;

                getRoot(baseCommitHash,function(err,root){
                    if(err || !root){
                        console.warn('unable to load base root:',err || new Error('unknown object'));
                        finishUp();
                    }
                    baseRoot = root;

                    calculateDiff(true,diffCalculated);
                    calculateDiff(false,diffCalculated);
                });

            },
            diffCalculated = function(err){
                error = error || err;
                if(--needed === 0){
                    if(error){
                        console.warn('unable to generate diffs:', error);
                        finishUp();
                    }
                    diffsGenerated();
                }
            },
            calculateDiff = function(isMine,next){
                var commitHash = isMine ? myCommitHash : theirCommitHash;

                getRoot(commitHash,function(err,root){
                    if(err || !root){
                        next(err || new Error('unknown object'));
                        return;
                    }
                    if(isMine){
                        myRoot = root;
                    } else {
                        theirRoot = root;
                    }
                    core.generateTreeDiff(baseRoot,root,function(err,diff){
                        if(err){
                            next(err);
                            return;
                        }

                        if(isMine){
                            myRoot = root;
                            myDiff = diff;
                        } else {
                            theirRoot = root;
                            theirDiff = diff;
                        }
                        next();
                    });
                });
            },
            saveResults = function(dontPrintBaseCommit){
                if(program.pathPrefix){
                    try{
                        FS.writeFileSync(program.pathPrefix+'.mine',JSON.stringify(myDiff,null,2));
                        FS.writeFileSync(program.pathPrefix+'.theirs',JSON.stringify(theirDiff,null,2));
                        if(conflict){
                            FS.writeFileSync(program.pathPrefix+'.conflict',JSON.stringify(conflict,null,2));
                        }
                        if(dontPrintBaseCommit !== true){
                            console.log('base commit hash to apply merged diff: ',baseCommitHash);
                        }
                        finishUp();
                    } catch(err) {
                        console.warn('cannot create output files:',err);
                        finishUp();
                    }
                } else {
                    //generate result to console;
                    console.log('necessary information for successfull merge:');
                    console.log('base commit hash to apply merged diff: ',baseCommitHash);
                    console.log('diff base->mine: ',JSON.stringify(myDiff,null,2));
                    console.log('diff base->theirs: ',JSON.stringify(theirDiff,null,2));
                    finishUp();
                }
            },
            diffsGenerated = function(){
                //so we are ready with the first phase, let's create the conflict object
                conflict = core.tryToConcatChanges(myDiff,theirDiff);
                var autoFailureReason;

                if(program.autoMerge && conflict !== null && conflict.items.length === 0){
                    //we try to apply our merge if possible
                    core.applyTreeDiff(baseRoot,conflict.merge,function(err){
                        if(err){
                            console.warn('unable to finish automatic merge:',err);
                            saveResults();
                        }
                        core.persist(baseRoot,function(err){
                            if(err){
                                console.warn('unable to update project:',err);
                                saveResults();
                            }
                            var newHash = core.getHash(baseRoot),
                                newCommitHash = project.makeCommit([myCommitHash,theirCommitHash],newHash,'merging ['+program.mine+'] into ['+program.theirs+']',function(err){
                                    if(err){
                                        console.warn('unable to create commit:',err);
                                        saveResults();
                                    }

                                    if(BRANCH_REGEXP.test(program.theirs)){
                                        //we updates the branch as well
                                        project.setBranchHash(program.theirs,theirCommitHash,newCommitHash,function(err){
                                            if(err){
                                                console.warn('unable to update branch '+program.theirs);
                                                console.warn('the merge result is saved to commit: ',newCommitHash);
                                                saveResults();
                                            }
                                            console.warn('branch '+program.theirs+' have been updated successfully');
                                            saveResults(true);
                                        });
                                    } else {
                                        console.warn('the merge result is saved to commit: ',newCommitHash);
                                        saveResults();
                                    }
                                });
                        });
                    });

                } else {
                    if(program.autoMerge){
                        if(conflict === null){
                            autoFailureReason = ' cannot do automatic merge as empty conflict object was generated';
                        } else if(conflict.item.length > 0){
                            autoFailureReason = 'cannot do automatic merge as there are conflicts that cannot be resolved';
                        }
                        console.warn(autoFailureReason);
                    }

                    saveResults();
                }
            },
            needed = 2, error = null,
            commitSearched = function(err){
                error = error || err;
                if(--needed === 0){
                    //we can go to the next step
                    if(error){
                        console.warn('unable to find all necessary commit hashes:',error);
                        finishUp();
                    }
                    project.getCommonAncestorCommit(myCommitHash,theirCommitHash,baseCommitCalculated);
                }
            },
            getCommitHash = function(isMine,inputIdentifier,next){
                if(HASH_REGEXP.test(inputIdentifier)){
                    if(isMine){
                        myCommitHash = inputIdentifier;
                    } else {
                        theirCommitHash = inputIdentifier;
                    }
                    next();
                    return;
                } else if(BRANCH_REGEXP.test(inputIdentifier)){
                    project.getBranchNames(function(err,names){
                        if(err){
                            next(err);
                            return;
                        }
                        if(!names[inputIdentifier]){
                            next('unknown branch ['+inputIdentifier+']');
                            return;
                        }

                        if(isMine){
                            myCommitHash = names[inputIdentifier];
                        } else {
                            theirCommitHash = names[inputIdentifier];
                        }
                        next();
                        return;
                    });
                }
            };

        if(err){
            console.warn(err);
            process.exit(0);
        }
        project = p;
        core = new Core(project);

        needed = 2;
        getCommitHash(true,program.mine,commitSearched);
        getCommitHash(false,program.theirs,commitSearched);
    });
});