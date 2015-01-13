/**
 * Created by tkecskes on 1/13/2015.
 */
(function(){
  GME = GME || {};
  GME.merge = {};
  GME.merge.initialize = function(config){
    GME.merge.storage = new GME.classes.Storage({host:config.host});
    GME.merge.storage.openDatabase(function(err){
      if(err){
        console.err('Unable to open database: ',err);
        return;
      }
      GME.merge.storage.openProject(config.project,function(err,p){
        if(err){
          console.err('Unable to open project: ',err);
          return;
        }
        GME.merge.project = p;
        GME.merge.commits = {mine:config.mine,theirs:config.theirs,base:null};
      });
    });
  };
  var mergeApp = angular.module('mergeApp',[]);
  mergeApp.controller('mergeController',function($scope){
    console.warn('ehune');
  });
}());
