/**
 * Created by tamas on 12/13/14.
 */
/* globals global, require, WebGME, describe, it, before, after */
require('../../_globals.js');
var FS = require('fs'),
    should = require('chai').should(),
    storage = new global.Storage();

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

describe('corediff',function(){
    describe('merge',function(){
        var project,core,root,commit,baseCommitHash,baseRootHash,
            applyChange= function(changeObject,next){
                core.applyTreeDiff(root,changeObject.diff,function(err){
                    if(err){
                        next(err);
                        return;
                    }
                    core.persist(root,function(err){
                        if(err){
                            next(err);
                            return;
                        }
                        changeObject.rootHash = core.getHash(root);
                        changeObject.root = root;
                        changeObject.commitHash = project.makeCommit([baseCommitHash],changeObject.rootHash,'apply change fininshed '+new Date().getTime(),function(err){
                            //we ignore this
                        });
                        //we restore the root object
                        core.loadRoot(baseRootHash,function(err,r){
                            if(err){
                                next(err);
                                return;
                            }
                            root = r;
                            next();
                        });
                    });
                });
            };
        before(function(done) {
            //creating the base project
            storage.openDatabase(function (err) {
                if (err) {
                    done(err);
                    return;
                }
                storage.openProject('corediffMergeTesting', function(err, p){
                    var jsonProject;
                    if (err) {
                        done(err);
                        return;
                    }
                    project = p;
                    try {
                        jsonProject = JSON.parse(FS.readFileSync('./test/asset/sm_basic_basic.json', 'utf8'));
                    } catch (err) {
                        done(err);
                        return;
                    }

                    core = new WebGME.core(project);
                    root = core.createNode();

                    WebGME.serializer.import(core, root, jsonProject, function (err, log) {
                        if (err) {
                            done(err);
                            return;
                        }

                        core.persist(root, function (err) {
                            if (err) {
                                return next(err);
                            }

                            commit = project.makeCommit([], core.getHash(root), 'initial project import', function (err) {
                                //ignore it
                            });
                            if (err) {
                                done(err);
                                return;
                            }
                            baseCommitHash = commit;
                            baseRootHash = core.getHash(root);
                            done();
                        });
                    });
                });
            });
        });
        after(function(done){
            storage.deleteProject('corediffMergeTesting',function(err){
                if(err){
                    done(err);
                    return;
                }
                storage.closeDatabase(done);
            });
        });
        beforeEach(function(done){
            //load the base state and sets the
            core.loadRoot(baseRootHash,function(err,r){
                if(err){
                    done(err);
                    return;
                }
                root = r;
                done();
            });
        });
        describe('attribute',function(){
            it('initial value check',function(done){
                core.loadByPath(root,'/579542227/651215756',function(err,a){
                    if(err){
                        done(err);
                        return;
                    }
                    core.getAttribute(a,'priority').should.be.equal(100);
                    core.loadByPath(root,'/579542227/2088994530',function(err,a) {
                        if(err){
                            done(err);
                            return;
                        }
                        core.getAttribute(a,'priority').should.be.equal(100);
                        done();
                    });
                });
            });

            it('changing separate attributes',function(done){
                var changeA={},changeB={};
                changeA.diff = {
                    '579542227':{
                        '651215756':{
                            'attr':{
                                'priority':2
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                changeB.diff = {
                    '579542227': {
                        '2088994530': {
                            'attr': {
                                'priority': 2
                            },
                            'guid': '32e4adfc-deac-43ae-2504-3563b9d58b97'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                applyChange(changeA,function(err){
                    if(err){
                        done(err);
                        return;
                    }
                    applyChange(changeB,function(err){
                        if(err){
                            done(err);
                            return;
                        }
                        project.getCommonAncestorCommit(changeA.commitHash,changeB.commitHash,function(err,hash){
                            if(err){
                                done(err);
                                return;
                            }
                            hash.should.be.equal(baseCommitHash);

                            //generate diffs
                            core.generateTreeDiff(root,changeA.root,function(err,diff){
                                if(err){
                                    done(err);
                                    return;
                                }
                                diff[579542227][651215756].attr.priority.should.be.equal(2);
                                changeA.computedDiff = diff;
                                core.generateTreeDiff(root,changeB.root,function(err,diff){
                                    if(err){
                                        done(err);
                                        return;
                                    }
                                    diff[579542227][2088994530].attr.priority.should.be.equal(2);
                                    changeB.computedDiff = diff;
                                    var conflict = core.tryToConcatChanges(changeA.computedDiff,changeB.computedDiff);
                                    conflict.items.should.be.empty();

                                    //apply merged diff to base
                                    var merged = {diff:conflict.merge};
                                    applyChange(merged,function(err){
                                        if(err){
                                            done(err);
                                            return;
                                        }

                                        //check values
                                        core.loadByPath(merged.root,'/579542227/651215756',function(err,a){
                                            core.getAttribute(a,'priority').should.be.equal(2);
                                            core.loadByPath(merged.root,'/579542227/2088994530',function(err,a){
                                                core.getAttribute(a,'priority').should.be.equal(2);
                                                done();
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
            it('changing to the same value',function(done){
                var changeA={},changeB={};
                changeA.diff = {
                    '579542227':{
                        '651215756':{
                            'attr':{
                                'priority':2
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                changeB.diff = {
                    '579542227':{
                        '651215756':{
                            'attr':{
                                'priority':2
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                applyChange(changeA,function(err){
                    if(err){
                        done(err);
                        return;
                    }
                    applyChange(changeB,function(err){
                        if(err){
                            done(err);
                            return;
                        }
                        project.getCommonAncestorCommit(changeA.commitHash,changeB.commitHash,function(err,hash){
                            if(err){
                                done(err);
                                return;
                            }
                            hash.should.be.equal(baseCommitHash);

                            //generate diffs
                            core.generateTreeDiff(root,changeA.root,function(err,diff){
                                if(err){
                                    done(err);
                                    return;
                                }
                                diff[579542227][651215756].attr.priority.should.be.equal(2);
                                changeA.computedDiff = diff;
                                core.generateTreeDiff(root,changeB.root,function(err,diff){
                                    if(err){
                                        done(err);
                                        return;
                                    }
                                    diff[579542227][651215756].attr.priority.should.be.equal(2);
                                    changeB.computedDiff = diff;
                                    var conflict = core.tryToConcatChanges(changeA.computedDiff,changeB.computedDiff);
                                    conflict.items.should.be.empty();

                                    //apply merged diff to base
                                    var merged = {diff:conflict.merge};
                                    applyChange(merged,function(err){
                                        if(err){
                                            done(err);
                                            return;
                                        }

                                        //check values
                                        core.loadByPath(merged.root,'/579542227/651215756',function(err,a){
                                            core.getAttribute(a,'priority').should.be.equal(2);
                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
            it('changing to different values',function(done){
                var changeA={},changeB={};
                changeA.diff = {
                    '579542227':{
                        '651215756':{
                            'attr':{
                                'priority':2
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                changeB.diff = {
                    '579542227':{
                        '651215756':{
                            'attr':{
                                'priority':3
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                applyChange(changeA,function(err){
                    if(err){
                        done(err);
                        return;
                    }
                    applyChange(changeB,function(err){
                        if(err){
                            done(err);
                            return;
                        }
                        project.getCommonAncestorCommit(changeA.commitHash,changeB.commitHash,function(err,hash){
                            if(err){
                                done(err);
                                return;
                            }
                            hash.should.be.equal(baseCommitHash);

                            //generate diffs
                            core.generateTreeDiff(root,changeA.root,function(err,diff){
                                if(err){
                                    done(err);
                                    return;
                                }
                                diff[579542227][651215756].attr.priority.should.be.equal(2);
                                changeA.computedDiff = diff;
                                core.generateTreeDiff(root,changeB.root,function(err,diff){
                                    if(err){
                                        done(err);
                                        return;
                                    }
                                    diff[579542227][651215756].attr.priority.should.be.equal(3);
                                    changeB.computedDiff = diff;
                                    var conflict = core.tryToConcatChanges(changeA.computedDiff,changeB.computedDiff);
                                    conflict.items.should.have.length(1);

                                    //get final apply
                                    conflict.items[0].selected = 'theirs';
                                    var merged = {diff:core.applyResolution(conflict)};
                                    applyChange(merged,function(err){
                                        if(err){
                                            done(err);
                                            return;
                                        }

                                        //check values
                                        core.loadByPath(merged.root,'/579542227/651215756',function(err,a){
                                            core.getAttribute(a,'priority').should.be.equal(3);
                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
            it('changing and moving the node parallel',function(done){
                var changeA={},changeB={};
                changeA.diff = {
                    '579542227':{
                        '651215756':{
                            'attr':{
                                'priority':2
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'attr':{
                        'changeA':true
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                changeB.diff = {
                    '1786679144':{
                        '651215756':{
                            'movedFrom':'/579542227/651215756',
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        guid:'8b636e17-3e94-e0c6-2678-1a24ee5e6ae7',
                    },
                    'attr':{
                        'changeB':true
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                applyChange(changeA,function(err){
                    if(err){
                        done(err);
                        return;
                    }
                    core.getAttribute(changeA.root,'changeA').should.be.true();
                    (core.getAttribute(root,'changeA') === undefined).should.be.true();
                    (core.getAttribute(root,'changeB') === undefined).should.be.true();
                    applyChange(changeB,function(err){
                        if(err){
                            done(err);
                            return;
                        }
                        core.getAttribute(changeB.root,'changeB').should.be.true();
                        (core.getAttribute(root,'changeA') === undefined).should.be.true();
                        (core.getAttribute(root,'changeB') === undefined).should.be.true();
                        project.getCommonAncestorCommit(changeA.commitHash,changeB.commitHash,function(err,hash){
                            if(err){
                                done(err);
                                return;
                            }
                            (core.getAttribute(root,'changeA') === undefined).should.be.true();
                            (core.getAttribute(root,'changeB') === undefined).should.be.true();
                            hash.should.be.equal(baseCommitHash);

                            //generate diffs
                            core.generateTreeDiff(root,changeA.root,function(err,diff){
                                (core.getAttribute(root,'changeA') === undefined).should.be.true();
                                (core.getAttribute(root,'changeB') === undefined).should.be.true();
                                if(err){
                                    done(err);
                                    return;
                                }
                                diff[579542227][651215756].attr.priority.should.be.equal(2);
                                changeA.computedDiff = diff;
                                core.generateTreeDiff(root,changeB.root,function(err,diff){
                                    if(err){
                                        done(err);
                                        return;
                                    }
                                    diff[1786679144][651215756].movedFrom.should.be.exist();
                                    changeB.computedDiff = diff;
                                    var conflict = core.tryToConcatChanges(changeA.computedDiff,changeB.computedDiff);
                                    conflict.items.should.be.empty();

                                    //apply merged diff to base
                                    var merged = {diff:conflict.merge};
                                    applyChange(merged,function(err){
                                        if(err){
                                            done(err);
                                            return;
                                        }

                                        //check values
                                        core.loadByPath(merged.root,'/1786679144/651215756',function(err,a){
                                            core.getAttribute(a,'priority').should.be.equal(2);
                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
        describe('registry',function(){
            it('initial value check',function(done){
                core.loadByPath(root,'/579542227/651215756',function(err,a){
                    if(err){
                        done(err);
                        return;
                    }
                    core.getRegistry(a,'position').x.should.be.equal(69);
                    core.getRegistry(a,'position').y.should.be.equal(276);

                    core.loadByPath(root,'/579542227/2088994530',function(err,a){
                        if(err){
                            done(err);
                            return;
                        }
                        core.getRegistry(a,'position').x.should.be.equal(243);
                        core.getRegistry(a,'position').y.should.be.equal(184);
                        done();
                    });
                });
            });
            it('changing separate nodes',function(done){
                var changeA={},changeB={};
                changeA.diff = {
                    '579542227':{
                        '651215756':{
                            'reg':{
                                'position':{'x':200,'y':200}
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                changeB.diff = {
                    '579542227': {
                        '2088994530': {
                            'reg':{
                                'position':{'x':300,'y':300}
                            },
                            'guid': '32e4adfc-deac-43ae-2504-3563b9d58b97'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                applyChange(changeA,function(err){
                    if(err){
                        done(err);
                        return;
                    }
                    applyChange(changeB,function(err){
                        if(err){
                            done(err);
                            return;
                        }
                        project.getCommonAncestorCommit(changeA.commitHash,changeB.commitHash,function(err,hash){
                            if(err){
                                done(err);
                                return;
                            }
                            hash.should.be.equal(baseCommitHash);

                            //generate diffs
                            core.generateTreeDiff(root,changeA.root,function(err,diff){
                                if(err){
                                    done(err);
                                    return;
                                }
                                diff[579542227][651215756].reg.position.x.should.be.equal(200);
                                diff[579542227][651215756].reg.position.y.should.be.equal(200);
                                changeA.computedDiff = diff;
                                core.generateTreeDiff(root,changeB.root,function(err,diff){
                                    if(err){
                                        done(err);
                                        return;
                                    }
                                    diff[579542227][2088994530].reg.position.x.should.be.equal(300);
                                    diff[579542227][2088994530].reg.position.y.should.be.equal(300);
                                    changeB.computedDiff = diff;
                                    var conflict = core.tryToConcatChanges(changeA.computedDiff,changeB.computedDiff);
                                    conflict.items.should.be.empty();

                                    //apply merged diff to base
                                    var merged = {diff:conflict.merge};
                                    applyChange(merged,function(err){
                                        if(err){
                                            done(err);
                                            return;
                                        }

                                        //check values
                                        core.loadByPath(merged.root,'/579542227/651215756',function(err,a){
                                            core.getRegistry(a,'position').x.should.be.equal(200);
                                            core.getRegistry(a,'position').y.should.be.equal(200);
                                            core.loadByPath(merged.root,'/579542227/2088994530',function(err,a){
                                                core.getRegistry(a,'position').x.should.be.equal(300);
                                                core.getRegistry(a,'position').y.should.be.equal(300);
                                                done();
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
            it('changing to the same value',function(done){
                var changeA={},changeB={};
                changeA.diff = {
                    '579542227':{
                        '651215756':{
                            'reg':{
                                'position':{'x':200,'y':200}
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                changeB.diff = {
                    '579542227':{
                        '651215756':{
                            'reg':{
                                'position':{'x':200,'y':200}
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                applyChange(changeA,function(err){
                    if(err){
                        done(err);
                        return;
                    }
                    applyChange(changeB,function(err){
                        if(err){
                            done(err);
                            return;
                        }
                        project.getCommonAncestorCommit(changeA.commitHash,changeB.commitHash,function(err,hash){
                            if(err){
                                done(err);
                                return;
                            }
                            hash.should.be.equal(baseCommitHash);

                            //generate diffs
                            core.generateTreeDiff(root,changeA.root,function(err,diff){
                                if(err){
                                    done(err);
                                    return;
                                }
                                diff[579542227][651215756].reg.position.x.should.be.equal(200);
                                diff[579542227][651215756].reg.position.y.should.be.equal(200);
                                changeA.computedDiff = diff;
                                core.generateTreeDiff(root,changeB.root,function(err,diff){
                                    if(err){
                                        done(err);
                                        return;
                                    }
                                    diff[579542227][651215756].reg.position.x.should.be.equal(200);
                                    diff[579542227][651215756].reg.position.y.should.be.equal(200);
                                    changeB.computedDiff = diff;
                                    var conflict = core.tryToConcatChanges(changeA.computedDiff,changeB.computedDiff);
                                    conflict.items.should.be.empty();

                                    //apply merged diff to base
                                    var merged = {diff:conflict.merge};
                                    applyChange(merged,function(err){
                                        if(err){
                                            done(err);
                                            return;
                                        }

                                        //check values
                                        core.loadByPath(merged.root,'/579542227/651215756',function(err,a){
                                            core.getRegistry(a,'position').x.should.be.equal(200);
                                            core.getRegistry(a,'position').y.should.be.equal(200);
                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
            it('changing to different values',function(done){
                var changeA={},changeB={};
                changeA.diff = {
                    '579542227':{
                        '651215756':{
                            'reg':{
                                'position':{'x':200,'y':200}
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                changeB.diff = {
                    '579542227':{
                        '651215756':{
                            'reg':{
                                'position':{'x':300,'y':300}
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                applyChange(changeA,function(err){
                    if(err){
                        done(err);
                        return;
                    }
                    applyChange(changeB,function(err){
                        if(err){
                            done(err);
                            return;
                        }
                        project.getCommonAncestorCommit(changeA.commitHash,changeB.commitHash,function(err,hash){
                            if(err){
                                done(err);
                                return;
                            }
                            hash.should.be.equal(baseCommitHash);

                            //generate diffs
                            core.generateTreeDiff(root,changeA.root,function(err,diff){
                                if(err){
                                    done(err);
                                    return;
                                }
                                diff[579542227][651215756].reg.position.x.should.be.equal(200);
                                diff[579542227][651215756].reg.position.y.should.be.equal(200);
                                changeA.computedDiff = diff;
                                core.generateTreeDiff(root,changeB.root,function(err,diff){
                                    if(err){
                                        done(err);
                                        return;
                                    }
                                    diff[579542227][651215756].reg.position.x.should.be.equal(300);
                                    diff[579542227][651215756].reg.position.y.should.be.equal(300);
                                    changeB.computedDiff = diff;
                                    var conflict = core.tryToConcatChanges(changeA.computedDiff,changeB.computedDiff);
                                    conflict.items.should.have.length(1);

                                    //apply merged diff to base
                                    conflict.items[0].selected = 'theirs';
                                    var merged = {diff:core.applyResolution(conflict)};
                                    applyChange(merged,function(err){
                                        if(err){
                                            done(err);
                                            return;
                                        }

                                        //check values
                                        core.loadByPath(merged.root,'/579542227/651215756',function(err,a){
                                            core.getRegistry(a,'position').x.should.be.equal(300);
                                            core.getRegistry(a,'position').y.should.be.equal(300);
                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
            it('changing and moving the node parallel',function(done){
                var changeA={},changeB={};
                changeA.diff = {
                    '579542227':{
                        '651215756':{
                            'reg':{
                                'position':{'x':200,'y':200}
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                changeB.diff = {
                    '1786679144':{
                        '651215756':{
                            'movedFrom':'/579542227/651215756',
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        guid:'8b636e17-3e94-e0c6-2678-1a24ee5e6ae7',
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                applyChange(changeA,function(err){
                    if(err){
                        done(err);
                        return;
                    }
                    applyChange(changeB,function(err){
                        if(err){
                            done(err);
                            return;
                        }
                        project.getCommonAncestorCommit(changeA.commitHash,changeB.commitHash,function(err,hash){
                            if(err){
                                done(err);
                                return;
                            }
                            hash.should.be.equal(baseCommitHash);

                            //generate diffs
                            core.generateTreeDiff(root,changeA.root,function(err,diff){
                                if(err){
                                    done(err);
                                    return;
                                }
                                diff[579542227][651215756].reg.position.x.should.be.equal(200);
                                diff[579542227][651215756].reg.position.y.should.be.equal(200);
                                changeA.computedDiff = diff;
                                core.generateTreeDiff(root,changeB.root,function(err,diff){
                                    if(err){
                                        done(err);
                                        return;
                                    }
                                    diff[1786679144][651215756].movedFrom.should.be.exist();
                                    changeB.computedDiff = diff;
                                    var conflict = core.tryToConcatChanges(changeA.computedDiff,changeB.computedDiff);
                                    conflict.items.should.be.empty();

                                    //apply merged diff to base
                                    var merged = {diff:conflict.merge};
                                    applyChange(merged,function(err){
                                        if(err){
                                            done(err);
                                            return;
                                        }

                                        //check values
                                        core.loadByPath(merged.root,'/1786679144/651215756',function(err,a){
                                            core.getRegistry(a,'position').x.should.be.equal(200);
                                            core.getRegistry(a,'position').y.should.be.equal(200);
                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});
//TODO pointer tests should be reintroduced
/*

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
        '/579542227/275896267',
        '/579542227/1532094116' ], function (err, nodes) {
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
        '/579542227/684921282',
        '/579542227/651215756'], function (err, nodes) {
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
        '/579542227/275896267',
        '/579542227/1532094116' ], function (err, nodes) {
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
        '/579542227/275896267',
        '/579542227/1532094116' ], function (err, nodes) {
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
        '/579542227/275896267',
        '/579542227/1532094116' ], function (err, nodes) {
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
        '/579542227/275896267',
        '/579542227/651215756',
        '/579542227/2088994530'], function (err, nodes) {
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
        '/579542227/275896267',
        '/579542227/1532094116' ], function (err, nodes) {
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
        '/579542227/275896267',
        '/579542227/1532094116' ], function (err, nodes) {
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
        '/579542227/275896267'], function (err, nodes) {
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
*/