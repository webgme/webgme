/**
 * Created by tkecskes on 8/6/2014.
 */
var requirejs = require("requirejs");
requirejs.config({
    nodeRequire: require,
    baseUrl: __dirname + "/..",
    paths: {
        "storage": "common/storage",
        "core": "common/core",
        "util": "common/util",
        "coreclient": "common/core/users"
    }
});
requirejs(['core/core','storage/serveruserstorage','coreclient/serialization', 'fs'],
    function(Core,Storage,Serialization,FS){
        var mongoip = process.argv[2] || null,
            mongoport = process.argv[3] || null,
            mongodb = process.argv[4] || null,
            projectname = process.argv[5] || null,
            branchname = process.argv[6] || null,
            projectfilepath = process.argv[7] || null,
            storage = null,
            project = null;



        var finish = function(){
            if(project){
                project.closeProject();
            }
            if(storage){
                storage.closeDatabase();
            }
        };

        if (mongoip && mongoport && mongodb && projectname && projectfilepath){

            var jProject = {};

            storage = new Storage({'host':mongoip, 'port':mongoport, 'database':mongodb});
            storage.openDatabase(function(err){
                if(!err){
                    storage.openProject(projectname,function(err,p){
                        if(!err){
                            project = p;
                            var core = new Core(project,{corerel:2});
                            project.getBranchHash(branchname,"#hack",function(err,commitHash){
                                if(!err){
                                    project.loadObject(commitHash,function(err,commit){
                                        if(!err && commit){
                                            core.loadRoot(commit.root,function(err,root){
                                                if(!err && root){
                                                    Serialization.export(core,root,function(err,jProject){
                                                        if(!err){
                                                            FS.writeFileSync(projectfilepath,JSON.stringify(jProject,undefined,2),'utf-8');
                                                            console.log("export finished successfully");
                                                            finish();
                                                        } else {
                                                            console.log("export failed:",err);
                                                            finish();
                                                        }
                                                    });
                                                } else {
                                                    console.log("unable to load root");
                                                    finish();
                                                }
                                            });
                                        } else {
                                            console.log('cannot get latest commit');
                                            finish();
                                        }
                                    });
                                } else {
                                    console.log("unable to find master branch");
                                    finish();
                                }
                            });
                        } else {
                            console.log('unable to reach project object - check your parameters and your database');
                            finish();
                        }
                    });
                } else {
                    console.log("unable to open database - check your parameters and your connection to your database server");
                    finish();
                }
            });
        } else {
            console.log("proper usage: node export_project.js <ip of your database server> <port of your database server> <name of your database> <name of the project> <name of the branch> <file to create>");
            finish();
        }

    });

