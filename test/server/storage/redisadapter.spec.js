/*globals*/
/*jshint node:true, newcap:false, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var testFixture = require('../../_globals.js');

describe('RedisAdapter', function () {
    var RedisAdapter = require('../../../src/server/storage/redisadapter'),
        expect = testFixture.expect,
        Q = testFixture.Q,
        gmeConfig = testFixture.getGmeConfig(),
        logger = testFixture.logger.fork('RedisAdapter');

    describe('open/close Database', function () {
        it('should create a new instance of RedisAdapter', function () {
            var redisAdapter = new RedisAdapter(logger, gmeConfig);
            expect(redisAdapter).to.have.property('openDatabase');
            expect(redisAdapter).to.have.property('closeDatabase');
            expect(redisAdapter).to.have.property('createProject');
            expect(redisAdapter).to.have.property('deleteProject');
            expect(redisAdapter).to.have.property('openProject');
            expect(redisAdapter).to.have.property('renameProject');
        });

        it('should open and close', function (done) {
            var redisAdapter = new RedisAdapter(logger, gmeConfig);
            redisAdapter.openDatabase()
                .then(function () {
                    return redisAdapter.closeDatabase();
                })
                .nodeify(done);
        });

        it('should open and allow multiple closes', function (done) {
            var redisAdapter = new RedisAdapter(logger, gmeConfig);
            redisAdapter.openDatabase()
                .then(function () {
                    return redisAdapter.closeDatabase();
                })
                .then(function () {
                    return redisAdapter.closeDatabase();
                })
                .nodeify(done);
        });

        it('should allow multiple open', function (done) {
            var redisAdapter = new RedisAdapter(logger, gmeConfig);
            redisAdapter.openDatabase()
                .then(function () {
                    return redisAdapter.openDatabase();
                })
                .then(function () {
                    return Q.allDone([
                        redisAdapter.closeDatabase(),
                        redisAdapter.closeDatabase()
                    ]);
                })
                .nodeify(done);
        });

        it('should allow multiple open and close with same instances', function (done) {
            var redisAdapter = new RedisAdapter(logger, gmeConfig),
                cnt = 2;

            redisAdapter.openDatabase()
                .then(function () {
                    return redisAdapter.openDatabase();
                })
                .then(function () {
                    redisAdapter.closeDatabase()
                        .then(function () {
                            // This will not resolve until the second closeDatabase has finished.
                            cnt -= 1;
                            if (cnt === 0) {
                                done();
                            }
                        });
                    return redisAdapter.createProject('aProject');
                })
                .then(function (project) {
                    return project.getBranches();
                })
                .then(function () {
                    return redisAdapter.closeDatabase();
                })
                .then(function () {
                    redisAdapter.createProject('anotherProject')
                        .then(function () {
                            throw new Error('should have failed to create project when db closed!');
                        })
                        .catch(function (err) {
                            expect(err.message).to.contain('Database is not open');
                            cnt -= 1;
                            if (cnt === 0) {
                                done();
                            }
                        })
                        .done();
                })
                .done();
        });
    });

    describe('create/open/delete/rename Project', function () {
        var redisAdapter = new RedisAdapter(logger, gmeConfig);

        before(function (done) {
            redisAdapter.openDatabase()
                .then(function () {
                    return Q.ninvoke(redisAdapter.client, 'flushdb');
                })
                .nodeify(done);
        });

        after(function (done) {
            redisAdapter.closeDatabase(done);
        });

        it('should createProject if it does not exist', function (done) {
            redisAdapter.createProject('project1')
                .nodeify(done);
        });

        it('should fail to createProject if it exists', function (done) {
            redisAdapter.createProject('project2')
                .then(function () {
                    return redisAdapter.createProject('project2');
                })
                .then(function () {
                    throw new Error('should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('Project already exists project2');
                })
                .nodeify(done);
        });

        it('should openProject if it exists', function (done) {
            redisAdapter.createProject('project3')
                .then(function () {
                    return redisAdapter.openProject('project3');
                })
                .then(function (project) {
                    expect(project).to.have.property('closeProject');
                })
                .nodeify(done);
        });

        it('should open and close Project if it exists', function (done) {
            redisAdapter.createProject('project31')
                .then(function () {
                    return redisAdapter.openProject('project31');
                })
                .then(function (project) {
                    expect(project).to.have.property('closeProject');
                    return project.closeProject();
                })
                .nodeify(done);
        });

        it('should fail to openProject if it does not exist', function (done) {
            redisAdapter.openProject('project4')
                .then(function () {
                    throw new Error('should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('Project does not exist project4');
                })
                .nodeify(done);
        });

        it('should deleteProject and return false if it does not exist', function (done) {
            redisAdapter.deleteProject('project5')
                .then(function (result) {
                    expect(result).to.equal(false);
                })
                .nodeify(done);
        });

        it('should deleteProject and return true if it exists', function (done) {
            redisAdapter.createProject('project6')
                .then(function () {
                    return redisAdapter.deleteProject('project6');
                })
                .then(function (result) {
                    expect(result).to.equal(true);
                    return redisAdapter.openProject('project6');
                })
                .then(function () {
                    throw new Error('should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('Project does not exist project6');
                })
                .nodeify(done);
        });

        it('should renameProject if it exists and old does not', function (done) {
            redisAdapter.createProject('project7')
                .then(function () {
                    return redisAdapter.renameProject('project7', 'newProject7');
                })
                .then(function () {
                    return redisAdapter.openProject('newProject7');
                })
                .then(function () {
                    return redisAdapter.openProject('project7');
                })
                .then(function () {
                    throw new Error('should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('Project does not exist project7');
                })
                .nodeify(done);
        });

        it('should fail to renameProject if new project already exists', function (done) {
            Q.allDone([
                redisAdapter.createProject('project8'),
                redisAdapter.createProject('newProject8')
            ])
                .then(function () {
                    return redisAdapter.renameProject('project8', 'newProject8');
                })
                .then(function () {
                    throw new Error('should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('Project already exists newProject8');
                })
                .nodeify(done);
        });

        it('should fail to renameProject if it does not exist', function (done) {
            redisAdapter.renameProject('project9', 'newProject9')
                .then(function () {
                    throw new Error('should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('Project does not exist project9');
                })
                .nodeify(done);
        });
    });

    describe('database closed errors', function () {
        var redisAdapter = new RedisAdapter(logger, gmeConfig);

        it('should fail to createProject', function (done) {
            redisAdapter.createProject('project')
                .then(function () {
                    throw new Error('should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('Database is not open');
                })
                .nodeify(done);
        });

        it('should fail to openProject', function (done) {
            redisAdapter.openProject('project')
                .then(function () {
                    throw new Error('should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('Database is not open');
                })
                .nodeify(done);
        });

        it('should fail to deleteProject', function (done) {
            redisAdapter.deleteProject('project')
                .then(function () {
                    throw new Error('should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('Database is not open');
                })
                .nodeify(done);
        });

        it('should fail to renameProject', function (done) {
            redisAdapter.renameProject('project')
                .then(function () {
                    throw new Error('should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('Database is not open');
                })
                .nodeify(done);
        });
    });

    describe('Project: insert/load Object and getCommits', function () {
        var redisAdapter = new RedisAdapter(logger, gmeConfig);

        before(function (done) {
            redisAdapter.openDatabase()
                .then(function () {
                    return Q.ninvoke(redisAdapter.client, 'flushdb');
                })
                .nodeify(done);
        });

        after(function (done) {
            redisAdapter.closeDatabase(done);
        });

        it('should insert an object', function (done) {
            redisAdapter.createProject('project1')
                .then(function (project) {
                    return project.insertObject({a: 1, b: 2, _id: '#ab12'});
                })
                .nodeify(done);
        });

        it('should insert same object twice [one-by-one]', function (done) {
            var project;
            redisAdapter.createProject('project2')
                .then(function (project_) {
                    project = project_;
                    return project.insertObject({a: 1, b: 2, _id: '#ab12'});
                })
                .then(function () {
                    return project.insertObject({a: 1, b: 2, _id: '#ab12'});
                })
                .nodeify(done);
        });

        it('should insert same object twice', function (done) {
            redisAdapter.createProject('project3')
                .then(function (project) {
                    return Q.allDone([
                        project.insertObject({a: 1, b: 2, _id: '#ab12'}),
                        project.insertObject({a: 1, b: 2, _id: '#ab12'})
                    ]);
                })
                .nodeify(done);
        });

        it('should fail to insert same hash with different object', function (done) {
            redisAdapter.createProject('project4')
                .then(function (project) {
                    return Q.allDone([
                        project.insertObject({a: 1, b: 2, _id: '#ab12'}),
                        project.insertObject({a: 2, b: 2, _id: '#ab12'})
                    ]);
                })
                .then(function () {
                    throw new Error('should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('tried to insert existing hash - the two objects were NOT equal');
                })
                .nodeify(done);
        });

        it('should insert same hash with different object in two projects', function (done) {
            Q.allDone([
                redisAdapter.createProject('project5'),
                redisAdapter.createProject('project6')
            ])
                .then(function (projects) {
                    return Q.allDone([
                        projects[0].insertObject({a: 1, b: 2, _id: '#ab12'}),
                        projects[1].insertObject({a: 2, b: 2, _id: '#ab12'})
                    ]);
                })
                .nodeify(done);
        });

        it('should fail to insert invalid hashed object', function (done) {
            redisAdapter.createProject('project7')
                .then(function (project) {
                    return project.insertObject({a: 1, b: 2, _id: 'ab12'});
                })
                .then(function () {
                    throw new Error('should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('object._id is not a valid hash');
                })
                .nodeify(done);
        });

        it('should fail to insert non object', function (done) {
            redisAdapter.createProject('project8')
                .then(function (project) {
                    return project.insertObject('This is not an object');
                })
                .then(function () {
                    throw new Error('should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('object is not an object');
                })
                .nodeify(done);
        });

        it('should insert and load object', function (done) {
            var project;
            redisAdapter.createProject('project9')
                .then(function (project_) {
                    project = project_;
                    return project.insertObject({a: 1, b: 2, _id: '#ab12'});
                })
                .then(function () {
                    return project.loadObject('#ab12');
                })
                .then(function (obj) {
                    expect(obj).to.deep.equal({a: 1, b: 2, _id: '#ab12'});
                })
                .nodeify(done);
        });

        it('should fail to load non-existing object', function (done) {
            redisAdapter.createProject('project10')
                .then(function (project) {
                    return project.loadObject('#ab12');
                })
                .then(function () {
                    throw new Error('should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('object does not exist #ab12');
                })
                .nodeify(done);
        });

        it('should fail to load non string hash', function (done) {
            redisAdapter.createProject('project11')
                .then(function (project) {
                    return project.loadObject(42);
                })
                .then(function () {
                    throw new Error('should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('loadObject - given hash is not a string : number');
                })
                .nodeify(done);
        });

        it('should fail to load invalid hash', function (done) {
            redisAdapter.createProject('project12')
                .then(function (project) {
                    return project.loadObject('123');
                })
                .then(function () {
                    throw new Error('should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('loadObject - invalid hash :123');
                })
                .nodeify(done);
        });

        it('should insert one commit and return it using getCommits', function (done) {
            var project,
                commitObj = {_id: '#commitHash', time: 1, type: 'commit'};
            redisAdapter.createProject('project13')
                .then(function (project_) {
                    project = project_;
                    return project.insertObject(commitObj);
                })
                .then(function () {
                    return project.getCommits(10, 1);
                })
                .then(function (commits) {
                    expect(commits).to.deep.equal([commitObj]);
                })
                .nodeify(done);
        });

        it('should insert three commits and return them in order using getCommits', function (done) {
            var project,
                commitObj1 = {_id: '#commitHash1', time: 1, type: 'commit'},
                commitObj2 = {_id: '#commitHash2', time: 2, type: 'commit'},
                commitObj3 = {_id: '#commitHash3', time: 3, type: 'commit'};

            redisAdapter.createProject('project14')
                .then(function (project_) {
                    project = project_;
                    return Q.allDone([
                        project.insertObject(commitObj1),
                        project.insertObject(commitObj2),
                        project.insertObject(commitObj3)
                    ]);
                })
                .then(function () {
                    return project.getCommits(10, 10);
                })
                .then(function (commits) {
                    expect(commits).to.deep.equal([commitObj3, commitObj2, commitObj1]);
                })
                .nodeify(done);
        });

        it('should insert three commits and return one using getCommits before=2', function (done) {
            var project,
                commitObj1 = {_id: '#commitHash1', time: 1, type: 'commit'},
                commitObj2 = {_id: '#commitHash2', time: 2, type: 'commit'},
                commitObj3 = {_id: '#commitHash3', time: 3, type: 'commit'};

            redisAdapter.createProject('project15')
                .then(function (project_) {
                    project = project_;
                    return Q.allDone([
                        project.insertObject(commitObj1),
                        project.insertObject(commitObj2),
                        project.insertObject(commitObj3)
                    ]);
                })
                .then(function () {
                    return project.getCommits(2, 10);
                })
                .then(function (commits) {
                    expect(commits).to.deep.equal([commitObj1]);
                })
                .nodeify(done);
        });

        it('should getCommits and return [] when no commits inserted', function (done) {
            var project,
                commitObj1 = {_id: '#commitHash1', time: 1},
                commitObj2 = {_id: '#commitHash2', time: 2},
                commitObj3 = {_id: '#commitHash3', time: 3};

            redisAdapter.createProject('project16')
                .then(function (project_) {
                    project = project_;
                    return Q.allDone([
                        project.insertObject(commitObj1),
                        project.insertObject(commitObj2),
                        project.insertObject(commitObj3)
                    ]);
                })
                .then(function () {
                    return project.getCommits(10, 10);
                })
                .then(function (commits) {
                    expect(commits).to.deep.equal([]);
                })
                .nodeify(done);
        });
    });

    describe('Project: branch operations', function () {
        var redisAdapter = new RedisAdapter(logger, gmeConfig);

        before(function (done) {
            redisAdapter.openDatabase()
                .then(function () {
                    return Q.ninvoke(redisAdapter.client, 'flushdb');
                })
                .nodeify(done);
        });

        after(function (done) {
            redisAdapter.closeDatabase(done);
        });

        it('getBranches should get empty object when no branches inserted', function (done) {
            redisAdapter.createProject('project1')
                .then(function (project) {
                    return project.getBranches();
                })
                .then(function (branches) {
                    expect(branches).to.deep.equal({});
                })
                .nodeify(done);
        });

        it('should create branch with setBranchHash when oldHash is empty', function (done) {
            var project;
            redisAdapter.createProject('project2')
                .then(function (project_) {
                    project = project_;
                    return project.setBranchHash('master', '', '#newHash');
                })
                .then(function () {
                    return project.getBranches();
                })
                .then(function (branches) {
                    expect(branches).to.deep.equal({master: '#newHash'});
                })
                .nodeify(done);
        });

        it('should create and return two branches setBranchHash', function (done) {
            var project;
            redisAdapter.createProject('project3')
                .then(function (project_) {
                    project = project_;
                    return Q.allDone([
                        project.setBranchHash('b', '', '#newHash'),
                        project.setBranchHash('b1', '', '#newHash1')
                    ]);
                })
                .then(function () {
                    return project.getBranches();
                })
                .then(function (branches) {
                    expect(branches).to.deep.equal({b: '#newHash', b1: '#newHash1'});
                })
                .nodeify(done);
        });

        it('should return branch hash mismatch when creating branch while it exists', function (done) {
            var project;
            redisAdapter.createProject('project4')
                .then(function (project_) {
                    project = project_;
                    return project.setBranchHash('master', '', '#newHash');
                })
                .then(function () {
                    return project.setBranchHash('master', '', '#someOther');
                })
                .then(function () {
                    throw new Error('should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('branch hash mismatch');
                })
                .nodeify(done);
        });

        it('should getBranchHash for existing branch', function (done) {
            var project;
            redisAdapter.createProject('project5')
                .then(function (project_) {
                    project = project_;
                    return project.setBranchHash('master', '', '#newHash');
                })
                .then(function () {
                    return project.getBranchHash('master');
                })
                .then(function (hash) {
                    expect(hash).to.equal('#newHash');
                })
                .nodeify(done);
        });

        it('should getBranchHash for non-existing branch and return empty string', function (done) {
            var project;
            redisAdapter.createProject('project6')
                .then(function (project_) {
                    project = project_;
                    return project.getBranchHash('master');
                })
                .then(function (hash) {
                    expect(hash).to.equal('');
                })
                .nodeify(done);
        });

        it('should create and delete a branch', function (done) {
            var project;
            redisAdapter.createProject('project7')
                .then(function (project_) {
                    project = project_;
                    return project.setBranchHash('master', '', '#newHash');
                })
                .then(function () {
                    return project.setBranchHash('master', '#newHash', '');
                })
                .then(function () {
                    return project.getBranchHash('master');
                })
                .then(function (hash) {
                    expect(hash).to.equal('');
                })
                .nodeify(done);
        });

        it('should return branch hash mismatch when deleting branch with wrong oldhash', function (done) {
            var project;
            redisAdapter.createProject('project8')
                .then(function (project_) {
                    project = project_;
                    return project.setBranchHash('master', '', '#newHash');
                })
                .then(function () {
                    return project.setBranchHash('master', '#someOther', '');
                })
                .then(function () {
                    throw new Error('should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('branch hash mismatch');
                })
                .nodeify(done);
        });

        it('should resolve when passing same hash and it matches old', function (done) {
            var project;
            redisAdapter.createProject('project9')
                .then(function (project_) {
                    project = project_;
                    return project.setBranchHash('master', '', '#newHash');
                })
                .then(function () {
                    return project.setBranchHash('master', '#newHash', '#newHash');
                })
                .nodeify(done);
        });

        it('should return branch hash mismatch when passing same hash and it does not match', function (done) {
            var project;
            redisAdapter.createProject('project10')
                .then(function (project_) {
                    project = project_;
                    return project.setBranchHash('master', '', '#newHash');
                })
                .then(function () {
                    return project.setBranchHash('master', '#someOther', '#someOther');
                })
                .then(function () {
                    throw new Error('should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('branch hash mismatch');
                })
                .nodeify(done);
        });

        it('should update the hash if oldhash matches', function (done) {
            var project;
            redisAdapter.createProject('project11')
                .then(function (project_) {
                    project = project_;
                    return project.setBranchHash('master', '', '#newHash');
                })
                .then(function () {
                    return project.setBranchHash('master', '#newHash', '#someNew');
                })
                .then(function () {
                    return project.getBranchHash('master');
                })
                .catch(function (branchHash) {
                    expect(branchHash).to.equal('#someNew');
                })
                .nodeify(done);
        });

        it('should return branch hash mismatch when passing same hash and it does not match', function (done) {
            var project;
            redisAdapter.createProject('project12')
                .then(function (project_) {
                    project = project_;
                    return project.setBranchHash('master', '', '#newHash');
                })
                .then(function () {
                    return project.setBranchHash('master', '#someOther', '#someNew');
                })
                .then(function () {
                    throw new Error('should have failed!');
                })
                .catch(function (err) {
                    expect(err.message).to.contain('branch hash mismatch');
                    project.getBranchHash('master')
                        .then(function (branchHash) {
                            expect(branchHash).to.equal('#newHash');
                        })
                        .nodeify(done);
                })
                .done();
        });

        it('should contain branches and commits after rename', function (done) {
            var project,
                commitObj1 = {_id: '#commitHash1', time: 1, type: 'commit'},
                commitObj2 = {_id: '#commitHash2', time: 2, type: 'commit'},
                commitObj3 = {_id: '#commitHash3', time: 3, type: 'commit'};

            redisAdapter.createProject('project13')
                .then(function (project_) {
                    project = project_;
                    return Q.allDone([
                        project.setBranchHash('b', '', '#newHash'),
                        project.setBranchHash('b1', '', '#newHash1'),
                        project.insertObject(commitObj1),
                        project.insertObject(commitObj2),
                        project.insertObject(commitObj3)
                    ]);
                })
                .then(function () {
                    return project.closeProject();
                })
                .then(function () {
                    return redisAdapter.renameProject('project13', 'newProject13');
                })
                .then(function () {
                    return redisAdapter.openProject('newProject13');
                })
                .then(function (newProject) {
                    return Q.allDone([
                        newProject.getBranches(),
                        newProject.getCommits(10, 10)
                    ]);
                })
                .then(function (result) {
                    expect(result[0]).to.deep.equal({b: '#newHash', b1: '#newHash1'});
                    expect(result[1]).to.deep.equal([commitObj3, commitObj2, commitObj1]);
                })
                .nodeify(done);
        });

        it('should should succeed in deleting branch that did not exist', function (done) {
            redisAdapter.createProject('project14')
                .then(function (project) {
                    return project.setBranchHash('doesNotExist', '', '');
                })
                .nodeify(done);
        });
    });
});