var requirejs = require("requirejs");
requirejs.config({
    nodeRequire: require,
    baseUrl: __dirname + "/..",
    paths: {
        "core":"core",
        "util": "util",
        "storage": "storage",
        "interpreter": "interpreter"
    }
});
requirejs(['core/core','storage/serveruserstorage','coreclient/dump', 'fs'],
    function(Core,Storage,Dump,FS){
        var mongoip = process.argv[2] || null,
            mongoport = process.argv[3] || null,
            mongodb = process.argv[4] || null,
            projectname = process.argv[5] || null,
            projectfilepath = process.argv[6] || null,
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
                            project.getBranchHash("master","#hack",function(err,commitHash){
                                console.log(commitHash);
                                if(!err){
                                    project.loadObject(commitHash,function(err,commit){
                                        if(!err && commit){
                                            core.loadRoot(commit.root,function(err,root){
                                                if(!err && root){
                                                    Dump(core,root,"",'guid',function(err,jProject){
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
            console.log("proper usage: node create_project_from_file.js <ip of your database server> <port of your database server> <name of your database> <name of the project> <file to create>");
            finish();
        }

    });

