define(['CommonUtil'],function(commonUtil){
    "use strict";
    var ASSERT = commonUtil.assert;
    var GUID = commonUtil.guid;
    var KEY = "_id";

    var Buffer = function(storage){
        ASSERT(storage);

        
        var objects = {};
        var states = {};
        var loadqueue = {};

        var isValid = function(node){
            ASSERT(node);
            ASSERT(node[KEY]);
            ASSERT(objects[node[KEY]]);

            
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

        var getKey = function(node){
            ASSET(isValid(node));

            return node[KEY];
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
                ASSERT(object[KEY] === key);
                objects[object[KEY]] = object;
                states[object[KEY]] = "read";
                while(loadqueue[key].length>0){
                    loadqueue[key][0](null,objects[object[KEY]]);
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
        var loadChild = function(node,relid,callback){
            ASSERT(isValid(node));
            ASSERT(isValid(objects[relid]));
            callback(null,objects[relid]);
        };
        var loadChildren = function(node,callback){
            ASSERT(isValid(node));

            var i;
            var children = [];
            for(i=0;i<node.relations.childrenIds.length;i++){
                children.push(objects[node.relations.childrenIds[i]]);
            }
            callback(null,children);
        };

        var getParent = function(node){
            ASSERT(isValid(node));

            if(node.relations.parentId !== null){
                return objects[node.relations.parentId];
            }
            return undefined;
        };
        var getRoot = function(node){
            var root = node;
            while(root.relations.parentId !== null){
                root = objects[root.relations.parentId];
            }

            return root;
        };
        var getStringPath = function (node, base) {
            ASSERT(isValid(node));
            ASSERT(isValid(base));
            return node[KEY];
        };

        var createEmptyNode = function(newguid){
            var node = {
                attributes:{},
                registry:{},
                relations:{
                    parentId:null,
                    childrenIds:[],
                    baseId:null,
                    inheritorIds:[]
                },
                pointers:{}
            };
            node[KEY] = newguid || GUID();

            objects[node[KEY]] = node;
            states[node[KEY]] = "created";
            return objects[node[KEY]];
        };
        var attachInheritor = function(base,node){
            if(commonUtil.insertIntoArray(base.relations.inheritorIds,node[KEY])){
                if(states[base[KEY]] === "read"){
                    states[base[KEY]] = "updated"
                }
            }
        };
        var inheritNode = function(baseId,newguid){

            var inheritanceArray = {};
            var subTreeIds = [];
            var i,j;
            var tempnode;

            var rAddtoSubTreeIds = function(key){
                var i;
                commonUtil.insertIntoArray(subTreeIds,key);
                for(i=0;i<objects[key].relations.childrenIds.length;i++){
                    rAddtoSubTreeIds(objects[key].relations.childrenIds[i]);
                }
            };


            newguid = newguid || GUID();
            rAddtoSubTreeIds(baseId);
            for(i=0;i<subTreeIds.length;i++){
                inheritanceArray[subTreeIds[i]] = GUID();
            }
            inheritanceArray[baseId] = newguid;

            for(i=0;i<subTreeIds.length;i++){
                tempnode = createEmptyNode(inheritanceArray[subTreeIds[i]]);
                if(subTreeIds.indexOf(objects[subTreeIds[i]].relations.parentId) !== -1){
                    tempnode.relations.parentId = inheritanceArray[objects[subTreeIds[i]].relations.parentId];
                }
                else{
                    tempnode.relations.parentId = null;
                }
                for(j=0;j<objects[subTreeIds[i]].relations.childrenIds.length;j++){
                    tempnode.relations.childrenIds.push(inheritanceArray[objects[subTreeIds[i]].relations.childrenIds[j]]);
                }
                tempnode.relations.baseId = subTreeIds[i];

                attachInheritor(objects[subTreeIds[i]],tempnode);
            }

            return objects[newguid];
        };
        var attachChild = function(parent,child){
            ASSERT(isValid(parent));
            ASSERT(isValid(child));
            child.relations.parentId = parent[KEY];
            if(commonUtil.insertIntoArray(parent.relations.childrenIds,child[KEY])){
                for(var i=0;i<parent.relations.inheritorIds.length;i++){
                    attachChild(objects[parent.relations.inheritorIds[i]],inheritNode(child[KEY]));
                }
            }
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
            ASSERT(states[node[KEY] !== "deleted"]);
            ASSERT(value);


            if(node[basename] === undefined){
                node[basename] = {};
            }
            node[basename][name] = value;
            if(states[node[KEY]] === "read"){
                states[node[KEY]] = "updated";
            }
        };
        var delProperty = function(node,basename,name){
            ASSERT(isValid(node));
            ASSERT(typeof basename === "string");
            ASSERT(typeof name === "string");
            ASSERT(node[basename]);
            ASSERT(node[basename][name]);
            ASSERT(states[node[KEY] !== "deleted"]);

            delete node[basename][name];
            if(states[node[KEY]] === "read"){
                states[node[KEY]] = "updated";
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

        var persist = function(node,callback){
            var i;
            var savequeue = [];
            var count;
            var objectSaved = function(){

            };
            for(i in states){
                if(states[i] !== "read"){
                    states[i] = "read";
                    savequeue.push(objects[i]);
                }
            }

            count = savequeue.length;
            for(i=0;i<savequeue.length;i++){
                storage.set(savequeue[i][KEY],savequeue[i],objectSaved);
            }
        };

        return{
            getKey          : getKey,
            getRegistry     : getRegistry,
            setRegistry     : setRegistry,
            delRegistry     : delRegistry,
            getAttribute    : getAttribute,
            setAttribute    : setAttribute,
            delAttribute    : delAttribute,
            createEmptyNode : createEmptyNode,
            inheritNode     : inheritNode,
            attachChild     : attachChild
        }
    };
    return Buffer;
});
