/*globals before, after, describe, it*/
/*
 * Created by tamas on 12/31/14.
 */
//these test intended to test the functions of the client layer
require('../_globals');

/*
 //eventer
 events: _self.events,
 networkStates: _self.networkStates,
 branchStates: _self.branchStates,
 _eventList: _self._eventList,
 _getEvent: _self._getEvent,
 addEventListener: _self.addEventListener,
 removeEventListener: _self.removeEventListener,
 removeAllEventListeners: _self.removeAllEventListeners,
 dispatchEvent: _self.dispatchEvent,
 connect: connect,

 getUserId: getUserId,

 //projects, branch, etc.
 getActiveProjectName: getActiveProject,
 getAvailableProjectsAsync: getAvailableProjectsAsync,
 getViewableProjectsAsync: getViewableProjectsAsync,
 getFullProjectListAsync: getFullProjectListAsync,
 getProjectAuthInfoAsync: getProjectAuthInfoAsync,
 connectToDatabaseAsync: connectToDatabaseAsync,
 selectProjectAsync: selectProjectAsync,
 createProjectAsync: createProjectAsync,
 deleteProjectAsync: deleteProjectAsync,
 getBranchesAsync: getBranchesAsync,
 selectCommitAsync: selectCommitAsync,
 getCommitsAsync: getCommitsAsync,
 getActualCommit: getActualCommit,
 getActualBranch: getActualBranch,
 getActualNetworkStatus: getActualNetworkStatus,
 getActualBranchStatus: getActualBranchStatus,
 createBranchAsync: createBranchAsync,
 deleteBranchAsync: deleteBranchAsync,
 selectBranchAsync: selectBranchAsync,
 commitAsync: commitAsync,
 goOffline: goOffline,
 goOnline: goOnline,
 isProjectReadOnly: function () {
 return _readOnlyProject;
 },
 isCommitReadOnly: function () {
 return _viewer;
 },

 //MGA
 startTransaction: startTransaction,
 completeTransaction: completeTransaction,
 setAttributes: setAttributes,
 delAttributes: delAttributes,
 setRegistry: setRegistry,
 delRegistry: delRegistry,
 copyMoreNodes: copyMoreNodes,
 moveMoreNodes: moveMoreNodes,
 delMoreNodes: delMoreNodes,
 createChild: createChild,
 createChildren: createChildren,
 makePointer: makePointer,
 delPointer: delPointer,
 addMember: addMember,
 removeMember: removeMember,
 setMemberAttribute: setMemberAttribute,
 delMemberAttribute: delMemberAttribute,
 setMemberRegistry: setMemberRegistry,
 delMemberRegistry: delMemberRegistry,
 createSet: createSet,
 deleteSet: deleteSet,

 //desc and META
 setAttributeDescriptor: setAttributeDescriptor,
 delAttributeDescriptor: delAttributeDescriptor,
 setPointerDescriptor: setPointerDescriptor,
 delPointerDescriptor: delPointerDescriptor,
 setChildrenMetaDescriptor: setChildrenMetaDescriptor,
 delChildrenMetaDescriptor: delChildrenMetaDescriptor,
 setBase: setBase,
 delBase: delBase,

 //we simply propagate the functions of META
 getMeta: META.getMeta,
 setMeta: META.setMeta,
 getChildrenMeta: META.getChildrenMeta,
 setChildrenMeta: META.setChildrenMeta,
 getChildrenMetaAttribute: META.getChildrenMetaAttribute,
 setChildrenMetaAttribute: META.setChildrenMetaAttribute,
 getValidChildrenItems: META.getValidChildrenItems,
 updateValidChildrenItem: META.updateValidChildrenItem,
 removeValidChildrenItem: META.removeValidChildrenItem,
 getAttributeSchema: META.getAttributeSchema,
 setAttributeSchema: META.setAttributeSchema,
 removeAttributeSchema: META.removeAttributeSchema,
 getPointerMeta: META.getPointerMeta,
 setPointerMeta: META.setPointerMeta,
 getValidTargetItems: META.getValidTargetItems,
 updateValidTargetItem: META.updateValidTargetItem,
 removeValidTargetItem: META.removeValidTargetItem,
 deleteMetaPointer: META.deleteMetaPointer,
 getOwnValidChildrenTypes: META.getOwnValidChildrenTypes,
 getOwnValidTargetTypes: META.getOwnValidTargetTypes,
 isValidChild: META.isValidChild,
 isValidTarget: META.isValidTarget,
 isValidAttribute: META.isValidAttribute,
 getValidChildrenTypes: META.getValidChildrenTypes,
 getValidTargetTypes: META.getValidTargetTypes,
 hasOwnMetaRules: META.hasOwnMetaRules,
 filterValidTarget: META.filterValidTarget,
 isTypeOf: META.isTypeOf,
 getValidAttributeNames: META.getValidAttributeNames,
 getOwnValidAttributeNames: META.getOwnValidAttributeNames,
 getMetaAspectNames: META.getMetaAspectNames,
 getOwnMetaAspectNames: META.getOwnMetaAspectNames,
 getMetaAspect: META.getMetaAspect,
 setMetaAspect: META.setMetaAspect,
 deleteMetaAspect: META.deleteMetaAspect,
 getAspectTerritoryPattern: META.getAspectTerritoryPattern,

 //end of META functions

 //decorators
 getAvailableDecoratorNames: getAvailableDecoratorNames,
 //interpreters
 getAvailableInterpreterNames: getAvailableInterpreterNames,
 getProjectObject: getProjectObject,
 runServerPlugin: runServerPlugin,

 //JSON functions
 exportItems: exportItems,
 getExportItemsUrlAsync: getExportItemsUrlAsync,
 getExternalInterpreterConfigUrlAsync: getExternalInterpreterConfigUrlAsync,
 dumpNodeAsync: dumpNodeAsync,
 importNodeAsync: importNodeAsync,
 mergeNodeAsync: mergeNodeAsync,
 createProjectFromFileAsync: createProjectFromFileAsync,
 getDumpURL: getDumpURL,
 getExportLibraryUrlAsync: getExportLibraryUrlAsync,
 updateLibraryAsync: updateLibraryAsync,
 addLibraryAsync: addLibraryAsync,
 getFullProjectsInfoAsync: getFullProjectsInfoAsync,
 createGenericBranchAsync: createGenericBranchAsync,
 deleteGenericBranchAsync: deleteGenericBranchAsync,

 //constraint
 setConstraint: setConstraint,
 delConstraint: delConstraint,

 //coreAddOn functions
 validateProjectAsync: validateProjectAsync,
 validateModelAsync: validateModelAsync,
 validateNodeAsync: validateNodeAsync,
 setValidationCallback: setValidationCallback,
 getDetailedHistoryAsync: getDetailedHistoryAsync,
 getRunningAddOnNames: getRunningAddOnNames,

 //territory functions for the UI
 addUI: addUI,
 removeUI: removeUI,
 updateTerritory: updateTerritory,
 getNode: getNode,

 //undo - redo
 undo: _redoer.undo,
 redo: _redoer.redo,

 //testing
 testMethod: testMethod
 */


describe('Client tests', function () {
    var should = require('chai').should(),
        FS = require('fs'),
        requirejs = require('requirejs'),
        config = WebGMEGlobal.getConfig();
    config.port = 9002;
    config.authentication = false; //we have to make sure that our current config doesn't affect the tests

    requirejs.config({
        nodeRequire: require,
        paths:{
            "logManager": "common/LogManager",
            "storage": "common/storage",
            "core": "common/core",
            "server": "server",
            "auth": "server/auth",
            "util": "common/util",
            "baseConfig" : "bin/getconfig",
            "webgme": "webgme",
            "plugin": "plugin",
            "worker": "server/worker",
            "coreclient": "common/core/users",
            "blob": "middleware/blob",
            "eventDispatcher": "common/EventDispatcher",
            " /listAllDecorators": "../test/asset/empty",
            " /listAllPlugins": "../test/asset/empty",
            " /socket.io/socket.io.js": "socketio-client"
        }
    });

    var CANON = requirejs('common/util/canon');
    var CLIENT = requirejs('client/js/client');

    var SRV,CLNT,FCOID,commitHash,projectName = "test_client_basic_"+new Date().getTime(),TERR;
    var testTerritory = function(level,cb){
        var next = function(events){
                cb(events);
            },
            event = function(events) {
                //TODO maybe some checking can be done here as well
                next(events);
            },
            guid = CLNT.addUI(this,event);
        function finish(){
            CLNT.removeUI(guid);
        }
        function setNext(fn){
            next = fn;
        }
        setTimeout(function(){
            CLNT.updateTerritory(guid,{'':{children:level}});
        },1);

        return {
            setNext: setNext,
            finish: finish
        };
    };

    function createTestProject(callback) {

        CLNT.connectToDatabaseAsync({},function (err) {
            if (err) {
                callback(err);
                return;
            }

            CLNT.createProjectAsync(projectName,{},function (err) {
                if (err) {
                    callback(err);
                    return;
                }

                CLNT.selectProjectAsync(projectName,function (err) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    //TODO it would be best to use the actual constant values
                    CLNT.startTransaction();
                    CLNT.setRegistry("", 'validPlugins', "");
                    CLNT.setRegistry("", 'usedAddOns', "ConstraintAddOn");
                    FCOID = CLNT.createChild({parentId:'',guid:'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045',relid:'1'});
                    CLNT.setMeta('',{
                        children:{
                            items:[{$ref: FCOID}],
                            minItems:[-1],
                            maxItems:[-1]
                        },
                        attributes:{
                            name:{type:'string'}
                        },
                        pointers:{}
                    });
                    CLNT.setMeta(FCOID,{
                        children:{},
                        attributes:{
                            name:{type:'string'}
                        },
                        pointers:{}
                    });

                    //TODO constraint

                    CLNT.setAttributes('','name','ROOT');
                    CLNT.setRegistry('','ProjectRegistry',{FCO_ID:FCOID});

                    CLNT.setAttributes(FCOID,'name','FCO');
                    CLNT.setRegistry(FCOID,"decorator","");
                    CLNT.setRegistry(FCOID,"isPort",false);
                    CLNT.setRegistry(FCOID,"isAbstract",false);
                    CLNT.setRegistry(FCOID,"SVGIcon","");
                    CLNT.setRegistry(FCOID,"SVGIcon","");
                    CLNT.setRegistry(FCOID,"PortSVGIcon","");
                    CLNT.setRegistry(FCOID,"DisplayFormat","$name");

                    CLNT.createSet('','MetaAspectSet');
                    CLNT.addMember('',FCOID,'MetaAspectSet');

                    CLNT.createSet('','MetaAspectSet_000');
                    CLNT.setRegistry('','MetaSheets',[{SetID:'MetaAspectSet_000',order:0,title:'META'}]);
                    CLNT.addMember('',FCOID,'MetaAspectSet_000');
                    CLNT.setMemberRegistry('',FCOID,'MetaAspectSet_000','position',{x:100,y:100});

                    CLNT.completeTransaction('basic project seed',function(err){
                        if(err){
                            callback(err);
                            return;
                        }

                        commitHash = CLNT.getActualCommit();
                        callback();
                    });
                });
            });
        });

    }

    before(function(done) {

        SRV = new global.WebGME.standaloneServer(config);
        SRV.start(function() {
            CLNT = new CLIENT({host: " ", port: config.port});

            createTestProject(done);
        });
    });

 after(function(done) {
   CLNT.deleteProjectAsync(projectName, function (err) {
    SRV.stop(function (serverError) {
     done(err || serverError);
    });
   });
 });

 describe('Client#Basic#Project&Branch',function(){
  /*
   //projects, branch, etc.
   --getActiveProjectName: getActiveProject,
   --getAvailableProjectsAsync: getAvailableProjectsAsync,
   --getViewableProjectsAsync: getViewableProjectsAsync,
   --getFullProjectListAsync: getFullProjectListAsync,
   --getProjectAuthInfoAsync: getProjectAuthInfoAsync,
   --connectToDatabaseAsync: connectToDatabaseAsync,
   --selectProjectAsync: selectProjectAsync,
   --createProjectAsync: createProjectAsync,
   --deleteProjectAsync: deleteProjectAsync,
   --getBranchesAsync: getBranchesAsync,
   selectCommitAsync: selectCommitAsync,
   getCommitsAsync: getCommitsAsync,
   --getActualCommit: getActualCommit,
   --getActualBranch: getActualBranch,
   getActualNetworkStatus: getActualNetworkStatus,
   getActualBranchStatus: getActualBranchStatus,
   --createBranchAsync: createBranchAsync,
   --deleteBranchAsync: deleteBranchAsync,
   --selectBranchAsync: selectBranchAsync,
   commitAsync: commitAsync,
   goOffline: goOffline,
   goOnline: goOnline,
   isProjectReadOnly: function () {
   return _readOnlyProject;
   },
   isCommitReadOnly: function () {
   return _viewer;
   },
   */
  it('checks if the newly created project is among the available ones',function(done){
   CLNT.getAvailableProjectsAsync(function(err,projects){
    if(err){
     return done(err);
    }
    if(projects.indexOf(projectName) === -1){
     return done(new Error('the test project is missing'));
    }
    done();
   });
  });
  it('checks if the newly created project is among the viewable ones',function(done){
   CLNT.getViewableProjectsAsync(function(err,projects){
    if(err){
     return done(err);
    }
    if(projects.indexOf(projectName) === -1){
     return done(new Error('the test project is missing'));
    }
    done();
   });
  });
  it('checks if the newly created project is in the full project list',function(done){
   CLNT.getFullProjectListAsync(function(err,projects){
    if(err){
     return done(err);
    }
    if(!projects[projectName]){
     return done(new Error('the test project is missing'));
    }
    done();
   });
  });
  it('checks the authorization info of the new project',function(done){
   CLNT.getProjectAuthInfoAsync(projectName,function(err,info){
    if(err){
     return done(err);
    }
    if(info.read !== true || info.write !== true || info.delete !== true){
     return done(new Error('insufficient authorization info'));
    }
    done();
   });
  });
  it('checks if the active project is the one we just created',function(){
   if(CLNT.getActiveProjectName() !== projectName){
    throw new Error('wrong active project name');
   }
  });
  it('checks the available branches',function(done){
   CLNT.getBranchesAsync(function(err,branches){
    if(err){
     return done(err);
    }
    if(branches.length !== 1){
     return done(new Error('only one branch should exist'));
    }
    if(branches[0].name !== 'master'){
     return done(new Error('the only branch name should be \'master\''));
    }
    done();
   });
  });
  it('creates another branch',function(done){
   commitHash = CLNT.getActualCommit();
   CLNT.createBranchAsync('another',commitHash,done);
  });
  it('selects the new branch',function(done){
   CLNT.selectBranchAsync('another',done);
  });
  it('makes some small modification',function(done){
   CLNT.setAttributes(FCOID,'value','one','changing the new branch');
   done();
  });
  it('checks the actual branch',function(){
   if(CLNT.getActualBranch() !== 'another'){
    throw new Error('wrong branch is the actual one');
   }
  });
  it('checks addon loading', function(done) {
      // TODO: CLNT should provide a callback for this. Then we won't have to poll
      var i = 0;
      var interval = setInterval(function () {
          if (i++ > 30) {
              clearInterval(interval);
              done('addon load timed out');
          }
          if (CLNT.getRunningAddOnNames().length == 1) {
              clearInterval(interval);
              done();
          }
      }, 50);
  });
  it('removes the new branch',function(done){
   CLNT.selectBranchAsync('master',function(err){
    if(err){
     return done(err);
    }
    CLNT.deleteBranchAsync('another',done);
   });
  });
 });

 describe('Client#Basic#Territory',function(){
 it('creating a territory and receiving events',function(done){
   TERR = CLNT.addUI({},function(events){
    var ids = [],allLoad = true,i;
    for(i=0;i<events.length;i++){
     if(events[i].eid !== null){
      ids.push(events[i].eid);
     }
     if(events[i].etype !== 'load' && events[i].etype !== 'complete' && events[i].etype !== 'incomplete'){
      allLoad = false;
     }
    }
    if(ids.length !== 2 || allLoad === false || ids.indexOf('') === -1 || ids.indexOf('/1') === -1){
     CLNT.removeUI(TERR);
     return done(new Error('wrong events'));
    }
    CLNT.removeUI(TERR);
    done();
   });
   CLNT.updateTerritory(TERR,{'':{children:1}});
 });
 it('creates a new child under the root ascendant of FCO and check the events',function(done){
   var myTerritory = testTerritory(1,function(events){
        //we are loaded the initial territory
        myTerritory.setNext(stepOne);
        CLNT.createChild({baseId:'/1', parentId:'', relid:'2'},'creating first new children');
       }),
       stepOne = function(events){
        //check if the new child is created
        var i,correct = false,node,ids;
        for(i=0;i<events.length;i++){
         if(events[i].eid === '/2' && events[i].etype === 'load'){
          correct = true;
         }
        }
        myTerritory.finish();
        if(!correct){
         return done(new Error('new object has not been created'));
        }
        node = CLNT.getNode('/2');

        if(node.getAttribute('name') !== 'FCO'){
         return done(new Error('new child has wrong name'));
        }
        if(node.getRegistry('position').x !== 100 || node.getRegistry('position').y !== 100){
         return done(new Error('new node has wrong position'));
        }
        if(node.getParentId() !== ''){
         return done(new Error('new node has insufficient parent'));
        }
        if(node.getBaseId() !== '/1'){
         return done(new Error('new node has insufficient ancestor'));
        }

        node = CLNT.getNode('');
        ids = node.getChildrenIds();
        if(!(ids.length == 2 && ((ids[0] === '/1' && ids[1] === '/2') || (ids[0] === '/2' && ids[1] === '/1')))){
         return done(new Error('new node not visible in parents children list'));
        }
        done();
       };
 });
 it('creates multiple children and removes some and checks the events',function(done){
   var myTerritory = testTerritory(1,function(events){
        //we are loaded the initial territory
        myTerritory.setNext(stepCreate);
        CLNT.createChild({baseId:'/1', parentId:'', relid:'3'},'creating first new children');
        CLNT.createChild({baseId:'/1', parentId:'', relid:'4'},'creating second new children');
       }),creates = 2,
       stepCreate = function(events){
        //check if the new child is created
        var node;
        if(--creates === 0){
         node = CLNT.getNode('/3');
         if(!node){
          myTerritory.finish();
          return done(new Error('new node \'/3\' is missing'));
         }
         node = CLNT.getNode('/4');
         if(!node){
          myTerritory.finish();
          return done(new Error('new node \'/4\' is missing'));
         }

         myTerritory.setNext(stepRemove);
         CLNT.delMoreNodes(['/4'],'removing the second node');
        }
       },
       stepRemove = function(events){
        myTerritory.finish();
        var node,correct=false,i;
        for(i=0;i<events.length;i++){
         if(events[i].eid === '/4' && events[i].etype === 'unload'){
          correct = true;
         }
        }

        if(!correct){
         return done(new Error('unload event is missing'));
        }

        node = CLNT.getNode('/4');
        if(node !== null){
         return done(new Error('removed node should not be available'));
        }

        done();
       };
 });
 });

 describe('Run plugins', function () {
  var runPluginOnServer = function (pluginName, config, pluginConfig, callback) {
   requirejs(['plugin/' + pluginName + '/' + pluginName + '/' + pluginName],
       function (PluginClass) {
        var plugin = new PluginClass(),
            pluginConfigParam,
            context = {
             managerConfig: config,
             pluginConfigs: plugin.getDefaultConfig()
            };

        pluginConfig = pluginConfig || {};

        for (pluginConfigParam in pluginConfig) {
          if (pluginConfig.hasOwnProperty(pluginConfigParam)) {
           context.pluginConfigs[pluginConfigParam] = pluginConfig[pluginConfigParam];
          }
        }

        CLNT.runServerPlugin(pluginName, context, function (err, result) {
         callback(err, result);
        });
       },
       function (err) {
        callback(err);
       }
   );
  };


  it('should run PluginGenerator on server side', function (done) {
   var config = {
        project: projectName,
        token: "",
        activeNode: null, // active object in the editor
        activeSelection: [],
        commit: null, //"#668b3babcdf2ddcd7ba38b51acb62d63da859d90",
        branchName: 'master' // this has priority over the commit if not null
       },
       pluginConfig = {};

   runPluginOnServer('PluginGenerator', config, pluginConfig, function (err, result) {
     if (err) {
      done(err);
      return;
     }

     // TODO: check/assert on result as needed
     //console.log(result);

     should.equal(result.success, true);
     should.equal(result.error, null);
     should.equal(result.artifacts.length, 1, 'should generate one artifact');

     done();
   });

  });
 });
});
