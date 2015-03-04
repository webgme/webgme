/* jshint node:true, mocha: true*/

/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../_globals.js');

describe('corediff-base', function () {
    'use strict';
    var storage = new testFixture.StorageLocal();

    describe('commitAncestor', function () {
        describe('straight line', function () {
            var project,
                commitChain = [],
                chainLength = 1000;
            before(function (done) {
                storage.openDatabase(function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    storage.openProject('straightLineTest', function (err, p) {
                        if (err) {
                            done(err);
                            return;
                        }

                        project = p;
                        //finally we create the commit chain
                        var needed = chainLength,
                            ancestors = [],
                            i,
                            error = null,
                            finalCheck = function (err) {
                                error = error || err;
                                if (--needed === 0) {
                                    done(error);
                                }
                            };
                        for (i = 0; i < chainLength; i++) {
                            commitChain.push(project.makeCommit(ancestors, '#roothash', '_' + i + '_', finalCheck));
                            ancestors = [commitChain[commitChain.length - 1]];
                        }
                    });
                });
            });
            after(function (done) {
                storage.deleteProject('straightLineTest', function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    storage.closeDatabase(done);
                });
            });
            it('single chain 0 vs 1', function (done) {
                project.getCommonAncestorCommit(commitChain[0], commitChain[1], function (err, c) {
                    if (err) {
                        done(new Error(err));
                        return;
                    }
                    c.should.be.equal(commitChain[0]);
                    done();
                });
            });
            it('single chain 1 vs 0', function (done) {
                project.getCommonAncestorCommit(commitChain[1], commitChain[0], function (err, c) {
                    if (err) {
                        done(new Error(err));
                        return;
                    }

                    c.should.be.equal(commitChain[0]);
                    done();
                });
            });
            it('single chain 1 vs 1', function (done) {
                project.getCommonAncestorCommit(commitChain[1], commitChain[1], function (err, c) {
                    if (err) {
                        done(new Error(err));
                        return;
                    }

                    c.should.be.equal(commitChain[1]);
                    done();
                });
            });
            it('single chain 0 vs 999', function (done) {
                project.getCommonAncestorCommit(commitChain[0], commitChain[999], function (err, c) {
                    if (err) {
                        done(new Error(err));
                        return;
                    }

                    c.should.be.equal(commitChain[0]);
                    done();
                });
            });
        });
        describe('complex chain', function () {
            var project, commitChain = [];
            before(function (done) {
                storage.openDatabase(function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    storage.openProject('complexChainTest', function (err, p) {
                        if (err) {
                            done(err);
                            return;
                        }

                        project = p;
                        //finally we create the commit chain
                        //           o -- o           8,9
                        //          /      \
                        //         o        o         7,12
                        //        / \      /
                        //       /   o -- o           10,11
                        // o -- o -- o -- o -- o -- o 1,2,3,4,5,6

                        var error = null,
                            needed = 12,
                            addCommit = function (ancestors) {
                                var rootHash = '#' + Math.round((Math.random() * 100000000));
                                commitChain.push(project.makeCommit(ancestors, rootHash, '_commit_', finalCheck));
                            },
                            finalCheck = function (err) {
                                error = error || err;
                                if (--needed === 0) {
                                    done(error);
                                }
                            };
                        commitChain = [];
                        addCommit([]);
                        addCommit([commitChain[0]]);
                        addCommit([commitChain[1]]);
                        addCommit([commitChain[2]]);
                        addCommit([commitChain[3]]);
                        addCommit([commitChain[4]]);
                        addCommit([commitChain[5]]);
                        addCommit([commitChain[2]]);
                        addCommit([commitChain[7]]);
                        addCommit([commitChain[8]]);
                        addCommit([commitChain[7]]);
                        addCommit([commitChain[10]]);
                        addCommit([commitChain[9], commitChain[11]]);
                    });
                });
            });
            after(function (done) {
                storage.deleteProject('complexChainTest', function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    storage.closeDatabase(done);
                });
            });

            it('12 vs 6 -> 2', function (done) {
                project.getCommonAncestorCommit(commitChain[12], commitChain[6], function (err, c) {
                    if (err) {
                        done(err);
                        return;
                    }
                    c.should.be.equal(commitChain[2]);
                    done();
                });
            });
            it('9 vs 11 -> 7', function (done) {
                project.getCommonAncestorCommit(commitChain[9], commitChain[11], function (err, c) {
                    if (err) {
                        done(err);
                        return;
                    }
                    c.should.be.equal(commitChain[7]);
                    done();
                });
            });
            it('10 vs 4 -> 2', function (done) {
                project.getCommonAncestorCommit(commitChain[10], commitChain[4], function (err, c) {
                    if (err) {
                        done(err);
                        return;
                    }
                    c.should.be.equal(commitChain[2]);
                    done();
                });
            });
            it('12 vs 8 -> 8', function (done) {
                project.getCommonAncestorCommit(commitChain[12], commitChain[8], function (err, c) {
                    if (err) {
                        done(err);
                        return;
                    }
                    c.should.be.equal(commitChain[8]);
                    done();
                });
            });
            it('9 vs 5 -> 2', function (done) {
                project.getCommonAncestorCommit(commitChain[9], commitChain[5], function (err, c) {
                    if (err) {
                        done(err);
                        return;
                    }
                    c.should.be.equal(commitChain[2]);
                    done();
                });
            });
        });
    });
});
