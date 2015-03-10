/* jshint node:true, mocha: true*/

/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../_globals.js');


describe('corediff-merge', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        FS = testFixture.fs,
        WebGME = testFixture.WebGME,
        storage = testFixture.Storage({globConf: gmeConfig});

    describe('merge', function () {
        var project, core, root, commit, baseCommitHash, baseRootHash,
            applyChange = function (changeObject, next) {
                core.applyTreeDiff(root, changeObject.diff, function (err) {
                    if (err) {
                        next(err);
                        return;
                    }
                    core.persist(root, function (err) {
                        if (err) {
                            next(err);
                            return;
                        }
                        changeObject.rootHash = core.getHash(root);
                        changeObject.root = root;
                        changeObject.commitHash = project.makeCommit([baseCommitHash], changeObject.rootHash,
                            'apply change fininshed ' + new Date().getTime(), function (/*err*/) {
                            //we ignore this
                        });
                        //we restore the root object
                        core.loadRoot(baseRootHash, function (err, r) {
                            if (err) {
                                next(err);
                                return;
                            }
                            root = r;
                            next();
                        });
                    });
                });
            };
        before(function (done) {
            //creating the base project
            storage.openDatabase(function (err) {
                if (err) {
                    done(err);
                    return;
                }
                storage.openProject('corediffMergeTesting', function (err, p) {
                    var jsonProject;
                    if (err) {
                        done(err);
                        return;
                    }
                    project = p;
                    try {
                        jsonProject = JSON.parse(FS.readFileSync('./test/asset/sm_basic_basic.json', 'utf8'));
                    } catch (err) {
                        done(err);
                        return;
                    }

                    core = new WebGME.core(project, {globConf: gmeConfig});
                    root = core.createNode();

                    WebGME.serializer.import(core, root, jsonProject, function (err/*log*/) {
                        if (err) {
                            done(err);
                            return;
                        }

                        core.persist(root, function (err) {
                            if (err) {
                                return done(err);
                            }

                            commit = project.makeCommit([], core.getHash(root), 'initial project import',
                                function (/*err*/) {
                                //ignore it
                            });
                            if (err) {
                                done(err);
                                return;
                            }
                            baseCommitHash = commit;
                            baseRootHash = core.getHash(root);
                            done();
                        });
                    });
                });
            });
        });
        after(function (done) {
            storage.deleteProject('corediffMergeTesting', function (err) {
                if (err) {
                    done(err);
                    return;
                }
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
                root = r;
                done();
            });
        });
        describe('attribute', function () {
            it('initial value check', function (done) {
                core.loadByPath(root, '/579542227/651215756', function (err, a) {
                    if (err) {
                        done(err);
                        return;
                    }
                    core.getAttribute(a, 'priority').should.be.equal(100);
                    core.loadByPath(root, '/579542227/2088994530', function (err, a) {
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
                        project.getCommonAncestorCommit(changeA.commitHash, changeB.commitHash, function (err, hash) {
                            if (err) {
                                done(err);
                                return;
                            }
                            hash.should.be.equal(baseCommitHash);

                            //generate diffs
                            core.generateTreeDiff(root, changeA.root, function (err, diff) {
                                if (err) {
                                    done(err);
                                    return;
                                }
                                diff[579542227][651215756].attr.priority.should.be.equal(2);
                                changeA.computedDiff = diff;
                                core.generateTreeDiff(root, changeB.root, function (err, diff) {
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
                                            core.getAttribute(a, 'priority').should.be.equal(2);
                                            core.loadByPath(merged.root, '/579542227/2088994530', function (err, a) {
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
                this.timeout(4000); // TODO: Why does this take so much time?
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
                        project.getCommonAncestorCommit(changeA.commitHash, changeB.commitHash, function (err, hash) {
                            if (err) {
                                done(err);
                                return;
                            }
                            hash.should.be.equal(baseCommitHash);

                            //generate diffs
                            core.generateTreeDiff(root, changeA.root, function (err, diff) {
                                if (err) {
                                    done(err);
                                    return;
                                }
                                diff[579542227][651215756].attr.priority.should.be.equal(2);
                                changeA.computedDiff = diff;
                                core.generateTreeDiff(root, changeB.root, function (err, diff) {
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
                        project.getCommonAncestorCommit(changeA.commitHash, changeB.commitHash, function (err, hash) {
                            if (err) {
                                done(err);
                                return;
                            }
                            hash.should.be.equal(baseCommitHash);

                            //generate diffs
                            core.generateTreeDiff(root, changeA.root, function (err, diff) {
                                if (err) {
                                    done(err);
                                    return;
                                }
                                diff[579542227][651215756].attr.priority.should.be.equal(2);
                                changeA.computedDiff = diff;
                                core.generateTreeDiff(root, changeB.root, function (err, diff) {
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
                    (core.getAttribute(root, 'changeA') === undefined).should.be.true;
                    (core.getAttribute(root, 'changeB') === undefined).should.be.true;
                    applyChange(changeB, function (err) {
                        if (err) {
                            done(err);
                            return;
                        }
                        core.getAttribute(changeB.root, 'changeB').should.be.true;
                        (core.getAttribute(root, 'changeA') === undefined).should.be.true;
                        (core.getAttribute(root, 'changeB') === undefined).should.be.true;
                        project.getCommonAncestorCommit(changeA.commitHash, changeB.commitHash, function (err, hash) {
                            if (err) {
                                done(err);
                                return;
                            }
                            (core.getAttribute(root, 'changeA') === undefined).should.be.true;
                            (core.getAttribute(root, 'changeB') === undefined).should.be.true;
                            hash.should.be.equal(baseCommitHash);

                            //generate diffs
                            core.generateTreeDiff(root, changeA.root, function (err, diff) {
                                (core.getAttribute(root, 'changeA') === undefined).should.be.true;
                                (core.getAttribute(root, 'changeB') === undefined).should.be.true;
                                if (err) {
                                    done(err);
                                    return;
                                }
                                diff[579542227][651215756].attr.priority.should.be.equal(2);
                                changeA.computedDiff = diff;
                                core.generateTreeDiff(root, changeB.root, function (err, diff) {
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
                core.loadByPath(root, '/579542227/651215756', function (err, a) {
                    if (err) {
                        done(err);
                        return;
                    }
                    core.getRegistry(a, 'position').x.should.be.equal(69);
                    core.getRegistry(a, 'position').y.should.be.equal(276);

                    core.loadByPath(root, '/579542227/2088994530', function (err, a) {
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
                        project.getCommonAncestorCommit(changeA.commitHash, changeB.commitHash, function (err, hash) {
                            if (err) {
                                done(err);
                                return;
                            }
                            hash.should.be.equal(baseCommitHash);

                            //generate diffs
                            core.generateTreeDiff(root, changeA.root, function (err, diff) {
                                if (err) {
                                    done(err);
                                    return;
                                }
                                diff[579542227][651215756].reg.position.x.should.be.equal(200);
                                diff[579542227][651215756].reg.position.y.should.be.equal(200);
                                changeA.computedDiff = diff;
                                core.generateTreeDiff(root, changeB.root, function (err, diff) {
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
                                            core.getRegistry(a, 'position').x.should.be.equal(200);
                                            core.getRegistry(a, 'position').y.should.be.equal(200);
                                            core.loadByPath(merged.root, '/579542227/2088994530', function (err, a) {
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
                this.timeout(4000); // TODO: Why does this take so much time?
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
                        project.getCommonAncestorCommit(changeA.commitHash, changeB.commitHash, function (err, hash) {
                            if (err) {
                                done(err);
                                return;
                            }
                            hash.should.be.equal(baseCommitHash);

                            //generate diffs
                            core.generateTreeDiff(root, changeA.root, function (err, diff) {
                                if (err) {
                                    done(err);
                                    return;
                                }
                                diff[579542227][651215756].reg.position.x.should.be.equal(200);
                                diff[579542227][651215756].reg.position.y.should.be.equal(200);
                                changeA.computedDiff = diff;
                                core.generateTreeDiff(root, changeB.root, function (err, diff) {
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
                        project.getCommonAncestorCommit(changeA.commitHash, changeB.commitHash, function (err, hash) {
                            if (err) {
                                done(err);
                                return;
                            }
                            hash.should.be.equal(baseCommitHash);

                            //generate diffs
                            core.generateTreeDiff(root, changeA.root, function (err, diff) {
                                if (err) {
                                    done(err);
                                    return;
                                }
                                diff[579542227][651215756].reg.position.x.should.be.equal(200);
                                diff[579542227][651215756].reg.position.y.should.be.equal(200);
                                changeA.computedDiff = diff;
                                core.generateTreeDiff(root, changeB.root, function (err, diff) {
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
                        project.getCommonAncestorCommit(changeA.commitHash, changeB.commitHash, function (err, hash) {
                            if (err) {
                                done(err);
                                return;
                            }
                            hash.should.be.equal(baseCommitHash);

                            //generate diffs
                            core.generateTreeDiff(root, changeA.root, function (err, diff) {
                                if (err) {
                                    done(err);
                                    return;
                                }
                                diff[579542227][651215756].reg.position.x.should.be.equal(200);
                                diff[579542227][651215756].reg.position.y.should.be.equal(200);
                                changeA.computedDiff = diff;
                                core.generateTreeDiff(root, changeB.root, function (err, diff) {
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