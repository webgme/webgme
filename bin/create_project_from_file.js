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
requirejs(['core/core','storage/serveruserstorage','coreclient/import', 'fs'],
    function(Core,Storage,Import,FS){
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

            var jProject = JSON.parse(FS.readFileSync(projectfilepath,'utf-8'));

            storage = new Storage({'host':mongoip, 'port':mongoport, 'database':mongodb});
            storage.openDatabase(function(err){
                if(!err){
                    storage.openProject(projectname,function(err,p){
                        if(!err){
                            project = p;
                            var core = new Core(project,{corerel:2});
                            Import(core,null,jProject,function(err,root){
                                if(err){
                                    console.log("some error happened during import:",err);
                                } else {
                                    core.persist(root,function(err){});
                                    var rhash = core.getHash(root);
                                    var chash = project.makeCommit([],rhash,"project imported by \'create_project_from_file\'",function(err){});
                                    project.getBranchHash("master","#hack",function(err,oldhash){
                                        if(!err){
                                            project.setBranchHash("master",oldhash,chash,function(err){
                                                if(!err){
                                                    console.log("the file have been imported to master branch");
                                                    finish();
                                                } else {
                                                    console.log("problem setting the branch...");
                                                    finish();
                                                }
                                            });
                                        } else {
                                            console.log("problem getting the branch set...");
                                            finish();
                                        }
                                    });
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
            console.log("proper usage: node create_project_from_file.js <ip of your database server> <port of your database server> <name of your database> <name of the project> <file to import>");
            finish();
        }

});
