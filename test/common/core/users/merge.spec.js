/**
 * @author kecso / https://github.com/kecso
 */

//future place of merge util tests

describe.skip('merge utils', function () {
    //coming from diffCLI test
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
                importCLI.import(storage,
                    gmeConfig, diffCliTest, jsonProject, 'source', true, undefined, function (err) {
                        if (err) {
                            done(err);
                            return;
                        }
                        importCLI.import(storage,
                            gmeConfig, diffCliTest, jsonProject, 'target', true, undefined, done);
                    }
                );
            });

            it('diff should be empty on identical project states source->target', function (done) {
                diffCLI.generateDiff(storage, diffCliTest, 'source', 'target', undefined, function (err, diff) {
                    if (err) {
                        done(err);
                        return;
                    }
                    diff.should.be.empty;
                    done();
                });
            });

            it('diff should be empty on identical project states target->source', function (done) {
                diffCLI.generateDiff(storage, diffCliTest, 'target', 'source', undefined, function (err, diff) {
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
                importCLI.import(storage, gmeConfig, diffCliTest, source, 'source', true, undefined, function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    importCLI.import(storage, gmeConfig, diffCliTest, target, 'target', true, undefined, done);
                });
            });

            it('new node should be visible in diff source->target', function (done) {
                diffCLI.generateDiff(storage, diffCliTest, 'source', 'target', undefined, function (err, diff) {
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
                diffCLI.generateDiff(storage, diffCliTest, 'target', 'source', undefined, function (err, diff) {
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
                importCLI.import(storage, gmeConfig, diffCliTest, source, 'source', true, undefined, function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    importCLI.import(storage, gmeConfig, diffCliTest, target, 'target', true, undefined, done);
                });
            });

            it('changed attribute should be visible in diff source->target', function (done) {
                diffCLI.generateDiff(storage, diffCliTest, 'source', 'target', undefined, function (err, diff) {
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
                diffCLI.generateDiff(storage, diffCliTest, 'target', 'source', undefined, function (err, diff) {
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
                importCLI.import(storage, gmeConfig, diffCliTest, source, 'source', true, undefined, function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    importCLI.import(storage, gmeConfig, diffCliTest, target, 'target', true, undefined, done);
                });
            });

            it('changed registry should be visible in diff source->target', function (done) {
                diffCLI.generateDiff(storage, diffCliTest, 'source', 'target', undefined, function (err, diff) {
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
                diffCLI.generateDiff(storage, diffCliTest, 'target', 'source', undefined, function (err, diff) {
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

    //coming from apply
    describe('basic', function () {
        var jsonBaseProject;

        before(function () {
            jsonBaseProject = getJsonProject('./test/bin/apply/base001.json');
        });

        beforeEach(function (done) {
            importCLI.import(storage, gmeConfig, applyCliTestProject, jsonBaseProject, 'base', true, undefined, done);
        });

        it('project should remain the same after applying empty patch', function (done) {
            var patch = {};
            applyCLI.applyPatch(storage, applyCliTestProject, 'base', patch, false, undefined, function (err, commit) {
                if (err) {
                    done(err);
                    return;
                }
                exportCLI.export(storage, applyCliTestProject, commit, undefined, function (err, jsonResultProject) {
                    if (err) {
                        done(err);
                        return;
                    }
                    jsonResultProject.should.be.eql(jsonBaseProject);
                    done();
                });
            });
        });

        it('simple attribute change', function (done) {
            var patch = {attr: {name: 'otherROOT'}};
            applyCLI.applyPatch(storage, applyCliTestProject, 'base', patch, false, undefined, function (err, commit) {
                if (err) {
                    done(err);
                    return;
                }
                exportCLI.export(storage, applyCliTestProject, commit, undefined, function (err, jsonResultProject) {
                    if (err) {
                        done(err);
                        return;
                    }
                    checkPath(jsonResultProject, '/nodes/03d36072-9e09-7866-cb4e-d0a36ff825f6/attributes/name',
                        'otherROOT');
                    done();
                });
            });
        });

        //TODO fix this issue now tests has been removed
        it('multiple attribute change', function (done) {
            var patch = {
                attr: {name: 'ROOTy'},
                1: {attr: {name: 'FCOy'}}
            };
            applyCLI.applyPatch(storage, applyCliTestProject, 'base', patch, false, undefined, function (err, commit) {
                if (err) {
                    return done(err);
                }
                exportCLI.export(storage, applyCliTestProject, commit, undefined, function (err, jsonResultProject) {
                    if (err) {
                        return done(err);
                    }
                    checkPath(jsonResultProject, '/nodes/03d36072-9e09-7866-cb4e-d0a36ff825f6/attributes/name',
                        'ROOTy');
                    checkPath(jsonResultProject, '/nodes/cd891e7b-e2ea-e929-f6cd-9faf4f1fc045/attributes/name', 'FCOy');
                    done();
                });
            });
        });
        /*it('simple registry change',function(done){
         applyCLI.applyPatch(mongoUri,
         applyCliTestProject,'base',{1:{reg:{position:{x:200,y:200}}}},false,function(err,commit){
         if(err){
         return done(err);
         }
         exportCLI.export(mongoUri,applyCliTestProject,commit,function(err,jsonResultProject){
         if(err){
         return done(err);
         }
         checkPath(jsonResultProject,'/nodes/cd891e7b-e2ea-e929-f6cd-9faf4f1fc045/registry/position',{x:200,y:200});
         done();
         });
         });
         });*/
    });
});