/*globals requireJS*/
/* jshint node:true, mocha: true*/
/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../../_globals');

describe('Meta Rename', function () {
    'use strict';

    var logger = testFixture.logger.fork('MetaRename'),
        gmeConfig = testFixture.getGmeConfig(),
        storage,
        expect = testFixture.expect,
        Q = testFixture.Q,
        renames = requireJS('common/core/users/metarename'),
        propagateMetaDefinitionRename = renames.propagateMetaDefinitionRename,
        metaConceptRename = renames.metaConceptRename,
        metaConceptRenameInMeta = renames.metaConceptRenameInMeta,
        projectName = 'MetaRename',
        branchName = 'master',
        ir,
        core,
        rootNode,
        allMetaNodes,
        rootHash,
        gmeAuth;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                var importParam = {
                    projectSeed: './test/common/core/users/rename/propagate.webgmex',
                    projectName: projectName,
                    branchName: branchName,
                    logger: logger,
                    gmeConfig: gmeConfig
                };

                return testFixture.importProject(storage, importParam);
            })
            .then(function (importResult) {
                ir = importResult;
                rootHash = ir.core.getHash(ir.rootNode);
                core = ir.core;
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
        core.loadRoot(rootHash)
            .then(function (root) {
                rootNode = root;
                allMetaNodes = core.getAllMetaNodes(root);
            })
            .nodeify(done);
    });

    it('should change attribute definition in the meta only', function (done) {
        metaConceptRenameInMeta(core, allMetaNodes['/X/7'], 'attribute', 'some', 'something');

        expect(core.getValidAttributeNames(allMetaNodes['/X/7'])).to.have.members(['name', 'something']);
        core.loadByPath(rootNode, '/i/k')
            .then(function (node) {
                expect(core.getValidAttributeNames(node)).to.have.members(['name', 'something', 'one']);
                expect(core.getOwnAttributeNames(node)).to.have.members(['name', 'some', 'one']);
            })
            .nodeify(done);
    });

    it('should change pointer definition in the meta only', function (done) {
        metaConceptRenameInMeta(core, allMetaNodes['/X/I'], 'pointer', 'ptrOne', 'pOne');

        expect(core.getValidPointerNames(allMetaNodes['/X/I'])).to.have.members(['pOne']);
        core.loadByPath(rootNode, '/i/k')
            .then(function (node) {
                expect(core.getValidPointerNames(node)).to.have.members(['pOne']);
                expect(core.getOwnPointerNames(node)).to.have.members(['base', 'ptrOne']);
                expect(core.getPointerPath(node, 'pOne')).to.eql(undefined);
            })
            .nodeify(done);
    });

    it('should change set definition in the meta only', function (done) {
        metaConceptRenameInMeta(core, allMetaNodes['/X/I'], 'set', 'ones', 'onesYeah');

        expect(core.getValidSetNames(allMetaNodes['/X/I'])).to.have.members(['onesYeah']);
        core.loadByPath(rootNode, '/i/k')
            .then(function (node) {
                expect(core.getValidSetNames(node)).to.have.members(['onesYeah']);
                expect(core.getOwnSetNames(node)).to.have.members(['ones']);
                expect(core.getMemberPaths(node, 'onesYeah')).to.eql([]);
            })
            .nodeify(done);
    });

    it('should change aspect definition in the meta only', function (done) {
        metaConceptRenameInMeta(core, allMetaNodes['/X/w'], 'aspect', 'onsies', 'oneSet');

        expect(core.getValidAspectNames(allMetaNodes['/X/w'])).to.have.members(['duetts', 'others', 'oneSet']);
        core.loadByPath(rootNode, '/i')
            .then(function (node) {
                expect(core.getValidAspectNames(node)).to.have.members(['duetts', 'others', 'oneSet']);
                expect(core.getMemberPaths(node, 'onsies')).to.have.length(2);
                try {
                    expect(core.getMemberPaths(node, 'oneSet')).to.eql([]);
                    return new Error('shoud have thrown');
                } catch (e) {
                    return null;
                }
            })
            .nodeify(done);
    });

    it('should change attribute concept throughout the project', function (done) {
        metaConceptRename(core, allMetaNodes['/X/7'], 'attribute', 'some', 'something')
            .then(function () {
                expect(core.getValidAttributeNames(allMetaNodes['/X/7'])).to.have.members(['name', 'something']);
                return core.loadByPath(rootNode, '/i/k');
            })
            .then(function (node) {
                expect(core.getValidAttributeNames(node)).to.have.members(['name', 'something', 'one']);
                expect(core.getOwnAttributeNames(node)).to.have.members(['name', 'something', 'one']);
                expect(core.getAttribute(node, 'some')).to.eql(undefined);
            })
            .nodeify(done);
    });

    it('should change pointer concept throughout the project', function (done) {
        metaConceptRename(core, allMetaNodes['/X/I'], 'pointer', 'ptrOne', 'pOne')
            .then(function () {
                expect(core.getValidPointerNames(allMetaNodes['/X/I'])).to.have.members(['pOne']);
                return core.loadByPath(rootNode, '/i/k');
            })
            .then(function (node) {
                expect(core.getValidPointerNames(node)).to.have.members(['pOne']);
                expect(core.getOwnPointerNames(node)).to.have.members(['base', 'pOne']);
                expect(core.getPointerPath(node, 'pOne')).not.to.eql(undefined);
            })
            .nodeify(done);
    });

    it('should change set concept throughout the project', function (done) {
        metaConceptRename(core, allMetaNodes['/X/I'], 'set', 'ones', 'onesYeah')
            .then(function () {
                expect(core.getValidSetNames(allMetaNodes['/X/I'])).to.have.members(['onesYeah']);
                return core.loadByPath(rootNode, '/i/k');
            })
            .then(function (node) {
                expect(core.getValidSetNames(node)).to.have.members(['onesYeah']);
                expect(core.getOwnSetNames(node)).to.have.members(['onesYeah']);
                expect(core.getMemberPaths(node, 'onesYeah')).to.have.members(['/i/m']);
            })
            .nodeify(done);
    });

    it('should change aspect concept throughout the project', function (done) {
        metaConceptRename(core, allMetaNodes['/X/w'], 'aspect', 'onsies', 'oneSet')
            .then(function () {
                expect(core.getValidAspectNames(allMetaNodes['/X/w'])).to.have.members(['duetts', 'others', 'oneSet']);
                return core.loadByPath(rootNode, '/i');
            })
            .then(function (node) {
                expect(core.getValidAspectNames(node)).to.have.members(['duetts', 'others', 'oneSet']);
                expect(core.getMemberPaths(node, 'oneSet')).to.have.length(2);

            })
            .nodeify(done);
    });

    it('should change attribute definition data throughout the project', function (done) {
        core.renameAttributeMeta(allMetaNodes['/X/7'], 'some', 'something');
        propagateMetaDefinitionRename(core, allMetaNodes['/X/7'], {
            type: 'attribute', oldName: 'some', newName: 'something'
        })
            .then(function () {
                expect(core.getValidAttributeNames(allMetaNodes['/X/7'])).to.have.members(['name', 'something']);
                return core.loadByPath(rootNode, '/i/k');
            })
            .then(function (node) {
                expect(core.getValidAttributeNames(node)).to.have.members(['name', 'something', 'one']);
                expect(core.getOwnAttributeNames(node)).to.have.members(['name', 'something', 'one']);
                expect(core.getAttribute(node, 'some')).to.eql(undefined);
            })
            .nodeify(done);
    });

    it('should change pointer definition throughout the project', function (done) {
        core.movePointerMetaTarget(allMetaNodes['/X/I'], allMetaNodes['/X/a'], 'ptrOne', 'pOne');
        propagateMetaDefinitionRename(core, allMetaNodes['/X/I'], {
            type: 'pointer', oldName: 'ptrOne', newName: 'pOne', targetPath: '/X/a'
        })
            .then(function () {
                expect(core.getValidPointerNames(allMetaNodes['/X/I'])).to.have.members(['pOne']);
                return core.loadByPath(rootNode, '/i/k');
            })
            .then(function (node) {
                expect(core.getValidPointerNames(node)).to.have.members(['pOne']);
                expect(core.getOwnPointerNames(node)).to.have.members(['base', 'pOne']);
                expect(core.getPointerPath(node, 'pOne')).not.to.eql(undefined);
            })
            .nodeify(done);
    });

    it('should change set definition throughout the project', function (done) {
        core.movePointerMetaTarget(allMetaNodes['/X/I'], allMetaNodes['/X/a'], 'ones', 'onesYeah');
        propagateMetaDefinitionRename(core, allMetaNodes['/X/I'], {
            type: 'set', oldName: 'ones', newName: 'onesYeah', targetPath: '/X/a'
        })
            .then(function () {
                expect(core.getValidSetNames(allMetaNodes['/X/I'])).to.have.members(['onesYeah']);
                return core.loadByPath(rootNode, '/i/k');
            })
            .then(function (node) {
                expect(core.getValidSetNames(node)).to.have.members(['onesYeah']);
                expect(core.getOwnSetNames(node)).to.have.members(['onesYeah']);
                expect(core.getMemberPaths(node, 'onesYeah')).to.have.members(['/i/m']);
            })
            .nodeify(done);
    });

    it('should change aspect definition throughout the project', function (done) {
        core.moveAspectMetaTarget(allMetaNodes['/X/w'], allMetaNodes['/X/m'], 'onsies', 'oneSet');
        propagateMetaDefinitionRename(core, allMetaNodes['/X/w'], {
            type: 'aspect', oldName: 'onsies', newName: 'oneSet', targetPath: '/X/m'
        })
            .then(function () {
                expect(core.getValidAspectNames(allMetaNodes['/X/w'])).to.have.members(['duetts', 'others', 'oneSet']);
                return core.loadByPath(rootNode, '/i');
            })
            .then(function (node) {
                expect(core.getValidAspectNames(node)).to.have.members(['duetts', 'others', 'oneSet']);
                expect(core.getMemberPaths(node, 'oneSet')).to.have.length(2);

            })
            .nodeify(done);
    });
});