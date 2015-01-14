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
  function generateTreeToPath(root,path,callback){
    var nodePath = getNodePath(path),
      tree = [];
    GME.merge.core.loadByPath(root,nodePath,function(err,node){
      if(err || !node){
        return callback(err || new Error('unable to load given node'));
      }

      while(node){
        tree = [{name:GME.merge.core.getAttribute(node,'name'),nodes:tree}];
        node = GME.merge.core.getParent(node);
      }
      callback(null,tree);
    });
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
    for(i=0;i<GME.merge.conflict.items.length;i++){
      GME.merge.conflict.items[i].id = i;
      $scope.items.push(GME.merge.conflict.items[i]);
    }

    $scope.getButtonText = getButtonText;
    $scope.getButtonClass = getButtonClass;
    $scope.selectedItem = -1;
    $scope.tree = {};
    $scope.tree.mine = [];
    $scope.tree.theirs = [];
    $scope.selectItem = function(itemId){
      //TODO
      console.warn('you selected',itemId);
      $scope.selectedItem = itemId;

      generateTreeToPath(GME.merge.roots.mine,$scope.items[$scope.selectedItem].mine.path,function(err,tree){
        if(err){
          errorBox(err);
        } else {
          $scope.tree.mine = tree;
        }
      });
      generateTreeToPath(GME.merge.roots.theirs,$scope.items[$scope.selectedItem].theirs.path,function(err,tree){
        if(err){
          errorBox(err);
        } else {
          $scope.tree.theirs = tree;
        }
      });
    }
  });
}());
