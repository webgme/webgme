/**
 * Created by tamas on 2/18/15.
 */
var requirejs = require("requirejs"),
    program = require('commander'),
    BRANCH_REGEXP = new RegExp("^[0-9a-zA-Z_]*$"),
    HASH_REGEXP = new RegExp("^#[0-9a-zA-Z_]*$"),
    FS = require('fs'),
    Core,Storage,Serialization,
    jsonProject;

requirejs.config({
    nodeRequire: require,
    baseUrl: __dirname + '/../',
    paths: {
        "storage": "common/storage",
        "core": "common/core",
        "util": "common/util",
        "coreclient": "common/core/users"
    }
});
Core = requirejs('core/core');
Storage = requirejs('storage/serveruserstorage');
Serialization = requirejs('coreclient/serialization');
var exportProject = function(mongoUri,projectId,branchOrCommit,callback){
    var core,project,root,database = new Storage({globConf: {mongo: {uri: mongoUri}},log:{debug:function(msg){},error:function(msg){}}}), //we do not want debugging
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
            var getRootFromCommitHash = function(cHash){
                project.loadObject(cHash,function(err,cObj){
                    if(err){
                        return next(err);
                    }
                    core.loadRoot(cObj.root,next);
                });
            };
            if(HASH_REGEXP.test(branchOrCommit)){
                return getRootFromCommitHash(branchOrCommit);
            }
            //it must be a branch name
            project.getBranchNames(function(err,names){
                if(err){
                    return next(err);
                }
                if(names[branchOrCommit]){
                    return getRootFromCommitHash(names[branchOrCommit]);
                }
                return next(new Error('unknown branch'));
            });
        };
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
                core = new Core(project);
                getRoot(function(err,r){
                    if(err){
                        return close(err);
                    }
                    root = r;
                    Serialization.export(core,root,close);
                });
            });
        });
    });
};

module.exports.export = exportProject;

if(require.main === module){
    program
        .version('0.1.0')
        .option('-m, --mongo-database-uri [url]', 'URI to connect to mongoDB where the project is stored')
        .option('-p, --project-identifier [value]', 'project identifier')
        .option('-s, --source [branch/commit]', 'the branch or commit that should be exported')
        .option('-o, --out [path]', 'the path of the output file')
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
    if(!BRANCH_REGEXP.test(program.source) && ! HASH_REGEXP.test(program.source)){
        console.warn('source format is invalid!');
        process.exit(0);
    }

    //calling the export function
    exportProject(program.mongoDatabaseUri,program.projectIdentifier,program.source,function(err,jsonProject){
        if(err){
            console.warn('error during project export: ',err);
        } else {
            if(program.out){
                try{
                    FS.writeFileSync(program.out,JSON.stringify(jsonProject,null,2));
                    console.warn('project \''+program.projectIdentifier+'\' hase been successfully written to \''+program.out+'\'');
                } catch(err){
                    console.warn('failed to create output file: '+err);
                }
            } else {
                console.warn('project \''+program.projectIdentifier+'\':');
                console.warn(JSON.stringify(jsonProject,null,2));
            }
        }
        process.exit(0);
    });
}