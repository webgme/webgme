/* jshint node:true, mocha: true, expr:true*/

/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../_globals.js');

describe('cached meta', function () {
    'user strict';

    var gmeConfig = testFixture.getGmeConfig(),
        Q = testFixture.Q,
        expect = testFixture.expect,
        logger = testFixture.logger.fork('cachedmetacore.spec'),
        storage,
        projectName = 'cachedMetaTesting',
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
                    projectSeed: 'test/common/core/cachedmetacore/project.json',
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
                return Q.allSettled([
                    Q.nfcall(core.loadByPath, root, '/1924875415'),
                    Q.nfcall(core.loadByPath, root, '/1924875415/1059131120'),
                    Q.nfcall(core.loadByPath, root, '/1924875415/1359805212'),
                    Q.nfcall(core.loadByPath, root, '/1924875415/1544821790')
                ]);
            })
            .then(function (results) {
                var i;
                for (i = 0; i < results.length; i += 1) {
                    expect(results[i].state).to.equal('fulfilled');
                    if (baseNodes[core.getPath(results[i].value)] === null) {
                        baseNodes[core.getPath(results[i].value)] = results[i].value;
                    }
                }
            })
            .nodeify(done);
    });

    it('should return all meta nodes', function () {
        var metaPaths = ['/1',
            '/367050797',
            '/367050797/1776478501',
            '/367050797/625420143',
            '/367050797/1626677559',
            '/367050797/355480347'
        ];

        expect(Object.keys(core.getAllMetaNodes(baseNodes['/1924875415']) || {})).to.have.members(metaPaths);
    });

    it('should have and empty meta node set for a newly created root', function () {
        var newRoot = core.createNode();
        expect(core.getAllMetaNodes(newRoot)).to.deep.equal({});
    });

    it('should follow if you remove an element from the META aspect', function () {
        var metaPaths = ['/1',
            '/367050797',
            '/367050797/1776478501',
            '/367050797/625420143',
            '/367050797/1626677559',
            '/367050797/355480347'
        ];

        core.delMember(rootNode, 'MetaAspectSet', metaPaths.pop());

        expect(Object.keys(core.getAllMetaNodes(baseNodes['/1924875415']) || {})).to.have.members(metaPaths);
    });

    it('should follow if you add a new node to your META', function () {
        var metaPaths = ['/1',
            '/367050797',
            '/367050797/1776478501',
            '/367050797/625420143',
            '/367050797/1626677559',
            '/367050797/355480347',
            '/1924875415'
        ];

        core.addMember(rootNode, 'MetaAspectSet', baseNodes['/1924875415']);
        metaNodePaths = Object.keys(core.getAllMetaNodes(baseNodes['/1924875415']) || {});

        expect(Object.keys(core.getAllMetaNodes(baseNodes['/1924875415']) || {})).to.have.members(metaPaths);
    });

    it('should follow if you delete a META node', function () {
        var metaPaths = ['/1',
                '/367050797',
                '/367050797/1776478501',
                '/367050797/625420143',
                '/367050797/1626677559'
            ],
            nodeToRemove = core.getAllMetaNodes(rootNode)['/367050797/355480347'];

        core.deleteNode(nodeToRemove);

        expect(Object.keys(core.getAllMetaNodes(baseNodes['/1924875415']) || {})).to.have.members(metaPaths);
    });

    it('should follow if you move a META node', function () {
        var metaPaths = ['/1',
                '/367050797',
                '/367050797/1776478501',
                '/367050797/625420143',
                '/367050797/1626677559',
                '/355480347'
            ],
            nodeToMove = core.getAllMetaNodes(rootNode)['/367050797/355480347'];

        nodeToMove = core.moveNode(nodeToMove, rootNode);

        expect(Object.keys(core.getAllMetaNodes(baseNodes['/1924875415']) || {})).to.have.members(metaPaths);
    });

    it('should decide if a node is META or not by checking if it is in the container set', function () {
        var metaNode = core.getAllMetaNodes(rootNode)['/367050797/1626677559'],
            nonMetaNode = baseNodes['/1924875415'];

        expect(core.isMetaNode(metaNode)).to.equal(true);
        expect(core.isMetaNode(nonMetaNode)).to.equal(false);
    });

    it('should check the whether the node is abstract', function () {
        var absNode = core.getAllMetaNodes(rootNode)['/367050797/1776478501'],
            nonAbsNode = core.getAllMetaNodes(rootNode)['/367050797/355480347'];

        expect(core.isAbstract(absNode)).to.equal(true);
        expect(core.isAbstract(nonAbsNode)).to.equal(false);
    });

    it('should check whether a node is connection type', function () {
        var nonConnection = core.getAllMetaNodes(rootNode)['/367050797/1776478501'];

        expect(core.isConnection(nonConnection)).to.equal(false);
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