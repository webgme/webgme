/**
 * Created by tamas on 8/13/14.
 */
var requirejs = require("requirejs");
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
requirejs(['core/core','storage/serveruserstorage'],
    function(Core,Storage){
        'use strict';
        var mongoip = process.argv[2] || null,
            mongoport = process.argv[3] || null,
            mongodb = process.argv[4] || null,
            projectname = process.argv[5] || null,
            branch = process.argv[6] || null,
            storage = null,
            project = null,
            core = null;



        var finish = function(){
            if(project){
                project.closeProject();
            }
            if(storage){
                storage.closeDatabase();
            }
            },
            checkDFS = function(root,callback){
                var index = 0,
                    children,
                    error = null,
                    checkNextChild = function(){
                        if(index>=children.length){
                            return callback(error);
                        }
                        checkDFS(children[index],function(err){
                            error = error || err;
                            index++;
                            checkNextChild();
                        });
                    };

                checkNode(root);
                core.loadChildren(root,function(err,c){
                    if(err){
                        return callback(err);
                    }
                    children = c;
                    if(children.length === 0){
                        return callback(null);
                    }
                    checkNextChild();
                });
            },
            checkBFS = function(root,callback){
                var needed,
                    error = null,
                    i,
                    checkChild = function(child){
                        checkBFS(child,function(err){
                            error = error || err;
                            if(--needed === 0){
                                callback(error);
                            }
                        });
                    };

                checkNode(root);
                core.loadChildren(root,function(err,children){
                    if(err){
                        return callback(err);
                    }
                    needed = children.length;
                    if(needed === 0){
                        return callback(error);
                    }
                    for(i=0;i<children.length;i++){
                        checkChild(children[i]);
                    }
                });
            },
            checkNode = function(node){
                console.log(core.getPath(node),core.getGuid(node));
            };


        if (mongoip && mongoport && mongodb && projectname && branch){

            storage = new Storage({'host':mongoip, 'port':mongoport, 'database':mongodb});
            storage.openDatabase(function(err){
                if(err){
                    console.log('unable to open database',err);
                    return finish();
                }
                storage.openProject(projectname,function(err,p){
                    if(err || !p){
                        console.log('cannot open project',err);
                        return finish();
                    }
                    project = p;
                    core = new Core(project);
                    project.getBranchNames(function(err,names){
                        if(err){
                            console.log('cannot get branch info');
                            return finish();
                        }

                        if(!names[branch]){
                            console.log('unknown branch');
                            return finish();
                        }

                        project.loadObject(names[branch],function(err,commit){
                            if(err || !commit){
                                console.log('unable to load commit',err);
                                return finish();
                            }

                            core.loadRoot(commit.root,function(err,root){
                                if(err || !root){
                                    console.log('cannot load root object',err);
                                    return finish();
                                }
                                checkDFS(root,function(err){
                                    console.log('DFS checking finished',err);

                                    checkBFS(root,function(err){
                                        console.log("BFS cheking finished",err);
                                        return finish();
                                    });
                                });
                            });
                        });
                    });
                });

            });
        } else {
            console.log("proper usage: node project_tester.js <ip of your database server> <port of your database server> <name of your database> <name of the project> <branch of the project>");
            finish();
        }

    });