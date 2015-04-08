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
        Storage = WebGME.serverUserStorage,
        importCLI = require('../../src/bin/import'),
        openContext = testFixture.requirejs('common/util/opencontext'),
        projectName,
        storage,
        project,
        jsonProject;

    function closeContext(callback) {
        try {
            project.closeProject(function () {
                storage.closeDatabase(function (err) {
                    callback(err);
                });
            });
        } catch (err) {
            storage.closeDatabase(function () {
                callback(err);
            });
        }
    }

    before(function () {
        jsonProject = testFixture.loadJsonFile('./test/asset/sm_basic.json');
        storage = storage = new WebGME.serverUserStorage({
            globConf: gmeConfig,
            logger: testFixture.logger.fork('import_CLI_tests:storage')
        });
    });

    afterEach(function (done) {
        if (project && projectName) {
            project.closeProject(function (err1) {
                storage.deleteProject(projectName, function (err2) {
                    storage.closeDatabase(function (err3) {
                        done(err1 || err2 || err3 || null);
                    });
                });
            });
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
        importCLI.import(Storage, gmeConfig, contextParam.projectName, jsonProject, null, true,
            function (err, data) {
                expect(err).to.equal(null);

                expect(typeof data).to.equal('object');
                expect(typeof data.commitHash).to.equal('string');
                openContext(storage, gmeConfig, contextParam, function (err, context) {
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
        importCLI.import(Storage, gmeConfig, contextParam.projectName, jsonProject, contextParam.branchName, true,
            function (err, data) {
                expect(err).to.equal(null);

                expect(typeof data).to.equal('object');
                expect(typeof data.commitHash).to.equal('string');
                openContext(storage, gmeConfig, contextParam, function (err, context) {
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
            tmpJsonProject = testFixture.loadJsonFile('./test/asset/sm_basic_basic.json');

        importCLI.import(Storage, gmeConfig, contextParam.projectName, tmpJsonProject, null, true,
            function (err, data) {
                expect(err).to.equal(null);

                expect(typeof data).to.equal('object');
                expect(typeof data.commitHash).to.equal('string');

                openContext(storage, gmeConfig, contextParam, function (err, context) {
                    expect(err).to.equal(null);

                    expect(context.commitHash).to.equal(data.commitHash);
                    expect(context.nodes).to.have.keys(nodePath);
                    expect(context.core.getAttribute(context.nodes[nodePath], 'name')).to.equal('2');

                    project = context.project;
                    projectName = contextParam.projectName;

                    closeContext(function (err) {
                        expect(err).to.equal(null);

                        importCLI.import(Storage, gmeConfig, contextParam.projectName, jsonProject, null, true,
                            function (err, data) {
                                expect(err).to.equal(null);

                                expect(typeof data).to.equal('object');
                                expect(typeof data.commitHash).to.equal('string');

                                nodePath = '/960660211/1365653822';
                                contextParam.nodePaths = [nodePath];

                                openContext(storage, gmeConfig, contextParam, function (err, context) {
                                    expect(err).to.equal(null);
                                    expect(context.commitHash).to.equal(data.commitHash);
                                    expect(context.nodes).to.have.keys(nodePath);
                                    expect(context.core.getAttribute(context.nodes[nodePath], 'name')).to.equal('state');

                                    project = context.project;
                                    done();
                                });
                            }
                        );
                    });
                });
            }
        );
    });
});