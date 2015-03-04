/**
 * Created by tamas on 2/18/15.
 */
require('../_globals');

describe('apply CLI tests', function () {
    var applyCLI = require('../../src/bin/apply'),
        importCLI = require('../../src/bin/import'),
        exportCLI = require('../../src/bin/export'),
        mongodb = require('mongodb'),
        FS = require('fs'),
        should = require('chai').should(),
        getJsonProject = function (path) {
            return JSON.parse(FS.readFileSync(path, 'utf-8'));
        },
        checkPath = function (object, path, value) {
            var i;
            path = path.split('/');
            path.shift();
            for (i = 0; i < path.length - 1; i++) {
                object = object[path[i]] || {};
            }
            if (object && object[path[i]] !== undefined) {
                return object[path[i]].should.be.eql(value);
            }
            return i.should.be.eql(-1);
        },

        mongoUri = 'mongodb://127.0.0.1:27017/multi',
        applyCliTestProject = 'applyCliTest';

    before(function (done) {
        // TODO: move this to globals.js as a utility function
        mongodb.MongoClient.connect(mongoUri, {
            'w': 1,
            'native-parser': true,
            'auto_reconnect': true,
            'poolSize': 20,
            socketOptions: {keepAlive: 1}
        }, function (err, db) {
            if (err) {
                done(err);
                return;
            }

            db.dropCollection(applyCliTestProject, function (err) {
                done(err);
            });

        });
    });

    describe('basic', function () {
        var jsonBaseProject;
        before(function () {
            jsonBaseProject = getJsonProject('./test/bin/apply/base001.json');
        });
        beforeEach(function (done) {
            importCLI.import(mongoUri, applyCliTestProject, jsonBaseProject, 'base', done);
        });
        it('project should remain the same after applying empty patch', function (done) {
            applyCLI.applyPatch(mongoUri, applyCliTestProject, 'base', {}, false, function (err, commit) {
                if (err) {
                    return done(err);
                }
                exportCLI.export(mongoUri, applyCliTestProject, commit, function (err, jsonResultProject) {
                    if (err) {
                        return done(err);
                    }
                    jsonResultProject.should.be.eql(jsonBaseProject);
                    done();
                });
            });
        });
        it('simple attribute change', function (done) {
            applyCLI.applyPatch(mongoUri, applyCliTestProject, 'base', {attr: {name: "otherROOT"}}, false, function (err, commit) {
                if (err) {
                    return done(err);
                }
                exportCLI.export(mongoUri, applyCliTestProject, commit, function (err, jsonResultProject) {
                    if (err) {
                        return done(err);
                    }
                    checkPath(jsonResultProject, '/nodes/03d36072-9e09-7866-cb4e-d0a36ff825f6/attributes/name', 'otherROOT');
                    done();
                });
            });
        });
        //TODO fix this issue now tests has been removed
        it('multiple attribute change', function (done) {
            applyCLI.applyPatch(mongoUri, applyCliTestProject, 'base', {
                attr: {name: 'ROOTy'},
                1: {attr: {name: 'FCOy'}}
            }, false, function (err, commit) {
                if (err) {
                    return done(err);
                }
                exportCLI.export(mongoUri, applyCliTestProject, commit, function (err, jsonResultProject) {
                    if (err) {
                        return done(err);
                    }
                    checkPath(jsonResultProject, '/nodes/03d36072-9e09-7866-cb4e-d0a36ff825f6/attributes/name', 'ROOTy');
                    checkPath(jsonResultProject, '/nodes/cd891e7b-e2ea-e929-f6cd-9faf4f1fc045/attributes/name', 'FCOy');
                    done();
                });
            });
        });
        /*it('simple registry change',function(done){
         applyCLI.applyPatch(mongoUri,applyCliTestProject,'base',{1:{reg:{position:{x:200,y:200}}}},false,function(err,commit){
         if(err){
         return done(err);
         }
         exportCLI.export(mongoUri,applyCliTestProject,commit,function(err,jsonResultProject){
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
