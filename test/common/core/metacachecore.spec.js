/* jshint node:true, mocha: true, expr:true*/

/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../_globals.js');

describe('meta cache core', function () {
    'user strict';

    var gmeConfig = testFixture.getGmeConfig(),
        Q = testFixture.Q,
        expect = testFixture.expect,
        logger = testFixture.logger.fork('metacachecore.spec'),
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

    it('should detect if some META element have been deleted during load', function (done) {
        //core.delMember(rootNode, 'MetaAspectSet', metaPaths.pop());
        var root = core.createNode({}),
            itemBase = core.createNode({parent: root}),
            item = core.createNode({parent: root, base: itemBase}),
            itemPath = core.getPath(item),
            hash = core.getHash(root);

        core.addMember(root, 'MetaAspectSet', itemBase);
        core.addMember(root, 'MetaAspectSet', item);

        expect(Object.keys(core.getAllMetaNodes(root))).to.have.length(2);
        core.persist(root);
        hash = core.getHash(root);

        core.loadRoot(hash)
            .then(function (root) {
                var item;
                expect(Object.keys(core.getAllMetaNodes(root))).to.have.length(2);

                item = core.getAllMetaNodes(root)[itemPath];
                core.deleteNode(item);
                core.persist(root);
                hash = core.getHash(root);

                return core.loadRoot(hash);
            })
            .then(function (root) {
                expect(Object.keys(core.getAllMetaNodes(root))).to.have.length(1);
            })
            .nodeify(done);
    });

    it('should clean up the meta-cache if an upper node is deleted in an type-chain', function (done) {
        var root = core.createNode(),
            FCO = core.createNode({parent: root, relid: 'FCO'}),
            top = core.createNode({parent: root, base: FCO, relid: 'top'}),
            middle = core.createNode({parent: root, base: top, relid: 'middle'}),
            bottom = core.createNode({parent: root, base: middle, relid: 'bottom'});

        core.addMember(root, 'MetaAspectSet', FCO);
        core.addMember(root, 'MetaAspectSet', top);
        core.addMember(root, 'MetaAspectSet', middle);
        core.addMember(root, 'MetaAspectSet', bottom);

        expect(Object.keys(core.getAllMetaNodes(root))).to.have.length(4);

        core.persist(root);

        core.loadRoot(core.getHash(root))
            .then(function (root_) {
                expect(Object.keys(core.getAllMetaNodes(root_))).to.have.length(4);
                core.deleteNode(core.getAllMetaNodes(root_)['/top']);
                core.persist(root_);

                return core.loadRoot(core.getHash(root_));
            })
            .then(function (root_) {
                expect(Object.keys(core.getAllMetaNodes(root_))).to.have.length(1);
            })
            .nodeify(done);

    });
});