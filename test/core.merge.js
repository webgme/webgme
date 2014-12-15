/**
 * Created by tamas on 12/13/14.
 */
var WebGME = require('../webgme'),
  FS = require('fs'),
  storage = new WebGME.serverUserStorage({host:'127.0.0.1',port:27017,database:'multi'});

//global helping functions and globally used variables
var emptyCommit = null,
  baseCommit = null,
  projectName = 'test_core_merge_'+new Date().getTime(),
  project = null,
  commit = '',
  root = null,
  rootHash = '',
  core = null,
  branch = 'master',
  jsonData = null;

function saveProject(txt,next){
  core.persist(root, function (err) {
    if (err) {
      return next(err);
    }

    commit = project.makeCommit([commit], core.getHash(root), txt, function (err) {
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
        saveProject('test initial import',next);
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
    console.log(commit,rootHash);
    storage.openDatabase(done);
  });
  it('should import an empty state machine project', function (done) {
    console.log(commit,rootHash);
    if(!loadJsonData('./test/asset/sm_basic.json')){
      return done(new Error('unable to load project file'));
    }
    importProject(jsonData,
      function (err, c){
        if (err) {
          return done(err);
        }
        emptyCommit = c;
        commit = c;
        rootHash = core.getHash(root);
        done();
      });
  });
  it('should patch the basic content of the project',function(done){
    console.log(commit,rootHash);
    if(!loadJsonData('./test/asset/sm_basic_empty_to_base.json')){
      return done(new Error('unable to load diff file'));
    }
    core.loadRoot(rootHash,function(err,r){
      if(err){
        return done(err);
      }
      root = r;
      applyDiff(jsonData,function(err){
        if(err){
          return done(err);
        }

        saveProject('basic project contents',function(err,c){
          if(err){
            return done(err);
          }
          baseCommit = c;
          commit = c;
          rootHash = core.getHash(root);
          done();
        });
      });
    });
  });
});
describe('Core#Merge#Attribute',function(){
  var baseRootHash,aRootHash,bRootHash,
    commitA,commitB,diffA,diffB;
  it('should change attribute of node \'one\'',function(done){
    console.log(commit,rootHash);
    baseRootHash = core.getHash(root);
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

        saveProject('modificationsA',function(err,c){
          aRootHash = core.getHash(root);
          commitA = c;
          done(err);
        });
      });
    });
  });
  it('should change attribute of node \'two\'',function(done){
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
              "priority": "2"
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
        saveProject('modificationsB',function(err,c){
          bRootHash = core.getHash(root);
          commitB = c;
          done(err);
        });
      });
    });
  });
  it('should return the base commit as a common ancestor commit',function(done){
    project.getCommonAncestorCommit(commitA,commitB,function(err,bc){
      if(err){
        return done(err);
      }
      if(bc !== baseCommit){
        console.log(bc,'!=',baseCommit);
        return done(new Error('common ancestor commit mismatch'));
      }
      done();
    });
  });
  it('should generate diff of modificationsA',function(done){
    core.loadRoot(baseRootHash,function(err,b){
      console.log('base loaded',core.getHash(b));
      if(err){
        return done(err);
      }
      core.loadRoot(aRootHash,function(err,a){
        console.log('modA loaded',core.getHash(a));
        if(err){
          return done(err);
        }
        core.generateTreeDiff(b,a,function(err,d){
          console.log('diff ready',err,d);
          if(err){
            return done(err);
          }
          diffA = d;
          done();
        });
      });
    });
  });
});
/*describe('Core#Merge#Post',function(){
  it('should remove the test project',function(done){
    deleteProject(done);
  });
  it('should close the database connection',function(done){
    storage.closeDatabase(done);
  });
});*/