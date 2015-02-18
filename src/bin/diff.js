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
.option('-s, --source [branch/commit]', 'the source or base of the diff to be created')
.option('-t, --target [branch/commit]', 'the target or end of the diff to be created')
.option('-o, --out [path]', 'the output path of the diff [by default it is printed to the console]')
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
if(!program.source){
    console.warn('source is a mandatory parameter!');
    process.exit(0);
}
if(!program.target){
    console.warn('target is a mandatory parameter!');
    process.exit(0);
}

//helper functions
var getBranchHash; //wrapped variant of storage's getBranchHash
var getRoot = function(branchOrCommit){
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

//connecting to mongoDB and opening project
var database = new Storage({uri:program.mongoDatabaseUri,log:{debug:function(msg){},error:function(msg){}}}), //we do not want debugging
    project,core;
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
        core = new Core(project,{usertype:'tasync'});

        //so now we have to get our two root objects...
        //check for the source root
        var source = getRoot(program.source),
            target = getRoot(program.target),
            diff = TASYNC.call(function(sRoot,tRoot){
                if(sRoot === null || tRoot === null){
                    return null;
                }
                return core.generateTreeDiff(sRoot,tRoot);
            },source,target);
        TASYNC.call(function(diff){
            if(diff){
                if(program.out){
                    try{
                        FS.writeFileSync(program.out,JSON.stringify(diff,null,2));
                    } catch(err){
                        console.warn(err);
                    }
                } else {
                    console.log(JSON.stringify(diff,null,2));
                }
            } else {
                console.warn('diff creation stopped with error');
            }
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
        },diff);
    });
});