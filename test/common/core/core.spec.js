/* jshint node:true, mocha: true*/

/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../_globals.js');

describe.only('core', function () {
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
        console.error(Matches.length);

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
            core.getRoot('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @getPath if not valid node is given', function () {
        var myError;

        try {
            core.getPath('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @getChild if not parameters are given', function () {
        var myError;

        try {
            core.getChild('string', 'anything');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            expect(myError.message).to.contains('node');
        }

        try {
            core.getChild(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            expect(myError.message).to.contains('relativeId');
        }
    });

    it('should throw @isEmpty if not valid node is given', function () {
        var myError;

        try {
            core.isEmpty('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @getHash if not valid node is given', function () {
        var myError;

        try {
            core.getHash('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @persist if not valid node is given', function () {
        var myError;

        try {
            core.getHash('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @loadRoot if not valid parameters are given', function (done) {
        var myError;

        core.loadRoot('badhash', function (e) {
            expect(e.name).to.eql('CoreInputError');
            expect(e.message).to.contains('valid hash');

            try {
                core.loadRoot(originalRootHash, 'string');
            } catch (e) {
                myError = e;
            } finally {
                expect(myError.name).to.eql('CoreInputError');
                expect(myError.message).to.contains('function');
                done();
            }
        });

    });

    it('should throw @loadChild if not parameters are given', function (done) {
        var myError;

        core.loadChild('badnode', 'relid', function (e) {
            expect(e.name).to.eql('CoreInputError');
            expect(e.message).to.contains('valid node');
            core.loadChild(rootNode, {}, function (e) {
                expect(e.name).to.eql('CoreInputError');
                expect(e.message).to.contains('string');

                try {
                    core.loadChild(rootNode, {});
                } catch (e) {
                    myError = e;
                } finally {
                    expect(myError.name).to.eql('CoreInputError');
                    expect(myError.message).to.contains('function');
                    done();
                }
            });
        });
    });

    it('should throw @loadByPath if not parameters are given', function (done) {
        var myError;

        core.loadByPath('badnode', 'relid', function (e) {
            expect(e.name).to.eql('CoreInputError');
            expect(e.message).to.contains('valid node');
            core.loadByPath(rootNode, {}, function (e) {
                expect(e.name).to.eql('CoreInputError');
                expect(e.message).to.contains('valid path');

                try {
                    core.loadByPath(rootNode, {});
                } catch (e) {
                    myError = e;
                } finally {
                    expect(myError.name).to.eql('CoreInputError');
                    expect(myError.message).to.contains('function');
                    done();
                }
            });
        });
    });

    it('should throw @loadChildren if not valid parameters are given', function (done) {
        var myError;

        core.loadChildren('badhash', function (e) {
            expect(e.name).to.eql('CoreInputError');
            expect(e.message).to.contains('valid node');

            try {
                core.loadChildren(originalRootHash, 'string');
            } catch (e) {
                myError = e;
            } finally {
                expect(myError.name).to.eql('CoreInputError');
                expect(myError.message).to.contains('function');
                done();
            }
        });

    });

    it('should throw @loadOwnChildren if not valid parameters are given', function (done) {
        var myError;

        core.loadOwnChildren('badhash', function (e) {
            expect(e.name).to.eql('CoreInputError');
            expect(e.message).to.contains('valid node');

            try {
                core.loadOwnChildren(originalRootHash, 'string');
            } catch (e) {
                myError = e;
            } finally {
                expect(myError.name).to.eql('CoreInputError');
                expect(myError.message).to.contains('function');
                done();
            }
        });

    });

    it('should throw @loadPointer if not parameters are given', function (done) {
        var myError;

        core.loadPointer('badnode', 'relid', function (e) {
            expect(e.name).to.eql('CoreInputError');
            expect(e.message).to.contains('valid node');
            core.loadPointer(rootNode, {}, function (e) {
                expect(e.name).to.eql('CoreInputError');
                expect(e.message).to.contains('string');

                try {
                    core.loadPointer(rootNode, {});
                } catch (e) {
                    myError = e;
                } finally {
                    expect(myError.name).to.eql('CoreInputError');
                    expect(myError.message).to.contains('function');
                    done();
                }
            });
        });
    });

    it('should throw @loadCollection if not parameters are given', function (done) {
        var myError;

        core.loadCollection('badnode', 'relid', function (e) {
            expect(e.name).to.eql('CoreInputError');
            expect(e.message).to.contains('valid node');
            core.loadCollection(rootNode, {}, function (e) {
                expect(e.name).to.eql('CoreInputError');
                expect(e.message).to.contains('string');

                try {
                    core.loadCollection(rootNode, {});
                } catch (e) {
                    myError = e;
                } finally {
                    expect(myError.name).to.eql('CoreInputError');
                    expect(myError.message).to.contains('function');
                    done();
                }
            });
        });
    });

    it('should throw @loadSubTree if not valid parameters are given', function (done) {
        var myError;

        core.loadSubTree('badhash', function (e) {
            expect(e.name).to.eql('CoreInputError');
            expect(e.message).to.contains('valid node');

            try {
                core.loadSubTree(originalRootHash, 'string');
            } catch (e) {
                myError = e;
            } finally {
                expect(myError.name).to.eql('CoreInputError');
                expect(myError.message).to.contains('function');
                done();
            }
        });

    });

    it('should throw @loadOwnSubTree if not valid parameters are given', function (done) {
        var myError;

        core.loadOwnSubTree('badhash', function (e) {
            expect(e.name).to.eql('CoreInputError');
            expect(e.message).to.contains('valid node');

            try {
                core.loadOwnSubTree(originalRootHash, 'string');
            } catch (e) {
                myError = e;
            } finally {
                expect(myError.name).to.eql('CoreInputError');
                expect(myError.message).to.contains('function');
                done();
            }
        });

    });

    it('should throw @loadTree if not valid parameters are given', function (done) {
        var myError;

        core.loadTree('badhash', function (e) {
            expect(e.name).to.eql('CoreInputError');
            expect(e.message).to.contains('valid hash');

            try {
                core.loadTree(originalRootHash, 'string');
            } catch (e) {
                myError = e;
            } finally {
                expect(myError.name).to.eql('CoreInputError');
                expect(myError.message).to.contains('function');
                done();
            }
        });
    });

    it('should throw @getChildrenRelids if not valid node is given', function () {
        var myError;

        try {
            core.getChildrenRelids('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @getOwnChildrenRelids if not valid node is given', function () {
        var myError;

        try {
            core.getOwnChildrenRelids('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @getChildrenPaths if not valid node is given', function () {
        var myError;

        try {
            core.getChildrenPaths('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @getOwnChildrenPaths if not valid node is given', function () {
        var myError;

        try {
            core.getOwnChildrenPaths('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @createNode if not valid parameters are given', function () {
        var myError;

        try {
            core.createNode({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.createNode({parent: 'notNode'});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.createNode({parent: rootNode, base: 'notNode'});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.createNode({parent: rootNode, base: rootNode, guid: 'invalidGuid'});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }
    });

    it('should throw @deleteNode if not valid node is given', function () {
        var myError;

        try {
            core.deleteNode('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @copyNode if not valid node or parent is given', function () {
        var myError;

        try {
            core.copyNode('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.copyNode(rootNode, 'invalid');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

    });

    it('should throw @copyNodes if not valid nodes or parent is given', function () {
        var myError;

        try {
            core.copyNode('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.copyNode(['string']);
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.copyNode([rootNode], 'invalid');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

    });

    it('should throw @isValidNewParent if not valid node or parent is given', function () {
        var myError;

        try {
            core.isValidNewParent('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.isValidNewParent(rootNode, 'invalid');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

    });

    it('should throw @moveNode if not valid node or parent is given', function () {
        var myError;

        try {
            core.moveNode('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.moveNode(rootNode, 'invalid');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

    });

    it('should throw @getAttributeNames if not valid node is given', function () {
        var myError;

        try {
            core.getAttributeNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @getAttribute if not valid node is given', function () {
        var myError;

        try {
            core.getAttribute('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getAttribute(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }
    });

    it('should throw @setAttribute if not valid node is given', function () {
        var myError;

        try {
            core.setAttribute('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.setAttribute(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.setAttribute(rootNode, 'name', undefined);
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }
    });

    it('should throw @delAttribute if not valid node is given', function () {
        var myError;

        try {
            core.delAttribute('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.delAttribute(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.delAttribute(rootNode, 'nonexistent');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }
    });
});
