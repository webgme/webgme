/* jshint node:true, mocha: true, expr:true*/

/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../_globals.js');

describe('meta query core', function () {
    'user strict';

    var gmeConfig = testFixture.getGmeConfig(),
        Q = testFixture.Q,
        expect = testFixture.expect,
        logger = testFixture.logger.fork('metaquerycore.spec'),
        storage,
        projectName = 'metaQueryTesting',
        project,
        core,
        rootNode,
        commit,
        baseRootHash,
        gmeAuth,
        baseNodes = {
            '': null,
            '/1924875415': null,
            '/1924875415/1059131120': null,
            '/1924875415/1359805212': null,
            '/1924875415/1544821790': null,

        };

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(storage, {
                    projectSeed: 'test/common/core/metacachecore/project.webgmex',
                    projectName: projectName,
                    branchName: 'base',
                    gmeConfig: gmeConfig,
                    logger: logger
                });
            })
            .then(function (result) {
                project = result.project;
                core = result.core;
                rootNode = result.rootNode;
                commit = result.commitHash;
                baseRootHash = result.rootHash;
            })
            .nodeify(done);
    });

    after(function (done) {
        Q.allDone([
                storage.closeDatabase(),
                gmeAuth.unload()
            ])
            .nodeify(done);
    });

    beforeEach(function (done) {
        var keys = Object.keys(baseNodes),
            i;

        for (i = 0; i < keys.length; i += 1) {
            baseNodes[keys[i]] = null;
        }

        //we load all the nodes that we wish to work with
        Q.nfcall(core.loadRoot, baseRootHash)
            .then(function (root) {
                rootNode = root;
                baseNodes[''] = root;
                return Q.allDone([
                    testFixture.loadNode(core, rootNode, '/1924875415'),
                    testFixture.loadNode(core, rootNode, '/1924875415/1059131120'),
                    testFixture.loadNode(core, rootNode, '/1924875415/1359805212'),
                    testFixture.loadNode(core, rootNode, '/1924875415/1544821790')
                ]);
            })
            .then(function (results) {
                var i;
                for (i = 0; i < results.length; i += 1) {
                    if (baseNodes[core.getPath(results[i])] === null) {
                        baseNodes[core.getPath(results[i])] = results[i];
                    }
                }
            })
            .nodeify(done);
    });

    it('should return every possible children type with basic check', function () {
        var validPaths = [
                '/367050797/1776478501',
                '/367050797/355480347',
                '/367050797/625420143',
                '/367050797/1626677559'
            ],
            parameters = {
                node: baseNodes['/1924875415'],
                children: [],
                sensitive: false,
                multiplicity: false
            },
            paths = [],
            i,
            validNodes = core.getValidChildrenMetaNodes(parameters);

        for (i = 0; i < validNodes.length; i += 1) {
            paths.push(core.getPath(validNodes[i]));
        }
        expect(paths).to.have.members(validPaths);
    });

    it('should return non-abstract children type with sensitive check', function () {
        var validPaths = [
                '/367050797/355480347',
                '/367050797/625420143',
                '/367050797/1626677559'
            ],
            parameters = {
                node: baseNodes['/1924875415'],
                children: [],
                sensitive: true,
                multiplicity: false
            },
            paths = [],
            i,
            validNodes = core.getValidChildrenMetaNodes(parameters);

        for (i = 0; i < validNodes.length; i += 1) {
            paths.push(core.getPath(validNodes[i]));
        }
        expect(paths).to.have.members(validPaths);
    });

    it('should return valid children type based on multiplicity', function () {
        var validPaths = [
                '/367050797/1626677559'
            ],
            parameters = {
                node: baseNodes['/1924875415'],
                children: [
                    baseNodes['/1924875415/1059131120'],
                    baseNodes['/1924875415/1359805212'],
                    baseNodes['/1924875415/1544821790']
                ],
                sensitive: true,
                multiplicity: true
            },
            paths = [],
            i,
            validNodes = core.getValidChildrenMetaNodes(parameters);

        for (i = 0; i < validNodes.length; i += 1) {
            paths.push(core.getPath(validNodes[i]));
        }
        expect(paths).to.have.members(validPaths);
    });

    it('should return valid children type not based on multiplicity if children is not given', function () {
        var validPaths = [
                '/367050797/355480347',
                '/367050797/625420143',
                '/367050797/1626677559'
            ],
            parameters = {
                node: baseNodes['/1924875415'],
                children: [],
                sensitive: true,
                multiplicity: true
            },
            paths = [],
            i,
            validNodes = core.getValidChildrenMetaNodes(parameters);

        for (i = 0; i < validNodes.length; i += 1) {
            paths.push(core.getPath(validNodes[i]));
        }
        expect(paths).to.have.members(validPaths);
    });

    it('should return every possible member type with basic check', function () {
        var validPaths = [
                '/367050797/625420143'
            ],
            parameters = {
                node: baseNodes['/1924875415'],
                members: [],
                sensitive: false,
                multiplicity: false,
                name: 'ins'
            },
            paths = [],
            i,
            validNodes = core.getValidSetElementsMetaNodes(parameters);

        for (i = 0; i < validNodes.length; i += 1) {
            paths.push(core.getPath(validNodes[i]));
        }
        expect(paths).to.have.members(validPaths);
    });

    it('should return every possible, non-abstract member type with sensitive check', function () {
        var validPaths = [
                '/367050797/625420143'
            ],
            parameters = {
                node: baseNodes['/1924875415'],
                members: [],
                sensitive: true,
                multiplicity: false,
                name: 'ins'
            },
            paths = [],
            i,
            validNodes = core.getValidSetElementsMetaNodes(parameters);

        for (i = 0; i < validNodes.length; i += 1) {
            paths.push(core.getPath(validNodes[i]));
        }
        expect(paths).to.have.members(validPaths);
    });

    it('should return every possible member type with multiplicity check', function () {
        var validPaths = [],
            parameters = {
                node: baseNodes['/1924875415'],
                members: [
                    baseNodes['/1924875415/1544821790'],
                    core.getAllMetaNodes(rootNode)['/367050797/625420143']
                ],
                sensitive: true,
                multiplicity: true,
                name: 'ins'
            },
            paths = [],
            i,
            validNodes = core.getValidSetElementsMetaNodes(parameters);

        for (i = 0; i < validNodes.length; i += 1) {
            paths.push(core.getPath(validNodes[i]));
        }
        expect(paths).to.have.members(validPaths);
    });

    it('should return every possible member type despite multiplicity check if no members given', function () {
        var validPaths = [
                '/367050797/625420143'
            ],
            parameters = {
                node: baseNodes['/1924875415'],
                members: [],
                sensitive: true,
                multiplicity: true,
                name: 'ins'
            },
            paths = [],
            i,
            validNodes = core.getValidSetElementsMetaNodes(parameters);

        for (i = 0; i < validNodes.length; i += 1) {
            paths.push(core.getPath(validNodes[i]));
        }
        expect(paths).to.have.members(validPaths);
    });
});