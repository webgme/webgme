define([],function(){

    var _nodes = {},
        _core = null,
        _pathToGuidMap = {},
        _guidKeys = [], //ordered list of GUIDs
        _extraBasePaths = {},
        _export = {},
        _import = {},
        _newNodeGuids = [],
        _removedNodeGuids = [],
        _updatedNodeGuids = [];

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
            parent:GUID,
            pointers:{name:targetGuid},
            sets:{name:[{guid:GUID,attributes:{name:value},registy:{name:value}}]}
            meta:{}
        }*/
        return {
            attributes:getAttributesOfNode(node),
            meta:_core.getOwnJsonMeta(node),
            parent:_core.getParent(node) ? _core.getGuid(_core.getParent(node)) : null,
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

    function importLibrary(core,originLibraryRoot,updatedLibraryJson,callback){
        _import = updatedLibraryJson;
        _newNodeGuids = [];
        _updatedNodeGuids = [];
        _removedNodeGuids = [];
        exportLibrary(core,originLibraryRoot,function(err){
            //we do not need the returned json object as that is stored in our global _export variable
            if(err){
                return callback(err);
            }

            //now we fill the insert/update/remove lists of GUIDs
            var oldkeys = Object.keys(_export.nodes),
                newkeys = Object.keys(_import.nodes),
                i;

            //TODO now we make three rounds although one would be sufficient on ordered lists
            for(i=0;i<oldkeys.length;i++){
                if(newkeys.indexOf(oldkeys[i]) === -1){
                    _removedNodeGuids.push(oldkeys[i]);
                }
            }

            for(i=0;i<oldkeys.length;i++){
                if(newkeys.indexOf(oldkeys[i]) !== -1){
                    _updatedNodeGuids.push(oldkeys[i]);
                }
            }

            for(i=0;i<newkeys.length;i++){
                if(oldkeys.indexOf(newkeys[i]) === -1){
                    _newNodeGuids.push(newkeys[i]);
                }
            }

            //Now we normalize the removedGUIDs by containment and remove them
            var toDelete = [],
                parent;
            for(i=0;i<_removedNodeGuids.length;i++){
                parent = _core.getParent(_nodes[_removedNodeGuids[i]]);
                if(parent && _removedNodeGuids.indexOf(_core.getGuid(parent)) === -1){
                    toDelete.push[_removedNodeGuids[i]];
                }
            }
            //and as a final step we remove all that is needed
            for(i=0;i<toDelete.length;i++){
                _core.deleteNode(_nodes[toDelete[i]]);
            }

            //as a second step we should deal with the updated nodes
            //we should go among containment hierarchy
            updateNodes(_import.root.guid,null,_import.containment);

            //now we can add or modify the relations of the nodes - we go along the hierarchy chain
            updateRelations(_import.root.guid,_import.containment);

            //now update inheritance chain
            updateInheritance(_import.root.guid,null,_import.inheritance);

            //finally we need to update the meta rules of each node - again along the containment hierarchy
            //updateMetaRules(_import.root.guid,null,_import.containment);
        });
    }

    //it will update the modified nodes and create the new ones regarding their place in the hierarchy chain
    function updateNodes(guid,parent,containmentTreeObject){
        if(_updatedNodeGuids.indexOf(guid) !== -1){
            updateNode(guid,parent);
        }

        var keys = Object.keys(containmentTreeObject),
            i,
            node = _nodes[guid],
            relid;

        for(i=0;i<keys.length;i++){
            if(_updatedNodeGuids.indexOf(keys[i]) === -1){
                relid = _import.relids[keys[i]];
                if(_core.getChildrenRelids(node).indexOf(relid) !== -1){
                    relid = undefined;
                }
                //this child is a new one so we should create
                _nodes[keys[i]] = _core.createNode({parent:node,guid:keys[i],relid:relid});
                addNode(keys[i]);
            }
            updateNodes(keys[i],node,containmentTreeObject[keys[i]]);
        }
    }
    function getNodePathFromJson(jsonLibrary,guid){
        var path = "";

        while(guid !== jsonLibrary.root.guid){
            path = "/"+jsonLibrary.relids[guid]+path;
            guid = jsonLibrary.nodes[guid].parent;
        }
        return path;
    }

    function updateRegistry(guid){
        var keys, i,
            node = _nodes[guid],
            jsonNode = _import.nodes[guid];

        keys = _core.getOwnRegistryNames(node);
        for(i=0;i<keys.length;i++){
            _core.delRegistry(node,keys[i]);
        }
        keys = Object.keys(jsonNode.attributes);
        for(i=0;i<keys.length;i++){
            _core.setRegistry(node,keys[i],jsonNode.attributes[keys[i]]);
        }
    }
    function updateAttributes(guid){
        var keys, i,
            node = _nodes[guid],
            jsonNode = _import.nodes[guid];

        keys = _core.getOwnAttributeNames(node);
        for(i=0;i<keys.length;i++){
            _core.delAttribute(node,keys[i]);
        }
        keys = Object.keys(jsonNode.attributes);
        for(i=0;i<keys.length;i++){
            _core.setAttribute(node,keys[i],jsonNode.attributes[keys[i]]);
        }
    }
    //this function does not cover relations - it means only attributes and registry have been updated here
    function updateNode(guid,parent){
        //first we check if the node have to be moved
        var node = _nodes[guid];

        if(parent && _core.getParent(node) && _core.getGuid(parent) !== _core.getGuid(_core.getParent(node))){
            //parent changed so it has to be moved...
            _core.moveNode(node,parent);
        }

        updateAttributes(guid);
        updateRegistry(guid);
    }

    //this function doesn't not cover relations - so only attributes and registry have been taken care of here
    function addNode(guid){
        //at this point we assume that an empty vessel has been already created and part of the _nodes
        updateAttributes(guid);
        updateRegistry(guid);_
    }

    function updateRelations(guid,containmentTreeObject){
        var keys,i;
        updateNodeRelations(guid);
        keys = Object.keys(containmentTreeObject);
        for(i=0;i<keys.length;i++){
            updateRelations(keys[i],containmentTreeObject[keys[i]]);
        }
    }
    function updateNodeRelations(guid){
        //although it is possible that we set the base pointer at this point we should go through inheritance just to be sure
        var node = _nodes[guid],
            jsonNode = _import.nodes[guid],
            keys, i,target;

        keys = _core.getOwnPointerNames(node);
        for(i=0;i<keys.length;i++){
            _core.deletePointer(node,keys[i]);
        }
        keys = Object.keys(jsonNode.pointers);
        for(i=0;i<keys.length;i++){
            target = jsonNode.pointers[keys[i]];
            if(_nodes[target] && _removedNodeGuids.indexOf(target) === -1){
                _core.setPointer(node,keys[i],_nodes[target]);
            } else {
                console.log("error handling needed???!!!???");
            }
        }
    }

    function updateInheritance(guid,base,inheritanceTreeObject){
        var node = _nodes[guid],
            oldBase = _core.getBase(node),
            keys,i;

        if((oldBase === null && base !== null) || _core.getGuid(oldBase) !== _core.getGuid(base)){
            //the base have been changed
            _core.setBase(node,base);
        }

        keys = Object.keys(inheritanceTreeObject);
        for(i=0;i<keys.length;i++){
            updateInheritance(keys[i],node,inheritanceTreeObject[keys[i]]);
        }
    }

    return {
        export : exportLibrary,
        import : importLibrary
    };
});
