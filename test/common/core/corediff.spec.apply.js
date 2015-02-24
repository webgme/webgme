/**
 * Created by tamas on 2/23/15.
 */
/* globals require, global, describe, before, after */
require('../../_globals.js');
var database = new global.WebGME.serverUserStorage({host:'127.0.0.1',port:27017,database:'multi',log:global.Log.create('mongoLog')}),
    FS = require('fs');
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
        jsonProject = getJsonProject('./test/bin/apply/base001.json');
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
                            project.setBranchHash('base','',commit,done);
                            project.closeProject(function(err){
                                if(err){
                                    return done(err);
                                }
                                console.warn('close000');
                                database.closeDatabase(done);
                            });
                        });
                    });
                });
            });
        });
    });
    after(function(done){
        var newdone = done;
        done = function(err){
            console.warn('called-after');
            newdone(err);
        };
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
            var newdone = done;
            done = function(err){
                console.warn('called');
                newdone(err);
            };
            database.openDatabase(function(err){
                console.warn('kecso001');
                if(err){
                    console.warn('kecso001-1');
                    return done(err);
                }
                database.openProject(projectName,function(err,p){
                    console.warn('kecso002');
                    if(err){
                        console.warn('kecso002-1');
                        return done(err);
                    }
                    project = p;
                    core = new global.WebGME.core(project);
                    project.getBranchNames(function(err,names){
                        console.warn('kecso003');
                        if(err){
                            console.warn('kecso003-1');
                            return done(err);
                        }
                        if(!names['base']){
                            console.warn('kecso003-2');
                            return done(new Error('missing branch'));
                        }
                        project.loadObject(names['base'],function(err,c){
                            console.warn('kecso004',c);
                            if(err){
                                console.warn('kecso004-1');
                                return done(err);
                            }
                            core.loadRoot(c.root,function(err,r){
                                console.warn('kecso005');
                                if(err){
                                    console.warn('kecso005-1',err);
                                    return done(err);
                                }
                                console.warn('kecso006');
                                root = r;
                                done();
                            });
                        });
                    });
                });
            });
        });
        it('modifies several attributes',function(done){
            /*core.applyTreeDiff(root,{attr:{name:'ROOTy'},1:{attr:{name:'FCOy'}}},function(err){
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
                        project.setBranchHash('base',oldCommit,commit,done);
                    });
                });
                done();
            });*/
            done();
        });
    });
});