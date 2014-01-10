define([
    'coreclient/meta',
    'util/url'
],function(
    META,
    URL
    ){

    var _refTypes = {
        'url':'url',
        'path':'path',
        'guid':'guid'
    };
    /*var changeRefObjects = function(refType,urlPrefix,object){
        if(typeof object === 'object' && object !== null){
            if(object['$ref']){
                //the object is a reference
                object = pathToRefObj(refType,urlPrefix,object['$ref'].substring(1));
            } else {
                //recursive call to the members of the non-reference object
                for(var i in object){
                    if(object[i] !== null){
                        object[i] = changeRefObjects(refType,urlPrefix,object[i]);
                    }
                }
            }
        }
        return object;
    };*/
    var changeRefObjects = function(refType,urlPrefix,object,core,root,callback){
        if(typeof object === 'object'){
            var needed = 0,
                neededNames = [],
                error = null;
            for(var i in object){
                if(typeof object[i] === 'object'){
                    needed++;
                    neededNames.push(i);
                }
            }
            if(needed > 0){
                for(var i=0;i<neededNames.length;i++){
                    if(object[neededNames[i]]['$ref']){
                        //refrence object
                        pathToRefObjAsync(refType,urlPrefix,object[neededNames[i]]['$ref'].substring(1),core,root,function(err,refObj){
                            error = error || err;
                            object[neededNames[i]] = refObj;
                            if(--needed === 0){
                                callback(error);
                            }
                        });
                    } else {
                        changeRefObjects(refType,urlPrefix,object[neededNames[i]],core,root,function(err){
                            error = error || err;
                            if(--needed === 0){
                                callback(error);
                            }
                        });
                    }
                }
            } else {
                callback(null);
            }
        } else {
            callback(null);
        }
    };
    var pathToRefObj = function(refType,urlPrefix,path){
        switch (refType){
            case _refTypes.url:
                if(path === null){
                    return URL.urlToRefObject(null);
                }
                return URL.urlToRefObject(urlPrefix+'/'+URL.addSpecialChars(path));
                break;
            case _refTypes.path:
                return URL.urlToRefObject(path);
                break;
            default:
                return URL.urlToRefObject(null);
        }
    };
    var pathToRefObjAsync = function(refType,urlPrefix,path,core,root,callback){
        switch (refType){
            case _refTypes.url:
                if(path === null){
                    callback(null,URL.urlToRefObject(null));
                }
                callback(null,URL.urlToRefObject(urlPrefix+'/'+URL.addSpecialChars(path)));
                break;
            case _refTypes.path:
                callback(null,URL.urlToRefObject(path));
                break;
            case _refTypes.guid:
                core.loadByPath(root,path,function(err,node){
                    if(err){
                        callback(err,null);
                    } else {
                        var refObj = URL.urlToRefObject(path);
                        refObj.GUID = core.getGuid(node);
                        callback(null,refObj);
                    }
                });
                break;
            default:
                callback(null,URL.urlToRefObject(null));
        }
    };
    var getChildrenGuids = function(core,node,callback){
        var GUIDHash = {};
        core.loadChildren(node,function(err,children){
            if(err){
                callback(err,null);
            } else {
                for(var i=0;i<children.length;i++){
                    GUIDHash[core.getPath(children[i])] = core.getGuid(children[i]);
                }
                callback(null,GUIDHash);
            }
        });
    };
    var getMetaOfNode = function(core,node,urlPrefix,refType,callback){
        var meta = META.getMeta(core.getPath(node));
        changeRefObjects(refType,urlPrefix,meta,core,core.getRoot(node),function(err){
            callback(err,meta);
        });
    };
    var getChildrenOfNode = function(core,node,urlPrefix,refType,callback){
        if(refType === _refTypes.guid){
            getChildrenGuids(core,node,function(err,gHash){
                if(err){
                    callback(err);
                } else {
                    //TODO possibly it needs some ordering
                    var children = [];
                    for(var i in gHash){
                        var refObj = URL.urlToRefObject(i);
                        refObj.GUID = gHash[i];
                        children.push(refObj);
                    }
                    callback(null,children);
                }
            });
        } else {
            var paths = core.getChildrenPaths(node);
            var children = [];
            for(var i=0;i<paths.length;i++){
                children.push(pathToRefObj(refType,urlPrefix,paths[i]));
            }
            callback(null,children);
        }
    };
    var getSetsOfNode = function(core,node,urlPrefix,refType,callback){
        callback(null,{});
        /*//sets
        tArray = core.getSetNames(node);
        t2Array = core.isMemberOf(node);
        for(j in t2Array){
            for(i=0;i<t2Array[j].length;i++){
                if(tArray.indexOf(t2Array[j][i]) === -1){
                    tArray.push(t2Array[j][i]);
                }
            }
        }

        for(i=0;i<tArray.length;i++){
            var pointer = {to:[],from:[]};
            var members = core.getMemberPaths(node,tArray[i]);
            for(j=0;j<members.length;j++){
                pointer.to.push(pathToRefObj(refType,urlPrefix,members[j]));
            }
            for(j in t2Array){
                if(t2Array[j].indexOf(tArray[i]) !== -1){
                    pointer.from.push(pathToRefObj(refType,urlPrefix,core.toActualPath(j)));
                }
            }
            jNode['pointers'][tArray[i]] = pointer;
        }*/
    };
    var getPointersGUIDs = function(core,node,callback){
        var gHash = {},
            pointerNames = core.getPointerNames(node),
            collectionNames = core.getCollectionNames(node),
            needed = pointerNames.length+collectionNames.length,
            error = null;
        if(needed > 0){
            //pointers
            for(var i=0;i<pointerNames.length;i++){
                core.loadPointer(node,pointerNames[i],function(err,pointer){
                    error = error || err;
                    if(pointer){
                        if(gHash[core.getPath(pointer)] === undefined){
                            gHash[core.getPath(pointer)] = core.getGuid(pointer);
                        }
                    }

                    if(--needed === 0){
                        callback(error,gHash);
                    }
                });
            }
            //collections
            for(var i=0;i<collectionNames.length;i++){
                core.loadCollection(node,collectionNames[i],function(err,collection){
                    error = error || err;
                    if(collection){
                        for(var j=0;j<collection.length;j++){
                            if(gHash[core.getPath(collection[j])] === undefined){
                                gHash[core.getPath(collection[j])] = core.getGuid(collection[j]);
                            }
                        }
                    }

                    if(--needed === 0){
                        callback(error,gHash);
                    }
                });
            }
        } else {
            callback(error,gHash);
        }
    };
    var getPointersOfNode = function(core,node,urlPrefix,refType,callback){
        var GUIDHash = {};
        var getRefObj = function(path){
            if(refType === _refTypes.guid){
                var refObj = URL.urlToRefObject(path);
                refObj.GUID = GUIDHash[path];
                return refObj;
            } else {
                return pathToRefObj(refType,urlPrefix,path);
            }
        };
        var initialized = function(){
            var pointers = {},
                tArray = core.getPointerNames(node),
                t2Array = core.getCollectionNames(node);
            for(var i=0;i<t2Array.length;i++){
                if(tArray.indexOf(t2Array[i]) === -1){
                    tArray.push(t2Array[i]);
                }
            }
            for(var i=0;i<tArray.length;i++){
                var coll = core.getCollectionPaths(node,tArray[i]);
                var pointer = {to:[],from:[]};
                pointer.to.push(getRefObj(core.getPointerPath(node,tArray[i])));
                for(var j=0;j<coll.length;j++){
                    pointer.from.push(getRefObj(coll[j]));
                }
                pointers[tArray[i]] = pointer;
            }
            callback(null,pointers);
        };

        //start
        if(refType === _refTypes.guid){
            getPointersGUIDs(core,node,function(err,gHash){
                if(err){
                    callback(err,null);
                } else {
                    GUIDHash = gHash;
                    initialized();
                }
            });
        } else {
            initialized();
        }
    };
    var getJsonNode = function(core,node,urlPrefix,refType,callback){
        var nodes = {},
            tArray,t2Array,
            i,j,
            jNode;
        if(refType === _refTypes.guid && typeof core.getGuid !== 'function'){
            callback(new Error('cannot provide GUIDs'),null);
        }

        nodes[core.getPath(node)] = node;
        META.initialize(core,nodes,function(){});
        jNode = {'meta':{},'registry':{},'children':[],'attributes':{},'pointers':{}, 'registry':{}};


        //basic parts of the node
        //GUID
        if(typeof core.getGuid === 'function'){
            jNode.GUID = core.getGuid(node);
        }
        //RELID
        jNode.RELID = core.getRelid(node);
        //registry entries
        tArray = core.getRegistryNames(node);
        for(i=0;i<tArray.length;i++){
            jNode['registry'][tArray[i]] = core.getRegistry(node,tArray[i]);
        }
        //attribute entries
        tArray = core.getAttributeNames(node);
        for(i=0;i<tArray.length;i++){
            jNode['attributes'][tArray[i]] = core.getAttribute(node,tArray[i]);
        }
        //registry entries
        tArray = core.getRegistryNames(node);
        for(i=0;i<tArray.length;i++){
            jNode['registry'][tArray[i]] = core.getAttribute(node,tArray[i]);
        }

        //now calling the relational parts
        var needed = 4,
            error = null;
        getChildrenOfNode(core,node,urlPrefix,refType,function(err,children){
            console.log('kecso','children',err);
            error = error || err;
            jNode.children = children;
            if(--needed === 0){
                callback(error,jNode);
            }
        });
        getMetaOfNode(core,node,urlPrefix,refType,function(err,meta){
            console.log('kecso','meta',err);
            error = error || err;
            jNode.meta = meta;
            if(--needed === 0){
                callback(error,jNode);
            }
        });
        getPointersOfNode(core,node,urlPrefix,refType,function(err,pointers){
            console.log('kecso','pointers',err);
            error = error || err;
            for(var i in pointers){
                jNode.pointers[i] = pointers[i];
            }
            if(--needed === 0){
                callback(error,jNode);
            }
        });
        getSetsOfNode(core,node,urlPrefix,refType,function(err,sets){
            console.log('kecso','sets',err);
            error = error || err;
            for(var i in sets){
                jNode.pointers[i] = sets[i];
            }
            if(--needed === 0){
                callback(error,jNode);
            }
        });
    };
    return getJsonNode;
});
