/*jshint node:true, mocha:true */

/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../_globals');

describe('apply CLI tests', function () {
    'use strict';

    var gmeConfig = testFixture.getGmeConfig(),
        logger = testFixture.logger.fork('apply.spec'),
        storage,
        gmeAuth,
        applyCLI = require('../../src/bin/apply'),
        importCLI = require('../../src/bin/import'),
        exportCLI = require('../../src/bin/export'),
        FS = testFixture.fs,
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

        applyCliTestProject = 'applyCliTest';

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, applyCliTestProject)
            .then(function (gmeAuth__) {
                gmeAuth = gmeAuth__;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return storage.deleteProject({projectName: applyCliTestProject});
            })
            .nodeify(done);
    });

    after(function (done) {
        storage.closeDatabase(done);
    });

    describe('basic', function () {
        var jsonBaseProject;

        before(function () {
            jsonBaseProject = getJsonProject('./test/bin/apply/base001.json');
        });

        beforeEach(function (done) {
            importCLI.import(storage, gmeConfig, applyCliTestProject, jsonBaseProject, 'base', true, undefined, done);
        });

        it('project should remain the same after applying empty patch', function (done) {
            var patch = {};
            applyCLI.applyPatch(storage, applyCliTestProject, 'base', patch, false, undefined, function (err, commit) {
                if (err) {
                    done(err);
                    return;
                }
                exportCLI.export(storage, applyCliTestProject, commit, undefined, function (err, jsonResultProject) {
                    if (err) {
                        done(err);
                        return;
                    }
                    jsonResultProject.should.be.eql(jsonBaseProject);
                    done();
                });
            });
        });

        it('simple attribute change', function (done) {
            var patch = {attr: {name: 'otherROOT'}};
            applyCLI.applyPatch(storage, applyCliTestProject, 'base', patch, false, undefined, function (err, commit) {
                if (err) {
                    done(err);
                    return;
                }
                exportCLI.export(storage, applyCliTestProject, commit, undefined, function (err, jsonResultProject) {
                    if (err) {
                        done(err);
                        return;
                    }
                    checkPath(jsonResultProject, '/nodes/03d36072-9e09-7866-cb4e-d0a36ff825f6/attributes/name',
                        'otherROOT');
                    done();
                });
            });
        });

        //TODO fix this issue now tests has been removed
        it('multiple attribute change', function (done) {
            var patch = {
                attr: {name: 'ROOTy'},
                1: {attr: {name: 'FCOy'}}
            };
            applyCLI.applyPatch(storage, applyCliTestProject, 'base', patch, false, undefined, function (err, commit) {
                if (err) {
                    return done(err);
                }
                exportCLI.export(storage, applyCliTestProject, commit, undefined, function (err, jsonResultProject) {
                    if (err) {
                        return done(err);
                    }
                    checkPath(jsonResultProject, '/nodes/03d36072-9e09-7866-cb4e-d0a36ff825f6/attributes/name',
                        'ROOTy');
                    checkPath(jsonResultProject, '/nodes/cd891e7b-e2ea-e929-f6cd-9faf4f1fc045/attributes/name', 'FCOy');
                    done();
                });
            });
        });
        /*it('simple registry change',function(done){
         applyCLI.applyPatch(mongoUri,
         applyCliTestProject,'base',{1:{reg:{position:{x:200,y:200}}}},false,function(err,commit){
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
