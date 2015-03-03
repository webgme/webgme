/**
 * Created by tamas on 2/18/15.
 */
require('../_globals');
var applyCLI = require('../../src/bin/apply'),
    importCLI = require('../../src/bin/import'),
    exportCLI = require('../../src/bin/export'),
    FS=require('fs'),
    should = require('chai').should(),
    getJsonProject = function(path){
        return JSON.parse(FS.readFileSync(path,'utf-8'));
    },
    checkPath = function(object,path,value){
        var i;
        path = path.split('/');
        path.shift();
        for(i=0;i<path.length-1;i++){
            object = object[path[i]] || {};
        }
        if(object && object[path[i]] !== undefined){
            return object[path[i]].should.be.eql(value);
        }
        return i.should.be.eql(-1);
    };

describe('apply CLI tests',function(){
    describe('basic',function(){
        var jsonBaseProject;
        before(function(){
            jsonBaseProject = getJsonProject('./test/bin/apply/base001.json');
        });
        beforeEach(function(done){
            importCLI.import('mongodb://127.0.0.1:27017/multi','applyCliTest',jsonBaseProject,'base',done);
        });
        it('project should remain the same after applying empty patch',function(done){
            applyCLI.applyPatch('mongodb://127.0.0.1:27017/multi','applyCliTest','base',{},false,function(err,commit){
                if(err){
                    return done(err);
                }
                exportCLI.export('mongodb://127.0.0.1:27017/multi','applyCliTest',commit,function(err,jsonResultProject){
                    if(err){
                        return done(err);
                    }
                    jsonResultProject.should.be.eql(jsonBaseProject);
                    done();
                });
            });
        });
        it('simple attribute change',function(done){
            applyCLI.applyPatch('mongodb://127.0.0.1:27017/multi','applyCliTest','base',{attr:{name:"otherROOT"}},false,function(err,commit){
                if(err){
                    return done(err);
                }
                exportCLI.export('mongodb://127.0.0.1:27017/multi','applyCliTest',commit,function(err,jsonResultProject){
                    if(err){
                        return done(err);
                    }
                    checkPath(jsonResultProject,'/nodes/03d36072-9e09-7866-cb4e-d0a36ff825f6/attributes/name','otherROOT');
                    done();
                });
            });
        });
        //TODO fix this issue now tests has been removed
        it('multiple attribute change',function(done){
            applyCLI.applyPatch('mongodb://127.0.0.1:27017/multi','applyCliTest','base',{attr:{name:'ROOTy'},1:{attr:{name:'FCOy'}}},false,function(err,commit){
                if(err){
                    return done(err);
                }
                exportCLI.export('mongodb://127.0.0.1:27017/multi','applyCliTest',commit,function(err,jsonResultProject){
                    if(err){
                        return done(err);
                    }
                    checkPath(jsonResultProject,'/nodes/03d36072-9e09-7866-cb4e-d0a36ff825f6/attributes/name','ROOTy');
                    checkPath(jsonResultProject,'/nodes/cd891e7b-e2ea-e929-f6cd-9faf4f1fc045/attributes/name','FCOy');
                    done();
                });
            });
        });
        /*it('simple registry change',function(done){
            applyCLI.applyPatch('mongodb://127.0.0.1:27017/multi','applyCliTest','base',{1:{reg:{position:{x:200,y:200}}}},false,function(err,commit){
                if(err){
                    return done(err);
                }
                exportCLI.export('mongodb://127.0.0.1:27017/multi','applyCliTest',commit,function(err,jsonResultProject){
                    if(err){
                        return done(err);
                    }
                    checkPath(jsonResultProject,'/nodes/cd891e7b-e2ea-e929-f6cd-9faf4f1fc045/registry/position',{x:200,y:200});
                    done();
                });
            });
        });*/
    });
});