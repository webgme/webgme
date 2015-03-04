/**
 * Created by tamas on 2/23/15.
 */
/* globals require, global, describe, before, after */
(function() {
require('../../_globals.js');
var database = new global.WebGME.serverUserStorage({host:'127.0.0.1',port:27017,database:'multi',log:global.Log.create('mongoLog')}),
    FS = require('fs'),
    should = require('chai').should();
describe('corediff',function(){
    'use strict';
    var projectName = 'coreDiffApply',
        project,
        core,
        root,
        commit,
        getJsonProject = function(path){
            return JSON.parse(FS.readFileSync(path,'utf-8'));
        },
        jsonProject;
    before(function(done){
        jsonProject = getJsonProject('./test/common/core/corediff/base001.json');
        database.openDatabase(function(err){
            if(err){
                return done(err);
            }
            database.openProject(projectName,function(err,p){
                if(err){
                    return done(err);
                }
                project = p;
                core = new global.WebGME.core(project);
                root = core.createNode();
                global.WebGME.serializer.import(core,root,jsonProject,function(err,log){
                    if(err){
                        return done(err);
                    }
                    core.persist(root, function (err) {
                        if (err) {
                            return done(err);
                        }
                        commit = project.makeCommit([], core.getHash(root), 'initial insert', function (err) {
                            if (err) {
                                return done(err);
                            }
                            project.setBranchHash('base','',commit,function(err){
                                if(err){
                                    return done(err);
                                }
                                project.closeProject(function(err){
                                    if(err){
                                        return done(err);
                                    }
                                    database.closeDatabase(done);
                                });
                            });
                        });
                    });
                });
            });
        });
    });
    after(function(done){
        database.openDatabase(function(err){
            if(err){
                return done(err);
            }

            database.deleteProject(projectName,function(err){
                if(err){
                    return done(err);
                }
                database.closeDatabase(done);
            });
        });
    });
    describe('apply',function(){
        before(function(done){
            database.openDatabase(function(err){
                if(err){
                    return done(err);
                }
                database.openProject(projectName,function(err,p){
                    if(err){
                        return done(err);
                    }
                    project = p;
                    core = new global.WebGME.core(project);
                    project.getBranchNames(function(err,names){
                        if(err){
                            return done(err);
                        }
                        if(!names['base']){
                            return done(new Error('missing branch'));
                        }
                        project.loadObject(names['base'],function(err,c){
                            if(err){
                                return done(err);
                            }
                            core.loadRoot(c.root,function(err,r){
                                if(err){
                                    return done(err);
                                }
                                root = r;
                                done();
                            });
                        });
                    });
                });
            });
        });
        after(function(done){
            try{
                database.closeDatabase(done);
            } catch(e){
                done();
            }
        });
        it('modifies several attributes',function(done){
            core.applyTreeDiff(root,{attr:{name:'ROOTy'},1:{attr:{name:'FCOy'}}},function(err){
                if(err){
                    return done(err);
                }
                core.persist(root, function (err) {
                    if (err) {
                        return done(err);
                    }
                    var oldCommit = commit;
                    commit = project.makeCommit([oldCommit], core.getHash(root), 'initial insert', function (err) {
                        if (err) {
                            return done(err);
                        }
                        project.setBranchHash('base',oldCommit,commit,function(err){
                            if(err){
                                return done(err);
                            }
                            //checking
                            project.loadObject(commit,function(err,c){
                                if(err){
                                    return done(err);
                                }
                                core.loadRoot(c.root,function(err,r){
                                    if(err){
                                        return done(err);
                                    }
                                    core.getAttribute(r,'name').should.be.eql('ROOTy');
                                    core.loadByPath(r,'/1',function(err,fco){
                                        if(err){
                                            return done(err);
                                        }
                                        core.getAttribute(fco,'name').should.be.eql('FCOy');
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
})();