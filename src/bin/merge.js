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
TASYNC = requirejs('core/tasync');

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

//helper functions
var getBranchHash, //wrapped variant of storage's getBranchHash
    makeCommit, //wrapped variant of storage's makeCommit
    getCommonAncestorCommit, //wrapped version of storage's getCommonAncestorCommit
    getCommitHash = function(branchOrCommit){
        console.log('getCH',branchOrCommit);
        if(BRANCH_REGEXP.test(branchOrCommit)){
            return TASYNC.call(function(commitHash){
                if(!commitHash){
                    return null;
                }
                return commitHash;
            },getBranchHash(branchOrCommit,'#hack'));
        }
        return branchOrCommit;
    },
    getRoot = function(commitHash){
        console.log('getR',commitHash);
        var openWithCommitHash = function(cHash){
            return TASYNC.call(function(cObj){
                if(!cObj){
                    console.warn('unknown commit id');
                    process.exit(0);
                }
                if(cObj && cObj.root){
                    return core.loadRoot(cObj.root);
                } else {
                    return null;
                }
            },project.loadObject(cHash));
        };
        if(HASH_REGEXP.test(commitHash)){
            return openWithCommitHash(commitHash);
        } else {
            return null;
        }
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
    },
    getDiff = function(sourceRoot,targetRoot){
        console.log('getD',core.getHash(sourceRoot),core.getHash(targetRoot));
        if(!sourceRoot || !targetRoot){
            console.warn('unable to load all necessary roots');
            finishUp();
        }
        return core.generateTreeDiff(sourceRoot,targetRoot);
    };


//connecting to mongoDB and opening project
var database = new Storage({uri:program.mongoDatabaseUri,log:{debug:function(msg){},error:function(msg){}}}), //we do not want debugging
    project,core,myCommitHash,theirCommitHash,baseCommitHash,myDiff,theirDiff,baseRoot,myRoot,theirRoot;
database.openDatabase(function(err){
    if(err){
        console.warn(err);
        process.exit(0);
    }
    database.openProject(program.projectIdentifier,function(err,p){
        if(err){
            console.warn(err);
            process.exit(0);
        }
        project = p;
        getBranchHash = TASYNC.wrap(project.getBranchHash);
        makeCommit = TASYNC.wrap(project.makeCommit);
        getCommonAncestorCommit = TASYNC.wrap(project.getCommonAncestorCommit);
        core = new Core(project,{usertype:'tasync'});
        myCommitHash = getCommitHash(program.mine);
        theirCommitHash = getCommitHash(program.theirs);
        baseCommitHash = TASYNC.call(function(mine, theirs){
            if(!mine || !theirs){
                console.warn('cannot get all necessary commits');
                process.exit(0);
            }
            console.log('getAnc');
            return getCommonAncestorCommit(mine,theirs);
        },myCommitHash,theirCommitHash);

        myRoot = TASYNC.call(getRoot,myCommitHash);
        theirRoot = TASYNC.call(getRoot,theirCommitHash);
        baseRoot = TASYNC.call(function(cHash){
            if(!cHash){
                console.warn('unable to determine common ancestor commit');
                finishUp();
            }
            return getRoot(cHash);
        },baseCommitHash);

        myDiff = TASYNC.call(getDiff,baseRoot,myRoot);
        theirDiff = TASYNC.call(getDiff,baseRoot,theirRoot);

        TASYNC.call(function(mine,theirs){
            if(!mine || !theirs){
                console.warn('unable to compute all necessary diffs');
                finishUp();
            }
            if(!program.pathPrefix){
                console.log('necessary information for successfull merge:');
                console.log('base commit hash to apply merged diff: ',baseCommitHash);
                console.log('diff base->mine: ',JSON.stringify(mine,null,2));
                console.log('diff base->theirs: ',JSON.stringify(theirs,null,2));
            } else {
                try{
                    FS.writeFileSync(program.pathPrefix+'.mine',JSON.stringify(mine,null,2));
                    FS.writeFileSync(program.pathPrefix+'.theirs',JSON.stringify(theirs,null,2));
                } catch(err) {
                    console.warn('cannot create output files:',err);
                    finishUp();
                }
                console.log('base commit hash to apply merged diff: ',baseCommitHash);
            }
            if(program.autoMerge){
                console.log('TODO');
            }
            finishUp();
        },myDiff,theirDiff);
    });
});