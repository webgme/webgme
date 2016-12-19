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
        setNode,
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
            return logger;
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

                return Q.ninvoke(core, 'loadByPath', rootNode, '/175547009/1104061497')
            })
            .then(function (node) {
                setNode = node;
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.getParent({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getRelid if not valid node is given', function () {
        var myError;

        try {
            core.getRelid('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getRoot if not valid node is given', function () {
        var myError;

        try {
            core.getRoot('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getPath if not valid node is given', function () {
        var myError;

        try {
            core.getPath('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getChild if not parameters are given', function () {
        var myError;

        try {
            core.getChild('string', 'anything');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            expect(myError.message).to.contains('node');
        }

        try {
            core.getChild(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getHash if not valid node is given', function () {
        var myError;

        try {
            core.getHash('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @persist if not valid node is given', function () {
        var myError;

        try {
            core.persist('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @loadRoot if not valid parameters are given', function (done) {
        var myError;

        core.loadRoot('badhash', function (e) {
            expect(e.name).to.eql('CoreIllegalArgumentError');
            expect(e.message).to.contains('valid hash');

            try {
                core.loadRoot(originalRootHash, 'string');
            } catch (e) {
                myError = e;
            } finally {
                expect(myError.name).to.eql('CoreIllegalArgumentError');
                expect(myError.message).to.contains('function');
                done();
            }
        });

    });

    it('should throw @loadChild if not parameters are given', function (done) {
        var myError;

        core.loadChild('badnode', 'relid', function (e) {
            expect(e.name).to.eql('CoreIllegalArgumentError');
            expect(e.message).to.contains('valid node');
            core.loadChild(rootNode, {}, function (e) {
                expect(e.name).to.eql('CoreIllegalArgumentError');
                expect(e.message).to.contains('string');

                try {
                    core.loadChild(rootNode, {});
                } catch (e) {
                    myError = e;
                } finally {
                    expect(myError.name).to.eql('CoreIllegalArgumentError');
                    expect(myError.message).to.contains('function');
                    done();
                }
            });
        });
    });

    it('should throw @loadByPath if not parameters are given', function (done) {
        var myError;

        core.loadByPath('badnode', 'relid', function (e) {
            expect(e.name).to.eql('CoreIllegalArgumentError');
            expect(e.message).to.contains('valid node');
            core.loadByPath(rootNode, {}, function (e) {
                expect(e.name).to.eql('CoreIllegalArgumentError');
                expect(e.message).to.contains('valid path');

                try {
                    core.loadByPath(rootNode, {});
                } catch (e) {
                    myError = e;
                } finally {
                    expect(myError.name).to.eql('CoreIllegalArgumentError');
                    expect(myError.message).to.contains('function');
                    done();
                }
            });
        });
    });

    it('should throw @loadChildren if not valid parameters are given', function (done) {
        var myError;

        core.loadChildren('badhash', function (e) {
            expect(e.name).to.eql('CoreIllegalArgumentError');
            expect(e.message).to.contains('valid node');

            try {
                core.loadChildren(originalRootHash, 'string');
            } catch (e) {
                myError = e;
            } finally {
                expect(myError.name).to.eql('CoreIllegalArgumentError');
                expect(myError.message).to.contains('function');
                done();
            }
        });

    });

    it('should throw @loadOwnChildren if not valid parameters are given', function (done) {
        var myError;

        core.loadOwnChildren('badhash', function (e) {
            expect(e.name).to.eql('CoreIllegalArgumentError');
            expect(e.message).to.contains('valid node');

            try {
                core.loadOwnChildren(originalRootHash, 'string');
            } catch (e) {
                myError = e;
            } finally {
                expect(myError.name).to.eql('CoreIllegalArgumentError');
                expect(myError.message).to.contains('function');
                done();
            }
        });

    });

    it('should throw @loadPointer if not parameters are given', function (done) {
        var myError;

        core.loadPointer('badnode', 'relid', function (e) {
            expect(e.name).to.eql('CoreIllegalArgumentError');
            expect(e.message).to.contains('valid node');

            core.loadPointer(rootNode, {}, function (e) {
                expect(e.name).to.eql('CoreIllegalArgumentError');
                expect(e.message).to.contains('string');

                try {
                    core.loadPointer(rootNode, {});
                } catch (e) {
                    myError = e;
                } finally {
                    expect(myError.name).to.eql('CoreIllegalArgumentError');
                    expect(myError.message).to.contains('function');
                    done();
                }
            });
        });
    });

    it('should throw @loadCollection if not parameters are given', function (done) {
        var myError;

        core.loadCollection('badnode', 'relid', function (e) {
            expect(e.name).to.eql('CoreIllegalArgumentError');
            expect(e.message).to.contains('valid node');
            core.loadCollection(rootNode, {}, function (e) {
                expect(e.name).to.eql('CoreIllegalArgumentError');
                expect(e.message).to.contains('string');

                try {
                    core.loadCollection(rootNode, {});
                } catch (e) {
                    myError = e;
                } finally {
                    expect(myError.name).to.eql('CoreIllegalArgumentError');
                    expect(myError.message).to.contains('function');
                    done();
                }
            });
        });
    });

    it('should throw @loadSubTree if not valid parameters are given', function (done) {
        var myError;

        core.loadSubTree('badhash', function (e) {
            expect(e.name).to.eql('CoreIllegalArgumentError');
            expect(e.message).to.contains('valid node');

            try {
                core.loadSubTree(originalRootHash, 'string');
            } catch (e) {
                myError = e;
            } finally {
                expect(myError.name).to.eql('CoreIllegalArgumentError');
                expect(myError.message).to.contains('function');
                done();
            }
        });

    });

    it('should throw @loadOwnSubTree if not valid parameters are given', function (done) {
        var myError;

        core.loadOwnSubTree('badhash', function (e) {
            expect(e.name).to.eql('CoreIllegalArgumentError');
            expect(e.message).to.contains('valid node');

            try {
                core.loadOwnSubTree(originalRootHash, 'string');
            } catch (e) {
                myError = e;
            } finally {
                expect(myError.name).to.eql('CoreIllegalArgumentError');
                expect(myError.message).to.contains('function');
                done();
            }
        });

    });

    it('should throw @loadTree if not valid parameters are given', function (done) {
        var myError;

        core.loadTree('badhash', function (e) {
            expect(e.name).to.eql('CoreIllegalArgumentError');
            expect(e.message).to.contains('valid hash');

            try {
                core.loadTree(originalRootHash, 'string');
            } catch (e) {
                myError = e;
            } finally {
                expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getOwnChildrenRelids if not valid node is given', function () {
        var myError;

        try {
            core.getOwnChildrenRelids('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getChildrenPaths if not valid node is given', function () {
        var myError;

        try {
            core.getChildrenPaths('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getOwnChildrenPaths if not valid node is given', function () {
        var myError;

        try {
            core.getOwnChildrenPaths('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @createNode if not valid parameters are given', function () {
        var myError;

        try {
            core.createNode({parent: 'notNode'});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.createNode({parent: rootNode, base: 'notNode'});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.createNode({parent: rootNode, base: rootNode, guid: 'invalidGuid'});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @copyNode if not valid node or parent is given', function () {
        var myError;

        try {
            core.copyNode('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.copyNode(rootNode, 'invalid');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.copyNodes(['string']);
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.copyNodes([rootNode], 'invalid');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.isValidNewParent(rootNode, 'invalid');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.moveNode(rootNode, 'invalid');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getAttribute if not valid node is given', function () {
        var myError;

        try {
            core.getAttribute('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getAttribute(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setAttribute(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setAttribute(rootNode, 'name', undefined);
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.delAttribute(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getRegistry if not valid node is given', function () {
        var myError;

        try {
            core.getRegistry('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getRegistry(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setRegistry(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setRegistry(rootNode, 'name', undefined);
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.delRegistry(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getPointerPath if not valid node is given', function () {
        var myError;

        try {
            core.getPointerPath('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getPointerPath(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setPointer(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setPointer(rootNode, 'name', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.delPointer(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getCollectionPaths if not valid node is given', function () {
        var myError;

        try {
            core.getCollectionPaths('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getCollectionPaths(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getBase if not valid node is given', function () {
        var myError;

        try {
            core.getBase('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getBaseRoot if not valid node is given', function () {
        var myError;

        try {
            core.getBaseRoot('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getOwnAttributeNames if not valid node is given', function () {
        var myError;

        try {
            core.getOwnAttributeNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getOwnRegistryNames if not valid node is given', function () {
        var myError;

        try {
            core.getOwnRegistryNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getOwnAttribute if not valid node is given', function () {
        var myError;

        try {
            core.getOwnAttribute('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getOwnAttribute(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getOwnRegistry(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getOwnPointerPath if not valid node is given', function () {
        var myError;

        try {
            core.getOwnPointerPath('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getOwnPointerPath(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.isValidNewBase(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setBase(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getSetNames if not valid node is given', function () {
        var myError;

        try {
            core.getSetNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getOwnSetNames if not valid node is given', function () {
        var myError;

        try {
            core.getOwnSetNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @createSet if not valid parameters are given', function () {
        var myError;

        try {
            core.createSet('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.createSet(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @delSet if not valid parameters are given', function () {
        var myError;

        try {
            core.delSet('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.delSet(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
    });

    it('should throw @getSetAttributeNames if not valid parameters are given', function () {
        var myError;

        try {
            core.getSetAttributeNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getSetAttributeNames(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getOwnSetAttributeNames(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getSetAttribute(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getOwnSetAttribute if not valid parameters are given', function () {
        var myError;

        try {
            core.getOwnSetAttribute('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getOwnSetAttribute(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @setSetAttribute if not valid parameters are given', function () {
        var myError;

        try {
            core.setSetAttribute('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setSetAttribute(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setSetAttribute(rootNode, 'MetaAspectSet', 'any', undefined);
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @delSetAttribute if not valid parameters are given', function () {
        var myError;

        try {
            core.delSetAttribute('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.delSetAttribute(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            core.delSetAttribute(rootNode, 'MetaAspectSet', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getSetRegistryNames if not valid parameters are given', function () {
        var myError;

        try {
            core.getSetRegistryNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getSetRegistryNames(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getOwnSetRegistryNames(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getSetRegistry(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getOwnSetRegistry if not valid parameters are given', function () {
        var myError;

        try {
            core.getOwnSetRegistry('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getOwnSetRegistry(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @setSetRegistry if not valid parameters are given', function () {
        var myError;

        try {
            core.setSetRegistry('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setSetRegistry(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setSetRegistry(rootNode, 'MetaAspectSet', 'any', undefined);
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @delSetRegistry if not valid parameters are given', function () {
        var myError;

        try {
            core.delSetRegistry('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.delSetRegistry(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            core.delSetRegistry(rootNode, 'MetaAspectSet', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getMemberPaths if not valid parameters are given', function () {
        var myError;

        try {
            core.getMemberPaths('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getMemberPaths(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getOwnMemberPaths(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.delMember(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.delMember(rootNode, 'unknown', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.addMember(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.addMember(rootNode, 'unknown', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
    });

    it('should throw @getMemberAttributeNames if not valid parameters are given', function () {
        var myError;

        try {
            core.getMemberAttributeNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getMemberAttributeNames(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getMemberAttributeNames(rootNode, 'setname', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getMemberOwnAttributeNames(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getMemberOwnAttributeNames(rootNode, 'setname', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getMemberAttribute(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getMemberAttribute(rootNode, 'setname', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getMemberAttribute(rootNode, 'setname', '/path', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getMemberOwnAttribute(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getMemberOwnAttribute(rootNode, 'setname', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getMemberOwnAttribute(rootNode, 'setname', '/path', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setMemberAttribute(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setMemberAttribute(rootNode, 'setname', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setMemberAttribute(rootNode, 'setname', '/path', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setMemberAttribute(rootNode, 'setname', '/path', 'attr', undefined);
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.delMemberAttribute(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.delMemberAttribute(rootNode, 'setname', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.delMemberAttribute(rootNode, 'setname', '/path', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
    });

    it('should throw @getMemberRegistryNames if not valid parameters are given', function () {
        var myError;

        try {
            core.getMemberRegistryNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getMemberRegistryNames(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getMemberRegistryNames(rootNode, 'setname', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            myError = null;
        }
    });

    it('should throw @getMemberOwnRegistryNames if not valid parameters are given', function () {
        var myError;

        try {
            core.getMemberOwnRegistryNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getMemberOwnRegistryNames(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getMemberOwnRegistryNames(rootNode, 'setname', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getMemberRegistry(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getMemberRegistry(rootNode, 'setname', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getMemberRegistry(rootNode, 'setname', '/path', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getMemberOwnRegistry(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getMemberOwnRegistry(rootNode, 'setname', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getMemberOwnRegistry(rootNode, 'setname', '/path', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setMemberRegistry(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setMemberRegistry(rootNode, 'setname', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setMemberRegistry(rootNode, 'setname', '/path', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setMemberRegistry(rootNode, 'setname', '/path', 'attr', undefined);
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.delMemberRegistry(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.delMemberRegistry(rootNode, 'setname', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.delMemberRegistry(rootNode, 'setname', '/path', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
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
    });

    it('should throw @isMemberOf if not valid node is given', function () {
        var myError;

        try {
            core.isMemberOf('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.isMemberOf({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getGuid if not valid node is given', function () {
        var myError;

        try {
            core.getGuid('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.getGuid({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @setGuid if not valid parameters are given', function (done) {
        var myError;

        try {
            core.getGuid('string', 'otherstring', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        core.setGuid('string', 'other', function (err) {
            expect(err).not.to.eql(null);
            expect(err.name).to.eql('CoreIllegalArgumentError');

            core.setGuid(rootNode, 'notguid', function (err) {
                expect(err).not.to.eql(null);
                expect(err.name).to.eql('CoreIllegalArgumentError');
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
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getConstraint(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @setConstraint if not valid parameters are given', function () {
        var myError;

        try {
            core.setConstraint('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setConstraint(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setConstraint(rootNode, 'newConstraint', 'notObject');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @delConstraint if not valid parameters are given', function () {
        var myError;

        try {
            core.delConstraint('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.delConstraint(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
    });

    it('should throw @getConstraintNames if not valid node is given', function () {
        var myError;

        try {
            core.getConstraintNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.getConstraintNames({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getOwnConstraintNames if not valid node is given', function () {
        var myError;

        try {
            core.getOwnConstraintNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.getOwnConstraintNames({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @isTypeOf if not valid parameters are given', function () {
        var myError;

        try {
            core.isTypeOf('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.isTypeOf(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @isValidChildOf if not valid parameters are given', function () {
        var myError;

        try {
            core.isValidChildOf('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.isValidChildOf(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getValidPointerNames if not valid node is given', function () {
        var myError;

        try {
            core.getValidPointerNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.getValidPointerNames({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getValidSetNames if not valid node is given', function () {
        var myError;

        try {
            core.getValidSetNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.getValidSetNames({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @isValidTargetOf if not valid parameters are given', function () {
        var myError;

        try {
            core.isValidTargetOf('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.isValidTargetOf(rootNode, 'notnode');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.isValidTargetOf(rootNode, rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
    });

    it('should throw @getValidAttributeNames if not valid node is given', function () {
        var myError;

        try {
            core.getValidAttributeNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.getValidAttributeNames({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getOwnValidAttributeNames if not valid node is given', function () {
        var myError;

        try {
            core.getOwnValidAttributeNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.getOwnValidAttributeNames({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @isValidAttributeValueOf if not valid parameters are given', function () {
        var myError;

        try {
            core.isValidAttributeValueOf('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.isValidAttributeValueOf(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.isValidAttributeValueOf(rootNode, 'attr', undefined);
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
    });

    it('should throw @getValidAspectNames if not valid node is given', function () {
        var myError;

        try {
            core.getValidAspectNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.getValidAspectNames({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getOwnValidAspectNames if not valid node is given', function () {
        var myError;

        try {
            core.getOwnValidAspectNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.getOwnValidAspectNames({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getAspectMeta if not valid parameters are given', function () {
        var myError;

        try {
            core.getAspectMeta('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getAspectMeta(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getJsonMeta if not valid node is given', function () {
        var myError;

        try {
            core.getJsonMeta('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.getJsonMeta({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getOwnJsonMeta if not valid node is given', function () {
        var myError;

        try {
            core.getOwnJsonMeta('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.getOwnJsonMeta({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @clearMetaRules if not valid node is given', function () {
        var myError;

        try {
            core.clearMetaRules('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.clearMetaRules({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @setAttributeMeta if not valid parameters are given', function () {
        var myError;

        try {
            core.setAttributeMeta('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setAttributeMeta(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setAttributeMeta(rootNode, 'rule', 'notObject');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setAttributeMeta(rootNode, 'rule', {noType: 'field'});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @delAttributeMeta if not valid parameters are given', function () {
        var myError;

        try {
            core.delAttributeMeta('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.delAttributeMeta(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
    });

    it('should throw @getAttributeMeta if not valid parameters are given', function () {
        var myError;

        try {
            core.getAttributeMeta('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getAttributeMeta(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getValidChildrenPaths if not valid node is given', function () {
        var myError;

        try {
            core.getValidChildrenPaths('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.getValidChildrenPaths({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getChildrenMeta if not valid node is given', function () {
        var myError;

        try {
            core.getChildrenMeta('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.getChildrenMeta({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @setChildMeta if not valid parameters are given', function () {
        var myError;

        try {
            core.setChildMeta('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setChildMeta(rootNode, 'notAValidPath');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setChildMeta(rootNode, rootNode, 'notNumber');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setChildMeta(rootNode, rootNode, 0.5);
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setChildMeta(rootNode, rootNode, -2);
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setChildMeta(rootNode, rootNode, 0, 'notnumber');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @delChildMeta if not valid parameters are given', function () {
        var myError;

        try {
            core.delChildMeta('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.delChildMeta(rootNode, 'notAValidPath');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
    });

    it('should throw @setChildrenMetaLimits if not valid parameters are given', function () {
        var myError;

        try {
            core.setChildrenMetaLimits('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setChildrenMetaLimits(rootNode, 'notNumber');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setChildrenMetaLimits(rootNode, 0.5);
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setChildrenMetaLimits(rootNode, -2);
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setChildrenMetaLimits(rootNode, 0, 'notnumber');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @setPointerMetaTarget if not valid parameters are given', function () {
        var myError;

        try {
            core.setPointerMetaTarget('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setPointerMetaTarget(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setPointerMetaTarget(rootNode, 'myname', 'notnode');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setPointerMetaTarget(rootNode, 'myname', rootNode, '0.5');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setPointerMetaTarget(rootNode, 'myname', rootNode, 0.5);
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setPointerMetaTarget(rootNode, 'myname', rootNode, -2);
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setPointerMetaTarget(rootNode, 'myname', rootNode, 0, 'notnumber');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @delPointerMetaTarget if not valid parameters are given', function () {
        var myError;

        try {
            core.delPointerMetaTarget('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.delPointerMetaTarget(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.delPointerMetaTarget(setNode, 'unknown', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.delPointerMetaTarget(setNode, 'unknown', '/path');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }
    });

    it('should throw @setPointerMetaLimits if not valid parameters are given', function () {
        var myError;

        try {
            core.setPointerMetaLimits('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setPointerMetaLimits(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setPointerMetaLimits(rootNode, '_nounderscore');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setPointerMetaLimits(rootNode, 'base');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setPointerMetaLimits(rootNode, 'ovr');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setPointerMetaLimits(rootNode, 'member');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setPointerMetaLimits(rootNode, 'any', 'notAValidPath');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setPointerMetaLimits(rootNode, 'any', 'notNumber');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setPointerMetaLimits(rootNode, 'any', 0.5);
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setPointerMetaLimits(rootNode, 'any', -2);
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setPointerMetaLimits(rootNode, 'any', 0, 'notnumber');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @delPointerMeta if not valid parameters are given', function () {
        var myError;

        try {
            core.delPointerMeta('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.delPointerMeta(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
    });

    it('should throw @getPointerMeta if not valid parameters are given', function () {
        var myError;

        try {
            core.getPointerMeta('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getPointerMeta(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
    });

    it('should throw @setAspectMetaTarget if not valid parameters are given', function () {
        var myError;

        try {
            core.setAspectMetaTarget('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setAspectMetaTarget(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.setAspectMetaTarget(rootNode, 'aspecto', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
    });

    it('should throw @delAspectMetaTarget if not valid parameters are given', function () {
        var myError;

        try {
            core.delAspectMetaTarget('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.delAspectMetaTarget(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.delAspectMetaTarget(rootNode, 'aspecto', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.delAspectMetaTarget(rootNode, 'aspecto', '/path');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }
    });

    it('should throw @delAspectMeta if not valid parameters are given', function () {
        var myError;

        try {
            core.delAspectMeta('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.delAspectMeta(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
    });

    it('should throw @getBaseType if not valid node is given', function () {
        var myError;

        try {
            core.getBaseType('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.getBaseType({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @isInstanceOf if not valid parameters are given', function () {
        var myError;

        try {
            core.isInstanceOf('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.isInstanceOf(rootNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
    });

    it('should throw @generateTreeDiff if not valid parameters are given', function (done) {
        var myError;

        try {
            core.generateTreeDiff('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        core.generateTreeDiff('string', 'string', function (err) {
            expect(err).not.to.eql(null);
            expect(err.name).to.eql('CoreIllegalArgumentError');

            core.generateTreeDiff(rootNode, 'string', function (err) {
                expect(err).not.to.eql(null);
                expect(err.name).to.eql('CoreIllegalArgumentError');
                done();
            });
        });
    });

    it('should throw @applyTreeDiff if not valid parameters are given', function (done) {
        var myError;

        try {
            core.applyTreeDiff('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        core.applyTreeDiff(rootNode, 'string', function (err) {
            expect(err).not.to.eql(null);
            expect(err.name).to.eql('CoreIllegalArgumentError');
            done();
        });
    });

    it('should throw @tryToConcatChanges if not valid parameters are given', function () {
        var myError;

        try {
            core.tryToConcatChanges('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.tryToConcatChanges({}, 'notobject');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
    });

    it('should throw @applyResolution if not valid parameters are given', function () {
        var myError;

        try {
            core.applyResolution('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
    });

    it('should throw @isAbstract if not valid node is given', function () {
        var myError;

        try {
            core.isAbstract('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.isAbstract({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @isConnection if not valid node is given', function () {
        var myError;

        try {
            core.isConnection('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.isConnection({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getValidChildrenMetaNodes if not valid parameters are given', function () {
        var myError;

        try {
            core.getValidChildrenMetaNodes('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getValidChildrenMetaNodes({missingNode: true});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getValidChildrenMetaNodes({node: 'badnode'});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getValidChildrenMetaNodes({node: rootNode, children: 'badchildren'});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getValidChildrenMetaNodes({node: rootNode, children: ['badelement']});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getValidChildrenMetaNodes({node: rootNode, sensitive: 'bad'});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getValidChildrenMetaNodes({node: rootNode, multiplicity: 'bad'});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getValidChildrenMetaNodes({node: rootNode, aspect: {}});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
    });

    it('should throw @getValidSetElementsMetaNodes if not valid parameters are given', function () {
        var myError;

        try {
            core.getValidSetElementsMetaNodes('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getValidSetElementsMetaNodes({missingNode: true});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getValidSetElementsMetaNodes({node: 'badnode'});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getValidSetElementsMetaNodes({node: rootNode, members: 'badmembers'});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getValidSetElementsMetaNodes({node: rootNode, members: ['badelement']});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getValidSetElementsMetaNodes({node: rootNode, sensitive: 'bad'});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getValidSetElementsMetaNodes({node: rootNode, multiplicity: 'bad'});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
    });

    it('should throw @getAllMetaNodes if not valid node is given', function () {
        var myError;

        try {
            core.getAllMetaNodes('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.getAllMetaNodes({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @isMetaNode if not valid node is given', function () {
        var myError;

        try {
            core.isMetaNode('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.isMetaNode({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @isFullyOverriddenMember if not valid parameters are given', function () {
        var myError;

        try {
            core.isFullyOverriddenMember('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.isFullyOverriddenMember(setNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.isFullyOverriddenMember(setNode, 'set', 'notpath');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.isFullyOverriddenMember(setNode, 'unknown', '/path');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }
    });

    it('should throw @getMixinErrors if not valid node is given', function () {
        var myError;

        try {
            core.getMixinErrors('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.getMixinErrors({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getMixinPaths if not valid node is given', function () {
        var myError;

        try {
            core.getMixinPaths('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.getMixinPaths({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getMixinNodes if not valid node is given', function () {
        var myError;

        try {
            core.getMixinNodes('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.getMixinNodes({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @delMixin if not valid parameters are given', function () {
        var myError;

        try {
            core.delMixin('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.delMixin(setNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
    });

    it('should throw @addMixin if not valid parameters are given', function () {
        var myError;

        try {
            core.addMixin('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.addMixin(setNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.addMixin(setNode, 'notpath');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
    });

    it('should throw @clearMixins if not valid node is given', function () {
        var myError;

        try {
            core.clearMixins('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.clearMixins({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getBaseTypes if not valid node is given', function () {
        var myError;

        try {
            core.getBaseTypes('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.getBaseTypes({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @canSetAsMixin if not valid parameters are given', function () {
        var myError;

        try {
            core.canSetAsMixin('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.canSetAsMixin(setNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.canSetAsMixin(setNode, 'notpath');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
    });

    it('should throw @addLibrary if not valid parameters are given', function (done) {
        var myError;

        try {
            core.addLibrary(rootNode, 'name', '#0123456789012345678901234567890123456789', null, 'nocallback');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
        Q.allSettled([
            Q.nfcall(core.addLibrary, 'string', 'string', 'string', null),
            Q.nfcall(core.addLibrary, rootNode, {}, 'string', null),
            Q.nfcall(core.addLibrary, rootNode, 'libname', 'string', null),
            Q.nfcall(core.addLibrary, rootNode, 'libname', '#0123456789012345678901234567890123456789', 'nope'),
            Q.nfcall(core.addLibrary, rootNode, 'libname', '#0123456789012345678901234567890123456789', {
                projectId: 0
            }),
            Q.nfcall(core.addLibrary, rootNode, 'libname', '#0123456789012345678901234567890123456789', {
                branchName: 0
            }),
            Q.nfcall(core.addLibrary, rootNode, 'libname', '#0123456789012345678901234567890123456789', {
                commitHash: 'notahash'
            }),
        ])
            .then(function (results) {
                expect(results).to.have.length(7);
                console.error(results);
                for (var i = 0; i < results.length; i += 1) {
                    expect(results[i].state).to.eql('rejected');
                    expect(results[i].reason instanceof Error).to.eql(true);
                    expect(results[i].reason.name).to.eql('CoreIllegalArgumentError');
                }
            })
            .nodeify(done);
    });

    it('should throw @updateLibrary if not valid parameters are given', function (done) {
        var myError;

        try {
            core.updateLibrary(rootNode, 'libname', '#0123456789012345678901234567890123456789', null, 'nocallback');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
        Q.allSettled([
            Q.nfcall(core.updateLibrary, 'string', 'string', 'string', null, null),
            Q.nfcall(core.updateLibrary, rootNode, {}, 'string', null, null),
            Q.nfcall(core.updateLibrary, rootNode, 'libname', 'string', null, null),
            Q.nfcall(core.updateLibrary, rootNode, 'libname', '#0123456789012345678901234567890123456789', 'nope', null),
            Q.nfcall(core.updateLibrary, rootNode, 'libname', '#0123456789012345678901234567890123456789', {
                projectId: 0
            }, null),
            Q.nfcall(core.updateLibrary, rootNode, 'libname', '#0123456789012345678901234567890123456789', {
                branchName: 0
            }, null),
            Q.nfcall(core.updateLibrary, rootNode, 'libname', '#0123456789012345678901234567890123456789', {
                commitHash: 'notahash'
            }, null),
        ])
            .then(function (results) {
                expect(results).to.have.length(7);
                for (var i = 0; i < results.length; i += 1) {
                    expect(results[i].state).to.eql('rejected');
                    expect(results[i].reason instanceof Error).to.eql(true);
                    expect(results[i].reason.name).to.eql('CoreIllegalArgumentError');
                }
            })
            .nodeify(done);
    });

    it('should throw @getLibraryNames if not valid node is given', function () {
        var myError;

        try {
            core.getLibraryNames('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.getLibraryNames({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getFCO if not valid node is given', function () {
        var myError;

        try {
            core.getFCO('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.getFCO({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @isLibraryRoot if not valid node is given', function () {
        var myError;

        try {
            core.isLibraryRoot('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.isLibraryRoot({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @isLibraryElement if not valid node is given', function () {
        var myError;

        try {
            core.isLibraryElement('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.isLibraryElement({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getNamespace if not valid node is given', function () {
        var myError;

        try {
            core.getNamespace('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.getNamespace({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @getFullyQualifiedName if not valid node is given', function () {
        var myError;

        try {
            core.getFullyQualifiedName('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.getFullyQualifiedName({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @removeLibrary if not valid parameters are given', function () {
        var myError;

        try {
            core.removeLibrary('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.removeLibrary(setNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.removeLibrary(setNode, 'unknown');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalOperationError');
            myError = null;
        }
    });

    it('should throw @getLibraryGuid if not valid parameters are given', function () {
        var myError;

        try {
            core.getLibraryGuid('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getLibraryGuid(setNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
    });

    it('should throw @renameLibrary if not valid parameters are given', function () {
        var myError;

        try {
            core.renameLibrary('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.renameLibrary(setNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.renameLibrary(setNode, 'old', {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
    });

    it('should throw @getLibraryInfo if not valid parameters are given', function () {
        var myError;

        try {
            core.getLibraryInfo('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getLibraryInfo(setNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
    });

    it('should throw @getLibraryRoot if not valid parameters are given', function () {
        var myError;

        try {
            core.getLibraryRoot('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getLibraryRoot(setNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
    });

    it('should throw @getLibraryMetaNodes if not valid parameters are given', function () {
        var myError;

        try {
            core.getLibraryMetaNodes('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getLibraryMetaNodes(setNode, {});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getLibraryMetaNodes(setNode, 'library', 'notbool');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
    });

    it('should throw @traverse if not valid parameters are given', function (done) {
        var myError,
            goodVisit = function (node, next) {
                next();
            };

        try {
            core.traverse(rootNode, null, goodVisit, 'nocallback');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        Q.allSettled([
            Q.nfcall(core.traverse, 'string', 'string', null),
            Q.nfcall(core.traverse, rootNode, 'string', null),
            Q.nfcall(core.traverse, rootNode, {excludeRoot: 0}, null),
            Q.nfcall(core.traverse, rootNode, {order: 0}, null),
            Q.nfcall(core.traverse, rootNode, {order: 'nope'}, null),
            Q.nfcall(core.traverse, rootNode, {stopOnError: 'nope'}, null),
            Q.nfcall(core.traverse, rootNode, null, 'nope')
        ])
            .then(function (results) {
                expect(results).to.have.length(7);
                for (var i = 0; i < results.length; i += 1) {
                    expect(results[i].state).to.eql('rejected');
                    expect(results[i].reason instanceof Error).to.eql(true);
                    expect(results[i].reason.name).to.eql('CoreIllegalArgumentError');
                }
            })
            .nodeify(done);
    });

    it('should throw @getClosureInformation if not valid parameters are given', function () {
        var myError;

        try {
            core.getClosureInformation('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.getClosureInformation(['badelement']);
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
    });

    it('should throw @importClosure if not valid parameters are given', function () {
        var myError;

        try {
            core.importClosure('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }

        try {
            core.importClosure(setNode, 'noobject');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
            myError = null;
        }
    });

    it('should throw @getInstancePaths if not valid node is given', function () {
        var myError;

        try {
            core.getInstancePaths('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        try {
            core.getInstancePaths({});
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }
    });

    it('should throw @loadInstances if not valid node is given', function (done) {
        var myError;

        try {
            core.loadInstances('string');
        } catch (e) {
            myError = e;
        } finally {
            expect(myError.name).to.eql('CoreIllegalArgumentError');
        }

        core.loadInstances('string', function (err) {
            expect(err).not.to.eql(null);
            expect(err.name).to.eql('CoreIllegalArgumentError');
            done();
        });
    });
});
