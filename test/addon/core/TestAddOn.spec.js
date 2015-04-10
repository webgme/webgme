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
        testLogger = testFixture.logger,
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
            expect(err).to.not.exist;
            storage = new WebGME.clientStorage({
                globConf: gmeConfig,
                type: 'node',
                host: (gmeConfig.server.https.enable === true ? 'https' : 'http') + '://127.0.0.1',
                logger: testLogger.fork(addOnName + ':storage'),
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

    it('should start, update and stop', function (done) {
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
                logger = testLogger.fork(addOnName),
                addOn;
            expect(err).equal(null);

            logger.info = function () {
                logMessages.push(arguments);
            };

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
                        testLogger.debug(rootHash);
                        testLogger.debug(commitHash);

                        testLogger.debug(logMessages);
                        addOn.stop(function (err) {
                            expect(err).equal(null);
                            testLogger.debug(logMessages);
                            expect(logMessages.length).to.equal(3);
                            expect(logMessages[0][2]).to.equal('start');
                            expect(logMessages[1][2]).to.equal('update');
                            expect(logMessages[1][4]).to.equal(rootHash);
                            expect(logMessages[2][2]).to.equal('stop');
                            done();
                        });
                    }
                );

            });
        });
    });


});
