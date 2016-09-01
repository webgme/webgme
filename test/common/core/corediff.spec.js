/* jshint node:true, mocha: true*/

/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../../_globals.js');

describe('core diff', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        projectName = 'coreDiff',
        projectId = testFixture.projectName2Id(projectName),
        project,
        core,
        rootNode,
        originalRootNode,
        originalRootHash,
        commit,
        Q = testFixture.Q,
        expect = testFixture.expect,
        logger = testFixture.logger.fork('coreDiff.spec'),
        storage,
        TO_DELETE = '*to*delete*',

        gmeAuth;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .nodeify(done);
    });

    after(function (done) {
        Q.allDone([
            storage.closeDatabase(),
            gmeAuth.unload()
        ]).nodeify(done);
    });

    describe('diff', function () {

        beforeEach(function (done) {
            storage.deleteProject({projectId: projectId})
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
                    core = result.core;
                    rootNode = result.rootNode;
                    originalRootHash = result.rootHash;
                    commit = result.commitHash;
                    return Q.nfcall(core.loadRoot, originalRootHash);
                })
                .then(function (originalRootNode_) {
                    originalRootNode = originalRootNode_;
                })
                .nodeify(done);
        });

        // FIXME: there is an issue if we try to delete non-existent project, it complains about auth issues.
        //afterEach(function (done) {
        //    storage.deleteProject({projectId: projectId})
        //        .nodeify(done);
        //});

        it('should generate diff if an object is deleted', function (done) {
            var patch = {
                175547009: {
                    471466181: {
                        guid: 'be36b1a1-8d82-8aba-9eda-03d655a8bf3e',
                        oGuids: {
                            'be36b1a1-8d82-8aba-9eda-03d655a8bf3e': true,
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    871430202: {
                        guid: '18eb3c1d-c951-b757-c8c4-0ea8736c2470',
                        oGuids: {
                            '18eb3c1d-c951-b757-c8c4-0ea8736c2470': true,
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    1104061497: {
                        guid: 'f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb',
                        oGuids: {
                            'f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb': true,
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    1817665259: {
                        guid: '5f73946c-68aa-9de1-7979-736d884171af',
                        oGuids: {
                            '5f73946c-68aa-9de1-7979-736d884171af': true,
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                    oGuids: {
                        'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                        '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                        'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                    }
                },
                1303043463: {
                    guid: 'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42',
                    removed: true,
                    oGuids: {
                        'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                        '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                        '5f73946c-68aa-9de1-7979-736d884171af': true,
                        'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                        'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                    }
                },
                childrenListChanged: true,
                guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
            };

            core.applyTreeDiff(rootNode, patch, function (err) {
                if (err) {
                    return done(err);
                }

                core.persist(rootNode);

                core.generateTreeDiff(originalRootNode, rootNode, function (err, diff) {
                    if (err) {
                        return done(err);
                    }

                    expect(diff).to.deep.equal(patch);
                    done();
                });
            });
        });

        it('should generate diff if an object is created', function (done) {
            var patch = {
                175547009: {
                    471466181: {
                        guid: 'be36b1a1-8d82-8aba-9eda-03d655a8bf3e',
                        oGuids: {
                            'be36b1a1-8d82-8aba-9eda-03d655a8bf3e': true,
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    871430202: {
                        guid: '18eb3c1d-c951-b757-c8c4-0ea8736c2470',
                        oGuids: {
                            '18eb3c1d-c951-b757-c8c4-0ea8736c2470': true,
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    1104061497: {
                        guid: 'f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb',
                        oGuids: {
                            'f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb': true,
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    1817665259: {
                        guid: '5f73946c-68aa-9de1-7979-736d884171af',
                        oGuids: {
                            '5f73946c-68aa-9de1-7979-736d884171af': true,
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                    oGuids: {
                        'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                        '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                        'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                    }
                },
                1303043463: {guid: 'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42', removed: true},
                childrenListChanged: true,
                guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
            };

            core.applyTreeDiff(rootNode, patch, function (err) {
                if (err) {
                    return done(err);
                }

                core.persist(rootNode);

                // N.B: same test as before diff is applied in the different order
                core.generateTreeDiff(rootNode, originalRootNode, function (err, diff) {
                    if (err) {
                        return done(err);
                    }

                    //complete diff comparison only possible if patch is used in forward order
                    expect(diff).not.to.equal(null);
                    expect(diff).to.include.keys('1303043463');
                    expect(diff['1303043463']).to.include.keys('removed');
                    expect(diff['1303043463'].removed).to.equal(false);

                    done();
                });
            });
        });

        //TODO check if the light function can be removed as currently it has no real users
        it.skip('should generate light tree diff', function (done) {
            core.generateLightTreeDiff(originalRootNode, originalRootNode, function (err, diff) {
                if (err) {
                    return done(err);
                }
                expect(diff).to.deep.equal({});
                done();
            });
        });

    });

    describe('tryToConcatChanges', function () {

        beforeEach(function (done) {
            storage.deleteProject({projectId: projectId})
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
                    core = result.core;
                    rootNode = result.rootNode;
                    originalRootHash = result.rootHash;
                    commit = result.commitHash;
                    return Q.nfcall(core.loadRoot, originalRootHash);
                })
                .then(function (originalRootNode_) {
                    originalRootNode = originalRootNode_;
                })
                .nodeify(done);
        });

        // FIXME: there is an issue if we try to delete non-existent project, it complains about auth issues.
        //afterEach(function (done) {
        //    storage.deleteProject({projectId: projectId})
        //        .nodeify(done);
        //});

        it('should concat empty diff and meta change', function () {
            var result,
                diff1 = {
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                },
                diff2 = {
                    1: {
                        attr: {newAttr: ''},
                        meta: {
                            attributes: {
                                newAttr: {
                                    type: 'string',
                                    enum: ['a', 'b', 'c']
                                }
                            }
                        },
                        guid: 'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045',
                        oGuids: {
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                };

            result = core.tryToConcatChanges(diff1, diff2);

            expect(result.merge).to.deep.equal(diff2);
        });

        it('should combine change an element, and delete the same element', function () {
            var result,
                diff1 = {
                    1303043463: {
                        reg: {position: {x: 38, y: 407}},
                        guid: 'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42',
                        oGuids: {
                            'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            '5f73946c-68aa-9de1-7979-736d884171af': true,
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                },
                diff2 = {
                    175547009: {
                        471466181: {
                            guid: 'be36b1a1-8d82-8aba-9eda-03d655a8bf3e',
                            oGuids: {
                                'be36b1a1-8d82-8aba-9eda-03d655a8bf3e': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        871430202: {
                            guid: '18eb3c1d-c951-b757-c8c4-0ea8736c2470',
                            oGuids: {
                                '18eb3c1d-c951-b757-c8c4-0ea8736c2470': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        1104061497: {
                            guid: 'f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb',
                            oGuids: {
                                'f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        1817665259: {
                            guid: '5f73946c-68aa-9de1-7979-736d884171af',
                            oGuids: {
                                '5f73946c-68aa-9de1-7979-736d884171af': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    1303043463: {guid: 'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42', removed: true},
                    childrenListChanged: true,
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                };

            result = core.tryToConcatChanges(diff1, diff2);

            expect(result).not.to.equal(null);
            expect(result).to.include.keys('items');
            expect(result.items).to.have.length(1);
            expect(result.items[0]).to.include.keys('mine', 'theirs');
            expect(result.items[0].theirs.path).to.equal('/1303043463/removed');
            expect(result.items[0].theirs.value).to.equal(true);
            expect(result.items[0].mine.path).to.equal('/1303043463/reg/position');

        });

        it('should combine delete an element, and change the same element', function () {
            var result,
                diff1 = {
                    1303043463: {
                        reg: {position: {x: 38, y: 407}},
                        guid: 'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42',
                        oGuids: {
                            'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            '5f73946c-68aa-9de1-7979-736d884171af': true,
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                },
                diff2 = {
                    175547009: {
                        471466181: {
                            guid: 'be36b1a1-8d82-8aba-9eda-03d655a8bf3e',
                            oGuids: {
                                'be36b1a1-8d82-8aba-9eda-03d655a8bf3e': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        871430202: {
                            guid: '18eb3c1d-c951-b757-c8c4-0ea8736c2470',
                            oGuids: {
                                '18eb3c1d-c951-b757-c8c4-0ea8736c2470': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        1104061497: {
                            guid: 'f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb',
                            oGuids: {
                                'f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        1817665259: {
                            guid: '5f73946c-68aa-9de1-7979-736d884171af',
                            oGuids: {
                                '5f73946c-68aa-9de1-7979-736d884171af': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    1303043463: {guid: 'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42', removed: true},
                    childrenListChanged: true,
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                };

            // same as before other way around
            result = core.tryToConcatChanges(diff2, diff1);

            expect(result).not.to.equal(null);
            expect(result).to.include.keys('items');
            expect(result.items).to.have.length(1);
            expect(result.items[0]).to.include.keys('mine', 'theirs');
            expect(result.items[0].mine.path).to.equal('/1303043463/removed');
            expect(result.items[0].mine.value).to.equal(true);
            expect(result.items[0].theirs.path).to.equal('/1303043463/reg/position');
        });

        it('should combine change a set element, and delete the same element from the set', function () {
            var result,
                diff1 = {
                    1303043463: {
                        2119137141: {
                            set: {
                                setPtr: {
                                    '/1303043463/1448030591': {
                                        reg: {
                                            position: {
                                                x: 352,
                                                y: 156
                                            }
                                        }
                                    }
                                }
                            },
                            guid: '45657d4d-f82d-13ce-1acb-0aadebb5c8b5',
                            oGuids: {
                                '45657d4d-f82d-13ce-1acb-0aadebb5c8b5': true,
                                'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                'f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        guid: 'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42',
                        oGuids: {
                            'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            '5f73946c-68aa-9de1-7979-736d884171af': true,
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                },
                diff2 = {
                    1303043463: {
                        2119137141: {
                            set: {setPtr: {'/1303043463/1448030591': TO_DELETE}},
                            guid: '45657d4d-f82d-13ce-1acb-0aadebb5c8b5',
                            oGuids: {
                                '45657d4d-f82d-13ce-1acb-0aadebb5c8b5': true,
                                'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                'f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        guid: 'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42',
                        oGuids: {
                            'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            '5f73946c-68aa-9de1-7979-736d884171af': true,
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                };

            result = core.tryToConcatChanges(diff1, diff2);

            expect(result).not.to.equal(null);
            expect(result).to.include.keys('items');
            expect(result.items).to.have.length(1);
            expect(result.items[0]).to.include.keys('mine', 'theirs');
            expect(result.items[0].theirs.path).to.equal('/1303043463/2119137141/set/setPtr//1303043463/1448030591//');
            expect(result.items[0].theirs.value).to.equal('*to*delete*');
            expect(result.items[0].mine.path)
                .to.equal('/1303043463/2119137141/set/setPtr//1303043463/1448030591///reg/position');
        });

        it('should combine delete a set element, and change the same element in the set', function () {
            var result,
                diff1 = {
                    1303043463: {
                        2119137141: {
                            set: {
                                setPtr: {
                                    '/1303043463/1448030591': {
                                        reg: {
                                            position: {
                                                x: 352,
                                                y: 156
                                            }
                                        }
                                    }
                                }
                            },
                            guid: '45657d4d-f82d-13ce-1acb-0aadebb5c8b5',
                            oGuids: {
                                '45657d4d-f82d-13ce-1acb-0aadebb5c8b5': true,
                                'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                'f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        guid: 'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42',
                        oGuids: {
                            'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            '5f73946c-68aa-9de1-7979-736d884171af': true,
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                },
                diff2 = {
                    1303043463: {
                        2119137141: {
                            set: {setPtr: {'/1303043463/1448030591': TO_DELETE}},
                            guid: '45657d4d-f82d-13ce-1acb-0aadebb5c8b5',
                            oGuids: {
                                '45657d4d-f82d-13ce-1acb-0aadebb5c8b5': true,
                                'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                'f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        guid: 'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42',
                        oGuids: {
                            'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            '5f73946c-68aa-9de1-7979-736d884171af': true,
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                };

            // same as before other way around
            result = core.tryToConcatChanges(diff2, diff1);

            expect(result).not.to.equal(null);
            expect(result).to.include.keys('items');
            expect(result.items).to.have.length(1);
            expect(result.items[0]).to.include.keys('mine', 'theirs');
            expect(result.items[0].mine.path).to.equal('/1303043463/2119137141/set/setPtr//1303043463/1448030591//');
            expect(result.items[0].mine.value).to.equal('*to*delete*');
            expect(result.items[0].theirs.path)
                .to.equal('/1303043463/2119137141/set/setPtr//1303043463/1448030591///reg/position');
        });

        it('should combine change a set element, and delete the set pointer', function () {
            var result,
                diff1 = {
                    1303043463: {
                        2119137141: {
                            set: {
                                setPtr: {
                                    '/1303043463/1448030591': {
                                        reg: {
                                            position: {
                                                x: 352,
                                                y: 156
                                            }
                                        }
                                    }
                                }
                            },
                            guid: '45657d4d-f82d-13ce-1acb-0aadebb5c8b5',
                            oGuids: {
                                '45657d4d-f82d-13ce-1acb-0aadebb5c8b5': true,
                                'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                'f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        guid: 'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42',
                        oGuids: {
                            'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            '5f73946c-68aa-9de1-7979-736d884171af': true,
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                },
                diff2 = {
                    1303043463: {
                        2119137141: {
                            set: {setPtr: TO_DELETE}, // WARNING: this cannot be generated by the UI.
                            guid: '45657d4d-f82d-13ce-1acb-0aadebb5c8b5',
                            oGuids: {
                                '45657d4d-f82d-13ce-1acb-0aadebb5c8b5': true,
                                'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                'f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        guid: 'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42',
                        oGuids: {
                            'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            '5f73946c-68aa-9de1-7979-736d884171af': true,
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                };

            result = core.tryToConcatChanges(diff1, diff2);

            expect(result).not.to.equal(null);
            expect(result).to.include.keys('items');
            expect(result.items).to.have.length(1);
            expect(result.items[0]).to.include.keys('mine', 'theirs');
            expect(result.items[0].mine.path)
                .to.equal('/1303043463/2119137141/set/setPtr//1303043463/1448030591//reg/position');
            expect(result.items[0].theirs.path).to.equal('/1303043463/2119137141/set/setPtr');
            expect(result.items[0].theirs.value).to.equal('*to*delete*');
        });

        //it('should tryToConcatChanges does nothing, and delete the set pointer', function () {
        //    var result,
        //        diff1 = {},
        //        diff2 = {
        //            1303043463: {
        //                2119137141: {
        //                    set: {setPtr: TO_DELETE}, // WARNING: this cannot be generated by the UI.
        //                    guid: '45657d4d-f82d-13ce-1acb-0aadebb5c8b5',
        //                    oGuids: {
        //                        '45657d4d-f82d-13ce-1acb-0aadebb5c8b5': true,
        //                        'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
        //                        '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
        //                        'f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb': true,
        //                        'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
        //                        'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
        //                    }
        //                },
        //                guid: 'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42',
        //                oGuids: {
        //                    'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
        //                    '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
        //                    '5f73946c-68aa-9de1-7979-736d884171af': true,
        //                    'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
        //                    'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
        //                }
        //            },
        //            guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
        //            oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
        //        };
        //
        //
        //    result = core.tryToConcatChanges(diff1, diff2);
        //    // TODO: check if changes happened as expected.
        //});

        it('should combine delete a meta rule, and add a new attribute to meta', function () {
            var result,
                combinedMeta = {
                    children: TO_DELETE,
                    attributes: {
                        newAttribute: {
                            type: 'string',
                            enum: ['a', 'b', 'c', 'd']
                        }
                    }
                },
                diff1 = {
                    175547009: {
                        attr: {newAttribute: 'a'},
                        meta: {children: combinedMeta.children},
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    set: {
                        MetaAspectSet: {'/175547009': TO_DELETE},
                        'MetaAspectSet_0fe6dd4c-e307-b3e3-9bff-f30fb55c5866': {'/175547009': TO_DELETE}
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                },
                diff2 = {
                    175547009: {
                        attr: {newAttribute: 'a'},
                        meta: {
                            attributes: combinedMeta.attributes
                        },
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                };

            result = core.tryToConcatChanges(diff1, diff2);

            expect(result).not.to.equal(null);
            expect(result).to.include.keys('items');
            expect(result.items).to.have.length(0);
            expect(result.merge).to.include.keys('175547009');
            expect(result.merge['175547009'].meta).to.deep.equal(combinedMeta);

        });

        it('should combine delete an element from meta sheet, and add a new attribute to meta', function () {
            var result,
                diff1 = {
                    175547009: {
                        attr: {newAttribute: 'a'},
                        meta: TO_DELETE, // FIXME: diff is generated incorrectly
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    set: {
                        MetaAspectSet: {'/175547009': TO_DELETE},
                        'MetaAspectSet_0fe6dd4c-e307-b3e3-9bff-f30fb55c5866': {'/175547009': TO_DELETE}
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                },
                diff2 = {
                    175547009: {
                        attr: {newAttribute: 'a'},
                        meta: {
                            attributes: {
                                newAttribute: {
                                    type: 'string',
                                    enum: ['a', 'b', 'c', 'd']
                                }
                            }
                        },
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                };

            result = core.tryToConcatChanges(diff1, diff2);

            expect(result).not.to.equal(null);
            expect(result).to.include.keys('items');
            expect(result.items).to.have.length(1);
            expect(result.items[0]).to.include.keys('mine', 'theirs');
            expect(result.items[0].mine.path).to.equal('/175547009/meta');
            expect(result.items[0].mine.value).to.equal('*to*delete*');
            expect(result.items[0].theirs.path).to.equal('/175547009/meta/attributes/newAttribute');

        });

        it('should combine add a new attribute to meta, and delete an element from meta sheet', function () {
            var result,
                diff1 = {
                    175547009: {
                        attr: {newAttribute: 'a'},
                        meta: TO_DELETE, // FIXME: diff is generated incorrectly
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    set: {
                        MetaAspectSet: {'/175547009': TO_DELETE},
                        'MetaAspectSet_0fe6dd4c-e307-b3e3-9bff-f30fb55c5866': {'/175547009': TO_DELETE}
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                },
                diff2 = {
                    175547009: {
                        attr: {newAttribute: 'a'},
                        meta: {
                            attributes: {
                                newAttribute: {
                                    type: 'string',
                                    enum: ['a', 'b', 'c', 'd']
                                }
                            }
                        },
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                };

            result = core.tryToConcatChanges(diff2, diff1);

            expect(result.items).to.have.length(1);
            expect(result.items[0].theirs.value).to.equal(TO_DELETE);
            expect(result.items[0].theirs.path).to.equal('/175547009/meta');
            expect(result.items[0].mine.path).to.equal('/175547009/meta/attributes/newAttribute');
        });

        it('should combine delete meta, and add a new pointer to meta', function () {
            var result,
                diff1 = {
                    175547009: {
                        meta: TO_DELETE,
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    set: {
                        MetaAspectSet: {'/175547009': TO_DELETE},
                        'MetaAspectSet_0fe6dd4c-e307-b3e3-9bff-f30fb55c5866': {'/175547009': TO_DELETE}
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                },
                diff2 = {
                    175547009: {
                        pointer: {src: null},
                        meta: {
                            pointers: {
                                src: {
                                    '/175547009/471466181': {
                                        min: -1,
                                        max: 1
                                    },
                                    min: 1,
                                    max: 1
                                }
                            }
                        },
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                };

            result = core.tryToConcatChanges(diff1, diff2);

            expect(result.items).to.have.length(3);
            expect(result.items[0].mine.value).to.equal(TO_DELETE);
            expect(result.items[0].mine.path).to.equal('/175547009/meta');
            expect(result.items[1].mine.value).to.equal(TO_DELETE);
            expect(result.items[1].mine.path).to.equal('/175547009/meta');
            expect(result.items[2].mine.value).to.equal(TO_DELETE);
            expect(result.items[2].mine.path).to.equal('/175547009/meta');
        });

        it('should combine delete meta, and add new children to meta', function () {
            var result,
                diff1 = {
                    175547009: {
                        meta: TO_DELETE,
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    set: {
                        MetaAspectSet: {'/175547009': TO_DELETE},
                        'MetaAspectSet_0fe6dd4c-e307-b3e3-9bff-f30fb55c5866': {'/175547009': TO_DELETE}
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                },
                diff2 = {
                    175547009: {
                        meta: {children: {'/1': {min: 1, max: 1}}},
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                };

            result = core.tryToConcatChanges(diff1, diff2);

            expect(result.items).to.have.length(1);
            expect(result.items[0].mine.value).to.equal(TO_DELETE);
            expect(result.items[0].mine.path).to.equal('/175547009/meta');
        });

        it('should generate all conflict when a base is deleted and a property is changed', function () {
            var diff1 = {
                    childrenListChanged: true,
                    D: {
                        guid: 'ef812549-4970-2312-5e3a-7eb9b96b2ae7',
                        removed: true,
                        oGuids: {
                            'ef812549-4970-2312-5e3a-7eb9b96b2ae7': true,
                            '03d36072-9e09-7866-cb4e-d0a36ff825f6': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '03d36072-9e09-7866-cb4e-d0a36ff825f6',
                    oGuids: {
                        '03d36072-9e09-7866-cb4e-d0a36ff825f6': true
                    }
                },
                diff2 = {
                    childrenListChanged: true,
                    O: {
                        reg: {
                            position: {
                                x: 379,
                                y: 210
                            }
                        },
                        guid: '57a34d02-1535-5f98-4864-78022e614bc2',
                        oGuids: {
                            '57a34d02-1535-5f98-4864-78022e614bc2': true,
                            '03d36072-9e09-7866-cb4e-d0a36ff825f6': true,
                            'ef812549-4970-2312-5e3a-7eb9b96b2ae7': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '03d36072-9e09-7866-cb4e-d0a36ff825f6',
                    oGuids: {
                        '03d36072-9e09-7866-cb4e-d0a36ff825f6': true
                    }
                },
                result = core.tryToConcatChanges(diff1, diff2);

            expect(result.items).to.have.length(1);
            expect(result.items[0].mine.path).to.equal('/D/removed');
        });

        it('should not fail to generate conflict result if one of the diffs are empty', function () {
            var diff1 = {
                    childrenListChanged: true,
                    D: {
                        guid: 'ef812549-4970-2312-5e3a-7eb9b96b2ae7',
                        removed: true,
                        oGuids: {
                            'ef812549-4970-2312-5e3a-7eb9b96b2ae7': true,
                            '03d36072-9e09-7866-cb4e-d0a36ff825f6': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '03d36072-9e09-7866-cb4e-d0a36ff825f6',
                    oGuids: {
                        '03d36072-9e09-7866-cb4e-d0a36ff825f6': true
                    }
                },
                diff2 = {},
                result = core.tryToConcatChanges(diff1, diff2);

            expect(result.items).to.have.length(0);

            result = core.tryToConcatChanges(diff2, diff1);

            expect(result.items).to.have.length(0);
        });

        it('should generate the same conflict no matter the order of parameters', function () {
            var diff1 = {
                    childrenListChanged: true,
                    D: {
                        guid: 'ef812549-4970-2312-5e3a-7eb9b96b2ae7',
                        removed: true,
                        oGuids: {
                            'ef812549-4970-2312-5e3a-7eb9b96b2ae7': true,
                            '03d36072-9e09-7866-cb4e-d0a36ff825f6': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '03d36072-9e09-7866-cb4e-d0a36ff825f6',
                    oGuids: {
                        '03d36072-9e09-7866-cb4e-d0a36ff825f6': true
                    }
                },
                diff2 = {
                    childrenListChanged: true,
                    O: {
                        reg: {
                            position: {
                                x: 379,
                                y: 210
                            }
                        },
                        guid: '57a34d02-1535-5f98-4864-78022e614bc2',
                        oGuids: {
                            '57a34d02-1535-5f98-4864-78022e614bc2': true,
                            '03d36072-9e09-7866-cb4e-d0a36ff825f6': true,
                            'ef812549-4970-2312-5e3a-7eb9b96b2ae7': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '03d36072-9e09-7866-cb4e-d0a36ff825f6',
                    oGuids: {
                        '03d36072-9e09-7866-cb4e-d0a36ff825f6': true
                    }
                },
                result1 = core.tryToConcatChanges(diff1, diff2),
                result2 = core.tryToConcatChanges(diff2, diff1),
                i;

            expect(result1.items).to.have.length(result2.items.length);
            for (i = 0; i < result1.items.length; i += 1) {
                expect(result1.items[i].mine).to.eql(result2.items[i].theirs);
            }
            expect(result1.mine).to.eql(result2.theirs);
        });

        it('should handle node addition symmetrically', function () {
            var diff1 = {
                    childrenListChanged: true,
                    D: {
                        guid: 'ef812549-4970-2312-5e3a-7eb9b96b2ae7',
                        removed: false,
                        hash: '#e341ba304b75ad76642dcf11dd920ca4a403be60',
                        pointer: {
                            base: '/1'
                        },
                        oGuids: {
                            'ef812549-4970-2312-5e3a-7eb9b96b2ae7': true,
                            '03d36072-9e09-7866-cb4e-d0a36ff825f6': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '03d36072-9e09-7866-cb4e-d0a36ff825f6',
                    oGuids: {
                        '03d36072-9e09-7866-cb4e-d0a36ff825f6': true
                    }
                },
                diff2 = {},
                result1 = core.tryToConcatChanges(diff1, diff2),
                result2 = core.tryToConcatChanges(diff2, diff1);

            expect(result1.items).to.have.length(result2.items.length);
            expect(result1.items).to.have.length(0);
            expect(result1.merge).to.eql(result2.merge);
        });

        it('should handle node removal symmetrically', function () {
            var diff1 = {
                    childrenListChanged: true,
                    D: {
                        guid: 'ef812549-4970-2312-5e3a-7eb9b96b2ae7',
                        removed: true,
                        oGuids: {
                            'ef812549-4970-2312-5e3a-7eb9b96b2ae7': true,
                            '03d36072-9e09-7866-cb4e-d0a36ff825f6': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '03d36072-9e09-7866-cb4e-d0a36ff825f6',
                    oGuids: {
                        '03d36072-9e09-7866-cb4e-d0a36ff825f6': true
                    }
                },
                diff2 = {},
                result1 = core.tryToConcatChanges(diff1, diff2),
                result2 = core.tryToConcatChanges(diff2, diff1);

            expect(result1.items).to.have.length(result2.items.length);
            expect(result1.items).to.have.length(0);
            expect(result1.merge).to.eql(result2.merge);
        });
    });

    describe('resolve', function () {

        beforeEach(function (done) {
            storage.deleteProject({projectId: projectId})
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
                    core = result.core;
                    rootNode = result.rootNode;
                    originalRootHash = result.rootHash;
                    commit = result.commitHash;
                    return Q.nfcall(core.loadRoot, originalRootHash);
                })
                .then(function (originalRootNode_) {
                    originalRootNode = originalRootNode_;
                })
                .nodeify(done);
        });

        // FIXME: there is an issue if we try to delete non-existent project, it complains about auth issues.
        //afterEach(function (done) {
        //    storage.deleteProject({projectId: projectId})
        //        .nodeify(done);
        //});

        it('should combine and resolve: rename and move + rename', function () {
            var resultPatch,
                resultConflict,
                diff1 = {
                    175547009: {
                        471466181: {
                            guid: 'be36b1a1-8d82-8aba-9eda-03d655a8bf3e',
                            oGuids: {
                                'be36b1a1-8d82-8aba-9eda-03d655a8bf3e': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        871430202: {
                            guid: '18eb3c1d-c951-b757-c8c4-0ea8736c2470',
                            oGuids: {
                                '18eb3c1d-c951-b757-c8c4-0ea8736c2470': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        1104061497: {
                            guid: 'f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb',
                            oGuids: {
                                'f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        1817665259: {
                            guid: '5f73946c-68aa-9de1-7979-736d884171af',
                            oGuids: {
                                '5f73946c-68aa-9de1-7979-736d884171af': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    1303043463: {
                        902088723: {
                            guid: 'd8f6c058-f180-f9ea-a0fc-5909e42811ae',
                            oGuids: {
                                'd8f6c058-f180-f9ea-a0fc-5909e42811ae': true,
                                'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                '5f73946c-68aa-9de1-7979-736d884171af': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        1044885565: {
                            guid: '138e7076-9c15-edf6-aea4-23effabebb86',
                            oGuids: {
                                '138e7076-9c15-edf6-aea4-23effabebb86': true,
                                'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                '18eb3c1d-c951-b757-c8c4-0ea8736c2470': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        1448030591: {
                            guid: 'be71f6dc-6eec-7552-f3c0-5cc64423f290',
                            oGuids: {
                                'be71f6dc-6eec-7552-f3c0-5cc64423f290': true,
                                'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                '18eb3c1d-c951-b757-c8c4-0ea8736c2470': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        1763546084: {
                            249902827: {
                                guid: 'bbaf81cd-07b8-c4c6-b333-280cae75ff4a',
                                oGuids: {
                                    'bbaf81cd-07b8-c4c6-b333-280cae75ff4a': true,
                                    'cbfe379c-c527-700e-3041-a0c22ca2a5d6': true,
                                    'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                                    '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                    '5f73946c-68aa-9de1-7979-736d884171af': true,
                                    'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                    'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                                }
                            },
                            childrenListChanged: true,
                            guid: 'cbfe379c-c527-700e-3041-a0c22ca2a5d6',
                            oGuids: {
                                'cbfe379c-c527-700e-3041-a0c22ca2a5d6': true,
                                'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                'be36b1a1-8d82-8aba-9eda-03d655a8bf3e': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        2119137141: {
                            guid: '45657d4d-f82d-13ce-1acb-0aadebb5c8b5',
                            oGuids: {
                                '45657d4d-f82d-13ce-1acb-0aadebb5c8b5': true,
                                'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                'f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        guid: 'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42',
                        oGuids: {
                            'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            '5f73946c-68aa-9de1-7979-736d884171af': true,
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    1823288916: {
                        attr: {name: 'ModelEditor3'},
                        guid: '56213d7f-3e44-6a23-3e2b-95adaf702b4d',
                        oGuids: {
                            '56213d7f-3e44-6a23-3e2b-95adaf702b4d': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            '5f73946c-68aa-9de1-7979-736d884171af': true,
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        },
                        movedFrom: '/1303043463/1763546084/1823288916',
                        ooGuids: {
                            '56213d7f-3e44-6a23-3e2b-95adaf702b4d': true,
                            'cbfe379c-c527-700e-3041-a0c22ca2a5d6': true,
                            'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            '5f73946c-68aa-9de1-7979-736d884171af': true,
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    childrenListChanged: true,
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                },
                diff2 = {
                    175547009: {
                        471466181: {
                            guid: 'be36b1a1-8d82-8aba-9eda-03d655a8bf3e',
                            oGuids: {
                                'be36b1a1-8d82-8aba-9eda-03d655a8bf3e': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        871430202: {
                            guid: '18eb3c1d-c951-b757-c8c4-0ea8736c2470',
                            oGuids: {
                                '18eb3c1d-c951-b757-c8c4-0ea8736c2470': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        1104061497: {
                            guid: 'f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb',
                            oGuids: {
                                'f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        1817665259: {
                            guid: '5f73946c-68aa-9de1-7979-736d884171af',
                            oGuids: {
                                '5f73946c-68aa-9de1-7979-736d884171af': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    1303043463: {
                        902088723: {
                            guid: 'd8f6c058-f180-f9ea-a0fc-5909e42811ae',
                            oGuids: {
                                'd8f6c058-f180-f9ea-a0fc-5909e42811ae': true,
                                'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                '5f73946c-68aa-9de1-7979-736d884171af': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        1044885565: {
                            guid: '138e7076-9c15-edf6-aea4-23effabebb86',
                            oGuids: {
                                '138e7076-9c15-edf6-aea4-23effabebb86': true,
                                'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                '18eb3c1d-c951-b757-c8c4-0ea8736c2470': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        1448030591: {
                            guid: 'be71f6dc-6eec-7552-f3c0-5cc64423f290',
                            oGuids: {
                                'be71f6dc-6eec-7552-f3c0-5cc64423f290': true,
                                'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                '18eb3c1d-c951-b757-c8c4-0ea8736c2470': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        1763546084: {
                            249902827: {
                                guid: 'bbaf81cd-07b8-c4c6-b333-280cae75ff4a',
                                oGuids: {
                                    'bbaf81cd-07b8-c4c6-b333-280cae75ff4a': true,
                                    'cbfe379c-c527-700e-3041-a0c22ca2a5d6': true,
                                    'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                                    '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                    '5f73946c-68aa-9de1-7979-736d884171af': true,
                                    'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                    'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                                }
                            },
                            childrenListChanged: true,
                            guid: 'cbfe379c-c527-700e-3041-a0c22ca2a5d6',
                            oGuids: {
                                'cbfe379c-c527-700e-3041-a0c22ca2a5d6': true,
                                'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                'be36b1a1-8d82-8aba-9eda-03d655a8bf3e': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        1823288916: {
                            guid: '56213d7f-3e44-6a23-3e2b-95adaf702b4d',
                            oGuids: {
                                '56213d7f-3e44-6a23-3e2b-95adaf702b4d': true,
                                'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                '5f73946c-68aa-9de1-7979-736d884171af': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            },
                            movedFrom: '/1303043463/1763546084/1823288916',
                            ooGuids: {
                                '56213d7f-3e44-6a23-3e2b-95adaf702b4d': true,
                                'cbfe379c-c527-700e-3041-a0c22ca2a5d6': true,
                                'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                '5f73946c-68aa-9de1-7979-736d884171af': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        2119137141: {
                            guid: '45657d4d-f82d-13ce-1acb-0aadebb5c8b5',
                            oGuids: {
                                '45657d4d-f82d-13ce-1acb-0aadebb5c8b5': true,
                                'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                                '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                                'f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb': true,
                                'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                            }
                        },
                        childrenListChanged: true,
                        guid: 'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42',
                        oGuids: {
                            'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            '5f73946c-68aa-9de1-7979-736d884171af': true,
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                };

            resultConflict = core.tryToConcatChanges(diff1, diff2);
            resultConflict.items[0].selected = 'theirs';
            resultPatch = core.applyResolution(resultConflict);

            expect(resultPatch).not.to.equal(null);
            expect(resultPatch).to.include.keys('1303043463');
            expect(resultPatch['1303043463']).to.include.keys('1823288916');
            expect(resultPatch['1303043463']['1823288916'].attr.name).to.equal('ModelEditor3');
            expect(resultPatch['1303043463']).to.include.keys('1763546084');
            expect(resultPatch['1303043463']['1763546084']).not.to.include.keys('1823288916');

        });
    });

    describe('patch', function () {
        beforeEach(function (done) {
            storage.deleteProject({projectId: projectId})
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
                    core = result.core;
                    rootNode = result.rootNode;
                    originalRootHash = result.rootHash;
                    commit = result.commitHash;
                    return Q.nfcall(core.loadRoot, originalRootHash);
                })
                .then(function (originalRootNode_) {
                    originalRootNode = originalRootNode_;
                })
                .nodeify(done);
        });

        // FIXME: there is an issue if we try to delete non-existent project, it complains about auth issues.
        //afterEach(function (done) {
        //    storage.deleteProject({projectId: projectId})
        //        .nodeify(done);
        //});

        //FIXME: This started to fail with webgmex as seed.
        it('should add a new object with patch', function (done) {
            var patch = {
                175547009: {
                    471466181: {
                        guid: 'be36b1a1-8d82-8aba-9eda-03d655a8bf3e',
                        oGuids: {
                            'be36b1a1-8d82-8aba-9eda-03d655a8bf3e': true,
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    871430202: {
                        guid: '18eb3c1d-c951-b757-c8c4-0ea8736c2470',
                        oGuids: {
                            '18eb3c1d-c951-b757-c8c4-0ea8736c2470': true,
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    1104061497: {
                        guid: 'f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb',
                        oGuids: {
                            'f05865fa-6f8b-0bc8-dea0-6bfdd1f552fb': true,
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    1817665259: {
                        guid: '5f73946c-68aa-9de1-7979-736d884171af',
                        oGuids: {
                            '5f73946c-68aa-9de1-7979-736d884171af': true,
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                    oGuids: {
                        'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                        '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                        'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                    }
                },
                1303043463: {guid: 'ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42', removed: true},
                childrenListChanged: true,
                guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
            };

            core.applyTreeDiff(rootNode, patch, function (err) {
                if (err) {
                    return done(err);
                }

                core.persist(rootNode);

                // N.B: load project, delete object, generate diff in reverse, then apply
                core.generateTreeDiff(rootNode, originalRootNode, function (err, diff) {
                    if (err) {
                        return done(err);
                    }

                    core.applyTreeDiff(rootNode, diff, function (err) {
                        if (err) {
                            return done(err);
                        }

                        Q.nfcall(core.loadByPath, rootNode, '/1303043463')
                            .then(function (node) {
                                expect(core.getGuid(node)).to.equal('ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42');
                                done();
                            })
                            .catch(done);
                    });
                });
            });
        });

        it('should create a new META attribute', function (done) {
            var newAttributeMetaRule = {type: 'string', enum: ['a', 'b', 'c']},
                patch = {
                    1: {
                        attr: {newAttr: ''},
                        meta: {attributes: {newAttr: newAttributeMetaRule}},
                        guid: 'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045',
                        oGuids: {
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                };

            core.applyTreeDiff(rootNode, patch, function (err) {
                if (err) {
                    return done(err);
                }

                core.persist(rootNode);

                Q.nfcall(core.loadByPath, rootNode, '/1')
                    .then(function (node) {
                        expect(core.getValidAttributeNames(node)).to.include('newAttr');
                        expect(core.getAttributeMeta(node, 'newAttr')).to.deep.equal(newAttributeMetaRule);
                        done();
                    })
                    .catch(done);
            });
        });

        it('should remove a META attribute', function (done) {
            var patch = {
                1: {
                    attr: {newAttr: ''},
                    meta: {attributes: {newAttr: {type: 'string', enum: ['a', 'b', 'c']}}},
                    guid: 'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045',
                    oGuids: {
                        'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true,
                        '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true
                    }
                },
                guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
            };

            core.applyTreeDiff(rootNode, patch, function (err) {
                if (err) {
                    return done(err);
                }

                core.persist(rootNode);

                // N.B: load project, delete object, generate diff in reverse, then apply
                core.generateTreeDiff(rootNode, originalRootNode, function (err, diff) {
                    if (err) {
                        return done(err);
                    }

                    core.applyTreeDiff(rootNode, diff, function (err) {
                        if (err) {
                            return done(err);
                        }

                        Q.nfcall(core.loadByPath, rootNode, '/1')
                            .then(function (node) {
                                expect(core.getValidAttributeNames(node)).not.to.include('newAttr');
                                done();
                            })
                            .catch(done);
                    });
                });
            });
        });

        it('should apply delete a containment rule from meta, and change min and max items', function (done) {
            var resultConflict,
                resultPatch,
                diff1 = {
                    175547009: {
                        meta: {children: TO_DELETE},
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                },
                diff2 = {
                    175547009: {
                        meta: {children: {'/1': {min: 1, max: 1}}},
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                };

            resultConflict = core.tryToConcatChanges(diff1, diff2);
            resultPatch = core.applyResolution(resultConflict);

            Q.nfcall(core.applyTreeDiff, rootNode, resultPatch) // FIXME: what if it results in an error?
                .then(function () {
                    return Q.nfcall(core.loadByPath, rootNode, '/175547009');
                })
                .then(function (node) {
                    expect(core.getValidChildrenPaths(node)).to.have.length(0);
                })
                .nodeify(done);

        });

        it('should apply conflicting attribute type changes in meta', function (done) {
            var resultConflict,
                resultPatch,
                diff1 = {
                    175547009: {
                        attr: {newAttr: 0},
                        meta: {attributes: {newAttr: {type: 'integer'}}},
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                },
                diff2 = {
                    175547009: {
                        attr: {newAttr: true},
                        meta: {attributes: {newAttr: {type: 'boolean'}}},
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    set: {
                        'MetaAspectSet_0fe6dd4c-e307-b3e3-9bff-f30fb55c5866': {
                            '/175547009': {
                                reg: {
                                    position: {
                                        x: 389,
                                        y: 110
                                    }
                                }
                            }
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                };

            resultConflict = core.tryToConcatChanges(diff1, diff2);
            resultPatch = core.applyResolution(resultConflict);

            Q.nfcall(core.applyTreeDiff, rootNode, resultPatch)
                .then(function () {
                    return Q.nfcall(core.loadByPath, rootNode, '/175547009');
                })
                .then(function (node) {
                    expect(core.getAttributeMeta(node, 'newAttr')).to.eql({type: 'integer'});
                })
                .nodeify(done);

        });

        it('should apply conflicting attribute changes in meta deleted one attribute', function (done) {
            var resultConflict,
                resultPatch,
                diff1 = {
                    175547009: {
                        meta: {attributes: {newAttr: TO_DELETE}},
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                },
                diff2 = {
                    175547009: {
                        attr: {newAttr: true},
                        meta: {attributes: {newAttr: {type: 'boolean'}}},
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    set: {
                        'MetaAspectSet_0fe6dd4c-e307-b3e3-9bff-f30fb55c5866': {
                            '/175547009': {
                                reg: {
                                    position: {
                                        x: 389,
                                        y: 110
                                    }
                                }
                            }
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                };

            resultConflict = core.tryToConcatChanges(diff1, diff2);
            resultPatch = core.applyResolution(resultConflict);

            Q.nfcall(core.applyTreeDiff, rootNode, resultPatch)
                .then(function () {
                    return Q.nfcall(core.loadByPath, rootNode, '/175547009');
                })
                .then(function (node) {
                    expect(core.getValidAttributeNames(node)).not.to.include.members(['newAttr']);
                })
                .nodeify(done);

        });

        it('should apply conflicting attribute changes in meta deleted all attributes', function (done) {
            var resultConflict,
                resultPatch,
                diff1 = {
                    175547009: {
                        meta: {attributes: TO_DELETE},
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                },
                diff2 = {
                    175547009: {
                        attr: {newAttr: true},
                        meta: {attributes: {newAttr: {type: 'boolean'}}},
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    set: {
                        'MetaAspectSet_0fe6dd4c-e307-b3e3-9bff-f30fb55c5866': {
                            '/175547009': {
                                reg: {
                                    position: {
                                        x: 389,
                                        y: 110
                                    }
                                }
                            }
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                };

            resultConflict = core.tryToConcatChanges(diff1, diff2);
            resultPatch = core.applyResolution(resultConflict);

            Q.nfcall(core.applyTreeDiff, rootNode, resultPatch) // FIXME: what if it results in an error?
                .then(function () {
                    return Q.nfcall(core.loadByPath, rootNode, '/175547009');
                })
                .then(function (node) {
                    expect(core.getValidAttributeNames(node)).not.to.include.members(['newAttr']);
                })
                .nodeify(done);

        });

        it('should apply conflicting aspect changes in meta', function (done) {
            var resultConflict,
                resultPatch,
                diff1 = {
                    175547009: {
                        set: {a: {}},
                        meta: {aspects: {a: ['/175547009', '/175547009/471466181']}},
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                },
                diff2 = {
                    175547009: {
                        set: {a: {}},
                        meta: {
                            aspects: {a: ['/175547009/471466181', '/175547009/1104061497', '/175547009/1817665259']}
                        },
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                };

            resultConflict = core.tryToConcatChanges(diff1, diff2);
            resultPatch = core.applyResolution(resultConflict);

            Q.nfcall(core.applyTreeDiff, rootNode, resultPatch) // FIXME: what if it results in an error?
                .then(function () {
                    return Q.nfcall(core.loadByPath, rootNode, '/175547009');
                })
                .then(function (node) {
                    expect(core.getAspectMeta(node, 'a')).to.include.members(['/175547009',
                        '/175547009/471466181', '/175547009/1817665259']);
                })
                .nodeify(done);

        });

        it('should apply conflicting aspect changes in meta delete one aspect', function (done) {
            var resultConflict,
                resultPatch,
                diff1 = {
                    175547009: {
                        meta: {aspects: {a: TO_DELETE}},
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                },
                diff2 = {
                    175547009: {
                        set: {a: {}},
                        meta: {
                            aspects: {a: ['/175547009/471466181', '/175547009/1104061497', '/175547009/1817665259']}
                        },
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                };

            resultConflict = core.tryToConcatChanges(diff1, diff2);
            resultPatch = core.applyResolution(resultConflict);

            Q.nfcall(core.applyTreeDiff, rootNode, resultPatch) // FIXME: what if it results in an error?
                .then(function () {
                    return Q.nfcall(core.loadByPath, rootNode, '/175547009');
                })
                .then(function (node) {
                    expect(core.getValidAspectNames(node)).to.have.length(0);
                })
                .nodeify(done);

        });

        it('should apply conflicting aspect changes in meta delete all aspects', function (done) {
            var resultConflict,
                resultPatch,
                diff1 = {
                    175547009: {
                        meta: {aspects: TO_DELETE},
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                },
                diff2 = {
                    175547009: {
                        set: {a: {}},
                        meta: {
                            aspects: {a: ['/175547009/471466181', '/175547009/1104061497', '/175547009/1817665259']}
                        },
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                };

            resultConflict = core.tryToConcatChanges(diff1, diff2);
            resultPatch = core.applyResolution(resultConflict);

            Q.nfcall(core.applyTreeDiff, rootNode, resultPatch) // FIXME: what if it results in an error?
                .then(function () {
                    return Q.nfcall(core.loadByPath, rootNode, '/175547009');
                })
                .then(function (node) {
                    expect(core.getValidAspectNames(node)).to.have.length(0);
                })
                .nodeify(done);

        });

        it('should apply: pointer spec change in meta', function (done) {
            var resultPatch,
                resultConflict,
                sourceNode,
                validTargets = [],
                diff1 = {
                    175547009: {
                        pointer: {src: null},
                        meta: {
                            pointers: {
                                src: {
                                    '/175547009/471466181': {
                                        min: -1,
                                        max: 1
                                    },
                                    min: 1,
                                    max: 1
                                }
                            }
                        },
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                },
                diff2 = {
                    175547009: {
                        pointer: {src: null},
                        meta: {
                            pointers: {
                                src: {
                                    '/175547009/1817665259': {
                                        min: -1,
                                        max: 1
                                    },
                                    min: 1,
                                    max: 1
                                }
                            }
                        },
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                };

            resultConflict = core.tryToConcatChanges(diff1, diff2);
            resultPatch = core.applyResolution(resultConflict);

            Q.nfcall(core.applyTreeDiff, rootNode, resultPatch) // FIXME: what if it results in an error?
                .then(function () {
                    return Q.nfcall(core.loadByPath, rootNode, '/175547009');
                })
                .then(function (node) {
                    sourceNode = node;
                    return Q.nfcall(core.loadByPath, rootNode, '/175547009/1817665259');
                })
                .then(function (node) {
                    validTargets.push(node);
                    return Q.nfcall(core.loadByPath, rootNode, '/175547009/471466181');
                })
                .then(function (node) {
                    var i;
                    validTargets.push(node);

                    for (i = 0; i < validTargets.length; i += 1) {
                        expect(core.isValidTargetOf(validTargets[i], sourceNode, 'src')).to.equal(true);
                    }

                    done();
                })
                .catch(done);
        });

        it('should apply: pointer spec change in meta min and max', function (done) {
            var resultPatch,
                resultConflict,
                diff1 = {
                    175547009: {
                        pointer: {src: null},
                        meta: {
                            pointers: {
                                src: {
                                    '/175547009/471466181': {
                                        min: -1,
                                        max: 1
                                    },
                                    min: 1,
                                    max: 1
                                }
                            }
                        },
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                },
                diff2 = {
                    175547009: {
                        pointer: {src: null},
                        meta: {
                            pointers: {
                                src: {
                                    '/175547009/1817665259': {
                                        min: 2,
                                        max: 4
                                    },
                                    min: 1,
                                    max: 6
                                }
                            }
                        },
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                };

            resultConflict = core.tryToConcatChanges(diff1, diff2);
            resultPatch = core.applyResolution(resultConflict);

            Q.nfcall(core.applyTreeDiff, rootNode, resultPatch)
                .then(function () {
                    return Q.nfcall(core.loadByPath, rootNode, '/175547009');
                })
                .then(function (node) {
                    expect(core.getPointerMeta(node, 'src')).to.eql({
                        '/175547009/1817665259': {
                            min: 2,
                            max: 4
                        },
                        '/175547009/471466181': {
                            min: -1,
                            max: 1
                        },
                        min: 1,
                        max: 1
                    });
                })
                .nodeify(done);
        });

        it('should apply: pointer spec change pointer deleted', function (done) {
            var resultPatch,
                resultConflict,
                diff1 = {
                    175547009: {
                        meta: {
                            pointers: {
                                src: TO_DELETE
                            }
                        },
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                },
                diff2 = {
                    175547009: {
                        pointer: {src: null},
                        meta: {
                            pointers: {
                                src: {
                                    '/175547009/1817665259': {
                                        min: 2,
                                        max: 4
                                    },
                                    min: 1,
                                    max: 6
                                }
                            }
                        },
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                };

            resultConflict = core.tryToConcatChanges(diff1, diff2);
            resultPatch = core.applyResolution(resultConflict);

            Q.nfcall(core.applyTreeDiff, rootNode, resultPatch) // FIXME: what if it results in an error?
                .then(function () {
                    return Q.nfcall(core.loadByPath, rootNode, '/175547009');
                })
                .then(function (node) {
                    expect(core.getValidPointerNames(node)).to.have.length(0);
                })
                .nodeify(done);
        });

        it('should apply: pointer spec change in meta all pointers were deleted', function (done) {
            var resultPatch,
                resultConflict,
                diff1 = {
                    175547009: {
                        meta: {
                            pointers: TO_DELETE
                        },
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                },
                diff2 = {
                    175547009: {
                        pointer: {src: null},
                        meta: {
                            pointers: {
                                src: {
                                    '/175547009/1817665259': {
                                        min: 2,
                                        max: 4
                                    },
                                    min: 1,
                                    max: 6
                                }
                            }
                        },
                        guid: 'd926b4e8-676d-709b-e10e-a6fe730e71f5',
                        oGuids: {
                            'd926b4e8-676d-709b-e10e-a6fe730e71f5': true,
                            '86236510-f1c7-694f-1c76-9bad3a2aa4e0': true,
                            'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': true
                        }
                    },
                    guid: '86236510-f1c7-694f-1c76-9bad3a2aa4e0',
                    oGuids: {'86236510-f1c7-694f-1c76-9bad3a2aa4e0': true}
                };

            resultConflict = core.tryToConcatChanges(diff1, diff2);
            resultPatch = core.applyResolution(resultConflict);

            Q.nfcall(core.applyTreeDiff, rootNode, resultPatch) // FIXME: what if it results in an error?
                .then(function () {
                    return Q.nfcall(core.loadByPath, rootNode, '/175547009');
                })
                .then(function (node) {
                    expect(core.getValidPointerNames(node)).to.have.length(0);
                })
                .nodeify(done);
        });
    });
});
