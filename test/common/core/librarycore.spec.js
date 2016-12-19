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
        CONSTANTS = testFixture.requirejs('common/core/constants'),
        shareContext,
        shareProjectName = 'libCoreShareTests',
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

    function checkError(error, errorType) {
        expect(error).not.to.equal(null);
        expect(error).not.to.equal(undefined);
        expect(error instanceof Error).to.eql(true);
        expect(error.name).to.eql(errorType || 'CoreIllegalOperationError');
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
                        projectSeed: 'seeds/EmptyProject.webgmex',
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
            .then(function () {
                return testFixture.importProject(storage,
                    {
                        projectSeed: 'test/common/core/librarycore/share.webgmex',
                        projectName: shareProjectName,
                        branchName: 'share',
                        gmeConfig: gmeConfig,
                        logger: logger
                    });
            })
            .then(function (shareContext_) {
                shareContext = shareContext_;
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
        expect(core.getLibraryGuid(core.getLibraryRoot(root, 'basicLibrary'))).not.to.equal(CONSTANTS.NULL_GUID);
        expect(core.getGuid(core.getLibraryRoot(root, 'basicLibrary'))).not.to.equal(CONSTANTS.NULL_GUID);
        expect(core.getGuid(core.getAllMetaNodes(root)['/L/I']))
            .not.to.equal(core.getLibraryGuid(core.getAllMetaNodes(root)['/L/I']));
        expect(core.getLibraryGuid(core.getAllMetaNodes(root)['/L/I'], 'basicLibrary'))
            .to.equal(core.getLibraryGuid(core.getAllMetaNodes(root)['/L/I']));
        expect(core.getLibraryGuid(core.getAllMetaNodes(root)['/L/I'])).not.to.equal(CONSTANTS.NULL_GUID);
        expect(core.getGuid(core.getAllMetaNodes(root)['/L/I'])).not.to.equal(CONSTANTS.NULL_GUID);
    });

    it('should give error if not a library member is asked for library GUID', function () {
        var error;
        try {
            core.getLibraryGuid(root);
        } catch (e) {
            error = e;
        } finally {
            expect(error.message).to.contain('Node is not a library member');
        }
    });

    it('should give error if unknown library was given to look for library GUID', function () {
        var error;
        try {
            core.getLibraryGuid(core.getAllMetaNodes(root)['/L/I'], 'unknown');
        } catch (e) {
            error = e;
        } finally {
            expect(error.message).to.contain('Unknown library was given');
        }
    });

    it('should list all library names', function () {
        expect(core.getLibraryNames(root)).to.eql(['basicLibrary']);
    });

    it('should return all library meta nodes by library name', function () {
        var libraryNodes = core.getLibraryMetaNodes(root, 'basicLibrary');

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

        try {
            core.setAttribute(metaNodes['/L/I'], 'anyAttribute', 'anyValue');
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }
    });

    it('should prevent library modification via setRegistry', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.setRegistry(metaNodes['/L/I'], 'anyAttribute', 'anyValue');
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }
    });

    it('should prevent library modification via createNode if parent is library item', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.createNode({parent: metaNodes['/L/I'], base: null});
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }

    });

    it('should prevent library modification via createNode if parent is library root', function () {
        var metaNodes = core.getAllMetaNodes(root),
            libraryRoot,
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        libraryRoot = core.getLibraryRoot(metaNodes['/L/I'], 'basicLibrary');
        try {
            core.createNode({parent: libraryRoot, base: null});
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }

    });

    it('should prevent library root usage as base of new node', function () {
        var metaNodes = core.getAllMetaNodes(root),
            libraryRoot,
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        libraryRoot = core.getLibraryRoot(metaNodes['/L/I'], 'basicLibrary');
        try {
            core.createNode({parent: root, base: libraryRoot});
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }

    });

    it('should prevent to remove library element or root', function () {
        var error;

        try {
            core.deleteNode(core.getLibraryRoot(root, 'basicLibrary'));
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
            error = null;
        }

        try {
            core.deleteNode(core.getAllMetaNodes(root)['/L/I']);
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }
    });

    it('should prevent the copy of library root', function () {
        var error;

        try {
            core.copyNode(core.getLibraryRoot(root, 'basicLibrary'), root);
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
            error = null;
        }

        try {
            core.copyNodes([core.getLibraryRoot(root, 'basicLibrary')], root);
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }
    });

    it('should prevent the move of any library element', function () {
        var error;

        try {
            core.moveNode(core.getLibraryRoot(root, 'basicLibrary'), root);
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
            error = null;
        }

        try {
            core.moveNode(core.getAllMetaNodes(root)['/L/I'], root);
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }
    });

    it('should prevent library modification via delAttribute', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.delAttribute(metaNodes['/L/I'], 'name');
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }
    });

    it('should prevent library modification via setRegistry', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.setRegistry(metaNodes['/L/I'], 'anyRegistry', 'anyValue');
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }
    });

    it('should prevent library modification via delRegistry', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.delRegistry(metaNodes['/L/I'], 'any');
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }
    });

    it('should prevent library modification via setPointer', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.setPointer(metaNodes['/L/I'], 'any', root);
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }
    });

    it('should prevent library modification via deletePointer', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.deletePointer(metaNodes['/L/I'], 'any');
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }
    });

    it('should prevent library modification via setBase', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.setBase(metaNodes['/L/I'], root);
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
            error = null;
        }

        try {
            core.setBase(core.getLibraryRoot(root, 'basicLibrary'), root);
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
            error = null;
        }

        try {
            core.setBase(metaNodes['/1'], core.getLibraryRoot(root, 'basicLibrary'));
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }
    });

    it('should prevent library modification via addMember', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.addMember(metaNodes['/L/I'], 'any', root);
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }
    });

    it('should prevent library modification via delMember', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.delMember(metaNodes['/L/I'], '');
        } catch (e) {
            error = e;
        } finally {
            checkError(error, 'CoreIllegalArgumentError');
        }
    });

    it('should prevent library modification via setMemberAttribute', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.setMemberAttribute(metaNodes['/L/I'], 'any', '', 'any', 'any');
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }
    });

    it('should prevent library modification via delMemberAttribute', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.delMemberAttribute(metaNodes['/L/I'], 'any', '', 'any');
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }
    });

    it('should prevent library modification via setMemberRegistry', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.setMemberRegistry(metaNodes['/L/I'], 'any', '', 'any', 'any');
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }
    });

    it('should prevent library modification via delMemberRegistry', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.delMemberRegistry(metaNodes['/L/I'], 'any', '', 'any');
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }
    });

    it('should prevent library modification via createSet', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.createSet(metaNodes['/L/I'], 'any');
        } catch (e) {
            error = e;
        } finally {
            expect(error).not.to.equal(null);
            expect(error).not.to.equal(undefined);
            expect(error.message).to.contain('Not allowed to');
        }
    });

    it('should prevent library modification via deleteSet', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.deleteSet(metaNodes['/L/I'], 'any');
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }
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

        try {
            core.setConstraint(metaNodes['/L/I'], 'any', {'any': 'any'});
        } catch (e) {
            error = e;
        } finally {
            expect(error).not.to.equal(null);
            expect(error).not.to.equal(undefined);
            expect(error.message).to.contain('Not allowed to');
        }
    });

    it('should prevent library modification via delConstraint', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.delConstraint(metaNodes['/L/I'], 'any');
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }
    });

    it('should prevent library modification via clearMetaRules', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.delConstraint(metaNodes['/L/I'], 'any');
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }
    });

    it('should prevent library modification via setAttributeMeta', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.setAttributeMeta(metaNodes['/L/I'], 'any', {});
        } catch (e) {
            error = e;
        } finally {
            checkError(error,'CoreIllegalArgumentError');
        }
    });

    it('should prevent library modification via delAttributeMeta', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.delAttributeMeta(metaNodes['/L/I'], 'any');
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }
    });

    it('should prevent library modification via setChildMeta', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.setChildMeta(metaNodes['/L/I'], root, 1, 1);
        } catch (e) {
            error = e;
        } finally {
            expect(error).not.to.equal(null);
            expect(error).not.to.equal(undefined);
            expect(error.message).to.contain('Not allowed to');
            error = null;
        }

        try {
            core.setChildMeta(root, core.getLibraryRoot(root, 'basicLibrary'), 1, 1);
        } catch (e) {
            error = e;
        } finally {
            expect(error).not.to.equal(null);
            expect(error).not.to.equal(undefined);
            expect(error.message).to.contain('Not allowed to');
        }
    });

    it('should prevent library modification via delChildMeta', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.delChildMeta(metaNodes['/L/I'], 'any');
        } catch (e) {
            error = e;
        } finally {
            checkError(error,'CoreIllegalArgumentError');
        }
    });

    it('should prevent library modification via setChildrenMetaLimits', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.setChildrenMetaLimits(metaNodes['/L/I'], 10, 10);
        } catch (e) {
            error = e;
        } finally {
            expect(error).not.to.equal(null);
            expect(error).not.to.equal(undefined);
            expect(error.message).to.contain('Not allowed to');
        }
    });

    it('should prevent library modification via setPointerMetaTarget', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.setPointerMetaTarget(metaNodes['/L/I'], 'any', root, 1, 1);
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }
    });

    it('should prevent library modification via delPointerMetaTarget', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.delPointerMetaTarget(metaNodes['/L/I'], 'any', 'any');
        } catch (e) {
            error = e;
        } finally {
            checkError(error,'CoreIllegalArgumentError');
        }
    });

    it('should prevent library modification via setPointerMetaLimits', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.setPointerMetaLimits(metaNodes['/L/I'], 'any', 10, 10);
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }
    });

    it('should prevent library modification via delPointerMeta', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.delPointerMeta(metaNodes['/L/I'], 'any');
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }
    });

    it('should prevent library modification via setAspectMetaTarget', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.setAspectMetaTarget(metaNodes['/L/I'], 'any', root);
        } catch (e) {
            error = e;
        } finally {
            expect(error).not.to.equal(null);
            expect(error).not.to.equal(undefined);
            expect(error.message).to.contain('Not allowed to');
        }
    });

    it('should prevent library modification via delAspectMetaTarget', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.delAspectMetaTarget(metaNodes['/L/I'], 'any', 'any');
        } catch (e) {
            error = e;
        } finally {
            checkError(error,'CoreIllegalArgumentError');
        }
    });

    it('should prevent library modification via delAspectMeta', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.delAspectMeta(metaNodes['/L/I'], 'any');
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }
    });

    it('should prevent library modification via delMixin', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.delMixin(metaNodes['/L/I'], '/1');
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }
    });

    it('should prevent library modification via addMixin', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.addMixin(metaNodes['/L/I'], '/1');
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
            error = null;
        }

        try {
            core.addMixin(root, '/L');
        } catch (e) {
            error = e;
        } finally {
            checkError(error);
        }
    });

    it('should prevent library modification via clearMixins', function () {
        var metaNodes = core.getAllMetaNodes(root),
            error;

        expect(metaNodes['/L/I']).not.to.equal(null);

        try {
            core.clearMixins(metaNodes['/L/I']);
        } catch (e) {
            error = e;
        } finally {
            expect(error).not.to.equal(null);
            expect(error).not.to.equal(undefined);
            expect(error.message).to.contain('Not allowed to');
        }
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
                core.addMember(lRoot, 'MetaAspectSet', lNew);

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
                return core.updateLibrary(asyncRoot, 'library', secondHash, {}, {});
            })
            .then(function () {
                expect(core.getLibraryNames(asyncRoot)).to.eql(['library']);

                core.persist(asyncRoot);

                return core.loadRoot(core.getHash(asyncRoot));
            })
            .then(function (root_) {
                asyncRoot = root_;
                asyncFco = core.getFCO(asyncRoot);

                return core.loadByPath(asyncRoot, '/node');
            })
            .then(function (node) {
                expect(node).not.to.equal(null);
                expect(core.getPath(node)).to.equal('/node');
                expect(core.getPath(core.getBase(node))).to.equal(libPath + '/Cont/toMove');
                expect(core.getAllMetaNodes(node)[libPath + '/toAdd']).not.to.equal(undefined);
                expect(core.getAllMetaNodes(node)[libPath + '/Cont']).to.equal(undefined);
                expect(core.getAllMetaNodes(node)[libPath]).to.equal(undefined);
                expect(core.getAllMetaNodes(node)[libPath] + '/Cont/toMove').not.to.equal(undefined);
            })
            .nodeify(done);
    });

    it('should update a library with removal of non-language node', function (done) {
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

                core.deleteNode(lCont);

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
                return core.updateLibrary(asyncRoot, 'library', secondHash, {}, {});
            })
            .then(function () {
                expect(core.getLibraryNames(asyncRoot)).to.eql(['library']);

                core.persist(asyncRoot);

                return core.loadRoot(core.getHash(asyncRoot));
            })
            .then(function (root_) {
                asyncRoot = root_;
                asyncFco = core.getFCO(asyncRoot);

                return core.loadByPath(asyncRoot, '/node');
            })
            .then(function (node) {
                expect(node).not.to.equal(null);
                expect(core.getPath(node)).to.equal('/node');
                expect(core.getAllMetaNodes(node)[libPath + '/Cont']).to.equal(undefined);
                expect(core.getAllMetaNodes(node)[libPath]).to.equal(undefined);
                expect(core.getAllMetaNodes(node)[libPath] + '/Cont/toMove').not.to.equal(undefined);
            })
            .nodeify(done);
    });

    it('should update a library of an imported project', function (done) {
        var core, rootHash, root, project,
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
                return core.getHash(lRoot);
            };

        testFixture.importProject(storage,
            {
                projectSeed: 'test/common/core/librarycore/project.webgmex',
                projectName: 'importedLibrary',
                branchName: 'master',
                gmeConfig: gmeConfig,
                logger: logger
            })
            .then(function (importResult) {
                core = importResult.core;
                rootHash = importResult.rootHash;
                project = importResult.project;
                root = importResult.rootNode;
                return buildLibrary();
            })
            .then(function (hash) {
                var nodes;

                nodes = core.getAllMetaNodes(root);
                expect(nodes).not.to.equal(null);
                expect(nodes['/1']).not.to.equal(undefined);
                expect(nodes['/a/q']).not.to.equal(undefined);
                expect(core.getAttribute(nodes['/a/q'], 'name')).to.equal('element');

                return core.updateLibrary(root, 'library', hash, {}, {});
            })
            .then(function () {
                core.persist(root);

                return core.loadRoot(core.getHash(root));
            })
            .then(function (root_) {
                var nodes;

                nodes = core.getAllMetaNodes(root_);
                expect(nodes).not.to.equal(null);
                expect(nodes['/1']).not.to.equal(undefined);
                expect(nodes['/a/q']).to.equal(undefined);
                expect(nodes['/a/toMove']).not.to.equal(undefined);
                expect(core.getAttribute(nodes['/a/toMove'], 'name')).to.equal('itemToMove');
            })
            .nodeify(done);
    });

    it('getNamespace should return empty string for non-library nodes', function () {
        expect(core.getNamespace(core.getFCO(root))).to.equal('');
    });

    it('getNamespace should return library name for nodes in a library', function () {
        var libNodes = core.getLibraryMetaNodes(root, 'basicLibrary');

        Object.keys(libNodes).forEach(function (libNodePath) {
            expect(core.getNamespace(libNodes[libNodePath])).to.equal('basicLibrary');
        });
    });

    it('getLibraryMetaNodes should distinguish between nodes with same full-name', function () {
        var fcoNode = core.getFCO(root),
            libNames = core.getLibraryNames(fcoNode),
            newFcoName;

        expect(libNames).to.deep.equal(['basicLibrary']);

        newFcoName = 'basicLibrary' + '.' + 'I';
        core.setAttribute(fcoNode, 'name', newFcoName);

        expect(Object.keys(core.getLibraryMetaNodes(fcoNode, 'basicLibrary'))).to.deep.equal(['/L/I']);
    });

    it('should generate a proper closure information', function (done) {
        Q.all([
            shareContext.core.loadByPath(shareContext.rootNode, '/E'),
            shareContext.core.loadByPath(shareContext.rootNode, '/Q'),
            shareContext.core.loadByPath(shareContext.rootNode, '/Q/P')
        ])
            .then(function (nodes) {
                var closure = shareContext.core.getClosureInformation(nodes);

                expect(closure).not.to.eql(null);
                expect(Object.keys(closure.selection)).to.have.length(2);
                expect(closure.selection).to.eql({
                    '8b58a986-de24-fc50-61ed-8fdb095d2dff': '#8dd00ed313a9ea1f020982a559ca99018c0fc8b7',
                    '3e801ed3-efa7-c527-eb91-91fefc521f2a': '#9214662e087d95c97517a5225150ef523b67d058'
                });
                expect(closure.relations.preserved['#9214662e087d95c97517a5225150ef523b67d058/W'].base).to.equal(
                    '#8dd00ed313a9ea1f020982a559ca99018c0fc8b7/V'
                );
                expect(closure.relations.lost).to.eql({});
            })
            .nodeify(done);
    });

    it('should generate a proper closure information with losses', function (done) {
        Q.all([
            shareContext.core.loadByPath(shareContext.rootNode, '/E'),
            shareContext.core.loadByPath(shareContext.rootNode, '/Q/W'),
            shareContext.core.loadByPath(shareContext.rootNode, '/Q/C'),
            shareContext.core.loadByPath(shareContext.rootNode, '/Q/T')
        ])
            .then(function (nodes) {
                var closure = shareContext.core.getClosureInformation(nodes);

                expect(closure).not.to.eql(null);
                expect(Object.keys(closure.selection)).to.have.length(4);
                expect(closure.selection).to.eql({
                    '8b58a986-de24-fc50-61ed-8fdb095d2dff': '#8dd00ed313a9ea1f020982a559ca99018c0fc8b7',
                    'b3c8fde1-7efc-5178-54ea-4b86fb0542fe': '#5204b443ed3e8f0a3a86f15e7030d10c52e42a65',
                    'e1d25d7e-7af8-6d9b-8ecf-65908c2063a3': '#55fb962119de9dc4afc80767dbc0288438c1f4df',
                    'c19737ae-2547-d608-9afa-5de493b4c2dd': '#e22a53655588bf011a2e9fc3019c82a13d87a4d1'
                });
                expect(closure.relations.lost).to.eql({'/Q/T': {src: '/Q/P'}});
            })
            .nodeify(done);
    });

    it('should generate an error if some base is not inside META', function (done) {
        Q.all([
            shareContext.core.loadByPath(shareContext.rootNode, '/Q'),
            shareContext.core.loadByPath(shareContext.rootNode, '/Q/P')
        ])
            .then(function (nodes) {
                shareContext.core.getClosureInformation(nodes);

                throw new Error('missing error handling in library core');
            })
            .catch(function (error) {
                expect(error).not.to.eql(null);
                expect(error instanceof Error).to.equal(true);
                expect(error.message).to.contains('cannot be created');
                expect(error.message).to.contains('base');
            })
            .nodeify(done);
    });

    it('should generate an error if root is in the selection', function (done) {
        Q.all([
            shareContext.core.loadByPath(shareContext.rootNode, '/Q'),
            shareContext.core.loadByPath(shareContext.rootNode, '/Q/P'),
            shareContext.core.loadByPath(shareContext.rootNode, '')
        ])
            .then(function (nodes) {
                shareContext.core.getClosureInformation(nodes);

                throw new Error('missing error handling in library core');
            })
            .catch(function (error) {
                expect(error).not.to.eql(null);
                expect(error instanceof Error).to.equal(true);
                expect(error.message).to.contains('Cannot select the project root!');
            })
            .nodeify(done);
    });

    it('should generate an error if library root is selected', function (done) {
        Q.all([
            shareContext.core.loadByPath(shareContext.rootNode, '/Q'),
            shareContext.core.loadByPath(shareContext.rootNode, '/Q/P'),
            shareContext.core.loadByPath(shareContext.rootNode, '/V/G')
        ])
            .then(function (nodes) {
                shareContext.core.getClosureInformation(nodes);

                throw new Error('missing error handling in library core');
            })
            .catch(function (error) {
                expect(error).not.to.eql(null);
                expect(error instanceof Error).to.equal(true);
                expect(error.message).to.contains('Cannot select node');
                expect(error.message).to.contains('library content');
            })
            .nodeify(done);
    });

    it('should generate a proper closure information then import it back', function (done) {
        var closure,
            paths = [];
        Q.all([
            shareContext.core.loadByPath(shareContext.rootNode, '/E'),
            shareContext.core.loadByPath(shareContext.rootNode, '/Q'),
            shareContext.core.loadByPath(shareContext.rootNode, '/Q/P')
        ])
            .then(function (nodes) {
                closure = shareContext.core.getClosureInformation(nodes);

                expect(closure).not.to.eql(null);
                expect(Object.keys(closure.selection)).to.have.length(2);

                closure = shareContext.core.importClosure(shareContext.rootNode, closure);
                expect(closure).not.to.eql(null);
                expect(Object.keys(closure.relids)).to.have.members([
                    '#8dd00ed313a9ea1f020982a559ca99018c0fc8b7',
                    '#9214662e087d95c97517a5225150ef523b67d058']);

                paths.push('/' + closure.relids['#8dd00ed313a9ea1f020982a559ca99018c0fc8b7']);
                paths.push('/' + closure.relids['#9214662e087d95c97517a5225150ef523b67d058']);
                return Q.all([
                    shareContext.core.loadByPath(shareContext.rootNode, paths[0]),
                    shareContext.core.loadByPath(shareContext.rootNode, paths[1])
                ]);
            })
            .then(function (newNodes) {
                expect(newNodes).to.have.length(2);
                expect(shareContext.core.getChildrenRelids(newNodes[0])).to.have.members(['V', 'e']);
                expect(shareContext.core.getChildrenRelids(newNodes[1])).to.have.members([
                    'P', 'T', 'X', 'W', 'g', 'C', 'M', 'm'
                ]);
            })
            .nodeify(done);
    });

    it('should import closure without the losses', function (done) {
        var closure;
        Q.all([
            shareContext.core.loadByPath(shareContext.rootNode, '/E'),
            shareContext.core.loadByPath(shareContext.rootNode, '/Q/W'),
            shareContext.core.loadByPath(shareContext.rootNode, '/Q/C'),
            shareContext.core.loadByPath(shareContext.rootNode, '/Q/T')
        ])
            .then(function (nodes) {
                closure = shareContext.core.getClosureInformation(nodes);

                expect(closure).not.to.eql(null);
                expect(Object.keys(closure.selection)).to.have.length(4);

                closure = shareContext.core.importClosure(shareContext.rootNode, closure);
                expect(closure).not.to.eql(null);
                expect(Object.keys(closure.relids)).to.have.members([
                    '#8dd00ed313a9ea1f020982a559ca99018c0fc8b7',
                    '#5204b443ed3e8f0a3a86f15e7030d10c52e42a65',
                    '#55fb962119de9dc4afc80767dbc0288438c1f4df',
                    '#e22a53655588bf011a2e9fc3019c82a13d87a4d1']);

                return shareContext.core.loadByPath(shareContext.rootNode,
                    '/' + closure.relids['#e22a53655588bf011a2e9fc3019c82a13d87a4d1']);
            })
            .then(function (halfConnection) {
                expect(shareContext.core.getGuid(halfConnection)).not.to.equal('c19737ae-2547-d608-9afa-5de493b4c2dd');
                expect(shareContext.core.getPointerPath(halfConnection, 'src')).to.eql(null);
                expect(shareContext.core.getPointerPath(halfConnection, 'dst')).not.to.eql(null);
                expect(shareContext.core.getValidPointerNames(halfConnection)).to.include.members(['src', 'dst']);
            })
            .nodeify(done);
    });

    it('should import if closure base matches only by originGuid', function (done) {
        var closure,
            paths = [],
            names,
            i;

        Q.all([
            shareContext.core.loadByPath(shareContext.rootNode, '/E'),
            shareContext.core.loadByPath(shareContext.rootNode, '/Q'),
            shareContext.core.loadByPath(shareContext.rootNode, '/Q/P')
        ])
            .then(function (nodes) {
                closure = shareContext.core.getClosureInformation(nodes);

                expect(closure).not.to.eql(null);
                expect(Object.keys(closure.selection)).to.have.length(2);

                closure.bases['6686433f-c77c-61a5-cd70-000000000000'] =
                    closure.bases['6686433f-c77c-61a5-cd70-e12860311fe1'];
                delete closure.bases['6686433f-c77c-61a5-cd70-e12860311fe1'];
                closure = shareContext.core.importClosure(shareContext.rootNode, closure);
                expect(closure).not.to.eql(null);

                expect(Object.keys(closure.relids)).to.have.members([
                    '#8dd00ed313a9ea1f020982a559ca99018c0fc8b7',
                    '#9214662e087d95c97517a5225150ef523b67d058']);

                paths.push('/' + closure.relids['#8dd00ed313a9ea1f020982a559ca99018c0fc8b7']);
                paths.push('/' + closure.relids['#9214662e087d95c97517a5225150ef523b67d058']);
                return Q.all([
                    shareContext.core.loadByPath(shareContext.rootNode, paths[0]),
                    shareContext.core.loadByPath(shareContext.rootNode, paths[1])
                ]);

            })
            .then(function (newNodes) {
                expect(newNodes).to.have.length(2);
                expect(shareContext.core.getChildrenRelids(newNodes[0])).to.have.members(['V', 'e']);
                expect(shareContext.core.getChildrenRelids(newNodes[1])).to.have.members([
                    'P', 'T', 'X', 'W', 'g', 'C', 'M', 'm'
                ]);

                //checking the relations, they all should be valid
                var names = shareContext.core.getPointerNames(newNodes[0]);
                for (i = 0; i < names.length; i += 1) {
                    expect(shareContext.core.getPointerPath(newNodes[0], names[i])).not.to.eql(null);
                    expect(shareContext.core.getPointerPath(newNodes[0], names[i])).not.to.eql(undefined);
                }
            })
            .nodeify(done);
    });

    it('should fail to import if closure missing a base', function (done) {
        var closure;
        Q.all([
            shareContext.core.loadByPath(shareContext.rootNode, '/E'),
            shareContext.core.loadByPath(shareContext.rootNode, '/Q'),
            shareContext.core.loadByPath(shareContext.rootNode, '/Q/P')
        ])
            .then(function (nodes) {
                closure = shareContext.core.getClosureInformation(nodes);

                expect(closure).not.to.eql(null);
                expect(Object.keys(closure.selection)).to.have.length(2);

                closure.bases['6686433f-c77c-61a5-cd70-000000000000'] =
                    closure.bases['6686433f-c77c-61a5-cd70-e12860311fe1'];
                delete closure.bases['6686433f-c77c-61a5-cd70-e12860311fe1'];
                closure.bases['6686433f-c77c-61a5-cd70-000000000000'].originGuid =
                    '6686433f-c77c-61a5-cd70-000000000000';

                shareContext.core.importClosure(shareContext.rootNode, closure);
                throw new Error('missing error handling in library core');
            })
            .catch(function (error) {
                expect(error).not.to.eql(null);
                expect(error instanceof Error).to.equal(true);
                expect(error.message).to.include('Cannot find necessary base');
            })
            .nodeify(done);
    });

    it('should fail to import if closure base has multiple occurrences', function (done) {
        var closure;
        Q.all([
            shareContext.core.loadByPath(shareContext.rootNode, '/E'),
            shareContext.core.loadByPath(shareContext.rootNode, '/Q'),
            shareContext.core.loadByPath(shareContext.rootNode, '/Q/P')
        ])
            .then(function (nodes) {
                closure = shareContext.core.getClosureInformation(nodes);

                expect(closure).not.to.eql(null);
                expect(Object.keys(closure.selection)).to.have.length(2);

                return shareContext.core.loadByPath(shareContext.rootNode, '/Q');
            })
            .then(function (exampleMachine) {
                shareContext.core.addMember(shareContext.rootNode, 'MetaAspectSet', exampleMachine);
                return shareContext.core.setGuid(exampleMachine, '5f55234d-5975-19c3-063e-318b0fc93a17');
            })
            .then(function () {
                shareContext.core.persist(shareContext.rootNode);

                return shareContext.core.loadRoot(shareContext.core.getHash(shareContext.rootNode));
            })
            .then(function (newRoot) {

                closure.bases['6686433f-c77c-61a5-cd70-000000000000'] =
                    closure.bases['6686433f-c77c-61a5-cd70-e12860311fe1'];
                delete closure.bases['6686433f-c77c-61a5-cd70-e12860311fe1'];

                shareContext.core.importClosure(newRoot, closure);
                throw new Error('missing error handling in library core');
            })
            .catch(function (error) {
                expect(error).not.to.eql(null);
                expect(error instanceof Error).to.equal(true);
                expect(error.message).to.include('Ambiguous occurrences of base');
            })
            .nodeify(done);
    });
});