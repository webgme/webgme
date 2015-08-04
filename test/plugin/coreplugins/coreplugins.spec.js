/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

'use strict';

var testFixture = require('../../_globals.js');

describe('CorePlugins', function () {

    var gmeConfig = testFixture.getGmeConfig(),
        Q = testFixture.Q,
        expect = testFixture.expect,
        superagent = testFixture.superagent,

        WebGME = testFixture.WebGME,
        path = require('path'),

        logger = testFixture.logger.fork('coreplugins.spec'),

        pluginNames = [
            'ConfigurationArtifact',
            'ExecutorPlugin',
            'MergeExample',
            'MetaGMEParadigmImporter',
            'MinimalWorkingExample',
            'PluginGenerator',
            'MultipleMainCallbackCalls',
            'PluginForked'
        ],

        pluginsShouldFail = [
            'ExecutorPlugin',
            'MergeExample',
            'MetaGMEParadigmImporter',
            'MultipleMainCallbackCalls'
        ],
        projects = [],// N.B.: this is getting populated by the createTests function

        gmeAuth,
        safeStorage,

    //guestAccount = testFixture.getGmeConfig().authentication.guestAccount,
        serverBaseUrl,
        server,

        runPlugin = require('../../../src/bin/run_plugin'),
        filename = path.normalize('../../../src/bin/run_plugin.js'),
        oldProcessExit = process.exit;

    before(function (done) {
        var gmeConfigWithAuth = testFixture.getGmeConfig();
        gmeConfigWithAuth.authentication.enable = true;
        gmeConfigWithAuth.authentication.allowGuests = true;

        server = WebGME.standaloneServer(gmeConfigWithAuth);
        serverBaseUrl = server.getUrl();
        server.start(function (err) {
            if (err) {
                done(new Error(err));
                return;
            }

            testFixture.clearDBAndGetGMEAuth(gmeConfigWithAuth, projects)
                .then(function (gmeAuth_) {
                    gmeAuth = gmeAuth_;
                    safeStorage = testFixture.getMongoStorage(logger, gmeConfigWithAuth, gmeAuth);

                    return Q.allSettled([
                        safeStorage.openDatabase()
                    ]);
                })
                .then(function () {
                    var projectName,
                        promises = [],
                        promise,
                        i;

                    for (i = 0; i < projects.length; i += 1) {
                        projectName = projects[i];
                        promise = testFixture.importProject(safeStorage, {
                            projectSeed: './seeds/ActivePanels.json',
                            projectName: projectName,
                            branchName: 'master',
                            gmeConfig: gmeConfig,
                            logger: logger
                        });
                        promises.push(promise);
                    }
                    return Q.allSettled(promises);
                })
                .nodeify(done);
        });
    });

    after(function (done) {
        server.stop(function (err) {
            if (err) {
                done(new Error(err));
                return;
            }

            Q.allSettled([
                gmeAuth.unload(),
                safeStorage.closeDatabase()
            ])
                .nodeify(done);
        });
    });

    afterEach(function () {
        process.exit = oldProcessExit;
    });

    // get seed designs 'files' and make sure all of them are getting tested
    it('should get all core plugins', function (done) {
        var agent = superagent.agent();

        agent.get(serverBaseUrl + '/listAllPlugins', function (err, res) {
            expect(err).to.equal(null);
            expect(res.body.allPlugins).to.deep.equal(pluginNames); // ensures that we test all available core plugins
            done();
        });
    });

    function createTests() {
        var i;

        function createPluginTest(name) {
            var projectName = name + 'TestMain';

            projects.push(projectName);

            // import seed designs
            it('should run plugin ' + name, function (done) {
                var numCallback = 0;

                process.exit = function (code) {
                    expect(code).to.equal(0);
                    done();
                };

                runPlugin.main(['node', filename, name, projectName, '-s', '/1'],
                    function (err, result) {
                        numCallback += 1;
                        if (err) {
                            if (pluginsShouldFail.indexOf(name) > -1) {
                                if (name === 'MultipleMainCallbackCalls') {
                                    // ignore all callback functions, done() is called from process.exit once.
                                } else {
                                    done();
                                }
                            } else {
                                done(new Error(err));
                            }
                            return;
                        }
                        expect(result.success).to.equal(true);
                        expect(result.error).to.equal(null);
                    }
                );
            });
        }

        for (i = 0; i < pluginNames.length; i += 1) {
            createPluginTest(pluginNames[i]);
        }
    }

    createTests();
});