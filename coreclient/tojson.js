define([
    'coreclient/meta',
    'util/url'
],function(
    META,
    URL
    ){

    var changeRefObjects = function(urlPrefix,object){
        if(typeof object === 'object' && object !== null){
            if(object['$ref']){
                //the object is a reference
                object = pathToRefObj(urlPrefix,object['$ref'].substring(1));
            } else {
                //recursive call to the members of the non-reference object
                for(var i in object){
                    if(object[i] !== null){
                        object[i] = changeRefObjects(urlPrefix,object[i]);
                    }
                }
            }
        }
        return object;
    };
    var pathToRefObj = function(urlPrefix,path){
        if(path === null){
            return URL.urlToRefObject(null);
        }
        return URL.urlToRefObject(urlPrefix+'/'+URL.addSpecialChars(path));
    }
    var getJsonNode = function(core,node,urlPrefix){
        var nodes = {},
            tArray,t2Array,
            i,j,
            jNode;
        nodes[core.getPath(node)] = node;
        META.initialize(core,nodes,function(){});

        jNode = {'meta':changeRefObjects(urlPrefix,META.getMeta(core.getPath(node))),'registry':{},'children':[],'attributes':{},'pointers':{}};


        //GUID
        if(typeof core.getGuid === 'function'){
            jNode.GUID = core.getGuid(node);
        }
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

        //children
        tArray = core.getChildrenRelids(node);
        for(i=0;i<tArray.length;i++){
            var path = core.getPath(core.getParent(node)) || "";
            //TODO this needs to be done in another way
            path = path === "root" ? "" : path;
            path += '/'+tArray[i];
            jNode['children'].push(pathToRefObj(urlPrefix,path));
        }

        //pointers
        tArray = core.getPointerNames(node);
        t2Array = core.getCollectionNames(node);
        for(i=0;i<t2Array.length;i++){
            if(tArray.indexOf(t2Array[i]) === -1){
                tArray.push(t2Array[i]);
            }
        }
        for(i=0;i<tArray.length;i++){
            var coll = core.getCollectionPaths(node,tArray[i]);
            var pointer = {to:[],from:[]};
            pointer.to.push(pathToRefObj(urlPrefix,core.getPointerPath(node,tArray[i])));
            for(j=0;j<coll.length;j++){
                pointer.from.push(pathToRefObj(urlPrefix,coll[j]));
            }
            jNode['pointers'][tArray[i]] = pointer;
        }

        //sets
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
                pointer.to.push(pathToRefObj(urlPrefix,members[j]));
            }
            for(j in t2Array){
                if(t2Array[j].indexOf(tArray[i]) !== -1){
                    pointer.from.push(pathToRefObj(urlPrefix,core.toActualPath(j)));
                }
            }
            jNode['pointers'][tArray[i]] = pointer;
        }
        return jNode;
    };
    return getJsonNode;
});
