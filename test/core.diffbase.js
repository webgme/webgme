/**
 * Created by tamas on 12/29/14.
 */
var WebGME = require('../webgme'),
  FS = require('fs'),
  storage = new WebGME.serverUserStorage({host:'127.0.0.1',port:27017,database:'multi'});

//global helping functions and globally used variables
var baseCommit = null,
  projectName = 'test_core_diffbase_'+new Date().getTime(),
  project = null,
  commit = '',
  root = null,
  rootHash = '',
  core = null,
  branch = 'master',
  jsonData = null;

describe('Core#Diff#CommonBase',function(){
  var commitChain = [];
  it('opens the database',function(done){
    storage.openDatabase(function(err){
      if(err){
        return done(err);
      }
      done();
    });
  });
  it('creates an empty project',function(done){
     storage.openProject(projectName,function(err,p){
       if(err){
         return done(err);
       }
       project = p;
       done();
     });
  });
  it('should create a simple commit chain and check the common ancestor of different commits on it',function(done){
    var amount = 1000,
      needed = amount,
      ancestors = [],i,error = null;
    for(i=0;i<amount;i++){
      commitChain.push(project.makeCommit(ancestors,"#roothash","_"+i+"_",function(err){
        error = error || err;
        if(--needed === 0){
          done(error);
        }
      }));
      ancestors = [commitChain[commitChain.length-1]];
    }
  });
  it('single chain 0 vs 1',function(done){
    project.getCommonAncestorCommit(commitChain[0],commitChain[1],function(err,c){
      if(err){
        return done(new Error(err));
      }

      if(c !== commitChain[0]){
        done(new Error('expected: '+commitChain[0]+', got: '+c));
      }
      done();
    });
  });
  it('single chain 1 vs 0',function(done){
    project.getCommonAncestorCommit(commitChain[1],commitChain[0],function(err,c){
      if(err){
        return done(new Error(err));
      }

      if(c !== commitChain[0]){
        done(new Error('expected: '+commitChain[0]+', got: '+c));
      }
      done();
    });
  });
  it('single chain 1 vs 1',function(done){
    project.getCommonAncestorCommit(commitChain[1],commitChain[1],function(err,c){
      if(err){
        return done(new Error(err));
      }

      if(c !== commitChain[1]){
        done(new Error('expected: '+commitChain[1]+', got: '+c));
      }
      done();
    });
  });
  it('single chain 0 vs 999',function(done){
    project.getCommonAncestorCommit(commitChain[0],commitChain[999],function(err,c){
      if(err){
        return done(new Error(err));
      }

      if(c !== commitChain[0]){
        done(new Error('expected: '+commitChain[0]+', got: '+c));
      }
      done();
    });
  });
  it('creates a more complex commit chain',function(done){
    //           o -- o           8,9
    //          /      \
    //         o        o         7,12
    //        / \      /
    //       /   o -- o           10,11
    // o -- o -- o -- o -- o -- o 1,2,3,4,5,6

    var error = null,needed = 12,addCommit = function(ancestors){
      commitChain.push(project.makeCommit(ancestors,"#roothash","_commit_",function(err){
        error = error || err;
        if(--needed === 0){
          done(error);
        }
      }));
    };
    commitChain = [];
    addCommit([]);
    addCommit([commitChain[0]]);
    addCommit([commitChain[1]]);
    addCommit([commitChain[2]]);
    addCommit([commitChain[3]]);
    addCommit([commitChain[4]]);
    addCommit([commitChain[5]]);
    addCommit([commitChain[2]]);
    addCommit([commitChain[7]]);
    addCommit([commitChain[8]]);
    addCommit([commitChain[7]]);
    addCommit([commitChain[10]]);
    addCommit([commitChain[9],commitChain[11]]);
  });
  it('12 vs 6 -> 2',function(done){
    project.getCommonAncestorCommit(commitChain[12],commitChain[6],function(err,c){
      if(err){
        return done(err);
      }
      if(c !== commitChain[2]){
        done(new Error('expected: '+commitChain[2]+', got: '+c));
      }
      done();
    });
  });
  it('9 vs 11 -> 7',function(done){
    project.getCommonAncestorCommit(commitChain[9],commitChain[11],function(err,c){
      if(err){
        return done(err);
      }
      if(c !== commitChain[7]){
        done(new Error('expected: '+commitChain[7]+', got: '+c));
      }
      done();
    });
  });
  it('10 vs 4 -> 2',function(done){
    project.getCommonAncestorCommit(commitChain[10],commitChain[4],function(err,c){
      if(err){
        return done(err);
      }
      if(c !== commitChain[2]){
        done(new Error('expected: '+commitChain[2]+', got: '+c));
      }
      done();
    });
  });
  it('12 vs 8 -> 8',function(done){
    project.getCommonAncestorCommit(commitChain[12],commitChain[8],function(err,c){
      if(err){
        return done(err);
      }
      if(c !== commitChain[8]){
        done(new Error('expected: '+commitChain[8]+', got: '+c));
      }
      done();
    });
  });
  it('9 vs 5 -> 2',function(done){
    project.getCommonAncestorCommit(commitChain[9],commitChain[5],function(err,c){
      if(err){
        return done(err);
      }
      if(c !== commitChain[2]){
        done(new Error('expected: '+commitChain[2]+', got: '+c));
      }
      done();
    });
  });

  it('should remove the test project',function(done){
    storage.getProjectNames(function(err,names){
      if(err){
        return done(err);
      }
      if(names.indexOf(projectName) === -1){
        return done(new Error('no such project'));
      }

      storage.deleteProject(projectName,done);
    });
  });
  it('should close the database connection',function(done){
    storage.closeDatabase(done);
  });
});