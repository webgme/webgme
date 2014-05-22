define([],function(){

    var _nodes = {},
        _core = null,
        _pathToGuidMap = {},
        _guidKeys = [], //ordered list of GUIDs
        _extraBasePaths = {},
        _export = {};
    function exportLibrary(core,libraryRoot,callback){
        //initialization
        _core = core;
        _nodes = {};
        _pathToGuidMap = {};
        _guidKeys = [];
        _extraBasePaths = {};
        _export = {};

        //loading all library element
        gatherNodesSlowly(libraryRoot,function(err){
            if(err){
                return callback(err);
            }

            _guidKeys = _guidKeys.sort();
            gatherAncestors(); //collecting the 'external' base classes - probably we should avoid these

            _export.bases = _extraBasePaths; //we save this info alongside with the library export, to be on the safe side

            _export.root = getLibraryRootInfo(libraryRoot);
            _export.relids = getRelIdInfo();
            _export.containment = {}; fillContainmentTree(libraryRoot,_export.containment);
            _export.inheritance = {}; fillInheritanceTree(_core.getBaseRoot(libraryRoot),_export.inheritance); //we expect that library root is descendant of FCO as every node
            _export.nodes = getNodesData();

            callback(null,_export);

        });
    }
    function getLibraryRootInfo(node){
        return {
            path: _core.getPath(node),
            guid: _core.getGuid(node)
        };
    }
    function gatherNodesSlowly(node,callback){
        //this function collects all the containment sub-tree of the given node
        var children,
            guid = _core.getGuid(node),
            loadNextChildsubTree = function(index){
                if(index<children.length){
                    gatherNodesSlowly(children[index],function(err){
                        if(err){
                            return callback(err);
                        }

                        loadNextChildsubTree(index+1);
                    });
                } else {
                    callback(null);
                }
            };

        _nodes[guid] = node;
        _guidKeys.push(guid);
        _pathToGuidMap[_core.getPath(node)] = guid;
        _core.loadChildren(node,function(err,c){
            if(err){
                return callback(err);
            }

            children = c;
            loadNextChildsubTree(0);
        });
    }
    function gatherAncestors(){
        //this function inserts the needed base classes which were not included in the library
        var i,base,guid;
        for(i=0;i<_guidKeys.length;i++){
            base = _nodes[_guidKeys[i]];
            while(base!== null){
                guid = _core.getGuid(base);
                if(!_nodes[guid]){
                    _nodes[guid] = base;
                    _extraBasePaths[guid] = _core.getPath(base);
                }
                base = _core.getBase(base);
            }
        }
    }
    function pathsToSortedGuidList(pathsList){ //it will also filter out not wanted elements
        var i,guids = [];
        for(i=0;i<pathsList.length;i++){
            if(_pathToGuidMap[pathsList[i]]){
                guids.push(_pathToGuidMap[pathsList[i]]);
            }
        }
        return guids.sort();
    }
    function fillContainmentTree(node,myTreeObject){
        var childrenGuids = pathsToSortedGuidList(_core.getChildrenPaths(node)),
            i;
        for(i=0;i<childrenGuids.length;i++){
            myTreeObject[childrenGuids[i]] = {};
            fillContainmentTree(_nodes[childrenGuids[i]],myTreeObject[childrenGuids[i]]);
        }
    }
    function fillInheritanceTree(node,myTreeObject){
        var i,
            descendantGuids = pathsToSortedGuidList(_core.getCollectionPaths(node,'base'));
        for(i=0;i<descendantGuids.length;i++){
            myTreeObject[descendantGuids[i]] = {};
            fillInheritanceTree(_nodes[descendantGuids[i]],myTreeObject[descendantGuids[i]]);
        }
    }
    function getRelIdInfo(){
        var i,
            relIdInfo={};
        for(i=0;i<_guidKeys.length;i++){
            relIdInfo[_guidKeys[i]] = _core.getRelid(_nodes[_guidKeys[i]]);
        }
        return relIdInfo;
    }
    function getNodesData(){
        var data = {},
            i;
        for(i=0;i<_guidKeys.length;i++){
            data[_guidKeys[i]] = getNodeData(_nodes[_guidKeys[i]]);
        }
        return data;
    }
    function getNodeData(node){
        /*{
            //only the ones defined on this level
            attributes:{name:value},
            registry:{name:value},
            pointers:{name:targetGuid},
            sets:{name:[{guid:GUID,attributes:{name:value},registy:{name:value}}]}
            meta:{}
        }*/
        return {
            attributes:getAttributesOfNode(node),
            meta:"TODO",
            pointers:getPointersOfNode(node),
            registry:getRegistryOfNode(node),
            sets:getSetsOfNode(node)
        };
    }
    function getAttributesOfNode(node){
        var names = _core.getOwnAttributeNames(node).sort(),
            i,
            result = {};
        for(i=0;i<names.length;i++){
            result[names[i]] = _core.getAttribute(node,names[i]);
        }
        return result;
    }
    function getRegistryOfNode(node){
        var names = _core.getOwnRegistryNames(node).sort(),
            i,
            result = {};
        for(i=0;i<names.length;i++){
            result[names[i]] = _core.getRegistry(node,names[i]);
        }
        return result;
    }
    function getPointersOfNode(node){
        var names = _core.getOwnPointerNames(node).sort(),
            i,
            result = {},
            target;
        for(i=0;i<names.length;i++){
            target = _core.getPointerPath(node,names[i]);
            if(_pathToGuidMap[target]){
                result[names[i]] = _pathToGuidMap[target];
            }
        }
        return result;
    }
    function getOwnMemberPaths(node,setName){
        var base = _core.getBase(node),
            baseMembers = base === null ? [] : _core.getMemberPaths(base,setName),
            members = _core.getMemberPaths(node,setName),
            ownMembers=[],
            i;
        for(i=0;i<members.length;i++){
            if(baseMembers.indexOf(members[i]) === -1){
                ownMembers.push(members[i]);
            }
        }
        return ownMembers;
    }
    function getSetsOfNode(node){
        var names = _core.getSetNames(node).sort(),
            i, j, k,
            result = {},
            targetGuids,
            attributeNames,
            registryNames,
            memberInfo,
            path;
        for(i=0;i<names.length;i++){
            targetGuids = pathsToSortedGuidList(getOwnMemberPaths(node,names[i]));
            result[names[i]] = [];
            for(j=0;j<targetGuids.length;j++){
                path = _core.getPath(_nodes[targetGuids[j]]);
                memberInfo = {
                    attributes:{},
                    guid:targetGuids[j],
                    registry:{}
                };

                //attributes
                attributeNames = _core.getMemberAttributeNames(node,names[i],path).sort();
                for(k=0;k<attributeNames.length;k++){
                    memberInfo.attributes[attributeNames[k]] = _core.getMemberAttribute(node,names[i],path,attributeNames[k]);
                }

                //registry
                registryNames = _core.getMemberRegistryNames(node,names[i],path).sort();
                for(k=0;k<registryNames.length;k++){
                    memberInfo.registry[registryNames[k]] = _core.getMemberRegistry(node,names[i],path,registryNames);
                }

                result[names[i]].push(memberInfo);
            }
        }
        return result;
    }

    return exportLibrary;
});
