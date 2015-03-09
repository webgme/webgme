/**
 * Created by tamas on 2/17/15.
 */

var program = require('commander'),
    HASH_REGEXP = new RegExp("^#[0-9a-zA-Z_]*$"),
    BRANCH_REGEXP = new RegExp("^[0-9a-zA-Z_]*$"),
    requirejs = require('requirejs'),
    FS = require('fs'),
    Core,
    Storage;
requirejs.config({
    paths:{
        'core': './../../src/common/core',
        'storage': './../../src/common/storage',
        'util': './../../src/common/util'
    }
});
Core = requirejs('core/core');
Storage = requirejs('storage/serveruserstorage');

var generateDiff = function(mongoUri,projectId,sourceBranchOrCommit,targetBranchOrCommit,callback){
    var database = new Storage(
            {globConf: {mongo: {uri: mongoUri},  storage: { keyType: 'plainSHA1'}},  //FIXME: should these read from config?
            log:{debug:function(msg){},error:function(msg){}}}), //we do not want debugging
        project,
        core,
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
        getRoot = function(branchOrCommit,next){
            var getFromCommitHash = function(cHash){
                project.loadObject(cHash,function(err,cObj){
                    if(err){
                        return next(err);
                    }
                    core.loadRoot(cObj.root,next);
                });
            };
            if(HASH_REGEXP.test(branchOrCommit)){
                getFromCommitHash(branchOrCommit);
            } else if(BRANCH_REGEXP.test(branchOrCommit)){
                project.getBranchHash(branchOrCommit,'#hack',function(err,commitHash){
                    if(err){
                        return next(err);
                    }
                    getFromCommitHash(commitHash);
                });
            } else {
                next(new Error('nor commit nor branch input'));
            }
        };

    database.openDatabase(function(err){
        if(err){
            return callback(err);
        }
        database.openProject(projectId,function(err,p) {
            if (err) {
                return close(err, null);
            }
            project = p;
            core = new Core(project);

            var needed = 2,
                error = null,
                sRoot, tRoot,
                rootsAreReady = function () {
                    if (error) {
                        return close(error, null);
                    }
                    core.generateTreeDiff(sRoot, tRoot, close);
                };
            getRoot(sourceBranchOrCommit, function (err, root) {
                error = error || err;
                sRoot = root;
                if (--needed === 0) {
                    rootsAreReady();
                }
            });
            getRoot(targetBranchOrCommit, function (err, root) {
                error = error || err;
                tRoot = root;
                if (--needed === 0) {
                    rootsAreReady();
                }
            });
        });
    });
};

module.exports.generateDiff = generateDiff;

if(require.main === module){
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

    generateDiff(program.mongoDatabaseUri,program.projectIdentifier,program.source,program.target,function(err,diff){
        if(err){
            console.warn('diff generation finished with error: ',err);
            process.exit(0);
        }
        if(program.out){
            try{
                FS.writeFileSync(program.out,JSON.stringify(diff,null,2));
            } catch(err){
                console.warn('unable to create output file:',err);
            }
        } else {
            console.log('generated diff:');
            console.log(JSON.stringify(diff,null,2));
        }
        process.exit(0);
    });
}
