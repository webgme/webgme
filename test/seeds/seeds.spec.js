/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

'use strict';

var testFixture = require('../_globals.js');

describe('Seeds', function () {

    var gmeConfig = testFixture.getGmeConfig(),
        Q = testFixture.Q,
        expect = testFixture.expect,
        superagent = testFixture.superagent,

        Project = testFixture.Project,
        WebGME = testFixture.WebGME,
        serializer = WebGME.serializer, // make sure we use it through webgme
        fs = require('fs'),
        path = require('path'),

        logger = testFixture.logger.fork('seeds.spec'),

        seedNames = [
            'ActivePanels',
            'EmptyProject',
            'EmptyWithConstraint',
            'SignalFlowSystem'
        ],
        projects = [],// N.B.: this is getting populated by the createTests function

        gmeAuth,
        safeStorage,

        //guestAccount = testFixture.getGmeConfig().authentication.guestAccount,
        serverBaseUrl,
        server;

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
                    safeStorage = testFixture.getMemoryStorage(logger, gmeConfigWithAuth, gmeAuth);

                    return Q.allSettled([
                        safeStorage.openDatabase()
                    ]);
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


    // get seed designs 'files' and make sure all of them are getting tested
    it('should get all seed project names', function (done) {
        var agent = superagent.agent();

        agent.get(serverBaseUrl + '/listAllSeeds', function (err, res) {
            expect(err).to.equal(null);
            expect(res.body.allSeeds).to.deep.equal(seedNames); // ensures that we test all available seeds
            done();
        });
    });

    function createTests() {
        var i,
            projectContents = {};

        function createImportTest(name) {
            var projectName = name + 'Import';

            projects.push(projectName);

            // import seed designs
            it('should import ' + name, function (done) {
                var data = {
                        projectName: projectName
                    },
                    core,
                    rootNode;

                safeStorage.createProject(data)
                    .then(function (dbProject) {
                        var project = new Project(dbProject, safeStorage, logger, gmeConfig);
                        core = new WebGME.core(project, {
                            globConf: gmeConfig,
                            logger: logger
                        });
                        rootNode = core.createNode({parent: null, base: null});

                        return Q.ninvoke(serializer, 'import', core, rootNode, projectContents[name]);
                    })
                    .then(function (res) {
                        expect(res).to.match(/will be added/);
                    })
                    .nodeify(done);
            });
        }

        function createExportTest(name) {
            var projectName = name + 'Export';
            projects.push(projectName);

            // export seed designs
            it('should import/export ' + name, function (done) {

                var data = {
                        projectName: projectName
                    },
                    core,
                    rootNode;

                safeStorage.createProject(data)
                    .then(function (dbProject) {
                        var project = new Project(dbProject, safeStorage, logger, gmeConfig);
                        core = new WebGME.core(project, {
                            globConf: gmeConfig,
                            logger: logger
                        });
                        rootNode = core.createNode({parent: null, base: null});

                        return Q.ninvoke(serializer, 'import', core, rootNode, projectContents[name]);
                    })
                    .then(function (res) {
                        expect(res).to.match(/will be added/);

                        return Q.ninvoke(serializer, 'export', core, rootNode);
                    })
                    .then(function (res) {
                        expect(res).to.deep.equal(projectContents[name]);
                    })
                    .nodeify(done);
            });
        }

        function createRoundTripTest(name) {
            var projectName = name + 'RoundTrip';
            projects.push(projectName);

            // import/export/import
            it('should import/export/import ' + name, function (done) {

                var data = {
                        projectName: projectName
                    },
                    core,
                    rootNode;

                if (name === 'SignalFlowSystem') {
                    this.timeout(20000);
                }

                safeStorage.createProject(data)
                    .then(function (dbProject) {
                        var project = new Project(dbProject, safeStorage, logger, gmeConfig);
                        core = new WebGME.core(project, {
                            globConf: gmeConfig,
                            logger: logger
                        });
                        rootNode = core.createNode({parent: null, base: null});

                        return Q.ninvoke(serializer, 'import', core, rootNode, projectContents[name]);
                    })
                    .then(function (res) {
                        expect(res).to.match(/will be added/);

                        return Q.ninvoke(serializer, 'export', core, rootNode);
                    })
                    .then(function (res) {
                        return Q.ninvoke(serializer, 'import', core, rootNode, res);
                    })
                    .then(function (res) {
                        // no new objects, only updates.
                        expect(res).to.not.match(/will be added/);
                        expect(res).to.match(/will be updated/);
                    })
                    .nodeify(done);
            });
        }

        for (i = 0; i < seedNames.length; i += 1) {
            projectContents[seedNames[i]] = JSON.parse(fs.readFileSync(path.join('.',
                'seeds',
                seedNames[i] + '.json')));
            createImportTest(seedNames[i]);
            createExportTest(seedNames[i]);
            createRoundTripTest(seedNames[i]);
        }
    }

    createTests();
});