define([
    'core/core',
    'core/setcore',
    'storage/cache',
    'storage/failsafe',
    'storage/socketioclient',
    'storage/log',
    'storage/commit',
    'core/tasync',
    'util/common',
    'storage/mongo'
], function(
    Core,
    SetCore,
    Cache,
    Failsafe,
    Client,
    Log,
    Commit,
    TASYNC,
    Common,
    Mongo) {

    function Rest(_configuration){
        var _tokens = {};
        var _projects = {};
        var _database = new Cache(
                            new Failsafe(
                                new Mongo({
                                    host: _configuration.ip,
                                    port: _configuration.port,
                                    database: _configuration.database
                                })
                            ,{})
                        ,{});
        var token = function(){

            return {

            }
        };

        var specialCharHandling = function(text){
            text = text.replace(/%23/g,'#');
            text = text.replace(/%2f/g,'/');text = text.replace(/%2F/g,'/');
            return text;
        };
        var addingSpecialChars = function(text){
            text = text.replace(/#/g,'%23');
            text = text.replace(/\//g,'%2F');
            return text;
        };
        var loadingNode = function(core,node,callback){
            //we have to load all pointers, all collections and all the stuff which has connection to the node
            var outnode = {};

            //attributes
            outnode.attribute={};
            var names = core.getAttributeNames(node);
            for(var i=0;i<names.length;i++){
                outnode.attribute[names[i]] = core.getAttribute(node,names[i]);
            }

            //registry
            outnode.registry={};
            names = core.getRegistryNames(node);
            for(var i=0;i<names.length;i++){
                outnode.registry[names[i]] = core.getRegistry(node,names[i]);
            }

            //children
            /*outnode.children={};
            names = core.getChildrenRelids(node);
            for(var i=0;i<names.length;i++){
                outnode.children[names[i]] = node.data[names[i]];
            }*/
            outnode.children=core.getChildrenPaths(node);

            //pointers and collections
            outnode.pointer = {};
            outnode.collection = {};
            var error = null;
            var needed = 0;
            var allLoaded = function(){
                if(error){
                    callback(error,null);
                } else {
                    callback(null,outnode);
                }
            };

            names = core.getPointerNames(node);
            needed += names.length;

            var names2 = core.getCollectionNames(node);
            needed += names2.length;

            var loadPointer= function(name){
                core.loadPointer(node,name,function(err,pointer){
                    if(err){
                        error = err;
                    } else {
                        //outnode.pointer[name] = pointer.data._id;
                        outnode.pointer[name] = core.getPath(pointer);
                    }

                    if(--needed === 0){
                        allLoaded();
                    }
                });
            };
            var loadCollection = function(name){
                core.loadCollection(node,name,function(err,collection){
                    if(err){
                        error = err;
                    } else {
                        outnode.collection[name] = [];
                        for(var i=0;i<collection.length;i++){
                            //outnode.collection[name].push(collection[i].data._id);
                            outnode.collection[name].push(core.getPath(collection[i]));
                        }
                    }

                    if(--needed === 0){
                        allLoaded();
                    }
                });
            };

            if(needed >0){
                for(var i=0;i<names.length;i++){
                    loadPointer(names[i]);
                }

                for(var j=0;j<names2.length;j++){
                    loadCollection(names2[j]);
                }
            } else {
                allLoaded();
            }
        };

        //available commands
        var getProjects = function(callback){
            _database.getProjectNames(callback);
        };
        var getBranches = function(projName,callback){
            _projects[projName].getBranchNames(callback);
        };
        var getSingleItem = function(projName,hash,callback){
            var core = new Core(_projects[projName]);
            core.loadRoot(hash,function(err,root){
                if(err){
                    callback(err,null);
                } else {
                    if(root.data.type && root.data.type === 'commit'){
                        callback(null,root);
                    } else {
                        loadingNode(core,root,callback);
                    }
                }
            });
        };
        var getItemByPath = function(projName,dataArray,callback){
            var core = new Core(_projects[projName]);
            var hash = dataArray[0];
            var path = "";
            for(var i=1;i<dataArray.length;i++){
                path +='/'+dataArray[i]+"";
            }
            core.loadRoot(hash,function(err,root){
                if(err){
                    callback(err,null);
                } else {
                    if(root.data.type && root.data.type === 'commit'){
                        callback(null,root);
                    } else {
                        core.loadByPath(root,path,function(err,node){
                            if(err){
                                callback(err,null);
                            } else {
                                loadingNode(core,node,callback);
                            }
                        });
                    }
                }
            });
        };




        var processGET = function(uri,callback){
            var projName = null;
            var myCallback = function(err,data){
                if(!err && data){
                    data = JSON.stringify(data);
                    data = addingSpecialChars(data);
                    data = JSON.parse(data);
                }
                if(projName){
                    _projects[projName].closeProject();
                    delete _projects[projName];
                }
                callback(err,data);
            };
            var uriArray = uri.split('/');
            var startindex = uriArray.indexOf('rest')+1;
            if(startindex>0 && startindex<uriArray.length){
                if(uriArray[startindex] === 'projects'){
                    getProjects(myCallback);
                } else {
                    projName = uriArray[startindex++];
                    var gotProject = function(){
                        if(uriArray[startindex] === 'branches'){
                            getBranches(projName,myCallback);
                        } else {
                            var base = uriArray[startindex];
                            base = specialCharHandling(base);
                            base = base.split('/');
                            if(base.length === 1){
                                //single hashed item
                                getSingleItem(projName,base[0],myCallback);
                            } else {
                                //hash followed by path
                                getItemByPath(projName,base,myCallback);
                            }
                        }
                    };
                    if(_projects[projName]){
                        gotProject();
                    } else {
                        _database.openProject(projName,function(err,proj){
                            if(!err && proj){
                                _projects[projName] = proj;
                                gotProject();
                            } else {
                                callback(err,null);
                            }
                        });
                    }
                }
            } else {
                callback('wrong URI',null);
            }
        };
        var processPOST = function(uri,data,callback){
            callback('not implemented yet',null);
        };

        return {
            processGET : processGET,
            processPOST : processPOST,
            open: _database.openDatabase
        }
    }

    return Rest;
});
