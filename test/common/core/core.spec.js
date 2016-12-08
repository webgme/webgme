/* jshint node:true, mocha: true*/

/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../_globals.js');

describe('core', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        projectName = 'core',
        Core = testFixture.requirejs('common/core/core'),
        project,
        core,
        rootNode,
        originalRootHash,
        commit,
        Q = testFixture.Q,
        expect = testFixture.expect,
        logger = {},
        lastError = null,
        storage,
        gmeAuth;

    before(function (done) {
        logger.error = function () {
            lastError = arguments[0];
        };
        logger.debug = function () {
        };
        logger.warn = function () {
        };
        logger.info = function () {
        };
        logger.fork = function () {
            return logger
        };

        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(storage, {
                    projectSeed: 'seeds/ActivePanels.webgmex',
                    projectName: projectName,
                    branchName: 'base',
                    gmeConfig: gmeConfig,
                    logger: logger
                });
            })
            .then(function (result) {
                project = result.project;
                core = new Core(project, {globConf: gmeConfig, logger: logger});
                rootNode = result.rootNode;
                originalRootHash = result.rootHash;
                commit = result.commitHash;
            })
            .nodeify(done);
    });

    after(function (done) {
        Q.allDone([
            storage.closeDatabase(),
            gmeAuth.unload()
        ]).nodeify(done);
    });

    it('should have all public functions available', function () {
        var functions = Object.keys(core),
            i,
            Matches = ['getParent', 'getRelid', 'getRoot', 'getPath', 'getChild', 'isEmpty', 'getHash',
                'persist', 'loadRoot', 'loadChild', 'loadByPath', 'loadChildren', 'loadOwnChildren',
                'loadPointer', 'loadCollection', 'loadSubTree', 'loadOwnSubTree', 'loadTree',
                'getChildrenRelids', 'getOwnChildrenRelids', 'getChildrenPaths', 'getOwnChildrenPaths',
                'createNode', 'deleteNode', 'copyNode', 'copyNodes', 'isValidNewParent', 'moveNode',
                'getAttributeNames', 'getAttribute', 'setAttribute', 'delAttribute', 'getRegistryNames',
                'getRegistry', 'setRegistry', 'delRegistry', 'getPointerNames', 'getPointerPath',
                'deletePointer', 'setPointer', 'getCollectionNames', 'getCollectionPaths',
                'getChildrenHashes', 'getBase', 'getBaseRoot', 'getOwnAttributeNames',
                'getOwnRegistryNames', 'getOwnAttribute', 'getOwnRegistry', 'getOwnPointerNames',
                'getOwnPointerPath', 'isValidNewBase', 'setBase', 'getTypeRoot', 'getSetNames',
                'getOwnSetNames', 'createSet', 'deleteSet', 'getSetAttributeNames',
                'getOwnSetAttributeNames', 'getSetAttribute', 'getOwnSetAttribute', 'setSetAttribute',
                'delSetAttribute', 'getSetRegistryNames', 'getOwnSetRegistryNames', 'getSetRegistry',
                'getOwnSetRegistry', 'setSetRegistry', 'delSetRegistry', 'getMemberPaths',
                'getOwnMemberPaths', 'delMember', 'addMember', 'getMemberAttributeNames',
                'getMemberOwnAttributeNames', 'getMemberAttribute', 'getMemberOwnAttribute',
                'setMemberAttribute', 'delMemberAttribute', 'getMemberRegistryNames',
                'getMemberOwnRegistryNames', 'getMemberRegistry', 'getMemberOwnRegistry',
                'setMemberRegistry', 'delMemberRegistry', 'isMemberOf', 'getGuid',
                'setGuid', 'getConstraint', 'setConstraint', 'delConstraint', 'getConstraintNames',
                'getOwnConstraintNames', 'isTypeOf', 'isValidChildOf', 'getValidPointerNames',
                'getValidSetNames', 'isValidTargetOf', 'getValidAttributeNames',
                'getOwnValidAttributeNames', 'isValidAttributeValueOf', 'getValidAspectNames',
                'getOwnValidAspectNames', 'getAspectMeta', 'getJsonMeta', 'getOwnJsonMeta',
                'clearMetaRules', 'setAttributeMeta', 'delAttributeMeta', 'getAttributeMeta',
                'getValidChildrenPaths', 'getChildrenMeta', 'setChildMeta', 'delChildMeta',
                'setChildrenMetaLimits', 'setPointerMetaTarget', 'delPointerMetaTarget',
                'setPointerMetaLimits', 'delPointerMeta', 'getPointerMeta',
                'setAspectMetaTarget', 'delAspectMetaTarget', 'delAspectMeta', 'getBaseType',
                'isInstanceOf', 'generateTreeDiff', 'applyTreeDiff', 'tryToConcatChanges',
                'applyResolution', 'isAbstract', 'isConnection', 'getValidChildrenMetaNodes',
                'getValidSetElementsMetaNodes', 'getAllMetaNodes', 'isMetaNode',
                'isFullyOverriddenMember', 'getMixinErrors', 'getMixinPaths',
                'getMixinNodes', 'delMixin', 'addMixin', 'clearMixins', 'getBaseTypes',
                'canSetAsMixin', 'addLibrary', 'updateLibrary', 'getLibraryNames', 'getFCO',
                'isLibraryRoot', 'isLibraryElement', 'getNamespace', 'getFullyQualifiedName',
                'removeLibrary', 'getLibraryGuid', 'renameLibrary', 'getLibraryInfo',
                'getLibraryRoot', 'getLibraryMetaNodes', 'traverse', 'getClosureInformation',
                'importClosure', 'getInstancePaths', 'loadInstances', 'delPointer', 'delSet',
                'getMetaType'
            ];

        expect(functions).to.have.members(Matches);

        for (i = 0; i < functions.length; i += 1) {
            expect(typeof core[functions[i]]).to.eql('function');
        }
    });

    it('should throw @getParent if not valid node is given', function () {
        var myError;

        try {
            core.getParent('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }

        try {
            core.getParent({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @getRelid if not valid node is given', function () {
        var myError;

        try {
            core.getParent('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @getRoot if not valid node is given', function () {
        var myError;

        try {
            core.getParent('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @loadRoot if not valid parameters are given', function () {
        var myError;

        try {
            core.loadRoot('badhash', function () {
            });
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            expect(myError.message).to.contains('valid hash');
        }

        try {
            core.loadRoot(originalRootHash, 'string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            expect(myError.message).to.contains('function');
        }
    });
});
