/*jshint node:true, mocha:true */

/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../_globals');

describe('diff CLI tests', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        diffCLI = require('../../src/bin/diff'),
        importCLI = require('../../src/bin/import'),
        mongodb = testFixture.mongodb,
        mongoConn,
        FS = testFixture.fs,
        getJsonProject = function (path) {
            return JSON.parse(FS.readFileSync(path, 'utf-8'));
        },

        mongoUri = gmeConfig.mongo.uri,
        diffCliTest = 'diffCliTest';

    before(function (done) {
        // TODO: move this to globals.js as a utility function
        mongodb.MongoClient.connect(mongoUri, gmeConfig.mongo.options, function (err, db) {
            if (err) {
                done(err);
                return;
            }
            mongoConn = db;
            db.dropCollection(diffCliTest, function (err) {
                // ignores if the collection was not found
                if (err && err.errmsg !== 'ns not found') {
                    done(err);
                    return;
                }
                done();
            });
        });
    });

    after(function (done) {
        mongoConn.close();
        done();
    });

    describe('basic', function () {
        describe('no diff', function () {
            var jsonProject;

            before(function (done) {
                try {
                    jsonProject = getJsonProject('./test/bin/diff/source001.json');
                } catch (err) {
                    done(err);
                    return;
                }
                importCLI.import(mongoUri, diffCliTest, jsonProject, 'source', true, function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    importCLI.import(mongoUri, diffCliTest, jsonProject, 'target', false, done);
                });
            });

            it('diff should be empty on identical project states source->target', function (done) {
                diffCLI.generateDiff(mongoUri, diffCliTest, 'source', 'target', function (err, diff) {
                    if (err) {
                        done(err);
                        return;
                    }
                    diff.should.be.empty;
                    done();
                });
            });

            it('diff should be empty on identical project states target->source', function (done) {
                diffCLI.generateDiff(mongoUri, diffCliTest, 'target', 'source', function (err, diff) {
                    if (err) {
                        done(err);
                        return;
                    }
                    diff.should.be.empty;
                    done();
                });
            });
        });

        describe('simple node difference', function () {
            var source,
                target;

            before(function (done) {
                try {
                    source = getJsonProject('./test/bin/diff/source001.json');
                    target = getJsonProject('./test/bin/diff/target001.json');
                } catch (err) {
                    done(err);
                    return;
                }
                importCLI.import(mongoUri, diffCliTest, source, 'source', true, function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    importCLI.import(mongoUri, diffCliTest, target, 'target', false, done);
                });
            });

            it('new node should be visible in diff source->target', function (done) {
                diffCLI.generateDiff(mongoUri, diffCliTest, 'source', 'target', function (err, diff) {
                    if (err) {
                        done(err);
                        return;
                    }

                    diff.should.include.key('2');
                    diff['2'].should.include.key('hash');
                    diff['2'].should.include.key('removed');
                    diff['2'].removed.should.be.equal(false);
                    done();
                });
            });

            it('node remove should be visible in diff target->source', function (done) {
                diffCLI.generateDiff(mongoUri, diffCliTest, 'target', 'source', function (err, diff) {
                    if (err) {
                        done(err);
                        return;
                    }
                    diff.should.include.key('2');
                    diff['2'].should.include.key('removed');
                    diff['2'].removed.should.be.equal(true);
                    done();
                });
            });
        });

        describe('simple attribute change', function () {
            var source,
                target;

            before(function (done) {
                try {
                    source = getJsonProject('./test/bin/diff/source001.json');
                    target = JSON.parse(JSON.stringify(source));
                    target.nodes['cd891e7b-e2ea-e929-f6cd-9faf4f1fc045'].attributes.name = 'FCOmodified';
                } catch (err) {
                    done(err);
                    return;
                }
                importCLI.import(mongoUri, diffCliTest, source, 'source', true, function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    importCLI.import(mongoUri, diffCliTest, target, 'target', false, done);
                });
            });

            it('changed attribute should be visible in diff source->target', function (done) {
                diffCLI.generateDiff(mongoUri, diffCliTest, 'source', 'target', function (err, diff) {
                    if (err) {
                        done(err);
                        return;
                    }

                    diff.should.include.key('1');
                    diff['1'].should.include.key('attr');
                    diff['1'].attr.should.include.key('name');
                    diff['1'].attr.name.should.be.equal('FCOmodified');
                    done();
                });
            });

            it('changed attribute should be visible in diff target->source', function (done) {
                diffCLI.generateDiff(mongoUri, diffCliTest, 'target', 'source', function (err, diff) {
                    if (err) {
                        done(err);
                        return;
                    }
                    diff.should.include.key('1');
                    diff['1'].should.include.key('attr');
                    diff['1'].attr.should.include.key('name');
                    diff['1'].attr.name.should.be.equal('FCO');
                    done();
                });
            });
        });

        describe('simple registry change', function () {
            var source,
                target;

            before(function (done) {
                try {
                    source = getJsonProject('./test/bin/diff/source001.json');
                    target = JSON.parse(JSON.stringify(source));
                    target.nodes['cd891e7b-e2ea-e929-f6cd-9faf4f1fc045'].registry.position = {x: 200, y: 200};
                } catch (err) {
                    done(err);
                    return;
                }
                importCLI.import(mongoUri, diffCliTest, source, 'source', true, function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    importCLI.import(mongoUri, diffCliTest, target, 'target', false, done);
                });
            });

            it('changed registry should be visible in diff source->target', function (done) {
                diffCLI.generateDiff(mongoUri, diffCliTest, 'source', 'target', function (err, diff) {
                    if (err) {
                        done(err);
                        return;
                    }

                    diff.should.include.key('1');
                    diff['1'].should.include.key('reg');
                    diff['1'].reg.should.include.key('position');
                    diff['1'].reg.position.should.be.eql({x: 200, y: 200});
                    done();
                });
            });

            it('changed registry should be visible in diff target->source', function (done) {
                diffCLI.generateDiff(mongoUri, diffCliTest, 'target', 'source', function (err, diff) {
                    if (err) {
                        done(err);
                        return;
                    }

                    diff.should.include.key('1');
                    diff['1'].should.include.key('reg');
                    diff['1'].reg.should.include.key('position');
                    diff['1'].reg.position.should.be.eql({x: 100, y: 100});
                    done();
                });
            });
        });
    });
});
