/*jshint node: true*/
/**
 * @author kecso / https://github.com/kecso
 */

var program = require('commander'),
    HASH_REGEXP = new RegExp("^#[0-9a-zA-Z_]*$"),
    BRANCH_REGEXP = new RegExp("^[0-9a-zA-Z_]*$"),
    requirejs = require('requirejs'),
    FS = require('fs'),
    Core,
    Storage,
    patchJson,
    path = require('path'),
    gmeConfig = require(path.join(process.cwd(), 'config')),
    webgme = require('../../webgme');

webgme.addToRequireJsPaths(gmeConfig);

Core = requirejs('core/core');
Storage = requirejs('storage/serveruserstorage');

var applyPatch = function(mongoUri,projectId,branchOrCommit,patch,noUpdate,callback){
    'use strict';
    var database,
        project,
        core,
        root,
        baseCommitHash,
        commit,
        close = function(error,data){
            try{
                project.closeProject(function(){
                    database.closeDatabase(function(){
                        callback(error,data);
                    });
                });
            } catch(err){
                database.closeDatabase(function(){
                    callback(error,data);
                });
            }
        },
        getRoot = function(next){
            var getFromCommitHash = function(cHash){
                baseCommitHash = cHash;
                project.loadObject(cHash,function(err,cObj){
                    if(err){
                        return next(err);
                    }
                    core.loadRoot(cObj.root,next);
                });
            };
            if(HASH_REGEXP.test(branchOrCommit)){
                return getFromCommitHash(branchOrCommit);
            } else if(BRANCH_REGEXP.test(branchOrCommit)){
                project.getBranchNames(function(err,names){
                    if(err){
                        return next(err);
                    }
                    if(!names[branchOrCommit]){
                        return next(new Error('unknown branch'));
                    }
                    return getFromCommitHash(names[branchOrCommit]);
                });
            } else {
                return next(new Error('nor commit nor branch input'));
            }
        };

    gmeConfig.mongo.uri = mongoUri || gmeConfig.mongo.uri;
    database = new Storage({
        globConf: gmeConfig,
        log: {
            debug: function (msg) {},
            error: function (msg) {}
        }}); //we do not want debugging

    database.openDatabase(function(err){
        if(err){
            return callback(err);
        }
        database.getProjectNames(function(err,names){
            if(err){
                return close(err);
            }
            if(names.indexOf(projectId) === -1){
                return close(new Error('unknown project'));
            }
            database.openProject(projectId,function(err,p){
                if(err){
                    return close(err);
                }
                project = p;
                core = new Core(project, {globConf: gmeConfig});

                getRoot(function(err,r){
                    if(err){
                        return close(err);
                    }
                    root = r;
                    core.applyTreeDiff(root,patch,function(err){
                        if(err){
                            return close(err);
                        }
                        core.persist(root,function(){});
                        commit = project.makeCommit([baseCommitHash],core.getHash(root),JSON.stringify(patch,null,2),function(){}); //TODO meaningful commit text
                        if(noUpdate || !BRANCH_REGEXP.test(branchOrCommit)){
                            return close(null,commit);
                        }

                        project.setBranchHash(branchOrCommit,baseCommitHash,commit,function(err){
                            if(err){
                                return close(err,commit);
                            }
                            return close(null,commit);
                        });
                    });
                });
            });
        });
    });
};

module.exports.applyPatch = applyPatch;

if(require.main === module){

    program
        .version('0.1.0')
        .usage('<patch-file> [options]')
        .option('-m, --mongo-database-uri [url]', 'URI to connect to mongoDB where the project is stored')
        .option('-p, --project-identifier [value]', 'project identifier')
        .option('-t, --target [branch/commit]', 'the target where we should apply the patch')
        .option('-n, --no-update', 'show if we should not update the branch')
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
    if(!program.target){
        console.warn('target is a mandatory parameter!');
        process.exit(0);
    }

    //load path file
    try{
        patchJson = JSON.parse(FS.readFileSync(program.args[0],'utf-8'));
    } catch(err) {
        console.warn('unable to load patch file: ',err);
        process.exit(0);
    }

    applyPatch(program.mongoDatabaseUri,program.projectIdentifier,program.target,patchJson,program.noUpdate,function(err){
        if(err){
            console.warn('there was an error during the application of the patch: ',err);
        } else {
            console.log('patch applied successfully to project \''+program.projectIdentifier+'\'');
        }
        process.exit(0);
    });
}