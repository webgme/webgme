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
requirejs(['core/core','storage/serveruserstorage','storage/clientstorage','fs'],
    function(Core,Storage,ConnectedStorage,FS){
        'use strict';
        var configFile;
        try{
            configFile = FS.readFileSync(process.argv[2],'utf8');
            configFile = JSON.parse(configFile);
        } catch (e) {
            throw e;
        }
        var storage = null,
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
            checkPath = function(root,path,callback){
                core.loadByPath(root,path,function(err,node){
                    if(err || !node){
                        console.log('unable to load node',err);
                        return callback(err);
                    }
                    checkNode(node);
                    callback(null);
                });
            },
            checkNode = function(node){
                console.log(core.getPath(node),core.getGuid(node));
            };

        if(configFile.serverip && configFile.serverport ){
            storage = new ConnectedStorage({type:'node',host:configFile.serverip,port:configFile.serverport,log:console});
        } else if(configFile.mongoip && configFile.mongoport && configFile.mongodb) {
            storage = new Storage({'host':configFile.mongoip, 'port':configFile.mongoport, 'database':configFile.mongodb});
        }


        if (storage){
            storage.openDatabase(function(err){
                if(err){
                    console.log('unable to open database',err);
                    return finish();
                }
                storage.openProject(configFile.projectname,function(err,p){
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

                        if(!names[configFile.branch]){
                            console.log('unknown branch');
                            return finish();
                        }

                        project.loadObject(names[configFile.branch],function(err,commit){
                            if(err || !commit){
                                console.log('unable to load commit',err);
                                return finish();
                            }

                            core.loadRoot(commit.root,function(err,root){
                                if(err || !root){
                                    console.log('cannot load root object',err);
                                    return finish();
                                }
                                switch (configFile.testtype){
                                    case "DFS":
                                        checkDFS(root,function(err) {
                                            console.log('DFS checking finished', err);
                                            return finish();
                                        });
                                        break;
                                    case "BFS":
                                        checkBFS(root,function(err){
                                            console.log("BFS cheking finished",err);
                                            return finish();
                                        });
                                        break;
                                    case "path":
                                        checkPath(root,configFile.path,function(err){
                                            console.log("Path checking finished",err);
                                            return finish();
                                        });
                                        break;
                                    default:
                                        console.log('wrong test type');
                                        return finish();
                                }
                            });
                        });
                    });
                });

            });
        } else {
            console.log("proper usage: node project_tester.js <path of test configuration file>");
            finish();
        }

    });