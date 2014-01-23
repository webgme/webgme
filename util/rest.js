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
        var _buffer = {project:null,core:null,root:null,coreNode:null,formattedNode:null,commit:null,branch:null};
        var _database = new Commit(
                            new Cache(
                                new Failsafe(
                                    new Mongo({
                                        host: _configuration.ip,
                                        port: _configuration.port,
                                        database: _configuration.database
                                    })
                                ,{})
                            ,{})
                        ,{});

        var clearBuffer = function(){
            delete(_buffer);
            _buffer = {project:null,core:null,root:null,coreNode:null,formattedNode:null,commit:null,branch:null};
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
            var outNode = {};

            //attributes
            outNode.attribute={};
            var names = core.getAttributeNames(node);
            for(var i=0;i<names.length;i++){
                outNode.attribute[names[i]] = core.getAttribute(node,names[i]);
            }

            //registry
            outNode.registry={};
            names = core.getRegistryNames(node);
            for(i=0;i<names.length;i++){
                outNode.registry[names[i]] = core.getRegistry(node,names[i]);
            }

            //children
            outNode.children=core.getChildrenPaths(node);

            //sets
            outNode.sets = {};
            var setNames = core.getSetNames(node);
            for(i=0; i<setNames.length;i++){
                outNode.sets[setNames[i]] = core.getMemberPaths(node,setNames[i]);
            }

            //pointers and collections
            outNode.pointer = {};
            outNode.collection = {};
            outNode.member = {};
            var error = null;
            var needed = 0;
            var allLoaded = function(){
                if(error){
                    callback(error,null);
                } else {
                    outNode.path = core.getPath(node);
                    _buffer.formattedNode = outNode;
                    callback(null,outNode);
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
                        outNode.pointer[name] = core.getPath(pointer);
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
                        outNode.collection[name] = [];
                        for(var i=0;i<collection.length;i++){
                            var path = core.getPath(collection[i]);
                            if(path.indexOf('/_sets/') === -1){
                                outNode.collection[name].push(path);
                            } else {
                                //we build, the member part here
                                path = path.split('/');
                                var setOwner = "",jMax = path.indexOf('_sets');
                                for(var j=0;j<jMax;j++){
                                    setOwner+="/"+path[j];
                                }
                                if(!outNode.member[_buffer.core.getSetName(path[jMax+1])]){
                                    outNode.member[_buffer.core.getSetName(path[jMax+1])] = [];
                                }
                                outNode.member[_buffer.core.getSetName(path[jMax+1])].push(setOwner);
                            }
                        }
                    }

                    if(--needed === 0){
                        allLoaded();
                    }
                });
            };

            if(needed >0){
                for(i=0;i<names.length;i++){
                    loadPointer(names[i]);
                }

                for(var j=0;j<names2.length;j++){
                    loadCollection(names2[j]);
                }
            } else {
                allLoaded();
            }
        };
        var persistProject = function(callback,isdelete){
            //now comes the saving part
            _buffer.core.persist(_buffer.root,function(){});
            var newRootHash = _buffer.core.getHash(_buffer.root);
            var newCommitHash = _buffer.project.makeCommit([_buffer.commit],newRootHash,"REST commit",function(){});
            if(isdelete){
                callback(null,addingSpecialChars(newCommitHash));
            } else {
                var retVal = {commit:newCommitHash,node:null};
                loadingNode(_buffer.core,_buffer.coreNode,function(err,node){
                    if(err){
                        callback(null,JSON.parse(addingSpecialChars(JSON.stringify(retVal))));
                    } else {
                        retVal.node = node;
                        callback(null,JSON.parse(addingSpecialChars(JSON.stringify(retVal))));
                    }
                });
            }
        };
        var updateNode = function(data,callback){
            //the buffer should be filled, and the coreNode will be updated with the data
            var error = null;
            var needToGo = 0;
            var pointerToUpdate = [];
            var memberToUpdate = [];
            var updatePointer = function(pointerName,callback){
                _buffer.core.loadByPath(specialCharHandling(data.pointer[pointerName]),function(err,node){
                    if(!err && node){
                        _buffer.core.setPointer(_buffer.coreNode,pointerName,node);
                        callback(null);
                    } else {
                        callback(err);
                    }
                });
            };
            var updateMember = function(setName,memberPath,isDelete,callback){
                _buffer.core.loadByPath(specialCharHandling(memberPath),function(err,node){
                    if(!err && node){
                        if(isDelete){
                            _buffer.core.delMember(_buffer.coreNode,setName,node);
                        } else {
                            _buffer.core.addMember(_buffer.coreNode,setName,node);
                        }
                        callback(null);
                    } else {
                        callback(err);
                    }
                });
            };
            var finished = function(){
                if(error){
                    callback(error);
                } else {
                    callback(null);
                }
            };

            //attribute updates and inserts
            for(var i in data.attribute){
                _buffer.core.setAttribute(_buffer.coreNode,i,data.attribute[i]);
            }
            //attribute removals
            for(i in _buffer.formattedNode.attribute){
                if(!data.attribute[i]){
                    _buffer.core.delAttribute(_buffer.coreNode,i);
                }
            }
            //registry updates and inserts
            for(i in data.registry){
                _buffer.core.setRegistry(_buffer.coreNode,i,data.registry[i]);
            }
            //registry removals
            for(i in _buffer.formattedNode.registry){
                if(!data.registry[i]){
                    _buffer.core.delRegistry(_buffer.coreNode,i);
                }
            }


            //pointer removals
            for(i in _buffer.formattedNode.pointer){
                if(!data.pointer[i]){
                    _buffer.core.deletePointer(_buffer.coreNode,i);
                }
            }

            //pointer updates and inserts - this can be done only by callback so it should be done at the end
            for(i in data.pointer){
                if(_buffer.formattedNode.pointer[i]){
                    if(data.pointer[i] !== _buffer.formattedNode.pointer[i]){
                        pointerToUpdate.push(i);
                    }
                } else {
                    pointerToUpdate.push(i);
                }
            }

            //member addition and removal presetting
            for(i in _buffer.formattedNode.sets){
                if(!data.sets[i]){
                    //remove the whole set
                    for(var j=0;j<_buffer.formattedNode.sets[i].length;j++){
                        memberToUpdate.push({set:i,path:_buffer.formattedNode.sets[i][j],del:true});
                    }
                }
            }
            for(i in data.sets){
                if(!_buffer.formattedNode.sets[i]){
                    //a new set
                    for(j=0;j<data.sets[i].length;j++){
                        memberToUpdate.push({set:i,path:data.sets[i][j],del:false});
                    }
                } else {
                    //first the removals
                    for(j=0;j<_buffer.formattedNode.sets[i].length;j++){
                        if(data.sets[i].indexOf(_buffer.formattedNode.sets[i][j]) === -1){
                            memberToUpdate.push({set:i,path:_buffer.formattedNode.sets[i][j],del:true});
                        }
                    }
                    //then the inserts
                    for(j=0;j<data.sets[i].length;j++){
                        if(_buffer.formattedNode.sets[i].indexOf(data.sets[i][j]) === -1){
                            memberToUpdate.push({set:i,path:data.sets[i][j],del:false});
                        }
                    }
                }
            }

            //the asyncronous updates

            needToGo = pointerToUpdate.length + memberToUpdate.length;

            if(needToGo <1){
                finished();
            } else {
                for(i=0;i<pointerToUpdate.length;i++){
                    updatePointer(pointerToUpdate[i],function(err){
                        if(err){
                            error = err;
                        }
                        if(--needToGo === 0){
                            finished();
                        }
                    });
                }
                for(j=0;j<memberToUpdate.length;j++){
                    updateMember(memberToUpdate[j].set,memberToUpdate[j].path,memberToUpdate[j].del,function(err){
                        if(err){
                            error = err;
                        }
                        if(--needToGo === 0){
                            finished();
                        }
                    });
                }
            }
        };

        //available commands
        var getProjects = function(callback){
            _database.getProjectNames(callback);
        };
        var getBranches = function(project,callback){
            project.getBranchNames(callback);
        };
        var getItem = function(project,pars,callback){
            //the first element of the pars should be always a commit and then the path... empty path leads to the root
            project.loadObject(pars[0],function(err,commit){
                if(err){
                    callback('wrong request',null);
                } else {
                    if(commit){
                        _buffer.commit = pars[0];
                        var hash = commit.root;
                        var core = new SetCore(new Core(project));
                        _buffer.core = core;
                        var path = "";
                        for(var i=1;i<pars.length;i++){
                            path +='/'+pars[i]+"";
                        }
                        core.loadRoot(hash,function(err,root){
                            if(err){
                                callback(err,null);
                            } else {
                                _buffer.root = root;
                                if(path === ""){
                                    _buffer.coreNode = root;
                                    loadingNode(core,root,callback);
                                } else {
                                    core.loadByPath(path,function(err,node){
                                        if(err){
                                            callback(err,null);
                                        } else {
                                            _buffer.coreNode = node;
                                            loadingNode(core,node,callback);
                                        }
                                    });
                                }
                            }
                        });
                    } else {
                        callback('commit not found',null);
                    }
                }
            });
        };

        var processGET = function(uri,callback){
            var myCallback = function(err,data){
                if(!err && data){
                    data = JSON.stringify(data);
                    data = addingSpecialChars(data);
                    data = JSON.parse(data);
                }
                callback(err,data);
            };
            clearBuffer();
            var uriArray = uri.split('/');
            var startindex = uriArray.indexOf('rest')+1;
            if(startindex>0 && startindex<uriArray.length){
                if(uriArray[startindex] === 'projects'){
                    getProjects(myCallback);
                } else {
                    var pName = uriArray[startindex++];
                    var pars = uriArray[startindex];
                    _database.openProject(pName,function(err,project){
                       if(err){
                           callback(err,null);
                       } else {
                           _buffer.project = project;
                           if(pars){
                               if(pars === 'branches'){
                                   getBranches(project,myCallback);
                               } else {
                                   pars = specialCharHandling(pars);
                                   pars = pars.split('/');

                                   if(pars[0].indexOf('#') === 0){
                                       getItem(project,pars,myCallback);
                                   } else {
                                       getBranches(project,function(err,branches){
                                           if(err){
                                               callback(err,null);
                                           } else {
                                               _buffer.branch = pars[0];
                                               if(branches[pars[0]]){
                                                   callback(null,addingSpecialChars(branches[pars[0]]));
                                               } else {
                                                   callback('no such branch found',null);
                                               }
                                           }
                                       });
                                   }
                               }
                           } else {
                               callback('wrong request',null);
                           }
                       }
                    });
                }
            } else {
                callback('wrong URI',null);
            }
        };
        var processPOST = function(uri,data,callback){
            processGET(uri,function(err,fNode){
                if(err){
                    callback('cannot get node',null);
                } else {
                    //we have everything in the buffer, so we just need to do the modifications and create a new commit
                    data = specialCharHandling(data);
                    data = JSON.parse(data);
                    if(typeof fNode === 'string'){
                        fNode = specialCharHandling(fNode);
                        //branch update
                        if(data.oldhash && data.newhash){
                            if(data.oldhash === fNode){
                                _buffer.project.setBranchHash(_buffer.branch,data.oldhash,data.newhash,callback);
                            } else {
                                callback('hash mismatch',null);
                            }
                        } else {
                            callback('not valid branch update',null);
                        }
                    } else {
                        //node update
                        updateNode(data,function(err){
                            if(err){
                                callback(err,null);
                            } else {
                                persistProject(callback,false);
                            }
                        });
                    }
                }
            });
        };
        var processPUT = function(uri,data,callback){
            processGET(uri,function(err,parent){
                if(err){
                    if(err === 'no such branch found'){
                        //branch creation
                        _buffer.project.setBranchHash(_buffer.branch,"",specialCharHandling(data),callback);
                    } else {
                        callback(err);
                    }
                } else {
                    data = specialCharHandling(data);
                    data = JSON.parse(data);
                    _buffer.parent = _buffer.coreNode;
                    _buffer.coreNode = _buffer.core.createNode(_buffer.parent);
                    loadingNode(_buffer.core,_buffer.coreNode,function(err,formatted){
                        if(err){
                            callback(err,null);
                        } else {
                            _buffer.formattedNode = formatted;
                            updateNode(data,function(err){
                                if(err){
                                    callback(err);
                                } else {
                                    persistProject(callback,false);
                                }
                            });
                        }
                    });
                }
            });
        };
        var processDELETE = function(uri,callback){
            processGET(uri,function(err,node){
                if(err){
                    callback(err);
                } else {
                    if(typeof node === "string"){
                        //branch deletion
                        _buffer.project.setBranchHash(_buffer.branch,specialCharHandling(node),"",callback);
                    } else {
                        //node deletion
                        //the root cannot be delete TODO
                        if(_buffer.coreNode === _buffer.root){
                            callback('cannot delete the root',null);
                        } else {
                            _buffer.core.deleteNode(_buffer.coreNode);
                            persistProject(callback,true);
                        }
                    }
                }
            });
        };


        return {
            processGET : processGET,
            processPOST : processPOST,
            processDELETE : processDELETE,
            processPUT : processPUT,
            open: _database.openDatabase
        };
    }

    return Rest;
});
