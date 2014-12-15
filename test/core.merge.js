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
  it('check original attribute values',function(done){
    baseRootHash = core.getHash(root);
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
  it('node \'one\' priority => 2',function(done){
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
  it('node \'two\' priority => 2',function(done){
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
  it('common ancestor',function(done){
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
  it('diff of modificationsA',function(done){
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
  it('diff of modificationsB',function(done){
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
  it('get conflict (0)',function(){
    conflict = core.tryToConcatChanges(diffA,diffB);
    if(conflict && conflict.items && conflict.items.length > 0){
      throw new Error('there are conflicts');
    }
    mergedDiff = conflict.merge;
  });
  it('apply merged changes',function(done){
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
  it('check changes',function(done){
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
  it('node \'one\' priority => 2',function(done){
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
  it('node \'one\' priority => 2',function(done){
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
  it('common ancestor',function(done){
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
  it('diff of modificationsA',function(done){
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
  it('diff of modificationsB',function(done){
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
  it('get conflict (0)',function(){
    conflict = core.tryToConcatChanges(diffA,diffB);
    if(conflict && conflict.items && conflict.items.length > 0){
      throw new Error('there are conflicts');
    }
    mergedDiff = conflict.merge;
  });
  it('apply merged changes',function(done){
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
  it('check changes',function(done){
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
  it('node \'one\' priority => 2',function(done){
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
  it('node \'one\' priority => 3',function(done){
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
  it('common ancestor',function(done){
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
  it('diff of modificationsA',function(done){
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
  it('diff of modificationsB',function(done){
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
  it('get conflict (1)',function(){
    conflict = core.tryToConcatChanges(diffA,diffB);
    if(conflict && conflict.items && conflict.items.length !== 1){
      throw new Error('insufficient amount of conflicts');
    }
  });
  it('crate final merged diff',function(){
    console.log(conflict);
    conflict.items[0].selected = 'theirs';
    mergedDiff = core.applyResolution(conflict);
  });
  it('apply merged changes',function(done){
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
  it('check changes',function(done){
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
  it('node \'one\' priority => 2',function(done){
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
  it('move node \'one\'',function(done){
    core.loadRoot(baseRootHash,function(err,r){
      if(err){
        return done(err);
      }
      commit = baseCommit;
      root = r;
      applyDiff({
        "579542227":{
          "childrenListChanged": true,
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
        },
        "1786679144":{
          "651215756":{
            "guid": "ed1a1ef7-7eb3-af75-11a8-7994220003e6",
            "oGuids": {
              "ed1a1ef7-7eb3-af75-11a8-7994220003e6": true,
              "8b636e17-3e94-e0c6-2678-1a24ee5e6ae7": true,
              "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
              "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true,
              "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
              "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
            },
            "movedFrom": "/579542227/651215756",
            "ooGuids": {
              "ed1a1ef7-7eb3-af75-11a8-7994220003e6": true,
              "3637e2ee-0d4b-15b1-52c6-4d1248e67ea3": true,
              "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
              "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true,
              "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
              "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
            }
          },
          "childrenListChanged": true,
          "guid": "8b636e17-3e94-e0c6-2678-1a24ee5e6ae7",
          "oGuids": {
            "8b636e17-3e94-e0c6-2678-1a24ee5e6ae7": true,
            "e687d284-a04a-7cbc-93ed-ea941752d57a": true,
            "ef6d34f0-e1b2-f134-0fa1-d642815d0afa": true,
            "8f6f4417-55b5-bf91-e4d6-447f6ced13e6": true,
            "cd891e7b-e2ea-e929-f6cd-9faf4f1fc045": true
          }
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
  it('common ancestor',function(done){
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
  it('diff of modificationsA',function(done){
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
  it('diff of modificationsB',function(done){
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
  it('get conflict (0)',function(){
    conflict = core.tryToConcatChanges(diffA,diffB);
    if(conflict && conflict.items && conflict.items.length > 0 ){
      throw new Error('there are conflicts');
    }
    console.log(conflict.merge);
    mergedDiff = conflict.merge;
  });
  it('apply merged changes',function(done){
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
  it('check changes',function(done){
    core.loadRoot(mergedRootHash,function(err,r){
      var needed = 1,error = null;
      if(err){
        return done(err);
      }
      root = r;
      core.loadByPath(r,'/1786679144/651215756',function(err,a){
        error = error || err;
        if(!err && core.getAttribute(a,'priority')!==100){
          error = error || new Error('value of modification is wrong');
        }
        if(--needed === 0){
          done(error);
        }
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