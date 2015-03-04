/*jshint node:true, mocha:true */

/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../_globals');

describe('diff CLI tests', function () {
    'use strict';
    var diffCLI = require('../../src/bin/diff'),
        importCLI = require('../../src/bin/import'),
        mongodb = testFixture.mongodb,
        FS = testFixture.fs,
        getJsonProject = function (path) {
            return JSON.parse(FS.readFileSync(path, 'utf-8'));
        },

        mongoUri = 'mongodb://127.0.0.1:27017/multi',
        diffCliTest = 'diffCliTest';

    before(function (done) {
        // TODO: move this to globals.js as a utility function
        mongodb.MongoClient.connect('mongodb://127.0.0.1:27017/multi', {
            'w': 1,
            'native-parser': true,
            'auto_reconnect': true,
            'poolSize': 20,
            socketOptions: {keepAlive: 1}
        }, function (err, db) {
            if (err) {
                done(err);
                return;
            }
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
                importCLI.import(mongoUri, diffCliTest, jsonProject, 'source', function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    importCLI.import(mongoUri, diffCliTest, jsonProject, 'target', done);
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
                importCLI.import(mongoUri, diffCliTest, source, 'source', function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    importCLI.import(mongoUri, diffCliTest, target, 'target', done);
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
                importCLI.import(mongoUri, diffCliTest, source, 'source', function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    importCLI.import(mongoUri, diffCliTest, target, 'target', done);
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
                importCLI.import(mongoUri, diffCliTest, source, 'source', function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    importCLI.import(mongoUri, diffCliTest, target, 'target', done);
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
