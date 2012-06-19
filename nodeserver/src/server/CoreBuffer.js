define(['CommonUtil'],function(commonUtil){
    "use strict";
    var ASSERT = commonUtil.assert;
    var GUID = commonUtil.guid;
    var ID = "_id";

    var Buffer = function(storage){
        ASSERT(storage);

        
        var objects = {};
        var states = {};
        var loadqueue = {};

        var isValid = function(node){
            ASSERT(node);
            ASSERT(node[ID]);
            ASSERT(objects[node[ID]]);

            
            if(node.relations.baseId === null){
                return true;
            }
            else{
                if(objects[node.relations.baseId]){
                    return isValid(objects[node.relations.baseId]);
                }
                else{
                    return false;
                }
            }
        };

        var objectLoaded = function(key,err,object){
            ASSERT(loadqueue[key]);
            if(err){
                while(loadqueue[key].length>0){
                    loadqueue[key][0](err,undefined);
                    loadqueue[key].shift();
                }
                delete loadqueue[key];
            }
            else{
                ASSERT(object[ID] === key);
                objects[object[ID]] = object;
                states[object[ID]] = "read";
                while(loadqueue[key].length>0){
                    loadqueue[key][0](null,objects[object[ID]]);
                    loadqueue[key].shift();
                }
                delete loadqueue[key];
            }

        };
        var get = function(key,callback){
            if(loadqueue[key]){
                loadqueue[key].push(callback);
            }
            else{
                if(objects[key] !== undefined){
                    callback(null,objects[key]);
                }
                else{
                    loadqueue[key] = [callback];
                    storage.get(key,function(err,object){
                        objectLoaded(key,err,object);
                    });
                }
            }
        };
        var loadObject = function(key,callback){
            var count = 0;
            var callback = false;
            var callCallback = function(err){
                if(!callbackcalled){
                    callbackcalled = true;
                    callback(err,objects[key]);
                }
            };
            var rObjectLoaded = function(err){
                if(--count === 0 || err){
                    callback(err,objects[key]);
                }
            };
            var rLoadObject = function(innerkey){
                count++;
                if(objects[innerkey] !== undefined){
                    rObjectLoaded(null);
                }
                else{
                    get(innerkey,function(err,data){
                        var i;
                        if(err){
                            rObjectLoaded(err);
                        }
                        else{
                            for(i=0;i<data.relations.inheritorIds.length;i++){
                                rLoadObject(data.relations.inheritorIds[i]);
                            }
                            for(i=0;i<data.relations.childrenIds.length;i++){
                                rLoadObject(data.relations.childrenIds[i]);
                            }
                            if(data.relations.baseId !== null){
                                rLoadObject(data.relations.baseId);
                            }
                            rObjectLoaded();
                        }
                    });
                }
            };

            /*main*/
            rLoadObject(key);
        };
        var loadBase = function(node,key,callback){
            ASSERT(node);
            ASSERT(callback);

            if(objects[key]){
                callback(null,node);
            }
            else{
                loadObject(key,function(err,data){
                    if(err){
                        callback(err,undefined);
                    }
                    else{
                        if(data.relations.baseId === null){
                            callback(null,node);
                        }
                        else{
                            loadBase(node,data.relations.baseId,callback);
                        }
                    }
                });
            }
        };

        var loadRoot = function(key,callback){
            ASSERT(typeof key === "string");
            ASSERT(callback);

            loadObject(key,function(err,node){
                if(err){
                    callback(err,undefined);
                }
                else{
                    loadBase(node,key,callback);
                }
            });
        };

        var createRoot = function(){

        };

        var getProperty = function(node,basename,name){
            ASSERT(isValid(node));
            ASSERT(typeof basename === "string");
            ASSERT(typeof name === "string");

            var property = undefined;
            var object = node;

            while(true){
                if(object[basename] !== undefined){
                    if(object[basename][name] !== undefined){
                        return object[basename][name];
                    }
                    else{
                        object = objects[object.relations.baseId];
                    }
                }
                else{
                    return undefined;
                }
            }

        };
        var setProperty = function(node,basename,name,value){
            ASSERT(isValid(node));
            ASSERT(typeof basename === "string");
            ASSERT(typeof name === "string");
            ASSERT(states[node[ID] !== "deleted"]);
            ASSERT(value);


            if(node[basename] === undefined){
                node[basename] = {};
            }
            node[basename][name] = value;
            if(states[node[ID]] === "read"){
                states[node[ID]] = "updated";
            }
        };
        var delProperty = function(node,basename,name){
            ASSERT(isValid(node));
            ASSERT(typeof basename === "string");
            ASSERT(typeof name === "string");
            ASSERT(node[basename]);
            ASSERT(node[basename][name]);
            ASSERT(states[node[ID] !== "deleted"]);

            delete node[basename][name];
            if(states[node[ID]] === "read"){
                states[node[ID]] = "updated";
            }
        };

        var getRegistry = function(node,name){
            return getProperty(node,"registry",name);
        };
        var setRegistry = function(node,name,value){
            setProperty(node,"registry",name,value);
        };
        var delRegistry = function(node,name){
            delProperty(node,"registry",name);
        };
        var getAttribute = function(node,name){
            return getProperty(node,"attributes",name);
        };
        var setAttribute = function(node,name,value){
            setProperty(node,"attribute",name,value);
        };
        var delAttribute = function(node,name){
            delProperty(node,"attribute",name);
        };
    };
    return Buffer;
});
