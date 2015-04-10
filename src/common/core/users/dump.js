define([
    'common/core/users/meta',
    'common/core/users/tojson',
    'common/util/url'
],function(
    BaseMeta,
    ToJson,
    URL
    ){
    var _refTypes = {
        'url':'url',
        'path':'path',
        'guid':'guid'
        },
        _cache = {},
        _rootPath = "",
        _refType = 'url',
        _core = null,
        META = new BaseMeta();

    var isRefObject = function(obj){
        if(obj && typeof obj['$ref'] === 'string'){
            return true;
        }
        return false;
    };
    var getRefObjectPath = function(obj){
        if(isRefObject(obj) === true){
            var refValue = obj['$ref'];
            switch(_refType){
                case _refTypes.url:
                    if(refValue === null){
                        return null;
                    }
                    refValue = refValue.split('/');
                    return URL.removeSpecialChars(refValue[refValue.length-1]);
                    break;
                case _refTypes.path:
                case _refTypes.guid:
                    return refValue;
                    break;
                default:
                    return null;
            }

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

    var refToRelRefObj = function(path,refObj){
        if(_cache[path]){
            refObj['$ref'] = _cache[path];
        } else {
            refObj = {'$ref': null};
        }
    };

    var isSubordinate = function(path){
        if(path.indexOf(_rootPath) === 0){
            return true;
        }
        return false;
    };

    var dumpChildren = function(node,dumpObject,urlPrefix,relPath,callback){
        var needed = dumpObject.children.length;
        if(needed > 0){
            _core.loadChildren(node,function(err,children){
                if(err){
                    callback(err);
                } else {
                    if(children === null || children === undefined || ! children.length > 0){
                        callback(new Error('invalid children info found'));
                    } else {
                        var setChildJson = function(child,cb){
                            ToJson(_core,child,urlPrefix,_refType,function(err,jChild){
                                if(err){
                                    cb(err);
                                } else {
                                    if(jChild){
                                        var childRelPath,
                                            childPath = _core.getPath(child);
                                        for(var j=0;j<dumpObject.children.length;j++){
                                            if(childPath === getRefObjectPath(dumpObject.children[j])){
                                                childRelPath = relPath+'/children['+j+']';
                                                _cache[childPath] = childRelPath;
                                                dumpObject.children[j] = jChild;
                                                break;
                                            }
                                        }
                                        dumpChildren(child,dumpObject.children[j],urlPrefix,childRelPath,cb);
                                    }
                                }
                            })
                        };
                        var error = null;

                        for(var i=0;i<children.length;i++){
                            setChildJson(children[i],function(err){
                                error = error || err;
                                if(--needed === 0){
                                    callback(error);
                                }
                            })
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
                            refToRelRefObj(path,dumpObject[i]);
                        }
                    } else {
                        checkForInternalReferences(dumpObject[i]);
                    }
                }
            }
        }
    };
    var dumpJsonNode = function(core,node,urlPrefix,refType,callback){
        _cache = {};
        _core = core;
        _rootPath = core.getPath(node);
        _refType = refType;

        //TODO this needs to be done in another way
        ToJson(core,node,urlPrefix,_refType,function(err,jDump){
            if(err){
                callback(err,null);
            } else {
                if(jDump){
                    _cache[_rootPath] = "#";
                }
                dumpChildren(node,jDump,urlPrefix,_cache[_rootPath],function(err){
                    if(err){
                        callback(err);
                    } else {
                        checkForInternalReferences(jDump);
                        callback(null,jDump);
                    }
                });
            }
        });
    };

    return dumpJsonNode;
});

