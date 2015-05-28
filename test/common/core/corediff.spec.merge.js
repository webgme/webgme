/* jshint node:true, mocha: true, expr:true*/

/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../_globals.js');


describe('corediff-merge', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        FS = testFixture.fs,
        Q = testFixture.Q,
        WebGME = testFixture.WebGME,
        logger = testFixture.logger.fork('corediff.spec.merge'),
        storage,
        getJsonProject = testFixture.loadJsonFile,
        jsonProject,
        projectName = 'corediffMergeTesting',
        project,
        core,
        rootNode,
        commit,
        baseRootHash,

        gmeAuth,

        guestAccount = gmeConfig.authentication.guestAccount;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .nodeify(done);
    });


    describe('merge', function () {
        var applyChange = function (changeObject, next) {
                core.applyTreeDiff(rootNode, changeObject.diff, function (err) {
                    if (err) {
                        next(err);
                        return;
                    }
                    core.persist(rootNode, function (err) {
                        if (err) {
                            next(err);
                            return;
                        }
                        changeObject.rootHash = core.getHash(rootNode);
                        changeObject.root = rootNode;
                        project.makeCommit(null,
                            [commit],
                            changeObject.rootHash,
                            [], // no core-objects
                            'apply change finished ' + new Date().getTime(),
                            function (err, commitResult) {
                                if (err) {
                                    next(err);
                                    return;
                                }
                                changeObject.commitHash = commitResult.hash;
                                //we restore the root object
                                core.loadRoot(baseRootHash, function (err, r) {
                                    if (err) {
                                        next(err);
                                        return;
                                    }
                                    rootNode = r;
                                    next();
                                });
                            });

                    });
                });
            };

        before(function (done) {
            storage.openDatabase()
                .then(function () {
                    return storage.deleteProject({projectName: projectName});
                })
                .then(function () {
                    return testFixture.importProject(storage, {
                        projectSeed: 'test/common/core/corediff/base002.json',
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
                .then(done)
                .catch(done);
        });

        after(function (done) {
            storage.deleteProject({projectName: projectName})
                .then(function () {
                    storage.closeDatabase(done);
                })
                .catch(function (err) {
                    logger.error(err);
                    storage.closeDatabase(done);
                });
        });

        beforeEach(function (done) {
            //load the base state and sets the
            core.loadRoot(baseRootHash, function (err, r) {
                if (err) {
                    done(err);
                    return;
                }
                rootNode = r;
                done();
            });
        });
        describe('attribute', function () {
            it('initial value check', function (done) {
                core.loadByPath(rootNode, '/579542227/651215756', function (err, a) {
                    if (err) {
                        done(err);
                        return;
                    }
                    core.getAttribute(a, 'priority').should.be.equal(100);
                    core.loadByPath(rootNode, '/579542227/2088994530', function (err, a) {
                        if (err) {
                            done(err);
                            return;
                        }
                        core.getAttribute(a, 'priority').should.be.equal(100);
                        done();
                    });
                });
            });

            it('changing separate attributes', function (done) {
                var changeA = {},
                    changeB = {};
                changeA.diff = {
                    '579542227': {
                        '651215756': {
                            'attr': {
                                'priority': 2
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                changeB.diff = {
                    '579542227': {
                        '2088994530': {
                            'attr': {
                                'priority': 2
                            },
                            'guid': '32e4adfc-deac-43ae-2504-3563b9d58b97'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                applyChange(changeA, function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    applyChange(changeB, function (err) {
                        if (err) {
                            done(err);
                            return;
                        }
                        storage.getCommonAncestorCommit({projectName: projectName, commitA: changeA.commitHash, commitB: changeB.commitHash}, function (err, hash) {
                            if (err) {
                                done(err);
                                return;
                            }
                            hash.should.be.equal(commit);

                            //generate diffs
                            core.generateTreeDiff(rootNode, changeA.root, function (err, diff) {
                                if (err) {
                                    done(err);
                                    return;
                                }
                                diff[579542227][651215756].attr.priority.should.be.equal(2);
                                changeA.computedDiff = diff;
                                core.generateTreeDiff(rootNode, changeB.root, function (err, diff) {
                                    if (err) {
                                        done(err);
                                        return;
                                    }
                                    diff[579542227][2088994530].attr.priority.should.be.equal(2);
                                    changeB.computedDiff = diff;
                                    var conflict = core.tryToConcatChanges(changeA.computedDiff, changeB.computedDiff);
                                    conflict.items.should.be.empty;

                                    //apply merged diff to base
                                    var merged = {diff: conflict.merge};
                                    applyChange(merged, function (err) {
                                        if (err) {
                                            done(err);
                                            return;
                                        }

                                        //check values
                                        core.loadByPath(merged.root, '/579542227/651215756', function (err, a) {
                                            if (err) {
                                                done(err);
                                                return;
                                            }
                                            core.getAttribute(a, 'priority').should.be.equal(2);
                                            core.loadByPath(merged.root, '/579542227/2088994530', function (err, a) {
                                                if (err) {
                                                    done(err);
                                                    return;
                                                }
                                                core.getAttribute(a, 'priority').should.be.equal(2);
                                                done();
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
            it('changing to the same value', function (done) {
                var changeA = {},
                    changeB = {};
                changeA.diff = {
                    '579542227': {
                        '651215756': {
                            'attr': {
                                'priority': 2
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                changeB.diff = {
                    '579542227': {
                        '651215756': {
                            'attr': {
                                'priority': 2
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                applyChange(changeA, function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    applyChange(changeB, function (err) {
                        if (err) {
                            done(err);
                            return;
                        }
                        storage.getCommonAncestorCommit({projectName: projectName, commitA: changeA.commitHash, commitB: changeB.commitHash}, function (err, hash) {
                            if (err) {
                                done(err);
                                return;
                            }
                            hash.should.be.equal(commit);

                            //generate diffs
                            core.generateTreeDiff(rootNode, changeA.root, function (err, diff) {
                                if (err) {
                                    done(err);
                                    return;
                                }
                                diff[579542227][651215756].attr.priority.should.be.equal(2);
                                changeA.computedDiff = diff;
                                core.generateTreeDiff(rootNode, changeB.root, function (err, diff) {
                                    if (err) {
                                        done(err);
                                        return;
                                    }
                                    diff[579542227][651215756].attr.priority.should.be.equal(2);
                                    changeB.computedDiff = diff;
                                    var conflict = core.tryToConcatChanges(changeA.computedDiff, changeB.computedDiff);
                                    conflict.items.should.be.empty;

                                    //apply merged diff to base
                                    var merged = {diff: conflict.merge};
                                    applyChange(merged, function (err) {
                                        if (err) {
                                            done(err);
                                            return;
                                        }

                                        //check values
                                        core.loadByPath(merged.root, '/579542227/651215756', function (err, a) {
                                            if (err) {
                                                done(err);
                                                return;
                                            }
                                            core.getAttribute(a, 'priority').should.be.equal(2);
                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
            it('changing to different values', function (done) {
                var changeA = {},
                    changeB = {};
                changeA.diff = {
                    '579542227': {
                        '651215756': {
                            'attr': {
                                'priority': 2
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                changeB.diff = {
                    '579542227': {
                        '651215756': {
                            'attr': {
                                'priority': 3
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                applyChange(changeA, function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    applyChange(changeB, function (err) {
                        if (err) {
                            done(err);
                            return;
                        }
                        storage.getCommonAncestorCommit({projectName: projectName, commitA: changeA.commitHash, commitB: changeB.commitHash}, function (err, hash) {
                            if (err) {
                                done(err);
                                return;
                            }
                            hash.should.be.equal(commit);

                            //generate diffs
                            core.generateTreeDiff(rootNode, changeA.root, function (err, diff) {
                                if (err) {
                                    done(err);
                                    return;
                                }
                                diff[579542227][651215756].attr.priority.should.be.equal(2);
                                changeA.computedDiff = diff;
                                core.generateTreeDiff(rootNode, changeB.root, function (err, diff) {
                                    if (err) {
                                        done(err);
                                        return;
                                    }
                                    diff[579542227][651215756].attr.priority.should.be.equal(3);
                                    changeB.computedDiff = diff;
                                    var conflict = core.tryToConcatChanges(changeA.computedDiff, changeB.computedDiff);
                                    conflict.items.should.have.length(1);

                                    //get final apply
                                    conflict.items[0].selected = 'theirs';
                                    var merged = {diff: core.applyResolution(conflict)};
                                    applyChange(merged, function (err) {
                                        if (err) {
                                            done(err);
                                            return;
                                        }

                                        //check values
                                        core.loadByPath(merged.root, '/579542227/651215756', function (err, a) {
                                            if (err) {
                                                done(err);
                                                return;
                                            }
                                            core.getAttribute(a, 'priority').should.be.equal(3);
                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
            it('changing and moving the node parallel', function (done) {
                var changeA = {},
                    changeB = {};
                changeA.diff = {
                    '579542227': {
                        '651215756': {
                            'attr': {
                                'priority': 2
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'attr': {
                        'changeA': true
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                changeB.diff = {
                    '1786679144': {
                        '651215756': {
                            'movedFrom': '/579542227/651215756',
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        guid: '8b636e17-3e94-e0c6-2678-1a24ee5e6ae7',
                    },
                    'attr': {
                        'changeB': true
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                applyChange(changeA, function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    core.getAttribute(changeA.root, 'changeA').should.be.true;
                    (core.getAttribute(rootNode, 'changeA') === undefined).should.be.true;
                    (core.getAttribute(rootNode, 'changeB') === undefined).should.be.true;
                    applyChange(changeB, function (err) {
                        if (err) {
                            done(err);
                            return;
                        }
                        core.getAttribute(changeB.root, 'changeB').should.be.true;
                        (core.getAttribute(rootNode, 'changeA') === undefined).should.be.true;
                        (core.getAttribute(rootNode, 'changeB') === undefined).should.be.true;
                        storage.getCommonAncestorCommit({projectName: projectName, commitA: changeA.commitHash, commitB: changeB.commitHash}, function (err, hash) {
                            if (err) {
                                done(err);
                                return;
                            }
                            (core.getAttribute(rootNode, 'changeA') === undefined).should.be.true;
                            (core.getAttribute(rootNode, 'changeB') === undefined).should.be.true;
                            hash.should.be.equal(commit);

                            //generate diffs
                            core.generateTreeDiff(rootNode, changeA.root, function (err, diff) {
                                (core.getAttribute(rootNode, 'changeA') === undefined).should.be.true;
                                (core.getAttribute(rootNode, 'changeB') === undefined).should.be.true;
                                if (err) {
                                    done(err);
                                    return;
                                }
                                diff[579542227][651215756].attr.priority.should.be.equal(2);
                                changeA.computedDiff = diff;
                                core.generateTreeDiff(rootNode, changeB.root, function (err, diff) {
                                    if (err) {
                                        done(err);
                                        return;
                                    }
                                    diff[1786679144][651215756].movedFrom.should.be.exist;
                                    changeB.computedDiff = diff;
                                    var conflict = core.tryToConcatChanges(changeA.computedDiff, changeB.computedDiff);
                                    conflict.items.should.be.empty;

                                    //apply merged diff to base
                                    var merged = {diff: conflict.merge};
                                    applyChange(merged, function (err) {
                                        if (err) {
                                            done(err);
                                            return;
                                        }

                                        //check values
                                        core.loadByPath(merged.root, '/1786679144/651215756', function (err, a) {
                                            if (err) {
                                                done(err);
                                                return;
                                            }
                                            core.getAttribute(a, 'priority').should.be.equal(2);
                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
        describe('registry', function () {
            it('initial value check', function (done) {
                core.loadByPath(rootNode, '/579542227/651215756', function (err, a) {
                    if (err) {
                        done(err);
                        return;
                    }
                    core.getRegistry(a, 'position').x.should.be.equal(69);
                    core.getRegistry(a, 'position').y.should.be.equal(276);

                    core.loadByPath(rootNode, '/579542227/2088994530', function (err, a) {
                        if (err) {
                            done(err);
                            return;
                        }
                        core.getRegistry(a, 'position').x.should.be.equal(243);
                        core.getRegistry(a, 'position').y.should.be.equal(184);
                        done();
                    });
                });
            });
            it('changing separate nodes', function (done) {
                var changeA = {},
                    changeB = {};
                changeA.diff = {
                    '579542227': {
                        '651215756': {
                            'reg': {
                                'position': {'x': 200, 'y': 200}
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                changeB.diff = {
                    '579542227': {
                        '2088994530': {
                            'reg': {
                                'position': {'x': 300, 'y': 300}
                            },
                            'guid': '32e4adfc-deac-43ae-2504-3563b9d58b97'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                applyChange(changeA, function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    applyChange(changeB, function (err) {
                        if (err) {
                            done(err);
                            return;
                        }
                        storage.getCommonAncestorCommit({projectName: projectName, commitA: changeA.commitHash, commitB: changeB.commitHash}, function (err, hash) {
                            if (err) {
                                done(err);
                                return;
                            }
                            hash.should.be.equal(commit);

                            //generate diffs
                            core.generateTreeDiff(rootNode, changeA.root, function (err, diff) {
                                if (err) {
                                    done(err);
                                    return;
                                }
                                diff[579542227][651215756].reg.position.x.should.be.equal(200);
                                diff[579542227][651215756].reg.position.y.should.be.equal(200);
                                changeA.computedDiff = diff;
                                core.generateTreeDiff(rootNode, changeB.root, function (err, diff) {
                                    if (err) {
                                        done(err);
                                        return;
                                    }
                                    diff[579542227][2088994530].reg.position.x.should.be.equal(300);
                                    diff[579542227][2088994530].reg.position.y.should.be.equal(300);
                                    changeB.computedDiff = diff;
                                    var conflict = core.tryToConcatChanges(changeA.computedDiff, changeB.computedDiff);
                                    conflict.items.should.be.empty;

                                    //apply merged diff to base
                                    var merged = {diff: conflict.merge};
                                    applyChange(merged, function (err) {
                                        if (err) {
                                            done(err);
                                            return;
                                        }

                                        //check values
                                        core.loadByPath(merged.root, '/579542227/651215756', function (err, a) {
                                            if (err) {
                                                done(err);
                                                return;
                                            }
                                            core.getRegistry(a, 'position').x.should.be.equal(200);
                                            core.getRegistry(a, 'position').y.should.be.equal(200);
                                            core.loadByPath(merged.root, '/579542227/2088994530', function (err, a) {
                                                if (err) {
                                                    done(err);
                                                    return;
                                                }
                                                core.getRegistry(a, 'position').x.should.be.equal(300);
                                                core.getRegistry(a, 'position').y.should.be.equal(300);
                                                done();
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
            it('changing to the same value', function (done) {
                var changeA = {},
                    changeB = {};
                changeA.diff = {
                    '579542227': {
                        '651215756': {
                            'reg': {
                                'position': {'x': 200, 'y': 200}
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                changeB.diff = {
                    '579542227': {
                        '651215756': {
                            'reg': {
                                'position': {'x': 200, 'y': 200}
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                applyChange(changeA, function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    applyChange(changeB, function (err) {
                        if (err) {
                            done(err);
                            return;
                        }
                        storage.getCommonAncestorCommit({projectName: projectName, commitA: changeA.commitHash, commitB: changeB.commitHash}, function (err, hash) {
                            if (err) {
                                done(err);
                                return;
                            }
                            hash.should.be.equal(commit);

                            //generate diffs
                            core.generateTreeDiff(rootNode, changeA.root, function (err, diff) {
                                if (err) {
                                    done(err);
                                    return;
                                }
                                diff[579542227][651215756].reg.position.x.should.be.equal(200);
                                diff[579542227][651215756].reg.position.y.should.be.equal(200);
                                changeA.computedDiff = diff;
                                core.generateTreeDiff(rootNode, changeB.root, function (err, diff) {
                                    if (err) {
                                        done(err);
                                        return;
                                    }
                                    diff[579542227][651215756].reg.position.x.should.be.equal(200);
                                    diff[579542227][651215756].reg.position.y.should.be.equal(200);
                                    changeB.computedDiff = diff;
                                    var conflict = core.tryToConcatChanges(changeA.computedDiff, changeB.computedDiff);
                                    conflict.items.should.be.empty;

                                    //apply merged diff to base
                                    var merged = {diff: conflict.merge};
                                    applyChange(merged, function (err) {
                                        if (err) {
                                            done(err);
                                            return;
                                        }

                                        //check values
                                        core.loadByPath(merged.root, '/579542227/651215756', function (err, a) {
                                            if (err) {
                                                done(err);
                                                return;
                                            }
                                            core.getRegistry(a, 'position').x.should.be.equal(200);
                                            core.getRegistry(a, 'position').y.should.be.equal(200);
                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
            it('changing to different values', function (done) {
                var changeA = {},
                    changeB = {};
                changeA.diff = {
                    '579542227': {
                        '651215756': {
                            'reg': {
                                'position': {'x': 200, 'y': 200}
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                changeB.diff = {
                    '579542227': {
                        '651215756': {
                            'reg': {
                                'position': {'x': 300, 'y': 300}
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                applyChange(changeA, function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    applyChange(changeB, function (err) {
                        if (err) {
                            done(err);
                            return;
                        }
                        storage.getCommonAncestorCommit({projectName: projectName, commitA: changeA.commitHash, commitB: changeB.commitHash}, function (err, hash) {
                            if (err) {
                                done(err);
                                return;
                            }
                            hash.should.be.equal(commit);

                            //generate diffs
                            core.generateTreeDiff(rootNode, changeA.root, function (err, diff) {
                                if (err) {
                                    done(err);
                                    return;
                                }
                                diff[579542227][651215756].reg.position.x.should.be.equal(200);
                                diff[579542227][651215756].reg.position.y.should.be.equal(200);
                                changeA.computedDiff = diff;
                                core.generateTreeDiff(rootNode, changeB.root, function (err, diff) {
                                    if (err) {
                                        done(err);
                                        return;
                                    }
                                    diff[579542227][651215756].reg.position.x.should.be.equal(300);
                                    diff[579542227][651215756].reg.position.y.should.be.equal(300);
                                    changeB.computedDiff = diff;
                                    var conflict = core.tryToConcatChanges(changeA.computedDiff, changeB.computedDiff);
                                    conflict.items.should.have.length(1);

                                    //apply merged diff to base
                                    conflict.items[0].selected = 'theirs';
                                    var merged = {diff: core.applyResolution(conflict)};
                                    applyChange(merged, function (err) {
                                        if (err) {
                                            done(err);
                                            return;
                                        }

                                        //check values
                                        core.loadByPath(merged.root, '/579542227/651215756', function (err, a) {
                                            if (err) {
                                                done(err);
                                                return;
                                            }
                                            core.getRegistry(a, 'position').x.should.be.equal(300);
                                            core.getRegistry(a, 'position').y.should.be.equal(300);
                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
            it('changing and moving the node parallel', function (done) {
                var changeA = {},
                    changeB = {};
                changeA.diff = {
                    '579542227': {
                        '651215756': {
                            'reg': {
                                'position': {'x': 200, 'y': 200}
                            },
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        'guid': '3637e2ee-0d4b-15b1-52c6-4d1248e67ea3'
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                changeB.diff = {
                    '1786679144': {
                        '651215756': {
                            'movedFrom': '/579542227/651215756',
                            'guid': 'ed1a1ef7-7eb3-af75-11a8-7994220003e6'
                        },
                        guid: '8b636e17-3e94-e0c6-2678-1a24ee5e6ae7',
                    },
                    'guid': 'e687d284-a04a-7cbc-93ed-ea941752d57a'
                };
                applyChange(changeA, function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    applyChange(changeB, function (err) {
                        if (err) {
                            done(err);
                            return;
                        }
                        storage.getCommonAncestorCommit({projectName: projectName, commitA: changeA.commitHash, commitB: changeB.commitHash}, function (err, hash) {
                            if (err) {
                                done(err);
                                return;
                            }
                            hash.should.be.equal(commit);

                            //generate diffs
                            core.generateTreeDiff(rootNode, changeA.root, function (err, diff) {
                                if (err) {
                                    done(err);
                                    return;
                                }
                                diff[579542227][651215756].reg.position.x.should.be.equal(200);
                                diff[579542227][651215756].reg.position.y.should.be.equal(200);
                                changeA.computedDiff = diff;
                                core.generateTreeDiff(rootNode, changeB.root, function (err, diff) {
                                    if (err) {
                                        done(err);
                                        return;
                                    }
                                    diff[1786679144][651215756].movedFrom.should.be.exist;
                                    changeB.computedDiff = diff;
                                    var conflict = core.tryToConcatChanges(changeA.computedDiff, changeB.computedDiff);
                                    conflict.items.should.be.empty;

                                    //apply merged diff to base
                                    var merged = {diff: conflict.merge};
                                    applyChange(merged, function (err) {
                                        if (err) {
                                            done(err);
                                            return;
                                        }

                                        //check values
                                        core.loadByPath(merged.root, '/1786679144/651215756', function (err, a) {
                                            if (err) {
                                                done(err);
                                                return;
                                            }
                                            core.getRegistry(a, 'position').x.should.be.equal(200);
                                            core.getRegistry(a, 'position').y.should.be.equal(200);
                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});
//TODO pointer tests should be reintroduced