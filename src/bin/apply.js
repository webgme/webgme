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
    .usage('<patch-file> [options]')
    .option('-m, --mongo-database-uri [url]', 'URI to connect to mongoDB where the project is stored')
    .option('-p, --project-identifier [value]', 'project identifier')
    .option('-s, --source [branch/commit]', 'the source or base of the diff to be created')
    .parse(process.argv);
//check necessary arguments
if(program.args.length !== 1){
    console.warn('wrong parameters');
}

if(!program.mongoDatabaseUri){
    console.warn('mongoDB URL is a mandatory parameter!');
    process.exit(0);
}
if(!program.projectIdentifier){
    console.warn('project identifier is a mandatory parameter!');
    process.exit(0);
}
if(!program.source){
    console.warn('source is a mandatory parameter!');
    process.exit(0);
}

//helper functions
var getBranchHash; //wrapped variant of storage's getBranchHash
var makeCommit; //wrapped variant of storage's makeCommit
var getRoot = function(branchOrCommit){
    var openWithCommitHash = function(cHash){
        baseCommitHash = cHash;
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
    if(HASH_REGEXP.test(branchOrCommit)){
        return openWithCommitHash(branchOrCommit);
    } else if(BRANCH_REGEXP.test(branchOrCommit)){
        return TASYNC.call(function(commitHash){
            if(!commitHash){
                console.warn('unknown branch name');
                process.exit(0);
            }
            return openWithCommitHash(commitHash);
        },getBranchHash(branchOrCommit,'#hack'));
    } else {
        return null;
    }
};

//loading the patch and checking if it is a correct json object
var patch;
try{
    patch = FS.readFileSync(program.args[0],'utf-8');
    patch = JSON.parse(patch);
} catch (err){
    console.warn('error in opening the patch file:',err);
    process.exit(0);
}

//connecting to mongoDB and opening project
var database = new Storage({uri:program.mongoDatabaseUri,log:{debug:function(msg){},error:function(msg){}}}), //we do not want debugging
    project,core,baseCommitHash;
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
        core = new Core(project,{usertype:'tasync'});

        //so now we have to get our two root objects...
        //check for the source root
        var source = getRoot(program.source),
            finishProperly = function(){
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
            },
            newCommitHash = TASYNC.call(function(sRoot){
                var done;
                if(!sRoot){
                    console.warn('unknown source root');
                    process.exit(0);
                }

                done = core.applyTreeDiff(sRoot,patch);
                return TASYNC.call(function(){
                    core.persist(sRoot);
                    var cHash = makeCommit([baseCommitHash],core.getHash(sRoot),JSON.stringify(patch,null,2));
                    return cHash;
                },done);
            },source);
        TASYNC.call(function(cHash){
            if(cHash){
                if(BRANCH_REGEXP.test(program.source)){
                    //we should update or at least try to update branch
                    project.setBranchHash(program.source,baseCommitHash,cHash,function(err){
                        if(err){
                            console.warn('branch update failed:',err);
                            console.warn('patch result is at commit:',cHash);

                        } else {
                            console.warn('branch '+program.source+' has been updated to commit '+cHash+' successfully');
                        }
                        finishProperly();
                    });
                } else {
                    console.warn('final commit of the patch:',cHash);
                    finishProperly();
                }
            } else {
                console.warn('diff creation stopped with error');
                finishProperly();
            }
        },newCommitHash);
    });
});