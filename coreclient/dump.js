define([
    'coreclient/meta',
    'coreclient/tojson',
    'util/url'
],function(
    META,
    ToJson,
    URL
    ){
    var _cache = {};
    var _rootPath = "";
    var isRefObject = function(obj){
        if(obj && obj['$ref']){
            return true;
        }
        return false;
    };
    var getRefObjectPath = function(obj){
        if(isRefObject(obj) === true){
            var url = obj['$ref'];
            if(url === null){
                return null;
            }
            url = url.split('/');
            return URL.removeSpecialChars(url[url.length-1]);
        } else {
            return null;
        }
    };

    var pathToRelRefObject = function(path){
        if(_cache[path]){
            return {'$ref': _cache[path]};
        }
        return {'$ref': null};
    };

    var isSubordinate = function(path){
        if(path.indexOf(_rootPath) === 0){
            return true;
        }
        return false;
    };

    var dumpChildren = function(core,node,dumpObject,urlPrefix,relPath,callback){
        var needed = dumpObject.children.length;
        if(needed > 0){
            core.loadChildren(node,function(err,children){
                if(err){
                    callback(err);
                } else {
                    if(children === null || children === undefined || ! children.length > 0){
                        callback(new Error('invalid children info found'));
                    } else {
                        //first we insert the children into our dump and updates our cache
                        var indexmap = [];
                        for(var i=0;i<dumpObject.children.length;i++){
                            indexmap.push(0);
                        }
                        for(var i=0;i<children.length;i++){
                            var childDump = ToJson(core,children[i],urlPrefix);
                            if(childDump){
                                var childPath = core.getPath(children[i]);
                                //TODO this needs to be done in another way
                                childPath = childPath === "root" ? "" : childPath;
                                //we should found where we should put it
                                for(var j=0;j<dumpObject.children.length;j++){
                                    if(childPath === getRefObjectPath(dumpObject.children[j])){
                                        _cache[childPath] = relPath+'/children['+j+']';
                                        dumpObject.children[j] = childDump;
                                        indexmap[j] = i;
                                    }
                                }
                            }
                        }

                        //now comes the recursive call time
                        var error = null;
                        var internalReturn = function(err){
                            error = error || err;
                            if(--needed === 0){
                                callback(err);
                            }
                        };
                        for(var i=0;i<dumpObject.children.length;i++){
                            dumpChildren(core,children[indexmap[i]],dumpObject.children[i],urlPrefix,relPath+'/children['+i+']',internalReturn);
                        }
                    }
                }
            });
        } else {
            callback(null);
        }
    };
    var checkForInternalReferences = function(dumpObject){
        if(typeof dumpObject === 'object'){
            for(var i in dumpObject){
                if(typeof dumpObject[i] === 'object'){
                    if(isRefObject(dumpObject[i])){
                        var path = getRefObjectPath(dumpObject[i]);
                        if(isSubordinate(path)){
                            dumpObject[i] = pathToRelRefObject(path);
                        }
                    } else {
                        checkForInternalReferences(dumpObject[i]);
                    }
                }
            }
        }
    };
    var dumpJsonNode = function(core,node,urlPrefix,callback){
        _cache = {};
        _rootPath = core.getPath(node);
        //TODO this needs to be done in another way
        _rootPath = _rootPath === "root" ? "" : _rootPath;
        var jDump = ToJson(core,node,urlPrefix);
        if(jDump){
            _cache[_rootPath] = "#";
        }
        dumpChildren(core,node,jDump,urlPrefix,_cache[_rootPath],function(err){
            if(err){
                callback(err);
            } else {
                checkForInternalReferences(jDump);
                callback(null,jDump);
            }
        })
    };

    return dumpJsonNode;
});

