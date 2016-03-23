/* jshint node:true, mocha: true*/
/**
 * @author kecso / https://github.com/kecso
 */
var testFixture = require('../../_globals.js');

describe('Library core ', function () {
    'use strict';

    var gmeConfig,
        logger,
        Q,
        expect,
        storage,
        projectName = 'libCoreTests',
        project,
        root,
        core,
        commitHash,
        rootHash,
        REGEXP = testFixture.requirejs('common/regexp'),

        gmeAuth;

    function buildBasicLibrary() {
        var deferred = Q.defer(),
            FCO = core.getFCO(root),
            libRoot = core.createNode({base: null, parent: root, relid: 'L'}),
            libItem = core.createNode({base: FCO, parent: libRoot, relid: 'I'}),
            persisted;

        core.setAttribute(libRoot, 'name', 'basicLibrary');
        core.setAttribute(libItem, 'name', 'libItem');
        core.addMember(root, 'MetaAspectSet', libItem);
        core.setAttribute(libRoot, '_libraryInfo', {something: 'else'});

        persisted = core.persist(root);

        rootHash = persisted.rootHash;
        project.makeCommit(null, [], persisted.rootHash, persisted.objects, 'basicLibrary', function (err, result) {
            if (err) {
                deferred.reject(err);
                return;
            }

            commitHash = result.hash;

            core.loadRoot(rootHash)
                .then(function (root_) {
                    root = root_;
                    deferred.resolve();
                })
                .catch(deferred.reject);
        });
        return deferred.promise;
    }

    before(function (done) {
        gmeConfig = testFixture.getGmeConfig();
        logger = testFixture.logger.fork('LibraryCore');
        expect = testFixture.expect;
        Q = testFixture.Q;

        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(storage,
                    {
                        projectSeed: 'seeds/EmptyProject.json',
                        projectName: projectName,
                        branchName: 'base',
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
            })
            .then(function (importResult) {
                core = importResult.core;
                rootHash = importResult.rootHash;
                project = importResult.project;
                root = importResult.rootNode;
                return buildBasicLibrary();
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

    it('should return library root if only library name is know', function () {
        var libraryRoot = core.getLibraryRoot(root, 'basicLibrary');

        expect(core.getPath(libraryRoot)).to.equal('/L');
    });

    it('should return null for getLibraryRoot with unknown library name', function () {
        var libraryRoot = core.getLibraryRoot(root, 'unknown');

        expect(libraryRoot).to.equal(null);
    });

    it('should be able to decide if a node is library root', function () {
        expect(core.isLibraryRoot(root)).to.equal(false);
        expect(core.isLibraryRoot(core.getLibraryRoot(root, 'basicLibrary'))).to.equal(true);
        expect(core.isLibraryRoot(core.getAllMetaNodes(root)['/L/I'])).to.equal(false);
    });

    it('should be able to decide if a node is library element', function () {
        expect(core.isLibraryElement(root)).to.equal(false);
        expect(core.isLibraryElement(core.getLibraryRoot(root, 'basicLibrary'))).to.equal(false);
        expect(core.isLibraryElement(core.getAllMetaNodes(root)['/L/I'])).to.equal(true);
    });

    it('should return a fully qualified name for every node', function () {
        expect(core.getFullyQualifiedName(root)).to.equal('ROOT');
        expect(core.getFullyQualifiedName(core.getLibraryRoot(root, 'basicLibrary'))).to.equal('basicLibrary');
        expect(core.getFullyQualifiedName(core.getAllMetaNodes(root)['/L/I'])).to.equal('basicLibrary.libItem');
        expect(core.getFullyQualifiedName(core.getAllMetaNodes(root)['/1'])).to.equal('FCO');
    });

    it('should be able to compute the library GUID for every node', function () {
        expect(core.getGuid(core.getLibraryRoot(root, 'basicLibrary')))
            .not.to.equal(core.getLibraryGuid(core.getLibraryRoot(root, 'basicLibrary')));
        expect(core.getGuid(core.getAllMetaNodes(root)['/L/I']))
            .not.to.equal(core.getLibraryGuid(core.getAllMetaNodes(root)['/L/I']));
    });

    it('should list all library names', function () {
        expect(core.getLibraryNames(root)).to.eql(['basicLibrary']);
    });

    it('should return all library meta nodes by library name', function () {
        var libraryNodes = core.getLibraryNodes(root, 'basicLibrary');

        expect(Object.keys(libraryNodes)).to.have.length(1);
        expect(core.getPath(libraryNodes['/L/I'])).to.equal('/L/I');
    });

    it('should return the info of the library', function () {
        expect(core.getLibraryInfo(root, 'basicLibrary')).to.eql({something: 'else'});
    });

    it('should prevent library modification via setAttribute', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.setAttribute(metaNodes['/L/I'], 'anyAttribute', 'anyValue');

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via setRegistry', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.setRegistry(metaNodes['/L/I'], 'anyAttribute', 'anyValue');

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via createNode if parent is library item', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.createNode({parent: metaNodes['/L/I'], base: null});

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('cannot create new node inside a library');
    });

    it('should prevent library modification via createNode if parent is library root', function () {
        var metaNodes = core.getAllMetaNodes(root),
            libraryRoot,
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        libraryRoot = core.getLibraryRoot(metaNodes['/L/I'], 'basicLibrary');
        error = core.createNode({parent: libraryRoot, base: null});

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('cannot create new node inside a library');
    });

    it('should prevent library root usage as base of new node', function () {
        var metaNodes = core.getAllMetaNodes(root),
            libraryRoot,
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        libraryRoot = core.getLibraryRoot(metaNodes['/L/I'], 'basicLibrary');
        error = core.createNode({parent: root, base: libraryRoot});

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('cannot instantiate a library root');
    });

    it('should prevent to remove library element or root', function () {
        var error;

        error = core.deleteNode(core.getLibraryRoot(root, 'basicLibrary'));
        expect(error instanceof Error).to.equal(true);
        expect(error.message).to.contain('cannot remove library node by simply deleting them');

        error = core.deleteNode(core.getAllMetaNodes(root)['/L/I']);
        expect(error instanceof Error).to.equal(true);
        expect(error.message).to.contain('cannot remove library node by simply deleting them');
    });

    it('should prevent the copy of library root', function () {
        var error;

        error = core.copyNode(core.getLibraryRoot(root, 'basicLibrary'), root);
        expect(error instanceof Error).to.equal(true);
        expect(error.message).to.contain('cannot copy library root');

        error = core.copyNodes([core.getLibraryRoot(root, 'basicLibrary')], root);
        expect(error instanceof Error).to.equal(true);
        expect(error.message).to.contain('cannot copy library root');
    });

    it('should prevent the move of any library element', function () {
        var error;

        error = core.moveNode(core.getLibraryRoot(root, 'basicLibrary'), root);
        expect(error instanceof Error).to.equal(true);
        expect(error.message).to.contain('cannot move library elements');

        error = core.moveNode(core.getAllMetaNodes(root)['/L/I'], root);
        expect(error instanceof Error).to.equal(true);
        expect(error.message).to.contain('cannot move library elements');
    });

    it('should prevent library modification via delAttribute', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.delAttribute(metaNodes['/L/I'], 'name');

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via setRegistry', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.setRegistry(metaNodes['/L/I'], 'anyRegistry', 'anyValue');

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via delRegistry', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.delRegistry(metaNodes['/L/I'], 'any');

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via setPointer', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.setPointer(metaNodes['/L/I'], 'any', root);

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via deletePointer', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.deletePointer(metaNodes['/L/I'], 'any');

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via setBase', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.setBase(metaNodes['/L/I'], root);

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');

        error = core.setBase(core.getLibraryRoot(root, 'basicLibrary'), root);

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');

        error = core.setBase(metaNodes['/1'], core.getLibraryRoot(root, 'basicLibrary'));

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('library root cannot have instances');
    });

    it('should prevent library modification via addMember', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.addMember(metaNodes['/L/I'], 'any', root);

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via delMember', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.delMember(metaNodes['/L/I'], '');

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via setMemberAttribute', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.setMemberAttribute(metaNodes['/L/I'], 'any', '', 'any', 'any');

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via delMemberAttribute', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.delMemberAttribute(metaNodes['/L/I'], 'any', '', 'any');

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via setMemberRegistry', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.setMemberRegistry(metaNodes['/L/I'], 'any', '', 'any', 'any');

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via delMemberRegistry', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.delMemberRegistry(metaNodes['/L/I'], 'any', '', 'any');

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via createSet', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.createSet(metaNodes['/L/I'], 'any');

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via deleteSet', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.deleteSet(metaNodes['/L/I'], 'any');

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via setGuid', function (done) {
        var metaNodes = core.getAllMetaNodes(root),
            oldGuid;

        expect(metaNodes['/L/I']).not.to.equal(null);
        oldGuid = core.getGuid(metaNodes['/L/I']);

        core.setGuid(metaNodes['/L/I'], 'any')
            .then(function () {
                expect(core.getGuid(metaNodes['/L/I'])).to.equal(oldGuid);
            })
            .nodeify(done);

    });

    it('should prevent library modification via setConstraint', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.setConstraint(metaNodes['/L/I'], 'any', {'any': 'any'});

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via delConstraint', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.delConstraint(metaNodes['/L/I'], 'any');

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via clearMetaRules', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.delConstraint(metaNodes['/L/I'], 'any');

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via setAttributeMeta', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.setAttributeMeta(metaNodes['/L/I'], 'any', {});

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via delAttributeMeta', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.delAttributeMeta(metaNodes['/L/I'], 'any');

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via setChildMeta', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.setChildMeta(metaNodes['/L/I'], root, 1, 1);

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');

        error = core.setChildMeta(root, core.getLibraryRoot(root, 'basicLibrary'), 1, 1);

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('library root cannot be a valid child');
    });

    it('should prevent library modification via delChildMeta', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.delChildMeta(metaNodes['/L/I'], 'any');

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via setChildrenMetaLimits', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.setChildrenMetaLimits(metaNodes['/L/I'], 10, 10);

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via setPointerMetaTarget', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.setPointerMetaTarget(metaNodes['/L/I'], 'any', root, 1, 1);

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via delPointerMetaTarget', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.delPointerMetaTarget(metaNodes['/L/I'], 'any', 'any');

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via setPointerMetaLimits', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.setPointerMetaLimits(metaNodes['/L/I'], 'any', 10, 10);

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via delPointerMeta', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.delPointerMeta(metaNodes['/L/I'], 'any');

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via setAspectMetaTarget', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.setAspectMetaTarget(metaNodes['/L/I'], 'any', root);

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via delAspectMetaTarget', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.delAspectMetaTarget(metaNodes['/L/I'], 'any', 'any');

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via delAspectMeta', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.delAspectMeta(metaNodes['/L/I'], 'any');

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via delMixin', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.delMixin(metaNodes['/L/I'], 'any');

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should prevent library modification via addMixin', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.addMixin(metaNodes['/L/I'], 'any');

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');

        error = core.addMixin(root, '/L');

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('library root cannot be a mixin');
    });

    it('should prevent library modification via clearMixins', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        error = core.clearMixins(metaNodes['/L/I']);

        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error.message).to.contain('modify library');
    });

    it('should rename a library', function (done) {
        core.loadRoot(rootHash)
            .then(function (asyncRoot) {
                core.renameLibrary(asyncRoot, 'basicLibrary', 'basic');
                expect(core.getLibraryNames(asyncRoot)).to.eql(['basic']);
            })
            .nodeify(done);
    });

    it('should remove the library', function (done) {
        core.loadRoot(rootHash)
            .then(function (asyncRoot) {
                core.removeLibrary(asyncRoot, 'basicLibrary');
                expect(core.getLibraryNames(asyncRoot)).to.eql([]);
            })
            .nodeify(done);
    });

    it('should add a library', function (done) {
        var asyncRoot;
        core.loadRoot(rootHash)
            .then(function (asyncRoot_) {
                asyncRoot = asyncRoot_;
                return core.addLibrary(asyncRoot, 'myself', rootHash, {});
            })
            .then(function () {
                core.persist(asyncRoot);

                return core.loadRoot(core.getHash(asyncRoot));
            })
            .then(function (newRoot) {
                expect(core.getLibraryNames(newRoot)).to.have.members(['basicLibrary', 'myself', 'myself.basicLibrary']);
            })
            .nodeify(done);
    });

    it('should update a library which contains removal and move', function (done) {
        var firstHash,
            secondHash,
            asyncRoot,
            asyncFco,
            libPath,
            buildLibrary = function () {
                var deferred = Q.defer(),
                    lRoot = core.createNode(),
                    lFco = core.createNode({parent: lRoot, base: null, relid: 'FCO'}),
                    lCont = core.createNode({parent: lRoot, base: lFco, relid: 'Cont'}),
                    lRem = core.createNode({parent: lCont, base: lFco, relid: 'toRemove'}),
                    lMov = core.createNode({parent: lRoot, base: lFco, relid: 'toMove'}),
                    lNew;

                core.setAttribute(lRoot, 'name', 'ROOT');
                core.setAttribute(lFco, 'name', 'FCO');
                core.setAttribute(lCont, 'name', 'container');
                core.setAttribute(lRem, 'name', 'itemToremove');
                core.setAttribute(lMov, 'name', 'itemToMove');

                core.addMember(lRoot, 'MetaAspectSet', lFco);
                core.addMember(lRoot, 'MetaAspectSet', lRem);
                core.addMember(lRoot, 'MetaAspectSet', lMov);

                core.persist(lRoot);
                firstHash = core.getHash(lRoot);

                core.deleteNode(lRem);
                lMov = core.moveNode(lMov, lCont);
                lNew = core.createNode({parent: lRoot, base: lFco, relid: 'toAdd'});
                core.addMember(lRoot,'MetaAspectSet',lNew);

                core.persist(lRoot);
                secondHash = core.getHash(lRoot);
            };

        buildLibrary();

        asyncRoot = core.createNode();
        asyncFco = core.createNode({parent: asyncRoot, base: null, relid: 'FCO'});

        core.setAttribute(asyncRoot, 'name', 'ROOT');
        core.setAttribute(asyncFco, 'name', 'FCO');
        core.addMember(asyncRoot, 'MetaAspectSet', asyncFco);
        expect(core.getPath(core.getFCO(asyncRoot))).to.equal('/FCO');

        core.addLibrary(asyncRoot, 'library', firstHash, {})
            .then(function () {
                var libRoot = core.getLibraryRoot(asyncRoot, 'library');

                expect(core.getLibraryNames(asyncRoot)).to.eql(['library']);
                expect(libRoot).not.to.equal(null);
                libPath = core.getPath(libRoot);
                core.persist(asyncRoot);

                return core.loadRoot(core.getHash(asyncRoot));
            })
            .then(function (root_) {
                var node;
                asyncRoot = root_;
                asyncFco = core.getFCO(asyncRoot);

                expect(core.getCollectionPaths(asyncFco, 'base')).to.eql([libPath + '/FCO']);

                node = core.createNode({
                    parent: asyncRoot,
                    base: core.getAllMetaNodes(asyncRoot)[libPath + '/toMove'],
                    relid: 'node'
                });
                return core.updateLibrary(asyncRoot,'library',secondHash,{},{});
            })
            .then(function(){
                expect(core.getLibraryNames(asyncRoot)).to.eql(['library']);

                core.persist(asyncRoot);

                return core.loadRoot(core.getHash(asyncRoot));
            })
            .then(function(root_){
                asyncRoot = root_;
                asyncFco = core.getFCO(asyncRoot);

                return core.loadByPath(asyncRoot,'/node');
            })
            .then(function(node){
                expect(node).not.to.equal(null);
                expect(core.getPath(node)).to.equal('/node');
                expect(core.getPath(core.getBase(node))).to.equal(libPath+'/Cont/toMove');
                expect(core.getAllMetaNodes(node)[libPath+'/toAdd']).not.to.equal(undefined);
                expect(core.getAllMetaNodes(node)[libPath+'/Cont']).to.equal(undefined);
                expect(core.getAllMetaNodes(node)[libPath]).to.equal(undefined);
                expect(core.getAllMetaNodes(node)[libPath]+'/Cont/toMove').not.to.equal(undefined);
            })
            .nodeify(done);
    });
});