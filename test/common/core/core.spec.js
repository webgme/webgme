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
            core.persist('string');
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

                core.loadPointer(rootNode, 'unknown', function (e) {
                    expect(e.name).to.eql('CoreIllegalOperationError');
                    expect(e.message).to.contains('undefined');

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
    });

    it('should throw @loadCollection if not parameters are given', function (done) {
        var myError;

        core.loadCollection('badnode', 'relid', function (e) {
            expect(e.name).to.eql('CoreInputError');
            expect(e.message).to.contains('valid node');
            core.loadCollection(rootNode, {}, function (e) {
                expect(e.name).to.eql('CoreInputError');
                expect(e.message).to.contains('string');

                core.loadCollection(rootNode, 'unknown', function (e) {
                    expect(e.name).to.eql('CoreIllegalOperationError');
                    expect(e.message).to.contains('undefined');

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
            core.copyNodes('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.copyNodes(['string']);
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.copyNodes([rootNode], 'invalid');
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

    it('should throw @getRegistryNames if not valid node is given', function () {
        var myError;

        try {
            core.getRegistryNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @getRegistry if not valid node is given', function () {
        var myError;

        try {
            core.getRegistry('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getRegistry(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }
    });

    it('should throw @setRegistry if not valid node is given', function () {
        var myError;

        try {
            core.setRegistry('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.setRegistry(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.setRegistry(rootNode, 'name', undefined);
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }
    });

    it('should throw @delRegistry if not valid node is given', function () {
        var myError;

        try {
            core.delRegistry('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.delRegistry(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.delRegistry(rootNode, 'nonexistent');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }
    });

    it('should throw @getPointerNames if not valid node is given', function () {
        var myError;

        try {
            core.getPointerNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @getPointerPath if not valid node is given', function () {
        var myError;

        try {
            core.getPointerPath('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getPointerPath(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }
    });

    it('should throw @setPointer if not valid node is given', function () {
        var myError;

        try {
            core.setPointer('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.setPointer(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.setPointer(rootNode, 'name', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }
    });

    it('should throw @delPointer if not valid node is given', function () {
        var myError;

        try {
            core.delPointer('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.delPointer(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.delPointer(rootNode, 'nonexistent');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }
    });

    it('should throw @getCollectionNames if not valid node is given', function () {
        var myError;

        try {
            core.getCollectionNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @getCollectionPaths if not valid node is given', function () {
        var myError;

        try {
            core.getCollectionPaths('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getCollectionPaths(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }
    });

    it('should throw @getChildrenHashes if not valid node is given', function () {
        var myError;

        try {
            core.getChildrenHashes('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @getBase if not valid node is given', function () {
        var myError;

        try {
            core.getBase('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @getBaseRoot if not valid node is given', function () {
        var myError;

        try {
            core.getBaseRoot('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @getOwnAttributeNames if not valid node is given', function () {
        var myError;

        try {
            core.getOwnAttributeNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @getOwnRegistryNames if not valid node is given', function () {
        var myError;

        try {
            core.getOwnRegistryNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @getOwnAttribute if not valid node is given', function () {
        var myError;

        try {
            core.getOwnAttribute('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getOwnAttribute(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }
    });

    it('should throw @getOwnRegistry if not valid node is given', function () {
        var myError;

        try {
            core.getOwnRegistry('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getOwnRegistry(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }
    });

    it('should throw @getOwnPointerNames if not valid node is given', function () {
        var myError;

        try {
            core.getOwnPointerNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @getOwnPointerPath if not valid node is given', function () {
        var myError;

        try {
            core.getOwnPointerPath('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getOwnPointerPath(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }
    });

    it('should throw @isValidNewBase if not valid node is given', function () {
        var myError;

        try {
            core.isValidNewBase('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.isValidNewBase(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }
    });

    it('should throw @setBase if not valid node is given', function () {
        var myError;

        try {
            core.setBase('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.setBase(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }
    });

    it('should throw @getTypeRoot if not valid node is given', function () {
        var myError;

        try {
            core.getTypeRoot('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @getSetNames if not valid node is given', function () {
        var myError;

        try {
            core.getSetNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @getOwnSetNames if not valid node is given', function () {
        var myError;

        try {
            core.getOwnSetNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @createSet if not valid parameters are given', function () {
        var myError;

        try {
            core.createSet('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.createSet(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @delSet if not valid parameters are given', function () {
        var myError;

        try {
            core.delSet('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.delSet(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.delSet(rootNode, 'unknown');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
        }
    });

    it('should throw @getSetAttributeNames if not valid parameters are given', function () {
        var myError;

        try {
            core.getSetAttributeNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getSetAttributeNames(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getSetAttributeNames(rootNode, 'unknown');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
        }
    });

    it('should throw @getOwnSetAttributeNames if not valid parameters are given', function () {
        var myError;

        try {
            core.getOwnSetAttributeNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getOwnSetAttributeNames(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getOwnSetAttributeNames(rootNode, 'unknown');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
        }
    });

    it('should throw @getSetAttribute if not valid parameters are given', function () {
        var myError;

        try {
            core.getSetAttribute('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getSetAttribute(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getSetAttribute(rootNode, 'unknown', 'good');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }

        try {
            core.getSetAttribute(rootNode, 'MetaAspectSet', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @getOwnSetAttribute if not valid parameters are given', function () {
        var myError;

        try {
            core.getOwnSetAttribute('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getOwnSetAttribute(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getOwnSetAttribute(rootNode, 'unknown', 'good');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }

        try {
            core.getOwnSetAttribute(rootNode, 'MetaAspectSet', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @setSetAttribute if not valid parameters are given', function () {
        var myError;

        try {
            core.setSetAttribute('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.setSetAttribute(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.setSetAttribute(rootNode, 'unknown', 'good', 'good');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }

        try {
            core.setSetAttribute(rootNode, 'MetaAspectSet', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.setSetAttribute(rootNode, 'MetaAspectSet', 'any', undefined);
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @delSetAttribute if not valid parameters are given', function () {
        var myError;

        try {
            core.delSetAttribute('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.delSetAttribute(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.delSetAttribute(rootNode, 'unknown', 'good');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }

        try {
            core.delSetAttribute(rootNode, 'MetaAspectSet', 'unknown');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }

        try {
            core.delSetAttribute(rootNode, 'MetaAspectSet', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @getSetRegistryNames if not valid parameters are given', function () {
        var myError;

        try {
            core.getSetRegistryNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getSetRegistryNames(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getSetRegistryNames(rootNode, 'unknown');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
        }
    });

    it('should throw @getOwnSetRegistryNames if not valid parameters are given', function () {
        var myError;

        try {
            core.getOwnSetRegistryNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getOwnSetRegistryNames(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getOwnSetRegistryNames(rootNode, 'unknown');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
        }
    });

    it('should throw @getSetRegistry if not valid parameters are given', function () {
        var myError;

        try {
            core.getSetRegistry('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getSetRegistry(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getSetRegistry(rootNode, 'unknown', 'good');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }

        try {
            core.getSetRegistry(rootNode, 'MetaAspectSet', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @getOwnSetRegistry if not valid parameters are given', function () {
        var myError;

        try {
            core.getOwnSetRegistry('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getOwnSetRegistry(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getOwnSetRegistry(rootNode, 'unknown', 'good');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }

        try {
            core.getOwnSetRegistry(rootNode, 'MetaAspectSet', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @setSetRegistry if not valid parameters are given', function () {
        var myError;

        try {
            core.setSetRegistry('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.setSetRegistry(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.setSetRegistry(rootNode, 'unknown', 'good', 'good');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }

        try {
            core.setSetRegistry(rootNode, 'MetaAspectSet', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.setSetRegistry(rootNode, 'MetaAspectSet', 'any', undefined);
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @delSetRegistry if not valid parameters are given', function () {
        var myError;

        try {
            core.delSetRegistry('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.delSetRegistry(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.delSetRegistry(rootNode, 'unknown', 'good');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }

        try {
            core.delSetRegistry(rootNode, 'MetaAspectSet', 'unknown');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }

        try {
            core.delSetRegistry(rootNode, 'MetaAspectSet', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @getMemberPaths if not valid parameters are given', function () {
        var myError;

        try {
            core.getMemberPaths('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberPaths(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberPaths(rootNode, 'unknown');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
        }
    });

    it('should throw @getOwnMemberPaths if not valid parameters are given', function () {
        var myError;

        try {
            core.getOwnMemberPaths('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getOwnMemberPaths(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getOwnMemberPaths(rootNode, 'unknown');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
        }
    });

    it('should throw @delMember if not valid parameters are given', function () {
        var myError;

        try {
            core.delMember('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.delMember(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.delMember(rootNode, 'unknown', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.delMember(rootNode, 'unknown', '/1/2');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
        }

        try {
            core.delMember(rootNode, 'MetaAspectSet', '/unknown');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
        }
    });

    it('should throw @addMember if not valid parameters are given', function () {
        var myError;

        try {
            core.addMember('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.addMember(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.addMember(rootNode, 'unknown', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.addMember(rootNode, 'unknown', rootNode);
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
        }
    });

    it('should throw @getMemberAttributeNames if not valid parameters are given', function () {
        var myError;

        try {
            core.getMemberAttributeNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberAttributeNames(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberAttributeNames(rootNode, 'setname', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberAttributeNames(rootNode, 'unknown', '/1/2');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }

        try {
            core.getMemberAttributeNames(rootNode, 'MetaAspectSet', '/unknown');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
        }
    });

    it('should throw @getMemberOwnAttributeNames if not valid parameters are given', function () {
        var myError;

        try {
            core.getMemberOwnAttributeNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberOwnAttributeNames(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberOwnAttributeNames(rootNode, 'setname', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberOwnAttributeNames(rootNode, 'unknown', '/1/2');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }

        try {
            core.getMemberOwnAttributeNames(rootNode, 'MetaAspectSet', '/unknown');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
        }
    });

    it('should throw @getMemberAttribute if not valid parameters are given', function () {
        var myError;

        try {
            core.getMemberAttribute('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberAttribute(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberAttribute(rootNode, 'setname', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberAttribute(rootNode, 'setname', '/path', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberAttribute(rootNode, 'unknown', '/1/2', 'attr');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }

        try {
            core.getMemberAttribute(rootNode, 'MetaAspectSet', '/unknown', 'attr');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
        }
    });

    it('should throw @getMemberOwnAttribute if not valid parameters are given', function () {
        var myError;

        try {
            core.getMemberOwnAttribute('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberOwnAttribute(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberOwnAttribute(rootNode, 'setname', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberOwnAttribute(rootNode, 'setname', '/path', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberOwnAttribute(rootNode, 'unknown', '/1/2', 'attr');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }

        try {
            core.getMemberOwnAttribute(rootNode, 'MetaAspectSet', '/unknown', 'attr');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
        }
    });

    it('should throw @setMemberAttribute if not valid parameters are given', function () {
        var myError;

        try {
            core.setMemberAttribute('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.setMemberAttribute(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.setMemberAttribute(rootNode, 'setname', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.setMemberAttribute(rootNode, 'setname', '/path', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.setMemberAttribute(rootNode, 'setname', '/path', 'attr', undefined);
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.setMemberAttribute(rootNode, 'unknown', '/1/2', 'attr', 'value');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }

        try {
            core.setMemberAttribute(rootNode, 'MetaAspectSet', '/unknown', 'attr', 'value');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
        }
    });

    it('should throw @delMemberAttribute if not valid parameters are given', function () {
        var myError;

        try {
            core.delMemberAttribute('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.delMemberAttribute(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.delMemberAttribute(rootNode, 'setname', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.delMemberAttribute(rootNode, 'setname', '/path', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.delMemberAttribute(rootNode, 'unknown', '/1/2', 'attr');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }

        try {
            core.delMemberAttribute(rootNode, 'MetaAspectSet', '/unknown', 'attr');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }

        try {
            core.delMemberAttribute(rootNode, 'MetaAspectSet', '/1', 'unknown');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }
    });

    it('should throw @getMemberRegistryNames if not valid parameters are given', function () {
        var myError;

        try {
            core.getMemberRegistryNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberRegistryNames(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberRegistryNames(rootNode, 'setname', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberRegistryNames(rootNode, 'unknown', '/1/2');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }

        try {
            core.getMemberRegistryNames(rootNode, 'MetaAspectSet', '/unknown');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
        }
    });

    it('should throw @getMemberOwnRegistryNames if not valid parameters are given', function () {
        var myError;

        try {
            core.getMemberOwnRegistryNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberOwnRegistryNames(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberOwnRegistryNames(rootNode, 'setname', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberOwnRegistryNames(rootNode, 'unknown', '/1/2');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }

        try {
            core.getMemberOwnRegistryNames(rootNode, 'MetaAspectSet', '/unknown');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
        }
    });

    it('should throw @getMemberRegistry if not valid parameters are given', function () {
        var myError;

        try {
            core.getMemberRegistry('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberRegistry(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberRegistry(rootNode, 'setname', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberRegistry(rootNode, 'setname', '/path', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberRegistry(rootNode, 'unknown', '/1/2', 'attr');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }

        try {
            core.getMemberRegistry(rootNode, 'MetaAspectSet', '/unknown', 'attr');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
        }
    });

    it('should throw @getMemberOwnRegistry if not valid parameters are given', function () {
        var myError;

        try {
            core.getMemberOwnRegistry('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberOwnRegistry(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberOwnRegistry(rootNode, 'setname', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberOwnRegistry(rootNode, 'setname', '/path', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getMemberOwnRegistry(rootNode, 'unknown', '/1/2', 'attr');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }

        try {
            core.getMemberOwnRegistry(rootNode, 'MetaAspectSet', '/unknown', 'attr');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
        }
    });

    it('should throw @setMemberRegistry if not valid parameters are given', function () {
        var myError;

        try {
            core.setMemberRegistry('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.setMemberRegistry(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.setMemberRegistry(rootNode, 'setname', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.setMemberRegistry(rootNode, 'setname', '/path', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.setMemberRegistry(rootNode, 'setname', '/path', 'attr', undefined);
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.setMemberRegistry(rootNode, 'unknown', '/1/2', 'attr', 'value');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }

        try {
            core.setMemberRegistry(rootNode, 'MetaAspectSet', '/unknown', 'attr', 'value');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
        }
    });

    it('should throw @delMemberRegistry if not valid parameters are given', function () {
        var myError;

        try {
            core.delMemberRegistry('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.delMemberRegistry(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.delMemberRegistry(rootNode, 'setname', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.delMemberRegistry(rootNode, 'setname', '/path', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.delMemberRegistry(rootNode, 'unknown', '/1/2', 'attr');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }

        try {
            core.delMemberRegistry(rootNode, 'MetaAspectSet', '/unknown', 'attr');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }

        try {
            core.delMemberRegistry(rootNode, 'MetaAspectSet', '/1', 'unknown');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }
    });

    it('should throw @isMemberOf if not valid node is given', function () {
        var myError;

        try {
            core.isMemberOf('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }

        try {
            core.isMemberOf({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @getGuid if not valid node is given', function () {
        var myError;

        try {
            core.getGuid('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }

        try {
            core.getGuid({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @setGuid if not valid parameters are given', function (done) {
        var myError;

        try {
            core.getGuid('string', 'otherstring', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }

        core.setGuid('string', 'other', function (err) {
            expect(err).not.to.eql(null);
            expect(err.name).to.eql('CoreInputError');

            core.setGuid(rootNode, 'notguid', function (err) {
                expect(err).not.to.eql(null);
                expect(err.name).to.eql('CoreInputError');
                done();
            });
        });
    });

    it('should throw @getConstraint if not valid parameters are given', function () {
        var myError;

        try {
            core.getConstraint('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.getConstraint(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @setConstraint if not valid parameters are given', function () {
        var myError;

        try {
            core.setConstraint('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.setConstraint(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.setConstraint(rootNode, 'newConstraint', 'notObject');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @delConstraint if not valid parameters are given', function () {
        var myError;

        try {
            core.delConstraint('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.delConstraint(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.delConstraint(rootNode, 'unknown');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
        }
    });

    it('should throw @getConstraintNames if not valid node is given', function () {
        var myError;

        try {
            core.getConstraintNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }

        try {
            core.getConstraintNames({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @getOwnConstraintNames if not valid node is given', function () {
        var myError;

        try {
            core.getOwnConstraintNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }

        try {
            core.getOwnConstraintNames({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @isTypeOf if not valid parameters are given', function () {
        var myError;

        try {
            core.isTypeOf('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.isTypeOf(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });

    it('should throw @isValidChildOf if not valid parameters are given', function () {
        var myError;

        try {
            core.isValidChildOf('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
            myError = null;
        }

        try {
            core.isValidChildOf(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreInputError');
        }
    });
});
