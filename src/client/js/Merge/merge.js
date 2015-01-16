/**
 * Created by tkecskes on 1/13/2015.
 */
(function(){
  function timestamp(){
    return new Date().getTime();
  }
  function errorBox(message){
    alert(message+"");
    close();
  }

  function getButtonText(selected){
    if(selected === 'mine'){
      return "M";
    }
    return "T";
  }
  function getButtonClass(me,selected){
    if(me === selected){
      return "btn btn-primary active"
    }
    return "btn btn-primary"
  }

  function getSelectButtonClass(mine,current){
    if(mine === current){
      return "btn btn-default btn-lg col-xs-1 col-xs-offset-3 active"
    } else {
      return "btn btn-default btn-lg col-xs-1 col-xs-offset-3"
    }
  }

  function getNodePath(path){
    var validRelid = function(id){
      //TODO always check what is a valid relid
      if(id === ''){
        return true;
      }
      if(Number(id)>=0 && Number(id)<Math.pow(2,31)){
        return true;
      }
      return false;
      },
      outpath = null,i;

    path = path.split('/');
    i=0;
    while(i<path.length){
      if(validRelid(path[i])){
        if(outpath === null){
          outpath = path[i]
        } else {
          outpath += "/"+path[i];
        }
        i++;
      } else {
        i = path.length;
      }
    }
    return outpath;
  }
  function generateTreeToPath(type,path,callback){
    var nodePath = getNodePath(path),
      root = GME.merge.roots[type],
      tree = [],i;
    GME.merge.core.loadByPath(root,nodePath,function(err,node){
      if(err || !node){
        return callback(err || new Error('unable to load given node'));
      }

      while(node){
        tree.unshift({name:GME.merge.core.getAttribute(node,'name'),path:GME.merge.core.getPath(node),class:"col-xs-2"});
        node = GME.merge.core.getParent(node);
      }
      for(i=0;i<tree.length;i++){
        tree[i].class = "btn btn-info btn-xs disabled col-xs-offset-"+(i+1);
      }
      callback(null,tree);
    });
  }

  function itemSelection(scope){
    //this function is called when selection changes
    //this computes the data model for the tree-view and model-view
    generateTreeToPath('mine',scope.items[scope.selectedItem].mine.path,function(err,tree){
      if(err){
        errorBox(err);
      } else {
        scope.tree.mine = tree;
      }
    });
    generateTreeToPath('theirs',scope.items[scope.selectedItem].theirs.path,function(err,tree){
      if(err){
        errorBox(err);
      } else {
        scope.tree.theirs = tree;
      }
    });
  }
  function getGuidFromPath(nodePath){
    var i,item = GME.merge.conflict.merge;
    nodePath = nodePath.split('/');
    nodePath.shift();
    for(i=0;i<nodePath.length;i++){
      item = item[nodePath[i]];
    }
    return item.guid;
  }

  function changeSelection(selectionId,selection){
    var items = GME.merge.conflict.items,
      item = items[selectionId],
      i,
      selectingTasks = [],
      handleSelectingTask = function(path,isSelect){
        var i,selections = {},deselections = {};
        for(i=0;i<items.length;i++){
          if(isSelect){
            if(path === items[i].mine.path && items[i].selected !== "mine"){
              items[i].selected = "mine";
              if(items[i].theirs.path !== path){
                deselections[items[i].theirs.path] = true;
              }
            } else if(path === items[i].theirs.path && items[i].selected !== "theirs"){
              items[i].selected = "theirs";
              if(items[i].mine.path !== path){
                deselections[items[i].mine.path] = true;
              }
            }
          } else {
            if(path === items[i].mine.path && items[i].selected === "mine"){
              items[i].selected = "theirs";
              if(items[i].theirs.path !== path){
                selections[items[i].theirs.path] = true;
              }
            } else if(path === items[i].theirs.path && items[i].selected === "theirs"){
              items[i].selected = "mine";
              if(items[i].mine.path !== path){
                selections[items[i].mine.path] = true;
              }
            }
          }
        }
        selections = Object.keys(selections);
        for(i=0;i<selections.length;i++){
          selectingTasks.push({path:selections[i],selection:true});
        }
        deselections = Object.keys(deselections);
        for(i=0;i<deselections.length;i++){
          selectingTasks.push({path:deselections[i],selection:false});
        }
      };

    if(item.selected !== selection){
      if(selection === "mine"){
        selectingTasks.push({path:item.mine.path,selection:true});
        if(item.theirs.path !== item.mine.path){
          selectingTasks.push({path:item.theirs.path,selection:false});
        }
      } else {
        if(item.theirs.path !== item.mine.path){
          selectingTasks.push({path:item.mine.path,selection:false});
        }
        selectingTasks.push({path:item.theirs.path,selection:true});
      }
    }

    while(selectingTasks.length > 0){
      i = selectingTasks.shift();
      handleSelectingTask(i.path, i.selection);
    }
  }

  function getConflictType(selectionId){
    //there are two classes of conflicts
    // value conflict when some value has ben changed differently
    // blocking conflict, when a node removal is against a value change

  }
  GME = GME || {};
  GME.merge = {};
  GME.merge.initialize = function(config){
    var getAncestorCommit = function(){
        GME.merge.project.getCommonAncestorCommit(GME.merge.commits.mine,GME.merge.commits.theirs,function(err,c){
          if(err){
            errorBox('unable to compute common ancestor commit: '+err);
            return;
          }
          console.warn(timestamp(),'common ancestor commit hash: ',c);
          GME.merge.commits.base = c;
          gatherRoots();
        });
      },
      gatherRoots = function(){
        var getRoot = function(type){
            GME.merge.project.loadObject(GME.merge.commits[type],function(err,c){
              if(err || !c){
                error = error || err || new Error('commit '+ type +' missing from DB');
                if(--needed === 0){
                  complete();
                }
              } else {
                GME.merge.core.loadRoot(c.root,function(err,r){
                  if(err || !r) {
                    error = error || err || new Error('root ' + type + ' missing from DB');
                    if (--needed === 0) {
                      complete();
                    }
                  } else {
                    GME.merge.roots = GME.merge.roots || {};
                    GME.merge.roots[type] = r;
                    if(--needed === 0){
                      complete();
                    }
                  }
                });
              }
            });
          }, needed = 3,error=null,
          complete = function(){
            if(error){
              errorBox('unable to load all necessary root objects: '+error);
              return;
            }
            calculateDiffs();
          };
        getRoot('base');
        getRoot('mine');
        getRoot('theirs');
      },
      calculateDiffs = function(){
        console.warn(timestamp(),GME.merge.core.getHash(GME.merge.roots.base));
        GME.merge.core.generateTreeDiff(GME.merge.roots.base,GME.merge.roots.mine,function(err,diff){
          if(err){
            errorBox('unable to compute diff base -> mine');
            return;
          }
          GME.merge.diffs = {mine:diff};
          GME.merge.core.generateTreeDiff(GME.merge.roots.base,GME.merge.roots.theirs,function(err,diff){
            if(err){
              errorBox('unable to compute diff base -> theirs');
              return;
            }
            GME.merge.diffs.theirs = diff;
            finishInitialization();
          });
        });
      },
      finishInitialization = function(){
        //this ends all remaining tasks and triggers the angular module initialization
        console.warn(timestamp(),'mine',GME.merge.diffs.mine);
        console.warn(timestamp(),'theirs',GME.merge.diffs.theirs);
        GME.merge.conflict = GME.merge.core.tryToConcatChanges(GME.merge.diffs.mine,GME.merge.diffs.theirs);
        console.warn(timestamp(),'conflict',GME.merge.conflict);
        angular.bootstrap(document,['mergeApp']);
      };
    GME.merge.storage = new GME.classes.Storage({host:config.host});
    GME.merge.storage.openDatabase(function(err){
      if(err){
        errorBox('Unable to open database: '+err);
        return;
      }
      GME.merge.storage.openProject(config.project,function(err,p){
        if(err){
          errorBox('Unable to open project: '+err);
          return;
        }
        GME.merge.project = p;
        GME.merge.commits = {mine:config.mine,theirs:config.theirs,base:null};
        GME.merge.core = new GME.classes.Core(p);
        getAncestorCommit();
      });
    });
  };
  var mergeApp = angular.module('mergeApp',[]);
  mergeApp.controller('mergeController',function($scope){
    $scope.items = [];
    var i;
    //adding extra elements to conflict items as an initial step
    for(i=0;i<GME.merge.conflict.items.length;i++){
      GME.merge.conflict.items[i].id = i;
      GME.merge.conflict.items[i].mine.guid = getGuidFromPath(getNodePath(GME.merge.conflict.items[i].mine.path));
      GME.merge.conflict.items[i].theirs.guid = getGuidFromPath(getNodePath(GME.merge.conflict.items[i].theirs.path));
    }
    $scope.items = GME.merge.conflict.items;

    $scope.getButtonText = getButtonText;
    $scope.getButtonClass = getButtonClass;
    $scope.getSelectButtonClass = getSelectButtonClass;
    $scope.selectedItem = 0;
    $scope.tree = {};
    $scope.tree.mine = [];
    $scope.tree.theirs = [];

    itemSelection($scope);
    $scope.selectItem = function(itemId){
      //TODO
      console.warn('you selected',itemId);
      if(itemId !== $scope.selectedItem){
        //if we really changed the selection
        $scope.selectedItem = itemId;
        itemSelection($scope);
      }

    };
    $scope.selectSide = changeSelection;
  });
}());
