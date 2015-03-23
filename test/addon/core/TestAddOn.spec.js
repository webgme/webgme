/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals');

describe('TestAddOn', function () {
    'use strict';

    var expect = testFixture.expect,
        WebGME = testFixture.WebGME,
        Core = testFixture.WebGME.core,
        server,
        storage,
        project,
        importParam,
        gmeConfig = testFixture.getGmeConfig(),
        addOnName = 'TestAddOn',
        TestAddOn = testFixture.requirejs('addon/' + addOnName + '/' + addOnName + '/' + addOnName);

    before(function (done) {
        server = WebGME.standaloneServer(gmeConfig);
        server.start(function (err) {
            expect(err).to.equal(undefined);
            storage = new WebGME.clientStorage({
                globConf: gmeConfig,
                type: 'node',
                host: (gmeConfig.server.https.enable === true ? 'https' : 'http') + '://127.0.0.1',
                webGMESessionId: 'testopencontext'
            });
            storage = storage;
            done();
        });
    });

    afterEach(function (done) {
        storage.deleteProject(importParam.projectName, function (err) {
            done(err);
        });
    });

    after(function (done) {
        storage.closeDatabase(function (err1) {
            server.stop(function (err2) {
                done(err1 || err2 || null);
            });
        });
    });

    it('should start', function (done) {
        importParam = {
            filePath: './test/asset/sm_basic.json',
            projectName: 'TestAddOn',
            branchName: 'master',
            gmeConfig: gmeConfig,
            storage: storage
        };
        testFixture.importProject(importParam, function (err, result) {
            var startParam,
                logMessages = [],
                logger = {
                    log: function () {
                        logMessages.push(arguments);
                    }
                },
                addOn;
            expect(err).equal(null);

            project = result.project;

            addOn = new TestAddOn(Core, storage, gmeConfig);

            startParam = {
                projectName: 'TestAddOn',
                branchName: 'master',
                project: project,
                logger: logger
            };

            addOn.start(startParam, function (err) {
                expect(err).equal(null);
                result.core.createNode(result.root, {base: '/1'}, 'new FCO instance');
                //FIXME: Currently the addOn is using the same project and core.
                testFixture.saveChanges({project: project, core: result.core, rootNode: result.root},
                    function (err, rootHash, commitHash) {
                        expect(err).equal(null);
                        console.log(rootHash);
                        console.log(commitHash);
                        //setTimeout(function () {
                        expect(logMessages.length).to.equal(2);
                        expect(logMessages[1][4]).to.equal(rootHash);
                        console.log(logMessages);
                        done();
                        //}, 50);
                    }
                );

            });
        });
    });


});
