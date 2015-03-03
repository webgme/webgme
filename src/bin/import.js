/**
 * Created by tamas on 2/18/15.
 */
var requirejs = require("requirejs"),
    program = require('commander'),
    BRANCH_REGEXP = new RegExp("^[0-9a-zA-Z_]*$"),
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

var importProject = function(mongoUri,projectId,jsonProject,branch,callback){
    var core,project,root,commit,database = new Storage({uri:mongoUri,log:{debug:function(msg){},error:function(msg){}}}), //we do not want debugging
        close = function(error){
            try{
                project.closeProject(function(){
                    database.closeDatabase(function(){
                        callback(error);
                    });
                });
            } catch(err){
                database.closeDatabase(function(){
                    callback(error);
                });
            }
        };

    database.openDatabase(function(err){
        if(err){
            return callback(err);
        }

        database.openProject(projectId,function(err,p){
            if(err){
                database.closeDatabase(function(){
                    return callback(err);
                });
            } else {
                project = p;
                core = new Core(project);
                root = core.createNode({parent:null,base:null});
                Serialization.import(core,root,jsonProject,function(err){
                    if(err){
                        return close(err);
                    }
                    core.persist(root,function(){});
                    commit = project.makeCommit([],core.getHash(root),"project imported by import.js CLI",function(){});
                    project.getBranchHash(branch,'#hack',function(err,oldCommit){
                        if(err){
                            return callback(new Error('project imported to commit: '+commit+', but branch cannot be updated.'));
                        }
                        project.setBranchHash(branch,oldCommit,commit,function(err){
                            if(err){
                                return callback(new Error('project imported to commit: '+commit+', but branch cannot be updated.'));
                            }
                            callback(null);
                        });
                    });
                });
            }
        });
    });
};

module.exports.import = importProject;

if(require.main === module){
    program
        .version('0.1.0')
        .usage('<project-file> [options]')
        .option('-m, --mongo-database-uri [url]', 'URI to connect to mongoDB where the project is stored')
        .option('-p, --project-identifier [value]', 'project identifier')
        .option('-b, --branch [branch]', 'the branch that should be created with the imported data')
        .parse(process.argv);
//check necessary arguments
    if(program.args.length !== 1){
        console.warn('wrong parameters');
        program.help();
    }

    if(!program.mongoDatabaseUri){
        console.warn('mongoDB URL is a mandatory parameter!');
        process.exit(0);
    }
    if(!program.projectIdentifier){
        console.warn('project identifier is a mandatory parameter!');
        process.exit(0);
    }

    if(!program.branch || !BRANCH_REGEXP.test(program.branch)){
        program.branch = 'master';
    }

    //loading the project file and seeing if it is a valid JSON object
    try{
        jsonProject = JSON.parse(FS.readFileSync(program.args[0],'utf-8'));
    } catch (err) {
        console.warn('unable to load project file: ',err);
        process.exit(0);
    }
    //calling the import function
    importProject(program.mongoDatabaseUri,program.projectIdentifier,jsonProject,program.branch,function(err){
        if(err){
            console.warn('error during project import: ',err);
        } else {
            console.warn('branch \''+program.branch+'\' of project \''+program.projectIdentifier+'\' have been successfully imported');
        }
        process.exit(0);
    });
}