/*
The decision whether a pointer is pointer or set should be based upon the node's META info.
If the META info doesn't contains anything about the given pointer then the importer should ignore it.
One exception from this rule is when the pointer is 'base' as that should be handled in all nodes.
Other exception is when we import a root. In this case we assume that every non 'base' named pointer is a set (or we introduce an exception list for pointers...).
Regarding the META, the multiplicity will show us whether a pointer is a set or not.
This means that if a META was given badly in the first place, then the importer would change it!!!

Other important thing is that the node must have a base pointer, the only exception again if the node is the root itself. - this option may be switchable TODO

As we have the possibility to import a subtree inside the same project, this means that the nodes that are inside the import will loose their GUID.

Currently we expect to have 'GUID enhanced' reference objects (or internal referring standard ones) and we will not search for the GUID, but only check against the found node on the given path. TODO

*/

define([
    'coreclient/meta'
],function(
    BaseMeta
    ){
    var _core = null,
        _root = null,
        _rootPath = "",
        _cache = {},
        _underImport = {},
        _internalRefHash = {},
        META = new BaseMeta();

    function internalRefCreated(intPath,node){
        _cache[_core.getPath(node)] = node;
        _internalRefHash[intPath] = _core.getPath(node);
        var callbacks = _underImport[intPath] || [];
        delete _underImport[intPath];
        for(var i=0;i<callbacks.length;i++){
            callbacks[i](null,node);
        }
    }
    function objectLoaded(error,node){
        if(error === null){
            _cache[_core.getPath(node)] = node;
        }

        var callbacks = _underImport[_core.getPath(node)] || [];
        delete _underImport[_core.getPath(node)];
        for(var i=0;i<callbacks.length;i++){
            callbacks[i](error,node);
        }
    }
    function isInternalReference(refObj){
        if(refObj && typeof refObj['$ref'] === 'string'){
            if(refObj['$ref'].indexOf('#') === 0){
                return true;
            }
        }
        return false;
    }
    function getReferenceNode(refObj,callback){
        //we allow the internal references and the
        if(refObj && typeof refObj['$ref'] === 'string'){
            if(refObj['$ref'].indexOf('#') === 0){
                //we assume that it is an internal reference
                if(_internalRefHash[refObj['$ref']]){
                    callback(null,_cache[_internalRefHash[refObj['$ref']]]);
                } else if(_underImport[refObj['$ref']]){
                    _underImport[refObj['$ref']].push(callback);
                } else {
                    _underImport[refObj['$ref']] = [callback]; //TODO we should check if the loading order is really finite this way
                }
            } else if(refObj['$ref'] === null){
                callback(null,null);
            } else {
                if(_cache[refObj['$ref']]){
                    callback(null,_cache[refObj['$ref']]);
                } else if(_underImport[refObj['$ref']]){
                    _underImport[refObj['$ref']].push(callback);
                } else {
                    _underImport[refObj['$ref']] = [callback];
                    _core.loadByPath(_root,refObj['$ref'],function(err,node){
                        if(err){
                            objectLoaded(err, null);
                        } else {
                            if(refObj['GUID']){
                                if(refObj['GUID'] === _core.getGuid(node)){
                                    objectLoaded(err,node);
                                } else {
                                    objectLoaded('GUID mismatch',node);
                                }
                            } else {
                                objectLoaded(err,node);
                            }
                        }
                    });
                }
            }
        } else {
            callback(null,null);
        }
    }
    function importChildren(node,jNode,pIntPath,callback){
        if(jNode && jNode.children && jNode.children.length){
            var needed = jNode.children.length;

            if(needed > 0){
                var error = null;
                for(var i=0;i<jNode.children.length;i++){
                    importNode(jNode.children[i],node,pIntPath+'/children['+i+']',function(err){
                        error = error || err;
                        if(--needed === 0){
                            callback(error);
                        }
                    });
                }
            } else {
                callback(null);
            }

        } else {
            callback(null); //TODO maybe we should be more strict
        }
    }
    function importAttributes(node,jNode){
        if(typeof jNode.attributes === 'object'){
            for(var i in jNode.attributes){
                _core.setAttribute(node,i,jNode.attributes[i]);
            }
        }
    }
    function importRegistry(node,jNode){
        if(typeof jNode.registry === 'object'){
            for(var i in jNode.registry){
                _core.setRegistry(node,i,jNode.registry[i]);
            }
        }
    }
    function importPointer(node,jNode,pName,callback){
        if(jNode.pointers[pName].to && jNode.pointers[pName].from){
            var needed = jNode.pointers[pName].to.length + jNode.pointers[pName].from.length,
                i,
                error = null;

            for(i=0;i<jNode.pointers[pName].to.length;i++){
                getReferenceNode(jNode.pointers[pName].to[i],function(err,target){
                    error = error || err;
                    _core.setPointer(node,pName,target);

                    if(--needed === 0){
                        callback(error);
                    }
                });
            }

            for(i=0;i<jNode.pointers[pName].from.length;i++){
                if(!isInternalReference(jNode.pointers[pName].from[i])){
                    getReferenceNode(jNode.pointers[pName].from[i],function(err,source){
                        error = error || err;
                        if(source){
                            _core.setPointer(source,pName,node);
                        }

                        if(--needed === 0){
                            callback(error);
                        }
                    });
                } else {
                    if(--needed === 0){
                        callback(error);
                    }
                }
            }

        } else {
            callback(null);
        }
    }
    function importSet(node,jNode,sName, callback){
        if(jNode.pointers[sName].to && jNode.pointers[sName].from){
            var needed = 0,
                importSetRegAndAtr = function(sOwner,sMember,atrAndReg){
                    _core.addMember(sOwner,sName,sMember);
                    var mPath = _core.getPath(sMember);
                    atrAndReg.attributes = atrAndReg.attributes || {};
                    for(var i in atrAndReg.attributes){
                        _core.setMemberAttribute(sOwner,sName,mPath,i,atrAndReg.attributes[i]);
                    }
                    atrAndReg.registry = atrAndReg.registry || {};
                    for(var i in atrAndReg.registry){
                        _core.setMemberRegistry(sOwner,sName,mPath,i,atrAndReg.registry[i]);
                    }
                },
                importSetReference = function(isTo,index,cb){
                    var jObj = isTo === true ? jNode.pointers[sName].to[index] : jNode.pointers[sName].from[index];
                    getReferenceNode(jObj,function(err,sNode){
                        if(err){
                            cb(err);
                        } else {
                            if(sNode){
                                var sOwner = isTo === true ? node : sNode,
                                    sMember = isTo === true ? sNode : node;
                                importSetRegAndAtr(sOwner,sMember,jObj);
                            }
                            cb(null);
                        }
                    });
                },
                error = null;

            if(jNode.pointers[sName].to.length > 0){
                needed += jNode.pointers[sName].to.length;
                _core.createSet(node,sName);
            }
            if(jNode.pointers[sName].from.length > 0){
                needed += jNode.pointers[sName].from.length;
            }

            if(needed > 0){
                for(var i=0;i<jNode.pointers[sName].to.length;i++){
                    importSetReference(true,i,function(err){
                        error = error || err;
                        if(--needed === 0){
                            callback(error);
                        }
                    });
                }
                for(var i=0;i<jNode.pointers[sName].from.length;i++){
                    importSetReference(false,i,function(err){
                        error = error || err;
                        if(--needed === 0){
                            callback(error);
                        }
                    });
                }
            } else {
                callback(null);
            }
        } else {
            callback(null); //TODO now we just simply try to ignore faulty data import
        }
    }
    function importRelations(node,jNode,callback){
        //TODO now se use the pointer's 'set' attribute to decide if it is a set or a pointer really
        var pointers = [],
            sets = [],
            needed = 0,
            error = null,
            i;
        if(! typeof jNode.pointers === 'object'){
            callback(null); //TODO should we drop an error???
        } else {
            for(i in jNode.pointers){
                if(jNode.pointers[i].set === true){
                    sets.push(i);
                } else {
                    pointers.push(i);
                }
            }

            needed = sets.length + pointers.length;

            if(needed > 0){
                for(i=0;i<pointers.length;i++){
                    importPointer(node,jNode,pointers[i],function(err){
                        error = error || err;
                        if(--needed === 0){
                            callback(error);
                        }
                    });
                }
                for(i=0;i<sets.length;i++){
                    importSet(node,jNode,sets[i],function(err){
                        error = error || err;
                        if(--needed === 0){
                            callback(error);
                        }
                    });
                }
            } else {
                callback(null);
            }
        }
    }
    function importMeta(node,jNode,callback){

        //TODO now this function searches the whole meta data for reference objects and load them, then call setMeta
        var loadReference = function(refObj,cb){
                getReferenceNode(refObj,function(err,rNode){
                    if(err){
                        cb(err);
                    } else {
                        if(rNode){
                            refObj['$ref'] = _core.getPath(rNode);
                        }
                        cb(null);
                    }
                });
            },
            loadMetaReferences = function(jObject,cb){
                var needed = 0,
                    error = null;
                for(var i in jObject){
                    if(jObject[i] !== null && typeof jObject[i] === 'object'){
                        needed++;
                    }
                }

                if(needed>0){
                    for(var i in jObject){
                        if(jObject[i] !== null && typeof jObject[i] === 'object'){
                            if(jObject[i]['$ref']){
                                loadReference(jObject[i],function(err){
                                    error = error || err;
                                    if(--needed === 0){
                                        cb(error);
                                    }
                                });
                            } else {
                                loadMetaReferences(jObject[i],function(err){
                                    error = error || err;
                                    if(--needed === 0){
                                        cb(error);
                                    }
                                })
                            }
                        }
                    }
                } else {
                    cb(error);
                }
            };

        loadMetaReferences(jNode.meta || {}, function(err){
            if(err){
                callback(err);
            } else {
                META.setMeta(_core.getPath(node),jNode.meta || {});
                callback(null);
            }
        });
    };
    function importRoot(jNode,callback){
        //first we create the root node itself, then the other parts of the function is pretty much like the importNode

        _root = _core.createNode();
        internalRefCreated('#',_root);
        importAttributes(_root,jNode);
        importRegistry(_root,jNode);
        importChildren(_root,jNode,'#',function(err){
            if(err){
                callback(err);
            } else {
                importRelations(_root,jNode,function(err){
                    if(err){
                        callback(err);
                    } else {
                        importMeta(_root,jNode,function(err){
                            callback(err,_root);
                        });
                    }
                });
            }
        });
    }
    function importNode(jNode,parentNode,intPath,callback){
        //return callback('not implemented');
        //first we have to get the base of the node
        if(jNode.pointers && jNode.pointers.base && jNode.pointers.base.to){
            getReferenceNode(jNode.pointers.base.to[0],function(err,base){
                if(err){
                    callback(err);
                } else {
                    //now we are ready to create the node itself
                    var node = _core.createNode({base:base,parent:parentNode});
                    internalRefCreated(intPath,node);
                    importAttributes(node,jNode);
                    importRegistry(node,jNode);
                    importChildren(node,jNode,intPath,function(err){
                        if(err){
                            callback(err);
                        } else {
                            importRelations(node,jNode,function(err){
                                if(err){
                                    callback(err);
                                } else {
                                    importMeta(node,jNode,callback);
                                }
                            });
                        }
                    });
                }
            });
        } else {
            callback('wrong import format: base info is wrong');
        }
    }
    function importing(core,parent,jNode,callback){
        _core = core;
        _cache = {};
        _underImport = {};
        _internalRefHash = {};
        META.initialize(_core,_cache,function(){});

        if(parent){
            _cache[core.getPath(parent)] = parent;
            _root = core.getRoot(parent);
            importNode(jNode,parent,'#',callback);
        } else {
            importRoot(jNode,callback);
        }
    }

    return importing;
});

