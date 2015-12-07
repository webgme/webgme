/*globals*/
/*jshint node:true, newcap:false, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

/**
 * @param AdapterClass
 * @param logger
 * @param gmeConfig
 * @param Q
 * @param expect
 */
function genOpenCloseDatabase(AdapterClass, logger, gmeConfig, Q, expect) {

    it('should create a new instance', function () {
        var databaseAdapter = new AdapterClass(logger, gmeConfig);
        expect(databaseAdapter).to.have.property('openDatabase');
        expect(databaseAdapter).to.have.property('closeDatabase');
        expect(databaseAdapter).to.have.property('createProject');
        expect(databaseAdapter).to.have.property('deleteProject');
        expect(databaseAdapter).to.have.property('openProject');
        expect(databaseAdapter).to.have.property('renameProject');
        expect(databaseAdapter).to.have.property('duplicateProject');
    });

    it('should open and close', function (done) {
        var databaseAdapter = new AdapterClass(logger, gmeConfig);
        databaseAdapter.openDatabase()
            .then(function () {
                expect(databaseAdapter.client).to.not.equal(null);
                return databaseAdapter.closeDatabase();
            })
            .then(function () {
                expect(databaseAdapter.client).to.equal(null);
            })
            .nodeify(done);
    });

    it('should open and allow multiple closes', function (done) {
        var databaseAdapter = new AdapterClass(logger, gmeConfig);
        databaseAdapter.openDatabase()
            .then(function () {
                expect(databaseAdapter.client).to.not.equal(null);
                return databaseAdapter.closeDatabase();
            })
            .then(function () {
                expect(databaseAdapter.client).to.equal(null);
                return databaseAdapter.closeDatabase();
            })
            .then(function () {
                expect(databaseAdapter.client).to.equal(null);
            })
            .nodeify(done);
    });

    it('should allow multiple open', function (done) {
        var databaseAdapter = new AdapterClass(logger, gmeConfig);
        databaseAdapter.openDatabase()
            .then(function () {
                return databaseAdapter.openDatabase();
            })
            .then(function () {
                expect(databaseAdapter.client).to.not.equal(null);
                return Q.allDone([
                    databaseAdapter.closeDatabase(),
                    databaseAdapter.closeDatabase()
                ]);
            })
            .then(function () {
                expect(databaseAdapter.client).to.equal(null);
            })
            .nodeify(done);
    });

    it('should allow multiple open and close with same instances', function (done) {
        var databaseAdapter = new AdapterClass(logger, gmeConfig),
            cnt = 2;

        databaseAdapter.openDatabase()
            .then(function () {
                expect(databaseAdapter.client).to.not.equal(null);
                return databaseAdapter.openDatabase();
            })
            .then(function () {
                databaseAdapter.closeDatabase()
                    .then(function () {
                        // This will not resolve until the second closeDatabase has finished.
                        cnt -= 1;
                        if (cnt === 0) {
                            done();
                        }
                    });

                expect(databaseAdapter.client).to.not.equal(null);
                return databaseAdapter.closeDatabase();
            })
            .then(function () {
                expect(databaseAdapter.client).to.equal(null);
                cnt -= 1;
                if (cnt === 0) {
                    done();
                }
            })
            .done();
    });

    it('should allow multiple concurrent open calls with same instance', function (done) {
        var databaseAdapter = new AdapterClass(logger, gmeConfig);

        Q.allDone([
            databaseAdapter.openDatabase(),
            databaseAdapter.openDatabase()
        ])
            .then(function () {
                expect(databaseAdapter.client).to.not.equal(null);
                return Q.allDone([
                    databaseAdapter.closeDatabase(),
                    databaseAdapter.closeDatabase()
                ]);
            })
            .then(function () {
                expect(databaseAdapter.client).to.equal(null);
            })
            .nodeify(done);
    });

    it('should allow multiple open calls with different instances', function (done) {
        var databaseAdapter1 = new AdapterClass(logger, gmeConfig),
            databaseAdapter2 = new AdapterClass(logger, gmeConfig);

        databaseAdapter1.openDatabase()
            .then(function () {
                return databaseAdapter2.openDatabase();
            })
            .then(function () {
                expect(databaseAdapter1.client).to.not.equal(null);
                expect(databaseAdapter2.client).to.not.equal(null);
                return databaseAdapter1.closeDatabase();
            })
            .then(function () {
                expect(databaseAdapter1.client).to.equal(null);
                expect(databaseAdapter2.client).to.not.equal(null);
                return databaseAdapter2.closeDatabase();
            })
            .then(function () {
                expect(databaseAdapter1.client).to.equal(null);
                expect(databaseAdapter2.client).to.equal(null);
            })
            .nodeify(done);
    });

    it('should allow multiple concurrent open calls with different instances', function (done) {
        var databaseAdapter1 = new AdapterClass(logger, gmeConfig),
            databaseAdapter2 = new AdapterClass(logger, gmeConfig);

        Q.allDone([
            databaseAdapter1.openDatabase(),
            databaseAdapter2.openDatabase()
            ])
            .then(function () {
                expect(databaseAdapter1.client).to.not.equal(null);
                expect(databaseAdapter2.client).to.not.equal(null);

                return Q.allDone([
                    databaseAdapter1.closeDatabase(),
                    databaseAdapter2.closeDatabase()
                ]);
            })
            .then(function () {
                expect(databaseAdapter1.client).to.equal(null);
                expect(databaseAdapter2.client).to.equal(null);
            })
            .nodeify(done);
    });

    it('should allow open then multiple close calls and then open again', function (done) {
        var databaseAdapter = new AdapterClass(logger, gmeConfig);

        databaseAdapter.openDatabase()
            .then(function () {
                return databaseAdapter.closeDatabase();
            })
            .then(function () {
                return databaseAdapter.closeDatabase();
            })
            .then(function () {
                return databaseAdapter.closeDatabase();
            })
            .then(function () {
                expect(databaseAdapter.client).to.equal(null);
                return databaseAdapter.openDatabase();
            })
            .then(function () {
                expect(databaseAdapter.client).to.not.equal(null);
                return databaseAdapter.closeDatabase();
            })
            .then(function () {
                expect(databaseAdapter.client).to.equal(null);
            })
            .nodeify(done);
    });

    it('should allow open after multiple close calls', function (done) {
        var databaseAdapter = new AdapterClass(logger, gmeConfig);

        databaseAdapter.closeDatabase()
            .then(function () {
                return databaseAdapter.closeDatabase();
            })
            .then(function () {
                return databaseAdapter.closeDatabase();
            })
            .then(function () {
                return databaseAdapter.openDatabase();
            })
            .then(function () {
                expect(databaseAdapter.client).to.not.equal(null);
                return databaseAdapter.closeDatabase();
            })
            .then(function () {
                expect(databaseAdapter.client).to.equal(null);
            })
            .nodeify(done);
    });

    it('should not connect twice although counter is 0', function (done) {
        var databaseAdapter = new AdapterClass(logger, gmeConfig);

        databaseAdapter.openDatabase()
            .then(function () {
                return Q.allDone([
                    databaseAdapter.closeDatabase(),
                    databaseAdapter.openDatabase(),
                    databaseAdapter.closeDatabase()
                ]);
            })
            .then(function () {
                return databaseAdapter.openDatabase();
            })
            .then(function () {
                return databaseAdapter.closeDatabase();
            })
            .then(function () {
                expect(databaseAdapter.client).to.equal(null);
            })
            .nodeify(done);
    });

    it('should not connect twice although counter is 0 case 2', function (done) {
        var databaseAdapter = new AdapterClass(logger, gmeConfig);

        databaseAdapter.openDatabase()
            .then(function () {
                return Q.allDone([
                    databaseAdapter.closeDatabase(),
                    databaseAdapter.closeDatabase(),
                    databaseAdapter.openDatabase(),
                    databaseAdapter.closeDatabase()
                ]);
            })
            .then(function () {
                return databaseAdapter.openDatabase();
            })
            .then(function () {
                return databaseAdapter.closeDatabase();
            })
            .then(function () {
                expect(databaseAdapter.client).to.equal(null);
            })
            .nodeify(done);
    });
}

/**
 * @param databaseAdapter
 * @param Q
 * @param expect
 */
function genCreateOpenDeleteRenameProject(databaseAdapter, Q, expect) {
    it('should createProject if it does not exist', function (done) {
        databaseAdapter.createProject('project1')
            .nodeify(done);
    });

    it('should fail to createProject if it exists', function (done) {
        databaseAdapter.createProject('project2')
            .then(function () {
                return databaseAdapter.createProject('project2');
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
        databaseAdapter.createProject('project3')
            .then(function () {
                return databaseAdapter.openProject('project3');
            })
            .then(function (project) {
                expect(project).to.have.property('closeProject');
            })
            .nodeify(done);
    });

    it('should open and close Project if it exists', function (done) {
        databaseAdapter.createProject('project31')
            .then(function () {
                return databaseAdapter.openProject('project31');
            })
            .then(function (project) {
                expect(project).to.have.property('closeProject');
                return project.closeProject();
            })
            .nodeify(done);
    });

    it('should fail to openProject if it does not exist', function (done) {
        databaseAdapter.openProject('project4')
            .then(function () {
                throw new Error('should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.contain('Project does not exist project4');
            })
            .nodeify(done);
    });

    it('should deleteProject and return false if it does not exist', function (done) {
        databaseAdapter.deleteProject('project5')
            .then(function (result) {
                expect(result).to.equal(false);
            })
            .nodeify(done);
    });

    it('should deleteProject and return true if it exists', function (done) {
        databaseAdapter.createProject('project6')
            .then(function () {
                return databaseAdapter.deleteProject('project6');
            })
            .then(function (result) {
                expect(result).to.equal(true);
                return databaseAdapter.openProject('project6');
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
        databaseAdapter.createProject('project7')
            .then(function () {
                return databaseAdapter.renameProject('project7', 'newProject7');
            })
            .then(function () {
                return databaseAdapter.openProject('newProject7');
            })
            .then(function () {
                return databaseAdapter.openProject('project7');
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
            databaseAdapter.createProject('project8'),
            databaseAdapter.createProject('newProject8')
        ])
            .then(function () {
                return databaseAdapter.renameProject('project8', 'newProject8');
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
        databaseAdapter.renameProject('project9', 'newProject9')
            .then(function () {
                throw new Error('should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.contain('Project does not exist project9');
            })
            .nodeify(done);
    });

    it('should duplicateProject if it exists and old does not', function (done) {
        databaseAdapter.createProject('project10')
            .then(function () {
                return databaseAdapter.duplicateProject('project10', 'newProject10');
            })
            .then(function () {
                return databaseAdapter.openProject('newProject10');
            })
            .then(function () {
                return databaseAdapter.openProject('project10');
            })
            .nodeify(done);
    });

    it('should fail to duplicateProject if new project already exists', function (done) {
        Q.allDone([
            databaseAdapter.createProject('project11'),
            databaseAdapter.createProject('newProject11')
        ])
            .then(function () {
                return databaseAdapter.duplicateProject('project11', 'newProject11');
            })
            .then(function () {
                throw new Error('should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.contain('Project already exists newProject11');
            })
            .nodeify(done);
    });

    it('should fail to duplicateProject if it does not exist', function (done) {
        databaseAdapter.duplicateProject('project12', 'newProject12')
            .then(function () {
                throw new Error('should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.contain('Project does not exist project12');
            })
            .nodeify(done);
    });
}

/**
 * @param databaseAdapter
 * @param Q
 * @param expect
 */
function genDatabaseClosedErrors(databaseAdapter, Q, expect) {

    it('should fail to createProject', function (done) {
        databaseAdapter.createProject('project')
            .then(function () {
                throw new Error('should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.contain('Database is not open');
            })
            .nodeify(done);
    });

    it('should fail to openProject', function (done) {
        databaseAdapter.openProject('project')
            .then(function () {
                throw new Error('should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.contain('Database is not open');
            })
            .nodeify(done);
    });

    it('should fail to deleteProject', function (done) {
        databaseAdapter.deleteProject('project')
            .then(function () {
                throw new Error('should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.contain('Database is not open');
            })
            .nodeify(done);
    });

    it('should fail to renameProject', function (done) {
        databaseAdapter.renameProject('project')
            .then(function () {
                throw new Error('should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.contain('Database is not open');
            })
            .nodeify(done);
    });

    it('should fail to duplicateProject', function (done) {
        databaseAdapter.duplicateProject('project')
            .then(function () {
                throw new Error('should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.contain('Database is not open');
            })
            .nodeify(done);
    });
}

/**
 * @param databaseAdapter
 * @param Q
 * @param expect
 */
function genInsertLoadAndCommits(databaseAdapter, Q, expect) {

    it('should insert an object', function (done) {
        databaseAdapter.createProject('project1')
            .then(function (project) {
                return project.insertObject({a: 1, b: 2, _id: '#ab12'});
            })
            .nodeify(done);
    });

    it('should insert same object twice [one-by-one]', function (done) {
        var project;
        databaseAdapter.createProject('project2')
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
        databaseAdapter.createProject('project3')
            .then(function (project) {
                return Q.allDone([
                    project.insertObject({a: 1, b: 2, _id: '#ab12'}),
                    project.insertObject({a: 1, b: 2, _id: '#ab12'})
                ]);
            })
            .nodeify(done);
    });

    it('should fail to insert same hash with different object', function (done) {
        var project;
        databaseAdapter.createProject('project4')
            .then(function (project_) {
                project = project_;
                return project.insertObject({a: 1, b: 2, _id: '#ab12'});
            })
            .then(function () {
                return project.insertObject({a: 2, b: 2, _id: '#ab12'});
            })
            .then(function () {
                throw new Error('should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.contain('tried to insert existing hash - the two objects were NOT equal');
                project.loadObject('#ab12')
                    .then(function (obj) {
                        expect(obj).to.deep.equal({a: 1, b: 2, _id: '#ab12'});
                    })
                    .nodeify(done);
            })
            .done();
    });

    it('should insert same hash with different object in two projects', function (done) {
        Q.allDone([
            databaseAdapter.createProject('project5'),
            databaseAdapter.createProject('project6')
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
        databaseAdapter.createProject('project7')
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
        databaseAdapter.createProject('project8')
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
        databaseAdapter.createProject('project9')
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
        databaseAdapter.createProject('project10')
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
        databaseAdapter.createProject('project11')
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
        databaseAdapter.createProject('project12')
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
        databaseAdapter.createProject('project13')
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

        databaseAdapter.createProject('project14')
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

        databaseAdapter.createProject('project15')
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

        databaseAdapter.createProject('project16')
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
}

/**
 * @param databaseAdapter
 * @param Q
 * @param expect
 */
function genBranchOperations(databaseAdapter, Q, expect) {

    it('should create branch with setBranchHash when oldHash is empty and getBranchHash and getHash', function (done) {
        var project;
        databaseAdapter.createProject('project0')
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

    it('getBranches should get empty object when no branches inserted', function (done) {
        databaseAdapter.createProject('project1')
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
        databaseAdapter.createProject('project2')
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
        databaseAdapter.createProject('project3')
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
        databaseAdapter.createProject('project4')
            .then(function (project_) {
                project = project_;
                return project.setBranchHash('master', '', '#startHash');
            })
            .then(function () {
                return project.setBranchHash('master', '', '#someOther');
            })
            .then(function () {
                throw new Error('should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.contain('branch hash mismatch');
                project.getBranchHash('master')
                    .then(function (hash) {
                        expect(hash).to.equal('#startHash');
                    })
                    .nodeify(done);
            })
            .done();
    });

    it('should getBranchHash for existing branch', function (done) {
        var project;
        databaseAdapter.createProject('project5')
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
        databaseAdapter.createProject('project6')
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
        databaseAdapter.createProject('project7')
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
        databaseAdapter.createProject('project8')
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
        databaseAdapter.createProject('project9')
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
        databaseAdapter.createProject('project10')
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
        databaseAdapter.createProject('project11')
            .then(function (project_) {
                project = project_;
                return project.setBranchHash('master', '', '#startHash');
            })
            .then(function () {
                return project.setBranchHash('master', '#startHash', '#newHash');
            })
            .then(function () {
                return project.getBranchHash('master');
            })
            .then(function (branchHash) {
                expect(branchHash).to.equal('#newHash');
            })
            .nodeify(done);
    });

    it('should return branch hash mismatch when passing a hash and it does not match', function (done) {
        var project;
        databaseAdapter.createProject('project12')
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

    it('should contain branches, commits and tags after rename', function (done) {
        var project,
            commitObj1 = {_id: '#commitHash1', time: 1, type: 'commit'},
            commitObj2 = {_id: '#commitHash2', time: 2, type: 'commit'},
            commitObj3 = {_id: '#commitHash3', time: 3, type: 'commit'};

        databaseAdapter.createProject('project13')
            .then(function (project_) {
                project = project_;
                return Q.allDone([
                    project.setBranchHash('b', '', '#newHash'),
                    project.setBranchHash('b1', '', '#newHash1'),
                    project.createTag('tag', '#newHash'),
                    project.createTag('tag1', '#newHash1'),
                    project.insertObject(commitObj1),
                    project.insertObject(commitObj2),
                    project.insertObject(commitObj3)
                ]);
            })
            .then(function () {
                return project.closeProject();
            })
            .then(function () {
                return databaseAdapter.renameProject('project13', 'newProject13');
            })
            .then(function () {
                return databaseAdapter.openProject('newProject13');
            })
            .then(function (newProject) {
                return Q.allDone([
                    newProject.getBranches(),
                    newProject.getCommits(10, 10),
                    newProject.getTags()
                ]);
            })
            .then(function (result) {
                expect(result[0]).to.deep.equal({b: '#newHash', b1: '#newHash1'});
                expect(result[1]).to.deep.equal([commitObj3, commitObj2, commitObj1]);
                expect(result[2]).to.deep.equal({tag: '#newHash', tag1: '#newHash1'});
            })
            .nodeify(done);
    });

    it('should succeed in deleting branch that did not exist', function (done) {
        databaseAdapter.createProject('project14')
            .then(function (project) {
                return project.setBranchHash('doesNotExist', '', '');
            })
            .nodeify(done);
    });

    it('should succeed in deleting branch that did not exist provided a hash', function (done) {
        databaseAdapter.createProject('project15')
            .then(function (project) {
                return project.setBranchHash('doesNotExist', '#someHash', '');
            })
            .nodeify(done);
    });

    it('should fail to delete when hash mismatch', function (done) {
        var project;
        databaseAdapter.createProject('project16')
            .then(function (project_) {
                project = project_;
                return project.setBranchHash('master', '', '#startHash');
            })
            .then(function () {
                return project.getBranchHash('master');
            })
            .then(function (startHash) {
                expect(startHash).to.equal('#startHash');
                return project.setBranchHash('master', '#someOtherHash', '');
            })
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.contain('branch hash mismatch');
                project.getBranchHash('master')
                    .then(function (hash) {
                        expect(hash).to.equal('#startHash');
                    })
                    .nodeify(done);
            })
            .done();
    });

    it('should fail to update when hash mismatch', function (done) {
        var project;
        databaseAdapter.createProject('project17')
            .then(function (project_) {
                project = project_;
                return project.setBranchHash('master', '', '#startHash');
            })
            .then(function () {
                return project.setBranchHash('master', '#someOtherHash', '#shouldNotBeSet');
            })
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.contain('branch hash mismatch');
                project.getBranchHash('master')
                    .then(function (hash) {
                        expect(hash).to.equal('#startHash');
                    })
                    .nodeify(done);
            })
            .done();
    });

    it('should fail to update if it does not exist', function (done) {
        var project;
        databaseAdapter.createProject('project18')
            .then(function (project_) {
                project = project_;
                return project.setBranchHash('master', '#someOtherHash', '#shouldNotBeSet');
            })
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.contain('branch hash mismatch');
                project.getBranchHash('master')
                    .then(function (hash) {
                        expect(hash).to.equal('');
                    })
                    .nodeify(done);
            })
            .done();
    });

    it('should contain branches and commits after duplicate', function (done) {
        var project,
            commitObj1 = {_id: '#commitHash1', time: 1, type: 'commit'},
            commitObj2 = {_id: '#commitHash2', time: 2, type: 'commit'},
            commitObj3 = {_id: '#commitHash3', time: 3, type: 'commit'};

        databaseAdapter.createProject('project19')
            .then(function (project_) {
                project = project_;
                return Q.allDone([
                    project.setBranchHash('b', '', '#newHash'),
                    project.setBranchHash('b1', '', '#newHash1'),
                    project.createTag('tag', '#newHash'),
                    project.createTag('tag1', '#newHash1'),
                    project.insertObject(commitObj1),
                    project.insertObject(commitObj2),
                    project.insertObject(commitObj3)
                ]);
            })
            .then(function () {
                return project.closeProject();
            })
            .then(function () {
                return databaseAdapter.duplicateProject('project19', 'newProject19');
            })
            .then(function () {
                return Q.allDone([
                    databaseAdapter.openProject('newProject19'),
                    databaseAdapter.openProject('project19')
                    ]);
            })
            .then(function (result) {
                return Q.allDone([
                    result[0].getBranches(),
                    result[1].getBranches(),
                    result[0].getCommits(10, 10),
                    result[1].getCommits(10, 10),
                    result[0].getTags(),
                    result[1].getTags()
                ]);
            })
            .then(function (result) {
                expect(result[0]).to.deep.equal({b: '#newHash', b1: '#newHash1'});
                expect(result[1]).to.deep.equal({b: '#newHash', b1: '#newHash1'});
                expect(result[2]).to.deep.equal([commitObj3, commitObj2, commitObj1]);
                expect(result[3]).to.deep.equal([commitObj3, commitObj2, commitObj1]);
                expect(result[4]).to.deep.equal({tag: '#newHash', tag1: '#newHash1'});
                expect(result[5]).to.deep.equal({tag: '#newHash', tag1: '#newHash1'});
            })
            .nodeify(done);
    });
}

/**
 * @param databaseAdapter
 * @param Q
 * @param expect
 */
function genTagOperations(databaseAdapter, Q, expect) {

    it('should create a tag if it does not exist', function (done) {
        var project;
        databaseAdapter.createProject('project1')
            .then(function (project_) {
                project = project_;
                return project.createTag('tag1', '#someHash');
            })
            .then(function () {
                return project.getTags();
            })
            .then(function (tags) {
                expect(tags).to.deep.equal({
                    tag1: '#someHash'
                });
            })
            .nodeify(done);
    });

    it('should create and delete', function (done) {
        var project;
        databaseAdapter.createProject('project2')
            .then(function (project_) {
                project = project_;
                return project.createTag('tag1', '#someHash');
            })
            .then(function () {
                return project.getTags();
            })
            .then(function (tags) {
                expect(tags).to.deep.equal({
                    tag1: '#someHash'
                });

                return project.deleteTag('tag1');
            })
            .then(function () {
                return project.getTags();
            })
            .then(function (tags) {
                expect(tags).to.deep.equal({});
            })
            .nodeify(done);
    });

    it('should fail to create a tag if it already exists', function (done) {
        var project;
        databaseAdapter.createProject('project3')
            .then(function (project_) {
                project = project_;
                return project.createTag('tag1', '#someHash');
            })
            .then(function () {
                return project.createTag('tag1', '#someOtherHash');
            })
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.contain('Tag already exists [tag1]');
                return project.getTags()
                    .then(function (tags) {
                        expect(tags).to.deep.equal({
                            tag1: '#someHash'
                        });
                    });
            })
            .nodeify(done);
    });

    it('should delete if not exist', function (done) {
        var project;
        databaseAdapter.createProject('project4')
            .then(function (project_) {
                project = project_;
                return project.createTag('tag1', '#someHash');
            })
            .then(function () {
                return project.deleteTag('tag2');
            })
            .then(function () {
                return project.getTags();
            })
            .then(function (tags) {
                expect(tags).to.deep.equal({
                    tag1: '#someHash'
                });
            })
            .nodeify(done);
    });

    it('should delete if not exist and no tags created', function (done) {
        var project;
        databaseAdapter.createProject('project5')
            .then(function (project_) {
                project = project_;

                return project.deleteTag('tag1');
            })
            .then(function () {
                return project.getTags();
            })
            .then(function (tags) {
                expect(tags).to.deep.equal({});
            })
            .nodeify(done);
    });

    it('should getTags if no created', function (done) {
        var project;
        databaseAdapter.createProject('project6')
            .then(function (project_) {
                project = project_;
                return project.getTags();
            })
            .then(function (tags) {
                expect(tags).to.deep.equal({});
            })
            .nodeify(done);
    });
}

module.exports = {
    genOpenCloseDatabase: genOpenCloseDatabase,
    genCreateOpenDeleteRenameProject: genCreateOpenDeleteRenameProject,
    genDatabaseClosedErrors: genDatabaseClosedErrors,
    genInsertLoadAndCommits: genInsertLoadAndCommits,
    genBranchOperations: genBranchOperations,
    genTagOperations: genTagOperations
}