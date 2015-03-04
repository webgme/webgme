/**
 * Created by tkecskes on 12/17/2014.
 */
require('./../_globals.js');

describe('issue110 testing',function(){
    var FS = require('fs'),
        storage = new global.Storage();

//global helping functions and globally used variables
    var baseCommit = null,
        projectName = 'test_issue_'+new Date().getTime(),
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

                core = new global.WebGME.core(p);
                project = p;
                root = core.createNode();

                global.WebGME.serializer.import(core, root, projectJson, function (err, log) {
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

  it('should open the database connection', function (done) {
    storage.openDatabase(done);
  });
  it('import the problematic project',function(done){
    loadJsonData('./test/issue/110/input.json');
    if(jsonData === null){
      return done(new Error('unable to load project file'));
    }
    importProject(jsonData,function(err,c){
      if(err){
        return done(err);
      }

      commit = c;
      baseCommit = c;
      rootHash = core.getHash(root);
      done();
    });
  });
  it('checks the ownJsonMeta of node \'specialTransition\'',function(done){
    core.loadRoot(rootHash,function(err,r){
      if(err){
        return done(err);
      }
      root = r;
      core.loadByPath(root,'/1402711366/1821421774',function(err,node){
        if(err){
          return done(err);
        }
        if(core.getOwnJsonMeta(node).pointers.src.items.constructor !== Array){
          return done(new Error('items field of pointer should be an array'));
        }
        done();
      });
    });
  });
  it('checks the ownJsonMeta of node \'specialState\'',function(done){
    core.loadRoot(rootHash,function(err,r){
      if(err){
        return done(err);
      }
      root = r;
      core.loadByPath(root,'/1402711366/1021878489',function(err,node){
        if(err){
          return done(err);
        }
        if(core.getOwnJsonMeta(node).aspects.asp.constructor !== Array){
          return done(new Error('items field of pointer should be an array'));
        }
        done();
      });
    });
  });
  it('removes the project',function(done){
    storage.deleteProject(projectName,done);
  });
  it('closes the database',function(done){
    storage.closeDatabase(done);
  });
});