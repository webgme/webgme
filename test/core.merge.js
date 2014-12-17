/**
 * Created by tamas on 12/13/14.
 */
var WebGME = require('../webgme'),
  FS = require('fs'),
  storage = new WebGME.serverUserStorage({host:'127.0.0.1',port:27017,database:'multi'});

//global helping functions and globally used variables
var baseCommit = null,
  projectName = 'test_core_merge_'+new Date().getTime(),
  project = null,
  commit = '',
  root = null,
  rootHash = '',
  core = null,
  branch = 'master',
  jsonData = null;

function saveProject(txt,ancestors,next){
  core.persist(root, function (err) {
    if (err) {
      return next(err);
    }

    commit = project.makeCommit(ancestors, core.getHash(root), txt, function (err) {
      if (err) {
        return next(err);
      }
      next(null,commit);
    });
  });
}
function loadJsonData(path){
  try {
    jsonData = JSON.parse(FS.readFileSync(path, 'utf8'));
  } catch (err) {
    jsonData = null;
    return false;
  }

  return true;
}
function importProject(projectJson,next) {

  storage.getProjectNames(function (err, names) {
    if (err) {
      return next(err);
    }
    names = names || [];
    if (names.indexOf(projectName) !== -1) {
      return next(new Error('project already exists'));
    }

    storage.openProject(projectName, function (err, p) {
      if (err || !p) {
        return next(err || new Error('unable to get quasi project'));
      }

      core = new WebGME.core(p);
      project = p;
      root = core.createNode();

      WebGME.serializer.import(core, root, projectJson, function (err, log) {
        if (err) {
          return next(err);
        }
        saveProject('test initial import',[],next);
      });
    });
  });
}
function deleteProject(next){
  storage.getProjectNames(function(err,names){
    if(err){
      return next(err);
    }
    if(names.indexOf(projectName) === -1){
      return next(new Error('no such project'));
    }

    storage.deleteProject(projectName,next);
  });
}
function applyDiff(diffJson,next){

  core.applyTreeDiff(root,diffJson,function(err){
    if(err){
      return next(err);
    }
    next(null);
  });
}
function loadNodes(paths,next){
  var needed = paths.length,
    nodes = {}, error = null, i,
    loadNode = function(path){
      core.loadByPath(root,path,function(err,node){
        error = error || err;
        nodes[path] = node;
        if(--needed === 0){
          next(error,nodes);
        }
      })
    };
  for(i=0;i<paths.length;i++){
    loadNode(paths[i]);
  }
}



describe('Core#Merge#Pre',function() {
  it('should open the database connection', function (done) {
    storage.openDatabase(done);
  });
  it('should import an initial state machine project', function (done) {
    console.log(commit,rootHash);
    if(!loadJsonData('./test/asset/sm_basic_basic.json')){
      return done(new Error('unable to load project file'));
    }
    importProject(jsonData,
      function (err, c){
        if (err) {
          return done(err);
        }
        baseCommit = c;
        commit = c;
        rootHash = core.getHash(root);
        done();
      });
  });
});
describe('Core#Merge#Attribute',function(){
  var baseRootHash,aRootHash,bRootHash,
    commitA,commitB,diffA,diffB,mergedDiff,mergedCommit,mergedRootHash,conflict;
  //before
  it('[a1] check original attribute values',function(done){
    baseRootHash = rootHash;
    core.loadRoot(baseRootHash,function(err,r){
      var needed = 2,error = null;
      if(err){
        return done(err);
      }
      root = r;
      core.loadByPath(r,'/579542227/651215756',function(err,a){
        error = error || err;
        if(!err && core.getAttribute(a,'priority')!==100){
          error = error || new Error('value of modificationA is wrong');
        }
        if(--needed === 0){
          done(error);
        }
      });
      core.loadByPath(r,'/579542227/2088994530',function(err,a){
        error = error || err;
        if(!err && core.getAttribute(a,'priority')!==100){
          error = error || new Error('value of modificationB is wrong');
        }
        if(--needed === 0){
          done(error);
        }
      });
    });
  });
  //changing attributes of different nodes
  it('[a2] node \'one\' priority => 2',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      commit = baseCommit;
      root = r;
      applyDiff({
        "579542227":{
          "651215756":{
            "attr":{
              "priority":2
            },
            "guid": "ed1a1ef7-7eb3-af75-11a8-7994220003e6",
            "oGuids":{
              "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
              "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
              "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true,
              "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
              "ed1a1ef7-7eb3-af75-11a8-7994220003e6": true,
              "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true
            }
          },
          "guid": "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3",
          "oGuids":{
            "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
            "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true,
            "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
            "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true
          }
        },
        "guid": "e687d284-a04a-7cbc-93ed-ea941752d57a",
        "oGuids":{
          "e687d284-a04a-7cbc-93ed-ea941752d57a": true
        }
      },function(err){
        if(err){
          return done(err);
        }

        saveProject('modificationsA',[baseCommit],function(err,c){
          aRootHash = core.getHash(root);
          commitA = c;
          done(err);
        });
      });
    });
  });
  it('[a2] node \'two\' priority => 2',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      commit = baseCommit;
      root = r;
      applyDiff({
        "579542227": {
          "2088994530": {
            "attr": {
              "priority": 2
            },
            "guid": "32e4adfc-deac-43ae-2504-3563b9d58b97",
            "oGuids": {
              "32e4adfc-deac-43ae-2504-3563b9d58b97": true,
              "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
              "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
              "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true,
              "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
              "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
            }
          },
          "guid": "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3",
          "oGuids": {
            "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
            "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
            "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true,
            "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
          }
        },
        "guid": "e687d284-a04a-7cbc-93ed-ea941752d57a",
        "oGuids": {
          "e687d284-a04a-7cbc-93ed-ea941752d57a": true
        }
      },function(err){
        if(err){
          return done(err);
        }
        saveProject('modificationsB',[baseCommit],function(err,c){
          bRootHash = core.getHash(root);
          commitB = c;
          done(err);
        });
      });
    });
  });
  it('[a2] common ancestor',function(done){
    project.getCommonAncestorCommit(commitA,commitB,function(err,bc){
      if(err){
        return done(new Error(err));
      }
      if(bc !== baseCommit){
        console.log(bc,'!=',baseCommit);
        return done(new Error('common ancestor commit mismatch'));
      }
      done();
    });
  });
  it('[a2] diff of modificationsA',function(done){
    core.loadRoot(baseRootHash,function(err,b){
      if(err){
        return done(err);
      }
      core.loadRoot(aRootHash,function(err,a){
        if(err){
          return done(err);
        }
        core.generateTreeDiff(b,a,function(err,d){
          if(err){
            return done(err);
          }
          diffA = d;
          done();
        });
      });
    });
  });
  it('[a2] diff of modificationsB',function(done){
    core.loadRoot(baseRootHash,function(err,b){
      if(err){
        return done(err);
      }
      core.loadRoot(bRootHash,function(err,a){
        if(err){
          return done(err);
        }
        core.generateTreeDiff(b,a,function(err,d){
          if(err){
            return done(err);
          }
          diffB = d;
          done();
        });
      });
    });
  });
  it('[a2] get conflict (0)',function(){
    conflict = core.tryToConcatChanges(diffA,diffB);
    if(conflict && conflict.items && conflict.items.length > 0){
      throw new Error('there are conflicts');
    }
    mergedDiff = conflict.merge;
  });
  it('[a2] apply merged changes',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      root = r;
      applyDiff(mergedDiff,function(err){
        if(err){
          return done(err);
        }
        saveProject('merged modifications',[commitA,commitB],function(err,c){
          if(err){
            return done(err);
          }
          mergedCommit = c;
          mergedRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[a2] check changes',function(done){
    core.loadRoot(mergedRootHash,function(err,r){
      var needed = 2,error = null;
      if(err){
        return done(err);
      }
      root = r;
      core.loadByPath(r,'/579542227/651215756',function(err,a){
        error = error || err;
        if(!err && core.getAttribute(a,'priority')!==2){
          error = error || new Error('value of modificationA is wrong');
        }
        if(--needed === 0){
          done(error);
        }
      });
      core.loadByPath(r,'/579542227/2088994530',function(err,a){
        error = error || err;
        if(!err && core.getAttribute(a,'priority')!==2){
          error = error || new Error('value of modificationB is wrong');
        }
        if(--needed === 0){
          done(error);
        }
      });
    });
  });
  //changing attribute to same value
  it('[a3] node \'one\' priority => 2',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      commit = baseCommit;
      root = r;
      applyDiff({
        "579542227":{
          "651215756":{
            "attr":{
              "priority":2
            },
            "guid": "ed1a1ef7-7eb3-af75-11a8-7994220003e6",
            "oGuids":{
              "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
              "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
              "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true,
              "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
              "ed1a1ef7-7eb3-af75-11a8-7994220003e6": true,
              "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true
            }
          },
          "guid": "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3",
          "oGuids":{
            "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
            "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true,
            "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
            "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true
          }
        },
        "guid": "e687d284-a04a-7cbc-93ed-ea941752d57a",
        "oGuids":{
          "e687d284-a04a-7cbc-93ed-ea941752d57a": true
        }
      },function(err){
        if(err){
          return done(err);
        }

        saveProject('modificationsA',[baseCommit],function(err,c){
          aRootHash = core.getHash(root);
          commitA = c;
          done(err);
        });
      });
    });
  });
  it('[a3] node \'one\' priority => 2',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      commit = baseCommit;
      root = r;
      applyDiff({
        "579542227":{
          "651215756":{
            "attr":{
              "priority":2
            },
            "guid": "ed1a1ef7-7eb3-af75-11a8-7994220003e6",
            "oGuids":{
              "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
              "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
              "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true,
              "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
              "ed1a1ef7-7eb3-af75-11a8-7994220003e6": true,
              "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true
            }
          },
          "guid": "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3",
          "oGuids":{
            "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
            "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true,
            "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
            "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true
          }
        },
        "guid": "e687d284-a04a-7cbc-93ed-ea941752d57a",
        "oGuids":{
          "e687d284-a04a-7cbc-93ed-ea941752d57a": true
        }
      },function(err){
        if(err){
          return done(err);
        }
        saveProject('modificationsB',[baseCommit],function(err,c){
          bRootHash = core.getHash(root);
          commitB = c;
          done(err);
        });
      });
    });
  });
  it('[a3] common ancestor',function(done){
    project.getCommonAncestorCommit(commitA,commitB,function(err,bc){
      if(err){
        return done(new Error(err));
      }
      if(bc !== baseCommit){
        console.warn(bc,'!=',baseCommit);
        return done(new Error('common ancestor commit mismatch'));
      }
      done();
    });
  });
  it('[a3] diff of modificationsA',function(done){
    core.loadRoot(baseRootHash,function(err,b){
      if(err){
        return done(err);
      }
      core.loadRoot(aRootHash,function(err,a){
        if(err){
          return done(err);
        }
        core.generateTreeDiff(b,a,function(err,d){
          if(err){
            return done(err);
          }
          diffA = d;
          done();
        });
      });
    });
  });
  it('[a3] diff of modificationsB',function(done){
    core.loadRoot(baseRootHash,function(err,b){
      if(err){
        return done(err);
      }
      core.loadRoot(bRootHash,function(err,a){
        if(err){
          return done(err);
        }
        core.generateTreeDiff(b,a,function(err,d){
          if(err){
            return done(err);
          }
          diffB = d;
          done();
        });
      });
    });
  });
  it('[a3] get conflict (0)',function(){
    conflict = core.tryToConcatChanges(diffA,diffB);
    if(conflict && conflict.items && conflict.items.length > 0){
      throw new Error('there are conflicts');
    }
    mergedDiff = conflict.merge;
  });
  it('[a3] apply merged changes',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      root = r;
      applyDiff(mergedDiff,function(err){
        if(err){
          return done(err);
        }
        saveProject('merged modifications',[commitA,commitB],function(err,c){
          if(err){
            return done(err);
          }
          mergedCommit = c;
          mergedRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[a3] check changes',function(done){
    core.loadRoot(mergedRootHash,function(err,r){
      var needed = 1,error = null;
      if(err){
        return done(err);
      }
      root = r;
      core.loadByPath(r,'/579542227/651215756',function(err,a){
        error = error || err;
        if(!err && core.getAttribute(a,'priority')!==2){
          error = error || new Error('value of modificationA is wrong');
        }
        if(--needed === 0){
          done(error);
        }
      });
    });
  });
  //changing attribute to different values
  it('[a4] node \'one\' priority => 2',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      commit = baseCommit;
      root = r;
      applyDiff({
        "579542227":{
          "651215756":{
            "attr":{
              "priority":2
            },
            "guid": "ed1a1ef7-7eb3-af75-11a8-7994220003e6",
            "oGuids":{
              "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
              "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
              "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true,
              "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
              "ed1a1ef7-7eb3-af75-11a8-7994220003e6": true,
              "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true
            }
          },
          "guid": "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3",
          "oGuids":{
            "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
            "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true,
            "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
            "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true
          }
        },
        "guid": "e687d284-a04a-7cbc-93ed-ea941752d57a",
        "oGuids":{
          "e687d284-a04a-7cbc-93ed-ea941752d57a": true
        }
      },function(err){
        if(err){
          return done(err);
        }

        saveProject('modificationsA',[baseCommit],function(err,c){
          aRootHash = core.getHash(root);
          commitA = c;
          done(err);
        });
      });
    });
  });
  it('[a4] node \'one\' priority => 3',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      commit = baseCommit;
      root = r;
      applyDiff({
        "579542227":{
          "651215756":{
            "attr":{
              "priority":3
            },
            "guid": "ed1a1ef7-7eb3-af75-11a8-7994220003e6",
            "oGuids":{
              "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
              "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
              "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true,
              "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
              "ed1a1ef7-7eb3-af75-11a8-7994220003e6": true,
              "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true
            }
          },
          "guid": "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3",
          "oGuids":{
            "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
            "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true,
            "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
            "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true
          }
        },
        "guid": "e687d284-a04a-7cbc-93ed-ea941752d57a",
        "oGuids":{
          "e687d284-a04a-7cbc-93ed-ea941752d57a": true
        }
      },function(err){
        if(err){
          return done(err);
        }
        saveProject('modificationsB',[baseCommit],function(err,c){
          bRootHash = core.getHash(root);
          commitB = c;
          done(err);
        });
      });
    });
  });
  it('[a4] common ancestor',function(done){
    project.getCommonAncestorCommit(commitA,commitB,function(err,bc){
      if(err){
        return done(new Error(err));
      }
      if(bc !== baseCommit){
        console.warn(bc,'!=',baseCommit);
        return done(new Error('common ancestor commit mismatch'));
      }
      done();
    });
  });
  it('[a4] diff of modificationsA',function(done){
    core.loadRoot(baseRootHash,function(err,b){
      if(err){
        return done(err);
      }
      core.loadRoot(aRootHash,function(err,a){
        if(err){
          return done(err);
        }
        core.generateTreeDiff(b,a,function(err,d){
          if(err){
            return done(err);
          }
          diffA = d;
          done();
        });
      });
    });
  });
  it('[a4] diff of modificationsB',function(done){
    core.loadRoot(baseRootHash,function(err,b){
      if(err){
        return done(err);
      }
      core.loadRoot(bRootHash,function(err,a){
        if(err){
          return done(err);
        }
        core.generateTreeDiff(b,a,function(err,d){
          if(err){
            return done(err);
          }
          diffB = d;
          done();
        });
      });
    });
  });
  it('[a4] get conflict (1)',function(){
    conflict = core.tryToConcatChanges(diffA,diffB);
    if(conflict && conflict.items && conflict.items.length !== 1){
      throw new Error('insufficient amount of conflicts');
    }
  });
  it('[a4] crate final merged diff',function(){
    conflict.items[0].selected = 'theirs';
    mergedDiff = core.applyResolution(conflict);
  });
  it('[a4] apply merged changes',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      root = r;
      applyDiff(mergedDiff,function(err){
        if(err){
          return done(err);
        }
        saveProject('merged modifications',[commitA,commitB],function(err,c){
          if(err){
            return done(err);
          }
          mergedCommit = c;
          mergedRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[a4] check changes',function(done){
    core.loadRoot(mergedRootHash,function(err,r){
      var needed = 1,error = null;
      if(err){
        return done(err);
      }
      root = r;
      core.loadByPath(r,'/579542227/651215756',function(err,a){
        error = error || err;
        if(!err && core.getAttribute(a,'priority')!==3){
          error = error || new Error('value of modificationA is wrong');
        }
        if(--needed === 0){
          done(error);
        }
      });
    });
  });
  //change attribute and move node
  it('[a5] node \'one\' priority => 2',function(done){
    core.loadRoot(baseRootHash,function(err,r) {
      if (err) {
        return done(err);
      }
      commit = baseCommit;
      root = r;
      core.loadByPath(root,'/579542227/651215756',function(err,node){
        if(err){
          return done(err);
        }
        core.setAttribute(node,'priority',2);
        saveProject('priority -> 2',[commit],function(err,c) {
          aRootHash = core.getHash(root);
          commitA = c;
          done(err);
        });
      });
    });
  });
  it('[a5] move node \'one\'',function(done){
    core.loadRoot(baseRootHash,function(err,r) {
      if (err) {
        return done(err);
      }
      commit = baseCommit;
      root = r;
      core.loadByPath(root,'/1786679144',function(err,parent){
        if(err){
          return done(err);
        }
        core.loadByPath(root,'/579542227/651215756',function(err,node){
          if(err){
            return done(err);
          }
          core.moveNode(node,parent);
          saveProject('node moved',[commit],function(err,c) {
            bRootHash = core.getHash(root);
            commitB = c;
            done(err);
          });
        });
      });
    });
  });
  it('[a5] common ancestor',function(done){
    project.getCommonAncestorCommit(commitA,commitB,function(err,bc){
      if(err){
        return done(new Error(err));
      }
      if(bc !== baseCommit){
        console.warn(bc,'!=',baseCommit);
        return done(new Error('common ancestor commit mismatch'));
      }
      done();
    });
  });
  it('[a5] diff of modificationsA',function(done){
    core.loadRoot(baseRootHash,function(err,b){
      if(err){
        return done(err);
      }
      core.loadRoot(aRootHash,function(err,a){
        if(err){
          return done(err);
        }
        core.generateTreeDiff(b,a,function(err,d){
          if(err){
            return done(err);
          }
          diffA = d;
          done();
        });
      });
    });
  });
  it('[a5] diff of modificationsB',function(done){
    core.loadRoot(baseRootHash,function(err,b){
      if(err){
        return done(err);
      }
      core.loadRoot(bRootHash,function(err,a){
        if(err){
          return done(err);
        }
        core.generateTreeDiff(b,a,function(err,d){
          if(err){
            return done(err);
          }
          diffB = d;
          done();
        });
      });
    });
  });
  it('[a5] get conflict (0)',function(){
    conflict = core.tryToConcatChanges(diffA,diffB);
    if(conflict && conflict.items && conflict.items.length > 0 ){
      throw new Error('there are conflicts');
    }
    mergedDiff = conflict.merge;
  });
  it('[a5] apply merged changes',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      root = r;
      applyDiff(mergedDiff,function(err){
        if(err){
          return done(err);
        }
        saveProject('merged modifications',[commitA,commitB],function(err,c){
          if(err){
            return done(err);
          }
          mergedCommit = c;
          mergedRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[a5] check changes',function(done){
    core.loadRoot(mergedRootHash,function(err,r){
      var needed = 1,error = null;
      if(err){
        return done(err);
      }
      root = r;
      core.loadByPath(r,'/1786679144/651215756',function(err,a){
        error = error || err;
        if(!err && core.getAttribute(a,'priority')!==2){
          error = error || new Error('value of modification is wrong');
        }
        if(--needed === 0){
          done(error);
        }
      });
    });
  });
  //remove attributes of different nodes
  it('[a6] node \'one\' and \'two\' priority => 2',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      var needed = 2,error = null,
        finish = function(){
          if(error){
            return done(error);
          }
          saveProject('basic modifications before the test',[commit],function(err,c){
            if(err){
              return done(err);
            }
            baseRootHash = core.getHash(root);
            commit = c;
            baseCommit = c;
            done();
          });
        };
      root = r;
      core.loadByPath(root,'/579542227/651215756',function(err,a){
        error = error || err;
        if(!error && a){
          core.setAttribute(a,'priority',2);
        }
        if(--needed === 0){
          finish();
        }
      });
      core.loadByPath(root,'/579542227/2088994530',function(err,a){
        error = error || err;
        if(!error && a){
          core.setAttribute(a,'priority',2);
        }
        if(--needed === 0){
          finish();
        }
      });
    });
  });
  it('[a6] removes priority from node \'one\'',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      root = r;
      core.loadByPath(root,'/579542227/651215756',function(err,node){
        if(err){
          return done(err);
        }
        core.delAttribute(node,'priority');
        saveProject('priority removed from node',[baseCommit],function(err,c){
          if(err){
            return done(err);
          }
          commitA = c;
          aRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[a6] removes priority from node \'two\'',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      root = r;
      core.loadByPath(root,'/579542227/2088994530',function(err,node){
        if(err){
          return done(err);
        }
        core.delAttribute(node,'priority');
        saveProject('priority removed from node',[baseCommit],function(err,c){
          if(err){
            return done(err);
          }
          commitB = c;
          bRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[a6] common ancestor',function(done){
    project.getCommonAncestorCommit(commitA,commitB,function(err,bc){
      if(err){
        return done(new Error(err));
      }
      if(bc !== baseCommit){
        console.warn(bc,'!=',baseCommit);
        return done(new Error('common ancestor commit mismatch'));
      }
      done();
    });
  });
  it('[a6] diff of modificationsA',function(done){
    core.loadRoot(baseRootHash,function(err,b){
      if(err){
        return done(err);
      }
      core.loadRoot(aRootHash,function(err,a){
        if(err){
          return done(err);
        }
        core.generateTreeDiff(b,a,function(err,d){
          if(err){
            return done(err);
          }
          diffA = d;
          done();
        });
      });
    });
  });
  it('[a6] diff of modificationsB',function(done){
    core.loadRoot(baseRootHash,function(err,b){
      if(err){
        return done(err);
      }
      core.loadRoot(bRootHash,function(err,a){
        if(err){
          return done(err);
        }
        core.generateTreeDiff(b,a,function(err,d){
          if(err){
            return done(err);
          }
          diffB = d;
          done();
        });
      });
    });
  });
  it('[a6] get conflict (0)',function(){
    conflict = core.tryToConcatChanges(diffA,diffB);
    if(conflict && conflict.items && conflict.items.length > 0 ){
      throw new Error('there are conflicts');
    }
    mergedDiff = conflict.merge;
  });
  it('[a6] apply merged changes',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      root = r;
      applyDiff(mergedDiff,function(err){
        if(err){
          return done(err);
        }
        saveProject('merged modifications',[commitA,commitB],function(err,c){
          if(err){
            return done(err);
          }
          mergedCommit = c;
          mergedRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[a6] check changes',function(done){
    core.loadRoot(mergedRootHash,function(err,r){
      var needed = 2,error = null;
      if(err){
        return done(err);
      }
      root = r;
      core.loadByPath(r,'/579542227/651215756',function(err,a){
        error = error || err;
        if(!err && core.getAttribute(a,'priority')!==100){
          error = error || new Error('value of modificationA is wrong');
        }
        if(--needed === 0){
          done(error);
        }
      });
      core.loadByPath(r,'/579542227/2088994530',function(err,a){
        error = error || err;
        if(!err && core.getAttribute(a,'priority')!==100){
          error = error || new Error('value of modificationB is wrong');
        }
        if(--needed === 0){
          done(error);
        }
      });
    });
  });
});
describe('Core#Merge#Registry',function(){
  var baseRootHash,aRootHash,bRootHash,
    commitA,commitB,diffA,diffB,mergedDiff,mergedCommit,mergedRootHash,conflict;
  //before
  it('[r1] check original registry values',function(done){
    baseRootHash = rootHash;
    core.loadRoot(baseRootHash,function(err,r){
      var needed = 2,error = null,position;
      if(err){
        return done(err);
      }
      root = r;
      core.loadByPath(r,'/579542227/651215756',function(err,a){
        error = error || err;
        if(!err ){
          position = core.getRegistry(a,'position');
          if(position.x !== 69 || position.y !== 276)
          error = error || new Error('values of node \'one\' are wrong');
        }
        if(--needed === 0){
          done(error);
        }
      });
      core.loadByPath(r,'/579542227/2088994530',function(err,a){
        error = error || err;
        if(!err ){
          position = core.getRegistry(a,'position');
          if(position.x !== 243 || position.y !== 184)
            error = error || new Error('values of node \'one\' are wrong');
        }
        if(--needed === 0){
          done(error);
        }
      });
    });
  });
  //changing registry of different nodes
  it('[r2] node \'one\' position => 200,200',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      commit = baseCommit;
      root = r;
      applyDiff({
        "579542227":{
          "651215756":{
            "reg":{
              "position":{"x":200,"y":200}
            },
            "guid": "ed1a1ef7-7eb3-af75-11a8-7994220003e6",
            "oGuids":{
              "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
              "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
              "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true,
              "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
              "ed1a1ef7-7eb3-af75-11a8-7994220003e6": true,
              "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true
            }
          },
          "guid": "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3",
          "oGuids":{
            "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
            "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true,
            "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
            "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true
          }
        },
        "guid": "e687d284-a04a-7cbc-93ed-ea941752d57a",
        "oGuids":{
          "e687d284-a04a-7cbc-93ed-ea941752d57a": true
        }
      },function(err){
        if(err){
          return done(err);
        }

        saveProject('modificationsA',[baseCommit],function(err,c){
          aRootHash = core.getHash(root);
          commitA = c;
          done(err);
        });
      });
    });
  });
  it('[r2] node \'two\' position => 300,300',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      commit = baseCommit;
      root = r;
      applyDiff({
        "579542227": {
          "2088994530": {
            "reg": {
              "position":{"x":300,"y":300}
            },
            "guid": "32e4adfc-deac-43ae-2504-3563b9d58b97",
            "oGuids": {
              "32e4adfc-deac-43ae-2504-3563b9d58b97": true,
              "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
              "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
              "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true,
              "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
              "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
            }
          },
          "guid": "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3",
          "oGuids": {
            "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
            "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
            "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true,
            "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
          }
        },
        "guid": "e687d284-a04a-7cbc-93ed-ea941752d57a",
        "oGuids": {
          "e687d284-a04a-7cbc-93ed-ea941752d57a": true
        }
      },function(err){
        if(err){
          return done(err);
        }
        saveProject('modificationsB',[baseCommit],function(err,c){
          bRootHash = core.getHash(root);
          commitB = c;
          done(err);
        });
      });
    });
  });
  it('[r2] common ancestor',function(done){
    project.getCommonAncestorCommit(commitA,commitB,function(err,bc){
      if(err){
        return done(new Error(err));
      }
      if(bc !== baseCommit){
        console.log(bc,'!=',baseCommit);
        return done(new Error('common ancestor commit mismatch'));
      }
      done();
    });
  });
  it('[r2] diff of modificationsA',function(done){
    core.loadRoot(baseRootHash,function(err,b){
      if(err){
        return done(err);
      }
      core.loadRoot(aRootHash,function(err,a){
        if(err){
          return done(err);
        }
        core.generateTreeDiff(b,a,function(err,d){
          if(err){
            return done(err);
          }
          diffA = d;
          done();
        });
      });
    });
  });
  it('[r2] diff of modificationsB',function(done){
    core.loadRoot(baseRootHash,function(err,b){
      if(err){
        return done(err);
      }
      core.loadRoot(bRootHash,function(err,a){
        if(err){
          return done(err);
        }
        core.generateTreeDiff(b,a,function(err,d){
          if(err){
            return done(err);
          }
          diffB = d;
          done();
        });
      });
    });
  });
  it('[r2] get conflict (0)',function(){
    conflict = core.tryToConcatChanges(diffA,diffB);
    if(conflict && conflict.items && conflict.items.length > 0){
      throw new Error('there are conflicts');
    }
    mergedDiff = conflict.merge;
  });
  it('[r2] apply merged changes',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      root = r;
      applyDiff(mergedDiff,function(err){
        if(err){
          return done(err);
        }
        saveProject('merged modifications',[commitA,commitB],function(err,c){
          if(err){
            return done(err);
          }
          mergedCommit = c;
          mergedRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[r2] check changes',function(done){
    core.loadRoot(mergedRootHash,function(err,r){
      var needed = 2,error = null,position;
      if(err){
        return done(err);
      }
      root = r;
      core.loadByPath(r,'/579542227/651215756',function(err,a){
        error = error || err;
        if(!err ){
          position = core.getRegistry(a,'position');
          if(position.x !== 200 || position.y !== 200)
            error = error || new Error('values of node \'one\' are wrong');
        }
        if(--needed === 0){
          done(error);
        }
      });
      core.loadByPath(r,'/579542227/2088994530',function(err,a){
        error = error || err;
        if(!err ){
          position = core.getRegistry(a,'position');
          if(position.x !== 300 || position.y !== 300)
            error = error || new Error('values of node \'one\' are wrong');
        }
        if(--needed === 0){
          done(error);
        }
      });
    });
  });
  //changing attribute to same value
  it('[r3] node \'one\' position => 200,200',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      commit = baseCommit;
      root = r;
      applyDiff({
        "579542227":{
          "651215756":{
            "reg":{
              "position":{"x":200,"y":200}
            },
            "guid": "ed1a1ef7-7eb3-af75-11a8-7994220003e6",
            "oGuids":{
              "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
              "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
              "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true,
              "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
              "ed1a1ef7-7eb3-af75-11a8-7994220003e6": true,
              "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true
            }
          },
          "guid": "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3",
          "oGuids":{
            "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
            "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true,
            "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
            "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true
          }
        },
        "guid": "e687d284-a04a-7cbc-93ed-ea941752d57a",
        "oGuids":{
          "e687d284-a04a-7cbc-93ed-ea941752d57a": true
        }
      },function(err){
        if(err){
          return done(err);
        }

        saveProject('modificationsA',[baseCommit],function(err,c){
          aRootHash = core.getHash(root);
          commitA = c;
          done(err);
        });
      });
    });
  });
  it('[r3] node \'one\' position => 200,200',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      commit = baseCommit;
      root = r;
      applyDiff({
        "579542227":{
          "651215756":{
            "reg":{
              "position":{"x":200,"y":200}
            },
            "guid": "ed1a1ef7-7eb3-af75-11a8-7994220003e6",
            "oGuids":{
              "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
              "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
              "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true,
              "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
              "ed1a1ef7-7eb3-af75-11a8-7994220003e6": true,
              "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true
            }
          },
          "guid": "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3",
          "oGuids":{
            "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
            "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true,
            "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
            "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true
          }
        },
        "guid": "e687d284-a04a-7cbc-93ed-ea941752d57a",
        "oGuids":{
          "e687d284-a04a-7cbc-93ed-ea941752d57a": true
        }
      },function(err){
        if(err){
          return done(err);
        }
        saveProject('modificationsB',[baseCommit],function(err,c){
          bRootHash = core.getHash(root);
          commitB = c;
          done(err);
        });
      });
    });
  });
  it('[r3] common ancestor',function(done){
    project.getCommonAncestorCommit(commitA,commitB,function(err,bc){
      if(err){
        return done(new Error(err));
      }
      if(bc !== baseCommit){
        console.warn(bc,'!=',baseCommit);
        return done(new Error('common ancestor commit mismatch'));
      }
      done();
    });
  });
  it('[r3] diff of modificationsA',function(done){
    core.loadRoot(baseRootHash,function(err,b){
      if(err){
        return done(err);
      }
      core.loadRoot(aRootHash,function(err,a){
        if(err){
          return done(err);
        }
        core.generateTreeDiff(b,a,function(err,d){
          if(err){
            return done(err);
          }
          diffA = d;
          done();
        });
      });
    });
  });
  it('[r3] diff of modificationsB',function(done){
    core.loadRoot(baseRootHash,function(err,b){
      if(err){
        return done(err);
      }
      core.loadRoot(bRootHash,function(err,a){
        if(err){
          return done(err);
        }
        core.generateTreeDiff(b,a,function(err,d){
          if(err){
            return done(err);
          }
          diffB = d;
          done();
        });
      });
    });
  });
  it('[r3] get conflict (0)',function(){
    conflict = core.tryToConcatChanges(diffA,diffB);
    if(conflict && conflict.items && conflict.items.length > 0){
      throw new Error('there are conflicts');
    }
    mergedDiff = conflict.merge;
  });
  it('[r3] apply merged changes',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      root = r;
      applyDiff(mergedDiff,function(err){
        if(err){
          return done(err);
        }
        saveProject('merged modifications',[commitA,commitB],function(err,c){
          if(err){
            return done(err);
          }
          mergedCommit = c;
          mergedRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[r3] check changes',function(done){
    core.loadRoot(mergedRootHash,function(err,r){
      var needed = 1,error = null,position;
      if(err){
        return done(err);
      }
      root = r;
      core.loadByPath(r,'/579542227/651215756',function(err,a){
        error = error || err;
        if(!err ){
          position = core.getRegistry(a,'position');
          if(position.x !== 200 || position.y !== 200)
            error = error || new Error('values of node \'one\' are wrong');
        }
        if(--needed === 0){
          done(error);
        }
      });
    });
  });
  //changing attribute to different values
  it('[r4] node \'one\' position => 200,200',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      commit = baseCommit;
      root = r;
      applyDiff({
        "579542227":{
          "651215756":{
            "reg":{
              "position":{"x":200,"y":200}
            },
            "guid": "ed1a1ef7-7eb3-af75-11a8-7994220003e6",
            "oGuids":{
              "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
              "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
              "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true,
              "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
              "ed1a1ef7-7eb3-af75-11a8-7994220003e6": true,
              "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true
            }
          },
          "guid": "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3",
          "oGuids":{
            "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
            "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true,
            "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
            "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true
          }
        },
        "guid": "e687d284-a04a-7cbc-93ed-ea941752d57a",
        "oGuids":{
          "e687d284-a04a-7cbc-93ed-ea941752d57a": true
        }
      },function(err){
        if(err){
          return done(err);
        }

        saveProject('modificationsA',[baseCommit],function(err,c){
          aRootHash = core.getHash(root);
          commitA = c;
          done(err);
        });
      });
    });
  });
  it('[r4] node \'one\' position => 300,300',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      commit = baseCommit;
      root = r;
      applyDiff({
        "579542227":{
          "651215756":{
            "reg":{
              "position":{"x":300,"y":300}
            },
            "guid": "ed1a1ef7-7eb3-af75-11a8-7994220003e6",
            "oGuids":{
              "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
              "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
              "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true,
              "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
              "ed1a1ef7-7eb3-af75-11a8-7994220003e6": true,
              "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true
            }
          },
          "guid": "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3",
          "oGuids":{
            "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
            "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true,
            "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
            "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true
          }
        },
        "guid": "e687d284-a04a-7cbc-93ed-ea941752d57a",
        "oGuids":{
          "e687d284-a04a-7cbc-93ed-ea941752d57a": true
        }
      },function(err){
        if(err){
          return done(err);
        }
        saveProject('modificationsB',[baseCommit],function(err,c){
          bRootHash = core.getHash(root);
          commitB = c;
          done(err);
        });
      });
    });
  });
  it('[r4] common ancestor',function(done){
    project.getCommonAncestorCommit(commitA,commitB,function(err,bc){
      if(err){
        return done(new Error(err));
      }
      if(bc !== baseCommit){
        console.warn(bc,'!=',baseCommit);
        return done(new Error('common ancestor commit mismatch'));
      }
      done();
    });
  });
  it('[r4] diff of modificationsA',function(done){
    core.loadRoot(baseRootHash,function(err,b){
      if(err){
        return done(err);
      }
      core.loadRoot(aRootHash,function(err,a){
        if(err){
          return done(err);
        }
        core.generateTreeDiff(b,a,function(err,d){
          if(err){
            return done(err);
          }
          diffA = d;
          done();
        });
      });
    });
  });
  it('[r4] diff of modificationsB',function(done){
    core.loadRoot(baseRootHash,function(err,b){
      if(err){
        return done(err);
      }
      core.loadRoot(bRootHash,function(err,a){
        if(err){
          return done(err);
        }
        core.generateTreeDiff(b,a,function(err,d){
          if(err){
            return done(err);
          }
          diffB = d;
          done();
        });
      });
    });
  });
  it('[r4] get conflict (1)',function(){
    conflict = core.tryToConcatChanges(diffA,diffB);
    if(conflict && conflict.items && conflict.items.length !== 1){
      throw new Error('insufficient amount of conflicts');
    }
  });
  it('[r4] crate final merged diff',function(){
    conflict.items[0].selected = 'theirs';
    mergedDiff = core.applyResolution(conflict);
  });
  it('[r4] apply merged changes',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      root = r;
      applyDiff(mergedDiff,function(err){
        if(err){
          return done(err);
        }
        saveProject('merged modifications',[commitA,commitB],function(err,c){
          if(err){
            return done(err);
          }
          mergedCommit = c;
          mergedRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[r4] check changes',function(done){
    core.loadRoot(mergedRootHash,function(err,r){
      var needed = 1,error = null,position;
      if(err){
        return done(err);
      }
      root = r;
      core.loadByPath(r,'/579542227/651215756',function(err,a){
        error = error || err;
        if(!err ){
          position = core.getRegistry(a,'position');
          if(position.x !== 300 || position.y !== 300)
            error = error || new Error('values of node \'one\' are wrong');
        }
        if(--needed === 0){
          done(error);
        }
      });
    });
  });
  //change attribute and move node
  it('[r5] node \'one\' position => 200,200',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      commit = baseCommit;
      root = r;
      applyDiff({
        "579542227":{
          "651215756":{
            "reg":{
              "position":{"x":200,"y":200}
            },
            "guid": "ed1a1ef7-7eb3-af75-11a8-7994220003e6",
            "oGuids":{
              "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
              "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
              "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true,
              "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
              "ed1a1ef7-7eb3-af75-11a8-7994220003e6": true,
              "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true
            }
          },
          "guid": "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3",
          "oGuids":{
            "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
            "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true,
            "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
            "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true
          }
        },
        "guid": "e687d284-a04a-7cbc-93ed-ea941752d57a",
        "oGuids":{
          "e687d284-a04a-7cbc-93ed-ea941752d57a": true
        }
      },function(err){
        if(err){
          return done(err);
        }

        saveProject('modificationsA',[baseCommit],function(err,c){
          aRootHash = core.getHash(root);
          commitA = c;
          done(err);
        });
      });
    });
  });
  it('[r5] move node \'one\'',function(done){
    core.loadRoot(baseRootHash,function(err,r) {
      if (err) {
        return done(err);
      }
      commit = baseCommit;
      root = r;
      core.loadByPath(root,'/1786679144',function(err,parent){
        if(err){
          return done(err);
        }
        core.loadByPath(root,'/579542227/651215756',function(err,node){
          if(err){
            return done(err);
          }
          core.moveNode(node,parent);
          saveProject('node moved',[commit],function(err,c) {
            bRootHash = core.getHash(root);
            commitB = c;
            done(err);
          });
        });
      });
    });
  });
  it('[r5] common ancestor',function(done){
    project.getCommonAncestorCommit(commitA,commitB,function(err,bc){
      if(err){
        return done(new Error(err));
      }
      if(bc !== baseCommit){
        console.warn(bc,'!=',baseCommit);
        return done(new Error('common ancestor commit mismatch'));
      }
      done();
    });
  });
  it('[r5] diff of modificationsA',function(done){
    core.loadRoot(baseRootHash,function(err,b){
      if(err){
        return done(err);
      }
      core.loadRoot(aRootHash,function(err,a){
        if(err){
          return done(err);
        }
        core.generateTreeDiff(b,a,function(err,d){
          if(err){
            return done(err);
          }
          diffA = d;
          done();
        });
      });
    });
  });
  it('[r5] diff of modificationsB',function(done){
    core.loadRoot(baseRootHash,function(err,b){
      if(err){
        return done(err);
      }
      core.loadRoot(bRootHash,function(err,a){
        if(err){
          return done(err);
        }
        core.generateTreeDiff(b,a,function(err,d){
          if(err){
            return done(err);
          }
          diffB = d;
          done();
        });
      });
    });
  });
  it('[r5] get conflict (0)',function(){
    conflict = core.tryToConcatChanges(diffA,diffB);
    if(conflict && conflict.items && conflict.items.length > 0 ){
      throw new Error('there are conflicts');
    }
    mergedDiff = conflict.merge;
  });
  it('[r5] apply merged changes',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      root = r;
      applyDiff(mergedDiff,function(err){
        if(err){
          return done(err);
        }
        saveProject('merged modifications',[commitA,commitB],function(err,c){
          if(err){
            return done(err);
          }
          mergedCommit = c;
          mergedRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[r5] check changes',function(done){
    core.loadRoot(mergedRootHash,function(err,r){
      var needed = 1,error = null,position;
      if(err){
        return done(err);
      }
      root = r;
      core.loadByPath(r,'/1786679144/651215756',function(err,a){
        error = error || err;
        if(!err ){
          position = core.getRegistry(a,'position');
          if(position.x !== 200 || position.y !== 200)
            error = error || new Error('values of node \'one\' are wrong');
        }
        if(--needed === 0){
          done(error);
        }
      });
    });
  });
  //remove attributes of different nodes
  it('[r6] removes position from node \'one\'',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      root = r;
      core.loadByPath(root,'/579542227/651215756',function(err,node){
        if(err){
          return done(err);
        }
        core.delRegistry(node,'position');
        saveProject('position removed from node',[baseCommit],function(err,c){
          if(err){
            return done(err);
          }
          commitA = c;
          aRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[r6] removes position from node \'two\'',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      root = r;
      core.loadByPath(root,'/579542227/2088994530',function(err,node){
        if(err){
          return done(err);
        }
        core.delRegistry(node,'position');
        saveProject('position removed from node',[baseCommit],function(err,c){
          if(err){
            return done(err);
          }
          commitB = c;
          bRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[r6] common ancestor',function(done){
    project.getCommonAncestorCommit(commitA,commitB,function(err,bc){
      if(err){
        return done(new Error(err));
      }
      if(bc !== baseCommit){
        console.warn(bc,'!=',baseCommit);
        return done(new Error('common ancestor commit mismatch'));
      }
      done();
    });
  });
  it('[r6] diff of modificationsA',function(done){
    core.loadRoot(baseRootHash,function(err,b){
      if(err){
        return done(err);
      }
      core.loadRoot(aRootHash,function(err,a){
        if(err){
          return done(err);
        }
        core.generateTreeDiff(b,a,function(err,d){
          if(err){
            return done(err);
          }
          diffA = d;
          done();
        });
      });
    });
  });
  it('[r6] diff of modificationsB',function(done){
    core.loadRoot(baseRootHash,function(err,b){
      if(err){
        return done(err);
      }
      core.loadRoot(bRootHash,function(err,a){
        if(err){
          return done(err);
        }
        core.generateTreeDiff(b,a,function(err,d){
          if(err){
            return done(err);
          }
          diffB = d;
          done();
        });
      });
    });
  });
  it('[r6] get conflict (0)',function(){
    conflict = core.tryToConcatChanges(diffA,diffB);
    if(conflict && conflict.items && conflict.items.length > 0 ){
      throw new Error('there are conflicts');
    }
    mergedDiff = conflict.merge;
  });
  it('[r6] apply merged changes',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      root = r;
      applyDiff(mergedDiff,function(err){
        if(err){
          return done(err);
        }
        saveProject('merged modifications',[commitA,commitB],function(err,c){
          if(err){
            return done(err);
          }
          mergedCommit = c;
          mergedRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[r6] check changes',function(done){
    core.loadRoot(mergedRootHash,function(err,r){
      var needed = 2,error = null,position;
      if(err){
        return done(err);
      }
      root = r;
      core.loadByPath(r,'/579542227/651215756',function(err,a){
        error = error || err;
        if(!err ){
          position = core.getRegistry(a,'position');
          if(position.x !== 329 || position.y !== 140)
            error = error || new Error('values of node \'one\' are wrong');
        }
        if(--needed === 0){
          done(error);
        }
      });
      core.loadByPath(r,'/579542227/2088994530',function(err,a){
        error = error || err;
        if(!err ){
          position = core.getRegistry(a,'position');
          if(position.x !== 329 || position.y !== 140)
            error = error || new Error('values of node \'one\' are wrong');
        }
        if(--needed === 0){
          done(error);
        }
      });
    });
  });
});
describe('Core#Merge#Pointer',function() {
  var baseRootHash, aRootHash, bRootHash,
    commitA, commitB, diffA, diffB, mergedDiff, mergedCommit, mergedRootHash, conflict;
  it('[p1] check the initial values of pointers', function (done) {
    baseRootHash = rootHash;
    commit = baseCommit;
    console.warn('kecso000', commit);
    core.loadRoot(baseRootHash, function (err, r) {
      var needed = 2, error = null;
      if (err) {
        return done(err);
      }
      root = r;
      core.loadByPath(root, '/579542227/275896267', function (err, node) {
        error = error || err;
        if (!error && (core.getPointerPath(node, 'dst') !== '/579542227/2088994530' || core.getPointerPath(node, 'src') !== '/579542227/651215756')) {
          error = new Error('insufficient target of pointers');
        }
        if (--needed === 0) {
          done(error);
        }
      });
      core.loadByPath(root, '/579542227/684921282', function (err, node) {
        error = error || err;
        if (!error && (core.getPointerPath(node, 'dst') !== '/579542227/1532094116' || core.getPointerPath(node, 'src') !== '/579542227/2088994530')) {
          error = new Error('insufficient target of pointers');
        }
        if (--needed === 0) {
          done(error);
        }
      });
    });
  });
  //change different pointer targets
  it('[p2] change src and dst of connectionA', function (done) {
    core.loadRoot(baseRootHash, function (err, r) {
      if (err) {
        return done(err);
      }
      root = r;
      loadNodes([
        '/579542227/275896267'/*connection*/,
        '/579542227/1532094116' /*new dst and src 3*/], function (err, nodes) {
        if (err) {
          return done(err);
        }
        core.setPointer(nodes['/579542227/275896267'], 'src', nodes['/579542227/1532094116']);
        core.setPointer(nodes['/579542227/275896267'], 'dst', nodes['/579542227/1532094116']);
        saveProject('changed pointer targets', [baseCommit], function (err, c) {
          if (err) {
            return done(err);
          }
          commitA = c;
          aRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[p2] change src and dst of connectionB', function (done) {
    core.loadRoot(baseRootHash, function (err, r) {
      if (err) {
        return done(err);
      }
      root = r;
      loadNodes([
        '/579542227/684921282'/*connection*/,
        '/579542227/651215756' /*new dst and src 1*/], function (err, nodes) {
        if (err) {
          return done(err);
        }
        core.setPointer(nodes['/579542227/684921282'], 'src', nodes['/579542227/651215756']);
        core.setPointer(nodes['/579542227/684921282'], 'dst', nodes['/579542227/651215756']);
        saveProject('changed pointer targets', [baseCommit], function (err, c) {
          if (err) {
            return done(err);
          }
          commitB = c;
          bRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[p2] common ancestor', function (done) {
    project.getCommonAncestorCommit(commitA, commitB, function (err, bc) {
      if (err) {
        return done(new Error(err));
      }
      if (bc !== baseCommit) {
        console.warn(bc, '!=', baseCommit);
        return done(new Error('common ancestor commit mismatch'));
      }
      done();
    });
  });
  it('[p2] diff of modificationsA', function (done) {
    core.loadRoot(baseRootHash, function (err, b) {
      if (err) {
        return done(err);
      }
      core.loadRoot(aRootHash, function (err, a) {
        if (err) {
          return done(err);
        }
        core.generateTreeDiff(b, a, function (err, d) {
          if (err) {
            return done(err);
          }
          diffA = d;
          done();
        });
      });
    });
  });
  it('[p2] diff of modificationsB', function (done) {
    core.loadRoot(baseRootHash, function (err, b) {
      if (err) {
        return done(err);
      }
      core.loadRoot(bRootHash, function (err, a) {
        if (err) {
          return done(err);
        }
        core.generateTreeDiff(b, a, function (err, d) {
          if (err) {
            return done(err);
          }
          diffB = d;
          done();
        });
      });
    });
  });
  it('[p2] get conflict (0)', function () {
    conflict = core.tryToConcatChanges(diffA, diffB);
    if (conflict && conflict.items && conflict.items.length > 0) {
      throw new Error('there are conflicts');
    }
    mergedDiff = conflict.merge;
  });
  it('[p2] apply merged changes', function (done) {
    core.loadRoot(baseRootHash, function (err, r) {
      if (err) {
        return done(err);
      }
      root = r;
      applyDiff(mergedDiff, function (err) {
        if (err) {
          return done(err);
        }
        saveProject('merged modifications', [commitA, commitB], function (err, c) {
          if (err) {
            return done(err);
          }
          mergedCommit = c;
          mergedRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[p2] check the merged values of pointers', function (done) {
    core.loadRoot(mergedRootHash, function (err, r) {
      if (err) {
        done(err);
      }
      root = r;
      loadNodes(['/579542227/275896267', '/579542227/684921282'], function (err, nodes) {
        if (err) {
          return done(err);
        }
        if (core.getPointerPath(nodes['/579542227/275896267'], 'src') !== '/579542227/1532094116' ||
          core.getPointerPath(nodes['/579542227/275896267'], 'dst') !== '/579542227/1532094116' ||
          core.getPointerPath(nodes['/579542227/684921282'], 'src') !== '/579542227/651215756' ||
          core.getPointerPath(nodes['/579542227/684921282'], 'src') !== '/579542227/651215756') {
          return done(new Error('insufficient pointer values'));
        }
        done();
      });
    });
  });
  //change the same target to the same value
  it('[p3] change src and dst of connectionA', function (done) {
    core.loadRoot(baseRootHash, function (err, r) {
      if (err) {
        return done(err);
      }
      root = r;
      loadNodes([
        '/579542227/275896267'/*connection*/,
        '/579542227/1532094116' /*new dst and src 3*/], function (err, nodes) {
        if (err) {
          return done(err);
        }
        core.setPointer(nodes['/579542227/275896267'], 'src', nodes['/579542227/1532094116']);
        core.setPointer(nodes['/579542227/275896267'], 'dst', nodes['/579542227/1532094116']);
        saveProject('changed pointer targets', [baseCommit], function (err, c) {
          if (err) {
            return done(err);
          }
          commitA = c;
          aRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[p3] change src and dst of connectionB', function (done) {
    core.loadRoot(baseRootHash, function (err, r) {
      if (err) {
        return done(err);
      }
      root = r;
      loadNodes([
        '/579542227/275896267'/*connection*/,
        '/579542227/1532094116' /*new dst and src 3*/], function (err, nodes) {
        if (err) {
          return done(err);
        }
        core.setPointer(nodes['/579542227/275896267'], 'src', nodes['/579542227/1532094116']);
        core.setPointer(nodes['/579542227/275896267'], 'dst', nodes['/579542227/1532094116']);
        saveProject('changed pointer targets', [baseCommit], function (err, c) {
          if (err) {
            return done(err);
          }
          commitB = c;
          bRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[p3] common ancestor', function (done) {
    project.getCommonAncestorCommit(commitA, commitB, function (err, bc) {
      if (err) {
        return done(new Error(err));
      }
      if (bc !== baseCommit) {
        console.warn(bc, '!=', baseCommit);
        return done(new Error('common ancestor commit mismatch'));
      }
      done();
    });
  });
  it('[p3] diff of modificationsA', function (done) {
    core.loadRoot(baseRootHash, function (err, b) {
      if (err) {
        return done(err);
      }
      core.loadRoot(aRootHash, function (err, a) {
        if (err) {
          return done(err);
        }
        core.generateTreeDiff(b, a, function (err, d) {
          if (err) {
            return done(err);
          }
          diffA = d;
          done();
        });
      });
    });
  });
  it('[p3] diff of modificationsB', function (done) {
    core.loadRoot(baseRootHash, function (err, b) {
      if (err) {
        return done(err);
      }
      core.loadRoot(bRootHash, function (err, a) {
        if (err) {
          return done(err);
        }
        core.generateTreeDiff(b, a, function (err, d) {
          if (err) {
            return done(err);
          }
          diffB = d;
          done();
        });
      });
    });
  });
  it('[p3] get conflict (0)', function () {
    conflict = core.tryToConcatChanges(diffA, diffB);
    if (conflict && conflict.items && conflict.items.length > 0) {
      throw new Error('there are conflicts');
    }
    mergedDiff = conflict.merge;
  });
  it('[p3] apply merged changes', function (done) {
    core.loadRoot(baseRootHash, function (err, r) {
      if (err) {
        return done(err);
      }
      root = r;
      applyDiff(mergedDiff, function (err) {
        if (err) {
          return done(err);
        }
        saveProject('merged modifications', [commitA, commitB], function (err, c) {
          if (err) {
            return done(err);
          }
          mergedCommit = c;
          mergedRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[p3] checks the merged values of pointers', function (done) {
    core.loadRoot(mergedRootHash, function (err, r) {
      if (err) {
        return done(err);
      }
      root = r;
      core.loadByPath(root, '/579542227/275896267', function (err, node) {
        if (err) {
          return done(err);
        }
        if (core.getPointerPath(node, 'src') !== '/579542227/1532094116' ||
          core.getPointerPath(node, 'src') !== '/579542227/1532094116') {
          return done(new Error('insufficient pointer values'));
        }
        done();
      });
    });
  });
  //change the same target to different values
  it('[p4] change src and dst of connectionA', function (done) {
    core.loadRoot(baseRootHash, function (err, r) {
      if (err) {
        return done(err);
      }
      root = r;
      loadNodes([
        '/579542227/275896267'/*connection*/,
        '/579542227/1532094116' /*new dst and src 3*/], function (err, nodes) {
        if (err) {
          return done(err);
        }
        core.setPointer(nodes['/579542227/275896267'], 'src', nodes['/579542227/1532094116']);
        core.setPointer(nodes['/579542227/275896267'], 'dst', nodes['/579542227/1532094116']);
        saveProject('changed pointer targets', [baseCommit], function (err, c) {
          if (err) {
            return done(err);
          }
          commitA = c;
          aRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[p4] change src and dst of connectionB', function (done) {
    core.loadRoot(baseRootHash, function (err, r) {
      if (err) {
        return done(err);
      }
      root = r;
      loadNodes([
        '/579542227/275896267'/*connection*/,
        '/579542227/651215756' /*new dst 1*/,
        '/579542227/2088994530' /*new src 2*/], function (err, nodes) {
        if (err) {
          return done(err);
        }
        core.setPointer(nodes['/579542227/275896267'], 'src', nodes['/579542227/2088994530']);
        core.setPointer(nodes['/579542227/275896267'], 'dst', nodes['/579542227/651215756']);
        saveProject('changed pointer targets', [baseCommit], function (err, c) {
          if (err) {
            return done(err);
          }
          commitB = c;
          bRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[p4] common ancestor', function (done) {
    project.getCommonAncestorCommit(commitA, commitB, function (err, bc) {
      if (err) {
        return done(new Error(err));
      }
      if (bc !== baseCommit) {
        console.warn(bc, '!=', baseCommit);
        return done(new Error('common ancestor commit mismatch'));
      }
      done();
    });
  });
  it('[p4] diff of modificationsA', function (done) {
    core.loadRoot(baseRootHash, function (err, b) {
      if (err) {
        return done(err);
      }
      core.loadRoot(aRootHash, function (err, a) {
        if (err) {
          return done(err);
        }
        core.generateTreeDiff(b, a, function (err, d) {
          if (err) {
            return done(err);
          }
          diffA = d;
          done();
        });
      });
    });
  });
  it('[p4] diff of modificationsB', function (done) {
    core.loadRoot(baseRootHash, function (err, b) {
      if (err) {
        return done(err);
      }
      core.loadRoot(bRootHash, function (err, a) {
        if (err) {
          return done(err);
        }
        core.generateTreeDiff(b, a, function (err, d) {
          if (err) {
            return done(err);
          }
          diffB = d;
          done();
        });
      });
    });
  });
  it('[p4] get conflict (2)', function () {
    conflict = core.tryToConcatChanges(diffA, diffB);
    if (conflict && conflict.items && conflict.items.length !== 2) {
      throw new Error('insufficient amount of conflicts');
    }
    var conflictPaths = [], i;
    for (i = 0; i < conflict.items.length; i++) {
      conflictPaths.push(conflict.items[i].mine.path);
    }
    if (conflictPaths.indexOf('/579542227/275896267/pointer/src') === -1 ||
      conflictPaths.indexOf('/579542227/275896267/pointer/dst') === -1) {
      throw new Error('place of conflict is wrong');
    }
  });
  it('[p4] crate final merged diff', function () {
    var conflictPaths = [], i;
    for (i = 0; i < conflict.items.length; i++) {
      conflictPaths.push(conflict.items[i].mine.path);
    }
    conflict.items[conflictPaths.indexOf('/579542227/275896267/pointer/src')].selected = 'theirs';
    mergedDiff = core.applyResolution(conflict);
  });
  it('[p4] apply merged changes', function (done) {
    core.loadRoot(baseRootHash, function (err, r) {
      if (err) {
        return done(err);
      }
      root = r;
      applyDiff(mergedDiff, function (err) {
        if (err) {
          return done(err);
        }
        saveProject('merged modifications', [commitA, commitB], function (err, c) {
          if (err) {
            return done(err);
          }
          mergedCommit = c;
          mergedRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[p4] checks the merged values of pointers', function (done) {
    core.loadRoot(mergedRootHash, function (err, r) {
      if (err) {
        return done(err);
      }
      root = r;
      core.loadByPath(root, '/579542227/275896267', function (err, node) {
        if (err) {
          return done(err);
        }
        if (core.getPointerPath(node, 'src') !== '/579542227/2088994530' ||
          core.getPointerPath(node, 'dst') !== '/579542227/1532094116') {
          return done(new Error('insufficient pointer values'));
        }
        done();
      });
    });
  });
  //change target and move it
  it('[p5] change src and dst of connectionA', function (done) {
    core.loadRoot(baseRootHash, function (err, r) {
      if (err) {
        return done(err);
      }
      root = r;
      loadNodes([
        '/579542227/275896267'/*connection*/,
        '/579542227/1532094116' /*new dst and src 3*/], function (err, nodes) {
        if (err) {
          return done(err);
        }
        core.setPointer(nodes['/579542227/275896267'], 'src', nodes['/579542227/1532094116']);
        core.setPointer(nodes['/579542227/275896267'], 'dst', nodes['/579542227/1532094116']);
        saveProject('changed pointer targets', [baseCommit], function (err, c) {
          if (err) {
            return done(err);
          }
          commitA = c;
          aRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[p5] move node \'three\'', function (done) {
    core.loadRoot(baseRootHash, function (err, r) {
      if (err) {
        return done(err);
      }
      root = r;
      loadNodes(['/579542227/1532094116', '/1786679144'], function (err, nodes) {
        if (err) {
          return done(err);
        }
        core.moveNode(nodes['/579542227/1532094116'], nodes['/1786679144']);
        saveProject('move node', [baseCommit], function (err, c) {
          if (err) {
            done(err);
          }
          commitB = c;
          bRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[p5] common ancestor', function (done) {
    project.getCommonAncestorCommit(commitA, commitB, function (err, bc) {
      if (err) {
        return done(new Error(err));
      }
      if (bc !== baseCommit) {
        console.warn(bc, '!=', baseCommit);
        return done(new Error('common ancestor commit mismatch'));
      }
      done();
    });
  });
  it('[p5] diff of modificationsA', function (done) {
    core.loadRoot(baseRootHash, function (err, b) {
      if (err) {
        return done(err);
      }
      core.loadRoot(aRootHash, function (err, a) {
        if (err) {
          return done(err);
        }
        core.generateTreeDiff(b, a, function (err, d) {
          if (err) {
            return done(err);
          }
          diffA = d;
          done();
        });
      });
    });
  });
  it('[p5] diff of modificationsB', function (done) {
    core.loadRoot(baseRootHash, function (err, b) {
      if (err) {
        return done(err);
      }
      core.loadRoot(bRootHash, function (err, a) {
        if (err) {
          return done(err);
        }
        core.generateTreeDiff(b, a, function (err, d) {
          if (err) {
            return done(err);
          }
          diffB = d;
          done();
        });
      });
    });
  });
  it('[p5] get conflict (0)', function () {
    conflict = core.tryToConcatChanges(diffA, diffB);
    if (conflict && conflict.items && conflict.items.length > 0) {
      throw new Error('there are conflicts');
    }
    mergedDiff = conflict.merge;
  });
  it('[p5] apply merged changes', function (done) {
    core.loadRoot(baseRootHash, function (err, r) {
      if (err) {
        return done(err);
      }
      root = r;
      applyDiff(mergedDiff, function (err) {
        if (err) {
          return done(err);
        }
        saveProject('merged modifications', [commitA, commitB], function (err, c) {
          if (err) {
            return done(err);
          }
          mergedCommit = c;
          mergedRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[p5] checks the merged values of pointers', function (done) {
    core.loadRoot(mergedRootHash, function (err, r) {
      if (err) {
        return done(err);
      }
      root = r;
      core.loadByPath(root, '/579542227/275896267', function (err, node) {
        if (err) {
          return done(err);
        }
        if (core.getPointerPath(node, 'src') !== '/1786679144/1532094116' ||
          core.getPointerPath(node, 'dst') !== '/1786679144/1532094116') {
          return done(new Error('insufficient pointer values'));
        }
        done();
      });
    });
  });
  //change target and move node
  it('[p6] change src and dst of connectionA', function (done) {
    core.loadRoot(baseRootHash, function (err, r) {
      if (err) {
        return done(err);
      }
      root = r;
      loadNodes([
        '/579542227/275896267'/*connection*/,
        '/579542227/1532094116' /*new dst and src 3*/], function (err, nodes) {
        if (err) {
          return done(err);
        }
        core.setPointer(nodes['/579542227/275896267'], 'src', nodes['/579542227/1532094116']);
        core.setPointer(nodes['/579542227/275896267'], 'dst', nodes['/579542227/1532094116']);
        saveProject('changed pointer targets', [baseCommit], function (err, c) {
          if (err) {
            return done(err);
          }
          commitA = c;
          aRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[p6] move connectionA', function (done) {
    core.loadRoot(baseRootHash, function (err, r) {
      if (err) {
        return done(err);
      }
      root = r;
      loadNodes(['/579542227/275896267', '/1786679144'], function (err, nodes) {
        if (err) {
          return done(err);
        }
        core.moveNode(nodes['/579542227/275896267'], nodes['/1786679144']);
        saveProject('move node', [baseCommit], function (err, c) {
          if (err) {
            done(err);
          }
          commitB = c;
          bRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[p6] common ancestor', function (done) {
    project.getCommonAncestorCommit(commitA, commitB, function (err, bc) {
      if (err) {
        return done(new Error(err));
      }
      if (bc !== baseCommit) {
        console.warn(bc, '!=', baseCommit);
        return done(new Error('common ancestor commit mismatch'));
      }
      done();
    });
  });
  it('[p6] diff of modificationsA', function (done) {
    core.loadRoot(baseRootHash, function (err, b) {
      if (err) {
        return done(err);
      }
      core.loadRoot(aRootHash, function (err, a) {
        if (err) {
          return done(err);
        }
        core.generateTreeDiff(b, a, function (err, d) {
          if (err) {
            return done(err);
          }
          diffA = d;
          done();
        });
      });
    });
  });
  it('[p6] diff of modificationsB', function (done) {
    core.loadRoot(baseRootHash, function (err, b) {
      if (err) {
        return done(err);
      }
      core.loadRoot(bRootHash, function (err, a) {
        if (err) {
          return done(err);
        }
        core.generateTreeDiff(b, a, function (err, d) {
          if (err) {
            return done(err);
          }
          diffB = d;
          done();
        });
      });
    });
  });
  it('[p6] get conflict (0)', function () {
    conflict = core.tryToConcatChanges(diffA, diffB);
    if (conflict && conflict.items && conflict.items.length > 0) {
      throw new Error('there are conflicts');
    }
    mergedDiff = conflict.merge;
  });
  it('[p6] apply merged changes', function (done) {
    core.loadRoot(baseRootHash, function (err, r) {
      if (err) {
        return done(err);
      }
      root = r;
      applyDiff(mergedDiff, function (err) {
        if (err) {
          return done(err);
        }
        saveProject('merged modifications', [commitA, commitB], function (err, c) {
          if (err) {
            return done(err);
          }
          mergedCommit = c;
          mergedRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[p6] checks the merged values of pointers', function (done) {
    core.loadRoot(mergedRootHash, function (err, r) {
      if (err) {
        return done(err);
      }
      root = r;
      core.loadByPath(root, '/1786679144/275896267', function (err, node) {
        if (err) {
          return done(err);
        }
        if (core.getPointerPath(node, 'src') !== '/579542227/1532094116' ||
          core.getPointerPath(node, 'dst') !== '/579542227/1532094116') {
          return done(new Error('insufficient pointer values'));
        }
        done();
      });
    });
  });
  //remove target and delete target
  it('[p7] delete src and dst of connectionA', function (done) {
    core.loadRoot(baseRootHash, function (err, r) {
      if (err) {
        return done(err);
      }
      root = r;
      loadNodes([
        '/579542227/275896267'/*connection*/], function (err, nodes) {
        if (err) {
          return done(err);
        }
        core.deletePointer(nodes['/579542227/275896267'], 'src');
        core.deletePointer(nodes['/579542227/275896267'], 'dst');
        saveProject('changed pointer targets', [baseCommit], function (err, c) {
          if (err) {
            return done(err);
          }
          commitA = c;
          aRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[p7] delete node \'one\'',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      root = r;
      core.loadByPath(root,'/579542227/651215756',function(err,node){
        if(err){
          return done(err);
        }
        core.deleteNode(node);
        saveProject('node removed',[baseCommit],function(err,c){
          if(err){
            return done(err);
          }
          commitB = c;
          bRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[p7] common ancestor', function (done) {
    project.getCommonAncestorCommit(commitA, commitB, function (err, bc) {
      if (err) {
        return done(new Error(err));
      }
      if (bc !== baseCommit) {
        console.warn(bc, '!=', baseCommit);
        return done(new Error('common ancestor commit mismatch'));
      }
      done();
    });
  });
  it('[p7] diff of modificationsA', function (done) {
    core.loadRoot(baseRootHash, function (err, b) {
      if (err) {
        return done(err);
      }
      core.loadRoot(aRootHash, function (err, a) {
        if (err) {
          return done(err);
        }
        core.generateTreeDiff(b, a, function (err, d) {
          if (err) {
            return done(err);
          }
          diffA = d;
          done();
        });
      });
    });
  });
  it('[p7] diff of modificationsB', function (done) {
    core.loadRoot(baseRootHash, function (err, b) {
      if (err) {
        return done(err);
      }
      core.loadRoot(bRootHash, function (err, a) {
        if (err) {
          return done(err);
        }
        core.generateTreeDiff(b, a, function (err, d) {
          if (err) {
            return done(err);
          }
          diffB = d;
          done();
        });
      });
    });
  });
  it('[p7] get conflict (0)', function () {
    conflict = core.tryToConcatChanges(diffA, diffB);
    if (conflict && conflict.items && conflict.items.length > 0) {
      throw new Error('there are conflicts');
    }
    mergedDiff = conflict.merge;
  });
  it('[p7] apply merged changes', function (done) {
    core.loadRoot(baseRootHash, function (err, r) {
      if (err) {
        return done(err);
      }
      root = r;
      applyDiff(mergedDiff, function (err) {
        if (err) {
          return done(err);
        }
        saveProject('merged modifications', [commitA, commitB], function (err, c) {
          if (err) {
            return done(err);
          }
          mergedCommit = c;
          mergedRootHash = core.getHash(root);
          done();
        });
      });
    });
  });
  it('[p7] checks the merged values of pointers',function(done){
    core.loadRoot(mergedRootHash,function(err,r){
      if(err){
        return done(err);
      }
      root = r;
      core.loadByPath(root,'/579542227/275896267',function(err,node){
        if(err){
          return done(err);
        }
        if(core.getPointerPath(node,'src') !== null ||
        core.getPointerPath(node,'dst') !== null){
          return done(new Error('wrong pointer targets'));
        }
        done();
      });
    });
  });
});
describe('Core#Merge#Post',function(){
  it('should remove the test project',function(done){
    deleteProject(done);
  });
  it('should close the database connection',function(done){
    storage.closeDatabase(done);
  });
});