/**
 * Created by tkecskes on 1/22/2015.
 */
//this module implements the node-by-node serialization
define(['util/assert','util/canon'],function(ASSERT,CANON){

  function exportLibrary(core,libraryRoot,callback){
    //export-global variables and their initialization
    var jsonLibrary = {bases:{},containment:{},nodes:{},metaSheets:{},relids:{},root:{path:core.getPath(libraryRoot),guid:core.getGuid(libraryRoot)}},
      guidCache = {}, pathCache = {},root = core.getRoot(libraryRoot), taskList = [core.getPath(libraryRoot)],
      notInComputation = true,myTick;
    //necessary functions for the export method

    function isInLibrary(node){
      while(node){
        if(core.getGuid(node) === jsonLibrary.root.guid){
          return true;
        }
        node = core.getParent(node);
      }
      return false;
    }
    function checkForExternalBases(node){
      var guid,
        path;
      while(node){
        guid = core.getGuid(node);
        path = core.getPath(node);
        if(!isInLibrary(node) && !jsonLibrary.bases[guid]){
          jsonLibrary.bases[guid] = path;
          //also have to put in caches as if some pointer points to these nodes, we should know about it and not handle as outgoing pointer
          guidCache[guid] = path;
          pathCache[path] = guid;
        }
        node = core.getBase(node);
      }
    }
    function fillContainment(node){
      //first we compute the guid chain up to the library root
      var guidChain = [],
        actualGuid = core.getGuid(node),
        containment = jsonLibrary.containment;
      while(actualGuid !== jsonLibrary.root.guid){
        guidChain.unshift(actualGuid);
        node = core.getParent(node);
        actualGuid = core.getGuid(node);
      }

      //now we insert our guid into the containment tree structure
      if(guidChain.length){
        while(guidChain.length>1){
          containment= containment[guidChain.shift()];
          ASSERT(typeof containment !== 'undefined');
        }
        containment[guidChain.shift()] = {};
      }
    }
    function getAttributesOfNode(node){
      var names = core.getOwnAttributeNames(node).sort(),
        i,
        result = {};
      for(i=0;i<names.length;i++){
        result[names[i]] = core.getAttribute(node,names[i]);
      }
      return result;
    }
    function getRegistryOfNode(node){
      var names = core.getOwnRegistryNames(node).sort(),
        i,
        result = {};
      for(i=0;i<names.length;i++){
        result[names[i]] = core.getRegistry(node,names[i]);
      }
      return result;
    }
    function getPointersOfNode(node){
      //this version only puts paths to target so they need to be either removed or replaced by guid targets
      var names = core.getOwnPointerNames(node).sort(),
        i,
        result = {};
      for(i=0;i<names.length;i++){
        result[names[i]] = core.getPointerPath(node,names[i]);
      }
      return result;
    }
    function getSetsOfNode(node){
      //we collect all set - but we keep only those data which were defined on this given level
      var names = core.getSetNames(node),
        sets = {},jsonSet,
        i,
        getMemberData = function(setName,memberPath){
          var data = {attributes:{},registry:{}}, i,names;
          //attributes
          names = core.getMemberAttributeNames(node,setName,memberPath);
          for(i=0;i<names.length;i++){
            data.attributes[names[i]] = core.getMemberAttribute(node,setName,memberPath,names[i]);
          }

          //registry
          names = core.getMemberRegistryNames(node,setName,memberPath);
          for(i=0;i<names.length;i++){
            data.registry[names[i]] = core.getMemberRegistry(node,setName,memberPath,names[i]);
          }
          return data;
        },
        getOwnMemberData = function(setName,memberPath){
          var base = core.getBase(node),
            names,
            i,
            data ={attributes:{},registry:{}},
            value;

          //no base
          if(!base){
            return getMemberData(setName,memberPath);
          }

          //the whole set was defined in the given level
          if(core.getSetNames(base).indexOf(setName) === -1){
            return getMemberData(setName,memberPath);
          }

          //the whole member was defined on the given level
          if(core.getMemberPaths(base,setName).indexOf(memberPath) === -1){
            return getMemberData(setName,memberPath);
          }

          //so we have the same member, let's check which values differ from the inherited one
          //attributes
          names = core.getMemberAttributeNames(node,setName,memberPath);
          for(i=0;i<names.length;i++){
            value = core.getMemberAttribute(node,setName,memberPath,names[i]);
            if(CANON.stringify(core.getMemberAttribute(base,setName,memberPath,names[i])) !== CANON.stringify(value)){
              data.attributes[names[i]] = value;
            }
          }

          //registry
          names = core.getMemberRegistryNames(node,setName,memberPath);
          for(i=0;i<names.length;i++){
            value = core.getMemberRegistry(node,setName,memberPath,names[i]);
            if(CANON.stringify(core.getMemberRegistry(base,setName,memberPath,names[i])) !== CANON.stringify(value)){
              data.attributes[names[i]] = value;
            }
          }

          return data;

        },
        getSetData = function(setName){
          var data = {},
            members = core.getMemberPaths(node,setName),
            i,member;

          for(i=0;i<members.length;i++){
            member = getOwnMemberData(setName,members[i]);
            if(Object.keys(member).length > 0){
              data[members[i]] = member;
            }
          }
          return data;
        };
      for(i=0;i<names.length;i++){
        jsonSet = getSetData(names[i]);
        if(Object.keys(jsonSet).length > 0){
          sets[names[i]] = jsonSet;
        }
      }
      return sets;
    }
    function getNodeData(path,next){
      var jsonNode = {},guid;
      notInComputation = false;
      core.loadByPath(root,path,function(err,node){
        if(err || !node){
          return next(err || new Error('no node found at given path:'+path));
        }

        //fill out the basic data and make place in the jsonLibrary for the node
        guid = core.getGuid(node);
        ASSERT(!jsonLibrary.nodes[guid]);

        guidCache[guid] = path;
        pathCache[path] = guid;
        jsonLibrary.relids[guid]=core.getRelid(node);
        jsonLibrary.nodes[guid]=jsonNode;

        checkForExternalBases(node);
        fillContainment(node);

        /*
         meta:pathsToGuids(JSON.parse(JSON.stringify(_core.getOwnJsonMeta(node)) || {})),
         */

        jsonNode.attributes = getAttributesOfNode(node);
        jsonNode.registry = getRegistryOfNode(node);
        jsonNode.base = core.getBase(node) ? core.getGuid(core.getBase(node)) : null;
        jsonNode.parent = core.getParent(node) ? core.getGuid(core.getParent(node)) : null
        jsonNode.pointers = getPointersOfNode(node);
        jsonNode.sets = getSetsOfNode(node);
        jsonNode.meta = core.getOwnJsonMeta(node);

        //putting children into task list
        taskList = taskList.concat(core.getChildrenPaths(node));

        next(null);
      });
    }
    function postProcessing(){
      var guids = Object.keys(jsonLibrary.nodes),
        i;
      jsonLibrary.metaSheets = getMetaSheetInfo(root) || {};
      for(i=0;i<guids.length;i++){
        postProcessPointersOfNode(jsonLibrary.nodes[guids[i]]);
        postProcessMembersOfSets(jsonLibrary.nodes[guids[i]]);
        postProcessMetaOfNode(jsonLibrary.nodes[guids[i]]);
      }
      jsonLibrary = recursiveSort(jsonLibrary);
      callback(null,jsonLibrary);
    }
    function getMetaSheetInfo(node){
      var getMemberRegistry = function(setname,memberpath){
          var names = core.getMemberRegistryNames(node,setname,memberpath),
            i,
            registry = {};
          for(i=0;i<names.length;i++){
            registry[names[i]] = core.getMemberRegistry(node,setname,memberpath,names[i]);
          }
          return registry;
        },
        getMemberAttributes = function(setname,memberpath){
          var names = core.getMemberAttributeNames(node,setname,memberpath),
            i,
            attributes = {};
          for(i=0;i<names.length;i++){
            attributes[names[i]] = core.getMemberAttribute(node,setname,memberpath,names[i]);
          }
          return attributes;
        },
        getRegistryEntry = function(setname){
          var index = registry.length;

          while(--index >= 0){
            if(registry[index].SetID === setname){
              return registry[index];
            }
          }
          return {};
        },
        sheets = {},
        registry = core.getRegistry(node,"MetaSheets"),
        keys = core.getSetNames(node),
        elements,guid,
        i,j;
      for(i=0;i<keys.length;i++){
        if(keys[i].indexOf("MetaAspectSet") === 0){
          elements = core.getMemberPaths(node,keys[i]);
          for(j=0;j<elements.length;j++){
            guid = pathCache[elements[j]];
            if(guid){
              sheets[keys[i]] = sheets[keys[i]] || {};
              sheets[keys[i]][guid] = {registry:getMemberRegistry(keys[i],elements[j]),attributes:getMemberAttributes(keys[i],elements[j])};
            }
          }

          if(sheets[keys[i]] && keys[i] !== "MetaAspectSet"){
            //we add the global registry values as well
            sheets[keys[i]].global = getRegistryEntry(keys[i]);
          }
        }
      }
      return sheets;
    }
    function recursiveSort(jsonObject){
      if(typeof jsonObject !== 'object'){
        return jsonObject;
      }
      if(jsonObject === null){
        return jsonObject;
      }
      if(Array.isArray(jsonObject)){
        return jsonObject;
      }
      var ordered = {},
        keys=Object.keys(jsonObject).sort(),
        i;
      for(i=0;i<keys.length;i++){
        ordered[keys[i]] = recursiveSort(jsonObject[keys[i]]);
      }
      return ordered;
    }
    function postProcessPointersOfNode(jsonNodeObject){
      var names = Object.keys(jsonNodeObject.pointers),
        i;
      for(i=0;i<names.length;i++){
        if(pathCache[jsonNodeObject.pointers[names[i]]]){
          jsonNodeObject.pointers[names[i]] = pathCache[jsonNodeObject.pointers[names[i]]];
        } else {
          delete jsonNodeObject.pointers[names[i]];
        }
      }
    }
    function postProcessMembersOfSets(jsonNodeObject){
      var setNames = Object.keys(jsonNodeObject.sets),
        i,
        memberPaths, j;

      for(i=0;i<setNames.length;i++){
        memberPaths = Object.keys(jsonNodeObject.sets[setNames[i]]);
        for(j=0;j<memberPaths.length;j++){
          if(pathCache[memberPaths[j]]){
            jsonNodeObject.sets[setNames[i]][pathCache[memberPaths[j]]] = jsonNodeObject.sets[setNames[i]][memberPaths[j]];
          }
          delete jsonNodeObject.sets[setNames[i]][memberPaths[j]];
        }
      }
    }
    function postProcessMetaOfNode(jsonNodeObject){
      //replacing and removing items...
      var processMetaPointer = function(jsonPointerObject){
        var toRemove = [],
          i;
        for(i=0;i<jsonPointerObject.items.length;i++){
          if(pathCache[jsonPointerObject.items[i]]){
            jsonPointerObject.items[i] = pathCache[jsonPointerObject.items[i]];
          } else {
            toRemove.push(i);
          }
        }
        while(toRemove.length > 0){
          i = toRemove.pop();
          jsonPointerObject.items.splice(i,1);
          jsonPointerObject.minItems.splice(i,1);
          jsonPointerObject.maxItems.splice(i,1);
        }
        }, i,names = Object.keys(jsonNodeObject.meta.pointers || {}),
        processChildrenRule = function(jsonChildrenObject){
          var toRemove = [],
            i;
          for(i=0;i<jsonChildrenObject.items.length;i++){
            if(pathCache[jsonChildrenObject.items[i]]){
              jsonChildrenObject.items[i] = pathCache[jsonChildrenObject.items[i]];
            } else {
              toRemove.push(i);
            }
          }

          while(toRemove.length > 0){
            i = toRemove.pop();
            jsonChildrenObject.items.splice(i,1);
            jsonChildrenObject.minItems.splice(i,1);
            jsonChildrenObject.maxItems.splice(i,1);
          }
        },
        processAspectRule = function(aspectElementArray){
          var toRemove = [],
            i;
          for(i=0;i<aspectElementArray.length;i++){
            if(pathCache[aspectElementArray[i]]){
              aspectElementArray[i] = pathCache[aspectElementArray[i]];
            } else {
              toRemove.push();
            }
          }

          while(toRemove.length > 0){
            aspectElementArray.splice(toRemove.pop(),1);
          }
        };

      for(i=0;i<names.length;i++){
        processMetaPointer(jsonNodeObject.meta.pointers[names[i]]);
      }

      processChildrenRule(jsonNodeObject.meta.children || {items:[]});

      names = Object.keys(jsonNodeObject.meta.aspects || {});
      for(i=0;i<names.length;i++){
        processAspectRule(jsonNodeObject.meta.aspects[names[i]]);
      }

    }

    //here starts the actual processing
    myTick = setInterval(function(){
      if(taskList.length > 0 && notInComputation){
        getNodeData(taskList.shift(),function(err){
          if(err){
            console.log(err);
          }
          notInComputation = true;
        });
      } else if(taskList.length === 0){
        clearInterval(myTick);
        postProcessing();
      }
    },10);
  }
  
  function importLibrary(core,originLibraryRoot,updatedJsonLibrary,callback){

    
    var logTxt = "", guidCache = {},originalJsonLibrary = {},
      myTick,taskList, i,keys, notInComputation,
      root = core.getRoot(originLibraryRoot),
      libraryRootPath = core.getPath(originLibraryRoot),
      synchronizeRoots = function(oldRoot,newGuid){
      core.setGuid(oldRoot,newGuid);
      },
      calculateGuidCache = function(){
        var keys, i,
          addElement = function(guid,path){
            if(!guidCache[guid]){
              guidCache[guid] = path;
            }
          };
        guidCache = {};

        //first we go with the original library
        //adding external bases
        keys = Object.keys(originalJsonLibrary.bases);
        for(i=0;i<keys.length;i++){
          addElement(keys[i],originalJsonLibrary.bases[keys[i]]);
        }
        //then simple nodes
        keys = Object.keys(originalJsonLibrary.nodes);
        for(i=0;i<keys.length;i++){
          addElement(keys[i],libraryRootPath+getRelativePathByGuid(keys[i],originalJsonLibrary));
        }
        //then the updated one
        //adding external bases
        keys = Object.keys(updatedJsonLibrary.bases);
        for(i=0;i<keys.length;i++){
          addElement(keys[i],updatedJsonLibrary.bases[keys[i]]);
        }
        //then simple nodes
        keys = Object.keys(updatedJsonLibrary.nodes);
        for(i=0;i<keys.length;i++){
          addElement(keys[i],libraryRootPath+getRelativePathByGuid(keys[i],updatedJsonLibrary));
        }
      },
      insertEmptyNode = function(guid,next){
        log("node "+logId(guid,updatedJsonLibrary)+" will be added as an empty object");
        //first we collect all creation related data
        var relid = updatedJsonLibrary.relids[guid],
          parentPath = guidCache[updatedJsonLibrary.nodes[guid].parent],
          basePath = guidCache[updatedJsonLibrary.nodes[guid].base],
          needed = 2,parent=null,base=null,error=null,
          create = function(){
            if(error){
              return next(error);
            }
            core.createNode({base:base,parent:parent,relid:relid,guid:giud});
            next(null);
          };
        //then we load the base and the parent of the node
        core.loadByPath(root,parentPath,function(err,n){
          error = error || err;
          parent = n;
          if(--needed === 0){
            create();
          }
        });
        core.loadByPath(root,basePath,function(err,n){
          error = error || err;
          base = n;
          if(--needed === 0){
            create();
          }
        });
      },
      moveNode = function(guid,next){
        //we need the node itself and the new parent
        log("node "+logId(guid,updatedJsonLibrary)+" will be moved within the library from"+getRelativePathByGuid(guid,originalJsonLibrary)+" to "+getRelativePathByGuid(guid,updatedJsonLibrary));
        var node,parent,needed = 2, error = null,
          move = function(){
            if(error){
              return next(error);
            }
            core.moveNode(node,parent);
            guidCache[guid] = core.getPath(node);
            next(null);
          };

        core.loadByPath(root,guidCache[guid],function(err,n){
          error = error || err;
          node = n;
          if(--needed === 0){
            move();
          }
        });
        core.loadByPath(root,guidCache[updatedJsonLibrary.nodes[guid].parent],function(err,n){
          error = error || err;
          parent = n;
          if(--needed === 0){
            move();
          }
        });
      },
      updateNode = function(guid,next){
        //TODO implement
        log("node "+logId(guid,updatedJsonLibrary)+" will be updated");
        next(null);
      },
      removeNode = function(guid,next){
        log("node "+logId(guid,originalJsonLibrary)+" will be removed - which will cause also the removal of all of its descendant and children");
        core.loadByPath(root,guidCache[guid],function(err,node){
          if(err){
            return next(err);
          }
          core.deleteNode(node);
          next(null);
        });
      },
      postProcessing = function(){
        //TODO collect what task we should do as a post processing task - like perist?
        callback(null);
      },
      getRelativePathByGuid = function(guid,library){
        var path = "";
        while(guid !== library.root.guid){
          path = "/"+library.relids[guid]+path;
          guid = library.nodes[guid].parent;
        }
        return path;
      },
      prepareForAddingNodes = function(){
        //we fill up some global variables and fill out the task list
        var oldGuids = Object.keys(originalJsonLibrary.nodes),
          newGuids = Object.keys(updatedJsonLibrary.nodes),
          i,index,guid;
        taskList = [];
        for(i=0;i<newGuids.length;i++){
          if(oldGuids.indexOf(newGuids[i]) === -1){
            taskList.push(newGuids[i]);
          }
        }

        //if some base or parent of a new node comes after it in our list we have to bring those before this node
        i=0;
        while(i<taskList.length){
          index = taskList.indexOf(updatedJsonLibrary.nodes[taskList[i]].parent);
          if(index !== -1 && index > i){
            guid = taskList[index];
            taskList.splice(index,1);
            taskList.splice(i,0,guid);
          } else {
            index = taskList.indexOf(updatedJsonLibrary.nodes[taskList[i]].base);
            if(index !== -1 && index > i){
              guid = taskList[index];
              taskList.splice(index,1);
              taskList.splice(i,0,guid);
            } else {
              //no obstacle before the node so we can go on
              i++;
            }
          }
        }
      },
      prepareForMoveNodes = function(){
        //we fill up some global variables and fill out the task list
        var oldGuids = Object.keys(originalJsonLibrary.nodes),
          newGuids = Object.keys(updatedJsonLibrary.nodes),
          i;

        taskList = [];
        for(i=0;i<newGuids.length;i++){
          if(oldGuids.indexOf(newGuids[i]) !== -1){
            taskList.push(newGuids[i]);
          }
        }
        i=taskList.length-1;
        while(i>=0){
          if(getRelativePathByGuid(taskList[i],originalJsonLibrary) === getRelativePathByGuid(taskList[i],updatedJsonLibrary)){
            taskList.splice(i,1);
          }
          i--;
        }
      },
      prepareForUpdateNodes = function(){
        //we fill up some global variables and fill out the task list
        //here we simply add the root to the tasklist as each update will insert the actual node's children
        taskList = [updatedJsonLibrary.root.guid];
      },
      prepareForDeleteNodes = function(){
        //we fill up some global variables and fill out the task list
        var oldGuids = Object.keys(originalJsonLibrary.nodes),
          newGuids = Object.keys(updatedJsonLibrary.nodes),
          i,index;
        taskList = [];
        for(i=0;i<oldGuids.length;i++){
          if(newGuids.indexOf(oldGuids[i]) === -1){
            taskList.push(oldGuids[i]);
          }
        }

        //if some of the nodes has its parent or base before itself we remove it from the tasklist
        i=taskList.length-1;
        while(i>=0){
          index = taskList.indexOf(originalJsonLibrary.nodes[taskList[i]].parent);
          if(index !== -1 && index < i){
            taskList.splice(i,1);
          } else {
            index = taskList.indexOf(originalJsonLibrary.nodes[taskList[i]].base);
            if(index !== -1 && index < i){
              taskList.splice(i,1);
            }
          }
          i--;
        }
      },
      logId = function(guid,library){
      var txtId = guid+"";
      if(library.nodes[guid] && library.nodes[guid].attributes && library.nodes[guid].attributes.name){
        txtId = library.nodes[guid].attributes.name+"("+id+")";
      }
      return txtId;
      },
      log = function(txt){
        logTxt += txt+"\n";
      },
      phase = 'addnodes';
    
    synchronizeRoots(originLibraryRoot,updatedJsonLibrary.root.guid);
    exportLibrary(core,originLibraryRoot,function(err,jsonLibrary){
      if(err){
        return callback(err);
      }


      //here starts the actual processing
      originalJsonLibrary = jsonLibrary;
      calculateGuidCache();
      prepareForAddingNodes();

      //first we add the new nodes
      myTick = setInterval(function(){
        if(notInComputation){
          switch (phase){
            case 'addnodes':
              if(taskList.length > 0){
                notInComputation = false;
                insertEmptyNode(taskList.shift(),function(err){
                  if(err){
                    console.log(err);
                  }
                  notInComputation = true;
                });
              } else {
                prepareForMoveNodes();
                phase = 'movenodes';
              }
              break;
            case 'movenodes':
              if(taskList.length > 0){
                notInComputation = false;
                moveNode(taskList.shift(),function(err){
                  if(err){
                    console.log(err);
                  }
                  notInComputation = true;
                });
              } else {
                prepareForUpdateNodes();
                phase = 'updatednodes';
              }
              break;
            case 'updatenodes':
              if(taskList.length > 0){
                notInComputation = false;
                updateNode(taskList.shift(),function(err){
                  if(err){
                    console.log(err);
                  }
                  notInComputation = true;
                });
              } else {
                prepareForDeleteNodes();
                phase = 'removenodes';
              }
              break;
            default:
              if(taskList.length > 0){
                notInComputation = false;
                removeNode(taskList.shift(),function(err){
                  if(err){
                    console.log(err);
                  }
                  notInComputation = true;
                });
              } else {
                clearInterval(myTick);
                postProcessing();
              }
          }
        }
      },10);
    });
  }

  return {
    export: exportLibrary,
    import: importLibrary
  }
});
