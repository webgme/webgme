define(['./../common/CommonUtil'],function(commonUtil){
    "use strict";
    var ASSERT = commonUtil.assert;
    var GUID = commonUtil.guid;
    var COPY = commonUtil.copy;
    var KEY = "_id";

    var Buffer = function(storage){
        ASSERT(storage);

        
        var objects = {};
        var states = {};
        var loadqueue = {};

        var isValid = function(node){
            var i;
            ASSERT(node);
            ASSERT(node[KEY]);
            ASSERT(objects[node[KEY]]);

            ASSERT(node.relations);
            ASSERT(node.relations.baseId !== undefined);
            ASSERT(node.relations.inheritorIds !== undefined);
            ASSERT(node.relations.inheritorIds.length >= 0);
            ASSERT(node.relations.parentId !== undefined);
            ASSERT(node.relations.childrenIds !== undefined);
            ASSERT(node.relations.childrenIds.length >= 0);

            ASSERT(node.registry);

            ASSERT(node.attributes);

            ASSERT(node.pointers);
            for(i in node.pointers){
                ASSERT(node.pointers[i].to !== undefined);
                ASSERT(node.pointers[i].from !== undefined);
                ASSERT(node.pointers[i].from.length >= 0);
            }


            return true;
        };

        var getKey = function(node){
            ASSERT(isValid(node));

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
            var callbackcalled = false;
            var callCallback = function(err){
                if(!callbackcalled){
                    callbackcalled = true;
                    callback(err,objects[key]);
                }
            };
            var loadPointers = function(){

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
                            /*parent and pointers have to be loaded as well, but not recursively*/

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

            if(objects[root] === undefined){
                storage.getAll(function(err,items){
                    var i;
                    if(err){
                        callback(err,undefined);
                    }
                    else{
                        objects = items;
                        states = {};
                        for(i in objects){
                            states[i] = "read";
                        }
                        callback(null,objects["root"]);
                    }
                });
            }
            else{
                callback(null,objects["root"]);
            }
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

        var loadByPath = function(stringpath,callback){
            ASSERT(objects['root']);
            ASSERT(stringpath && callback);

            callback(null,objects[stringpath]);
        };

        var getParent = function(node){
            ASSERT(isValid(node));

            if(node.relations.parentId !== null){
                return objects[node.relations.parentId];
            }
            return undefined;
        };
        var getBase = function(node){
            ASSERT(isValid(node));

            if(node.relations.baseId !== null){
                return objects[node.relations.baseId];
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
                /*parent*/
                if(subTreeIds.indexOf(objects[subTreeIds[i]].relations.parentId) !== -1){
                    tempnode.relations.parentId = inheritanceArray[objects[subTreeIds[i]].relations.parentId];
                }
                else{
                    tempnode.relations.parentId = null;
                }
                /*children*/
                for(j=0;j<objects[subTreeIds[i]].relations.childrenIds.length;j++){
                    tempnode.relations.childrenIds.push(inheritanceArray[objects[subTreeIds[i]].relations.childrenIds[j]]);
                }

                tempnode.relations.baseId = subTreeIds[i];

                attachInheritor(objects[subTreeIds[i]],tempnode);
            }

            /*pointers can be connected once every new node have been created*/
            for(i=0;i<subTreeIds.length;i++){
                for(j in objects[subTreeIds[i]].pointers){
                    if(subTreeIds.indexOf(objects[subTreeIds[i]].pointers[j].to) === -1){
                        setPointer(objects[inheritanceArray[subTreeIds[i]]],j,objects[subTreeIds[i]].pointers[j].to);
                    }
                    else{
                        setPointer(objects[inheritanceArray[subTreeIds[i]]],j,objects[inheritanceArray[objects[subTreeIds[i]].pointers[j].to]]);
                    }
                }
            }

            return objects[newguid];
        };
        var attachChild = function(parent,child){
            ASSERT(isValid(parent));
            ASSERT(isValid(child));
            child.relations.parentId = parent[KEY];
            if(states[child[KEY]] === "read"){
                states[child[KEY]] = "updated";
            }
            if(commonUtil.insertIntoArray(parent.relations.childrenIds,child[KEY])){
                if(states[parent[KEY]] === "read"){
                    states[parent[KEY]] = "updated";
                }
                for(var i=0;i<parent.relations.inheritorIds.length;i++){
                    attachChild(objects[parent.relations.inheritorIds[i]],inheritNode(child[KEY]));
                }
            }
        };

        var createRoot = function(){

        };

        var removeNode = function(node){
            ASSERT(isValid(node));
            var i;
            states[node[KEY]] = "deleted";
            for(i in node.pointers){
                deletePointer(node,i);
            }
            for(i=0;i<node.relations.childrenIds.length;i++){
                removeNode(objects[node.relations.childrenIds[i]]);
            }
            for(i=0;i<node.relations.inheritorIds.length;i++){
                removeNode(objects[node.relations.inheritorIds[i]]);
            }

            if(states[node.relations.parentId] !== "deleted"){
                commonUtil.removeFromArray(objects[node.relations.parentId].relations.childrenIds,node[KEY]);
                if(states[node.relations.parentId] === "read"){
                    states[node.relations.parentId] = "updated";
                }
            }

            if(states[node.relations.baseId] !== "deleted"){
                commonUtil.removeFromArray(objects[node.relations.baseId].relations.inheritorIds,node[KEY]);
                if(states[node.relations.baseId] === "read"){
                    states[node.relations.baseId] = "updated";
                }
            }

            objects[node[KEY]] = null;

        };
        var copyNode = function(node,parent,newguid){
            ASSERT(node && parent);
            var copyArray = {};
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
            rAddtoSubTreeIds(node[KEY]);
            for(i=0;i<subTreeIds.length;i++){
                copyArray[subTreeIds[i]] = GUID();
            }
            copyArray[node[KEY]] = newguid;

            for(i=0;i<subTreeIds.length;i++){
                tempnode = createEmptyNode(copyArray[subTreeIds[i]]);

                tempnode.attributes = COPY(objects[subTreeIds[i]].attributes);
                tempnode.registry = COPY(objects[subTreeIds[i]].registry);

                /*parent*/
                if(subTreeIds.indexOf(objects[subTreeIds[i]].relations.parentId) !== -1){
                    tempnode.relations.parentId = copyArray[objects[subTreeIds[i]].relations.parentId];
                }
                else{
                    tempnode.relations.parentId = null;
                }
                /*children*/
                for(j=0;j<objects[subTreeIds[i]].relations.childrenIds.length;j++){
                    tempnode.relations.childrenIds.push(copyArray[objects[subTreeIds[i]].relations.childrenIds[j]]);
                }

                tempnode.relations.baseId = subTreeIds[i];

                attachInheritor(objects[subTreeIds[i]],tempnode);
            }

            /*pointers can be connected once every new node have been created*/
            for(i=0;i<subTreeIds.length;i++){
                for(j in objects[subTreeIds[i]].pointers){
                    if(objects[subTreeIds[i]].pointers[j].to !== null){
                        if(subTreeIds.indexOf(objects[subTreeIds[i]].pointers[j].to) === -1){
                            setPointer(objects[copyArray[subTreeIds[i]]],j,objects[subTreeIds[i]].pointers[j].to);
                        }
                        else{
                            setPointer(objects[copyArray[subTreeIds[i]]],j,objects[copyArray[objects[subTreeIds[i]].pointers[j].to]]);
                        }
                    }
                }
            }
            attachChild(parent,objects[newguid]);
            return objects[newguid];

        };

        var loadPointer = function(node,name,callback){
            ASSERT(node && name);

            if(node.pointers[name]){
                if(node.pointers[name].to === null){
                    callback(null,null);
                }
                else{
                    callback(null,objects[node.pointers[name].to]);
                }
            }
            else{
                callback(null,undefined);
            }
        };
        var deletePointer = function(node,name){
            ASSERT(node && name);

            if(node.pointers[name]){
                if(node.pointers[name].to){
                    commonUtil.removeFromArray(objects[node.pointers[name].to].pointers[name].from,node[KEY]);
                    if(states[node[KEY]] === "read"){
                        states[node[KEY]] = "updated";
                    }

                    if(states[node.pointers[name].to] === "read"){
                        states[node.pointers[name].to] = "updated";
                    }

                    node.pointers[name].to = null;
                }
            }
        };
        var setPointer = function(node,name,target){
            console.log("kecso "+JSON.stringify(node)+"-"+name+"-"+JSON.stringify(target));
            ASSERT(node && name && target);

            if(node.pointers[name] === undefined){
                node.pointers[name] = {to:null,from:[]};
            }
            deletePointer(node,name);

            if(target.pointers[name] === undefined){
                target.pointers[name] = {to:null,from:[]};
            }

            node.pointers[name].to = target[KEY];
            commonUtil.insertIntoArray(target.pointers[name].from,node[KEY]);

            if(states[node[KEY]] === "read"){
                states[node[KEY]] = "updated";
            }

            if(states[target[KEY]] === "read"){
                states[target[KEY]] = "updated";
            }

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
            ASSERT(states[node[KEY]] !== "deleted");
            ASSERT(value !== undefined);


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
            ASSERT(states[node[KEY]] !== "deleted");

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
            setProperty(node,"attributes",name,value);
        };
        var delAttribute = function(node,name){
            delProperty(node,"attributes",name);
        };

        var persist = function(node,callback){
            var i;
            var savequeue = [];
            var count;
            var success = true;
            var error = null;
            var persistinfo = {};
            var objectSaved = function(err){
                if(err){
                    /*TODO how to get back to previous database state???*/
                    success = false;
                    objects = {};
                    states = {};
                    error = err;
                }
                if(--count === 0){
                    storage.save();
                    callback(error,persistinfo);
                }
            };
            for(i in states){
                if(states[i] !== "read"){
                    persistinfo[i] = {info:states[i],object:objects[i]};
                    if(states[i] === "deleted"){
                     savequeue.push(i);   
                    }
                    else{
                        savequeue.push(objects[i]);
                    }
                    states[i] = "read";
                }
            }

            count = savequeue.length;
            if(count === 0){
                callback(null,{});
            }
            else{
                for(i=0;i<savequeue.length;i++){
                    if(typeof savequeue[i] === "string"){
                        storage.set(savequeue[i],null,objectSaved);
                    }
                    else{
                        storage.set(savequeue[i][KEY],savequeue[i],objectSaved);
                    }
                }
            }
        };

        var dumpTree = function(key,callback){
            callback(null,objects["root"]);
        };

        var getAttributeNames = function(node){
            return Object.keys(node.attributes);
        };
        var getPointerNames = function(node){
            return Object.keys(node.pointers);
        };

        var flushTree = function(){
            objects = {};
            states = {};
            loadqueue = {};
        };

        return{
            getKey            : getKey,
            getRegistry       : getRegistry,
            setRegistry       : setRegistry,
            delRegistry       : delRegistry,
            getAttribute      : getAttribute,
            setAttribute      : setAttribute,
            delAttribute      : delAttribute,
            createEmptyNode   : createEmptyNode,
            inheritNode       : inheritNode,
            attachChild       : attachChild,
            persist           : persist,
            loadPointer       : loadPointer,
            setPointer        : setPointer,
            deletePointer     : deletePointer,
            dumpTree          : dumpTree,
            getAttributeNames : getAttributeNames,
            getPointerNames   : getPointerNames,
            loadObject        : loadObject,
            loadRoot          : loadRoot,
            loadChild         : loadChild,
            loadChildren      : loadChildren,
            loadByPath        : loadByPath,
            getParent         : getParent,
            getRoot           : getRoot,
            getBase           : getBase,
            getStringPath     : getStringPath,
            flushTree         : flushTree,
            removeNode        : removeNode,
            copyNode          : copyNode
        }
    };
    return Buffer;
});
