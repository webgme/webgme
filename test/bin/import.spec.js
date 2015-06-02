/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../_globals');

describe('import CLI tests', function () {
    'use strict';

    var gmeConfig = testFixture.getGmeConfig(),
        expect = testFixture.expect,
        WebGME = testFixture.WebGME,
        importCLI = require('../../src/bin/import'),
        openContext = testFixture.openContext,
        projectName,
        logger = testFixture.logger.fork('import.spec'),
        storage,
        gmeAuth,
        project,
        jsonProject;

    function closeContext(callback) {
        storage.closeDatabase(function (err) {
            callback(err);
        });
    }

    before(function (done) {
        jsonProject = testFixture.loadJsonFile('./test/bin/import/project.json');
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .nodeify(done);

    });

    afterEach(function (done) {
        if (project && projectName) {
            storage.deleteProject({projectName: projectName}, done);
        } else {
            done();
        }
    });

    it('should import non-existing project with unspecified branch into master', function (done) {
        var nodePath = '/960660211/1365653822',
            contextParam = {
                projectName: 'importTestNumber1',
                branchName: 'master',
                nodePaths: [nodePath]
            };
        importCLI.import(storage, gmeConfig, contextParam.projectName, jsonProject, null, true, undefined,
            function (err, data) {
                expect(err).to.equal(null);

                expect(typeof data).to.equal('object');
                expect(typeof data.commitHash).to.equal('string');
                openContext(storage, gmeConfig, testFixture.logger, contextParam, function (err, context) {
                    expect(err).to.equal(null);
                    expect(context.commitHash).to.equal(data.commitHash);
                    expect(context.nodes).to.have.keys(nodePath);
                    expect(context.core.getAttribute(context.nodes[nodePath], 'name')).to.equal('state');
                    projectName = contextParam.projectName;
                    project = context.project;
                    done();
                });
            }
        );
    });

    it('should import non-existing project with specified branch', function (done) {
        var nodePath = '/960660211/1365653822',
            contextParam = {
                projectName: 'importTestNumber2',
                branchName: 'b1',
                nodePaths: [nodePath]
            };
        importCLI.import(storage,
            gmeConfig, contextParam.projectName, jsonProject, contextParam.branchName, true, undefined,
            function (err, data) {
                expect(err).to.equal(null);

                expect(typeof data).to.equal('object');
                expect(typeof data.commitHash).to.equal('string');
                openContext(storage, gmeConfig, testFixture.logger, contextParam, function (err, context) {
                    expect(err).to.equal(null);
                    expect(context.commitHash).to.equal(data.commitHash);
                    expect(context.nodes).to.have.keys(nodePath);
                    expect(context.core.getAttribute(context.nodes[nodePath], 'name')).to.equal('state');
                    projectName = contextParam.projectName;
                    project = context.project;
                    done();
                });
            }
        );
    });

    it('should import existing project with unspecified branch into master', function (done) {
        var nodePath = '/579542227/2088994530',
            contextParam = {
                projectName: 'importTestNumber3',
                branchName: 'master',
                nodePaths: [nodePath]
            },
            tmpJsonProject = testFixture.loadJsonFile('./test/bin/import/basicProject.json');

        importCLI.import(storage, gmeConfig, contextParam.projectName, tmpJsonProject, null, true, undefined,
            function (err, data) {
                expect(err).to.equal(null);

                expect(typeof data).to.equal('object');
                expect(typeof data.commitHash).to.equal('string');

                openContext(storage, gmeConfig, testFixture.logger, contextParam, function (err, context) {
                    expect(err).to.equal(null);

                    expect(context.commitHash).to.equal(data.commitHash);
                    expect(context.nodes).to.have.keys(nodePath);
                    expect(context.core.getAttribute(context.nodes[nodePath], 'name')).to.equal('2');

                    project = context.project;
                    projectName = contextParam.projectName;

                    closeContext(function (err) {
                        expect(err).to.equal(null);

                        importCLI.import(storage,
                            gmeConfig, contextParam.projectName, jsonProject, null, true, undefined,
                            function (err, data) {
                                expect(err).to.equal(null);

                                expect(typeof data).to.equal('object');
                                expect(typeof data.commitHash).to.equal('string');

                                nodePath = '/960660211/1365653822';
                                contextParam.nodePaths = [nodePath];

                                openContext(storage, gmeConfig, testFixture.logger, contextParam,
                                    function (err, context) {
                                        expect(err).to.equal(null);
                                        expect(context.commitHash).to.equal(data.commitHash);
                                        expect(context.nodes).to.have.keys(nodePath);
                                        expect(context.core.getAttribute(context.nodes[nodePath], 'name'))
                                            .to.equal('state');

                                        project = context.project;
                                        done();
                                    }
                                );
                            }
                        );
                    });
                });
            }
        );
    });
});