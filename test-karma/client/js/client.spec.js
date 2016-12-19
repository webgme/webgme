/*globals requirejs, expect, console, before*/
/* jshint browser: true, mocha: true, expr: true */
/**
 * @author lattmann / https://github.com/lattmann
 * @author kesco / https://github.com/kesco
 * @author pmeijer / https://github.com/pmeijer
 */

var WebGMEGlobal = {}; // jshint ignore:line

describe('GME client', function () {
    'use strict';

    var superagent = null,
        projectName2Id = function (projectName, gmeConfig, client) {
            return gmeConfig.authentication.guestAccount + client.CONSTANTS.STORAGE.PROJECT_ID_SEP +
                projectName;
        };
    before(function (done) {
        this.timeout(10000);
        requirejs(['superagent'], function (superagent_) {

            superagent = superagent_;

            superagent.get('/base/gmeConfig.json')
                .end(function (err, res) {
                    expect(err).to.equal(null);

                    expect(res.status).to.equal(200);
                    //console.log(res.body);

                    done();
                });
        });
    });

    describe('API', function () {
        var Client,
            gmeConfig;

        before(function (done) {
            this.timeout(10000);
            requirejs(['js/client', 'text!gmeConfig.json'], function (Client_, gmeConfigJSON) {
                Client = Client_;
                gmeConfig = JSON.parse(gmeConfigJSON);
                done();
            });
        });

        it('should have public functions', function () {
            var client = new Client(gmeConfig);

            expect(client.hasOwnProperty('gmeConfig')).to.equal(true, 'gmeConfig');

            //event related API
            expect(typeof client.addEventListener).to.equal('function');
            expect(typeof client.removeEventListener).to.equal('function');
            expect(typeof client.removeAllEventListeners).to.equal('function');
            expect(typeof client.dispatchEvent).to.equal('function');

            //project, branch and connection actions API
            expect(client).to.include.keys(
                'CONSTANTS',
                'getUserId',

                'connectToDatabase',
                'disconnectFromDatabase',

                'selectProject',
                'selectBranch',
                'selectCommit',

                'forkCurrentBranch',
                //'commitAsync',
                'undo',
                'redo'
            );

            // State getters
            expect(client).to.include.keys(
                'getNetworkStatus',
                'getBranchStatus',

                'getActiveProjectId',
                'getActiveBranchName',
                'getActiveCommitHash',
                'getActiveRootHash',

                'isProjectReadOnly',
                'isCommitReadOnly',

                'getProjectObject'
            );

            // Requests getters
            expect(client).to.include.keys(
                'getProjects',
                'getBranches',
                'getTags',
                'getCommits',
                'getHistory',
                'getLatestCommitData',
                'getProjectsAndBranches'
            );

            // Requests setters
            expect(client).to.include.keys(
                'createProject',
                'deleteProject',
                'createBranch',
                'deleteBranch',
                'createTag',
                'deleteTag'
            );

            // Watchers
            expect(client).to.include.keys(
                'watchDatabase',
                'unwatchDatabase',
                'watchProject',
                'unwatchProject'
            );

            //node manipulation API
            expect(client).to.include.keys(
                'startTransaction',
                'completeTransaction',
                'setAttributes',
                'delAttributes',
                'setRegistry',
                'delRegistry',
                'copyMoreNodes',
                'moveMoreNodes',
                'delMoreNodes',
                'createChild',
                'createChildren',
                'makePointer',
                'delPointer',
                'addMember',
                'removeMember',
                'setMemberAttribute',
                'delMemberAttribute',
                'setMemberRegistry',
                'delMemberRegistry',
                'createSet',
                'deleteSet',
                'setBase',
                'delBase'
                //'setConstraint', TODO: Add these back
                //'delConstraint'
            );

            //META manipulation API
            expect(client).to.include.keys(
                'getMeta',
                'setMeta',
                'getChildrenMeta',
                'setChildrenMeta',
                'getChildrenMetaAttribute',
                'setChildrenMetaAttribute',
                'getValidChildrenItems',
                'updateValidChildrenItem',
                'removeValidChildrenItem',
                'getAttributeSchema',
                'setAttributeSchema',
                'removeAttributeSchema',
                'getPointerMeta',
                'setPointerMeta',
                'getValidTargetItems',
                'updateValidTargetItem',
                'removeValidTargetItem',
                'deleteMetaPointer',
                'getOwnValidChildrenTypes',
                'getOwnValidTargetTypes',
                'isValidChild',
                'isValidTarget',
                //'isValidAttribute',
                'getValidChildrenTypes',
                'getValidTargetTypes',
                'hasOwnMetaRules',
                'filterValidTarget',
                'isTypeOf',
                'getValidAttributeNames',
                'getOwnValidAttributeNames',
                'getMetaAspectNames',
                'getOwnMetaAspectNames',
                'getMetaAspect',
                'setMetaAspect',
                'deleteMetaAspect',
                'getAspectTerritoryPattern'
            );

            //territory related API
            expect(client).to.include.keys(
                'addUI',
                'removeUI',
                'updateTerritory',
                'getNode'
            );

            //simple request commands
            expect(client.hasOwnProperty('runServerPlugin')).to.equal(true, 'runServerPlugin');
            expect(client.hasOwnProperty('importProjectFromFile')).to.equal(true, 'importProjectFromFile');
            expect(client.hasOwnProperty('seedProject')).to.equal(true, 'seedProject');
            expect(client.hasOwnProperty('updateLibrary')).to.equal(true, 'updateLibrary');
            expect(client.hasOwnProperty('addLibrary')).to.equal(true, 'addLibrary');
            expect(client.hasOwnProperty('autoMerge')).to.equal(true, 'autoMerge');
            expect(client.hasOwnProperty('resolve')).to.equal(true, 'resolve');
            expect(client.hasOwnProperty('checkMetaRules')).to.equal(true, 'checkMetaRules');
            expect(client.hasOwnProperty('checkCustomConstraints')).to.equal(true, 'checkCustomConstraints');

        });

        //it('should not contain merge related functions', function () {
        //    var client = new Client(gmeConfig);
        //    expect(client).not.to.include.keys('getBaseOfCommits',
        //        'getDiffTree',
        //        'getConflictOfDiffs',
        //        'applyDiff',
        //        'merge',
        //        'getResolve',
        //        'resolve');
        //});

    });

    describe('database connection', function () {
        var Client,
            gmeConfig,
            client,
            projectName = 'ProjectAndBranchOperationsTest',
            projectId;

        before(function (done) {
            this.timeout(10000);
            requirejs(['js/client', 'text!gmeConfig.json'], function (Client_, gmeConfigJSON) {
                Client = Client_;
                gmeConfig = JSON.parse(gmeConfigJSON);
                done();
            });
        });

        after(function (done) {
            if (client) {
                client = null;
                client.disconnectFromDatabase(done);
            } else {
                client = null;
                done();
            }
        });

        it('should connect to the database', function (done) {
            var client = new Client(gmeConfig);
            client.connectToDatabase(function (err) {
                expect(err).to.equal(null);
                done();
            });
        });

        it('should connect to the database even if we already connected', function (done) {
            var client = new Client(gmeConfig);
            client.connectToDatabase(function (err) {
                expect(err).to.equal(null);

                client.connectToDatabase(function (err) {
                    expect(err).to.equal(null);
                    done();
                });
            });
        });

        it('should connect to the database but close the project if it was opened before', function (done) {
            var client = new Client(gmeConfig);
            projectId = projectName2Id(projectName, gmeConfig, client);
            client.connectToDatabase(function (err) {
                expect(err).to.equal(null);
                client.selectProject(projectId, null, function (err) {
                    expect(err).to.equal(null);

                    expect(client.getActiveProjectId()).to.equal(projectId);
                    client.disconnectFromDatabase(function (err) {
                        expect(err).to.equal(null);

                        client.connectToDatabase(function (err) {
                            expect(err).to.equal(null);
                            expect(client.getActiveProjectId()).to.equal(null);
                            done();
                        });
                    });
                });
            });
        });
    });

    describe('no database connection', function () {
        var Client,
            gmeConfig,
            client;

        before(function (done) {
            this.timeout(10000);
            requirejs(['js/client', 'text!gmeConfig.json'], function (Client_, gmeConfigJSON) {
                Client = Client_;
                gmeConfig = JSON.parse(gmeConfigJSON);

                client = new Client(gmeConfig);

                done();
            });
        });

        it('should fail to get getProjects', function (done) {
            client.getProjects({}, function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('no open database');

                done();
            });
        });

        it('should fail to get getProjectsAndBranches', function (done) {
            client.getProjectsAndBranches(false, function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('no open database');

                done();
            });
        });

        it('should fail to select project', function (done) {
            client.selectProject('any project', null, function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('no open database');

                done();
            });
        });

        it('should fail to create project', function (done) {
            client.createProject('any project', {}, function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('no open database');

                done();
            });
        });

        it('should fail to delete project', function (done) {
            client.deleteProject('any project', function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('no open database');

                done();
            });
        });

        it('should fail to get branch names', function (done) {
            client.getBranches('any project', function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('no open database');

                done();
            });
        });

        it('should fail to select branch', function (done) {
            client.selectBranch('any branch', null, function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('no open database');

                done();
            });
        });

        it('should fail to select commit', function (done) {
            client.selectCommit('any commit', function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('no open database');

                done();
            });
        });

        it('should fail to get commits', function (done) {
            client.getCommits('anyProject', 'any commit', 'any number', function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('no open database');

                done();
            });
        });

        it('should fail to create branch', function (done) {
            client.createBranch('anyProject', 'any branch', 'any commitHash', function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('no open database');

                done();
            });
        });

        it('should fail to delete branch', function (done) {
            client.deleteBranch('anyProject', 'any branch', 'any commitHash', function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('no open database');

                done();
            });
        });

        //it('should fail to make a commit', function (done) {
        //    var commitOptions = {message: 'any message'};
        //
        //    client.commitAsync(commitOptions, function (err) {
        //        expect(err).not.to.equal(null);
        //        expect(err.message).to.contain('no open database');
        //
        //        done();
        //    });
        //});

        //FIXME - there are other Async functions which misses the database check, so they can cause crash in the client
        // so either we refactor and make the API dynamic,
        // or we add the check to all available functions (which will be a long and boring task)
        //getExportItemsUrlAsync
        //getExternalInterpreterConfigUrlAsync
        //dumpNodeAsync
        //importNodeAsync
        //mergeNodeAsync
        //createProjectFromFileAsync
        //getDumpURL
        //getExportLibraryUrlAsync
        //updateLibraryAsync
        //addLibraryAsync
        //getFullProjectsInfoAsync
        //createGenericBranchAsync
        //deleteGenericBranchAsync
        //setProjectInfoAsync
        //getProjectInfoAsync
        //getAllInfoTagsAsync
    });

    describe('project and branch operations', function () {
        var Client,
            gmeConfig,
            client,
            projectName = 'ProjectAndBranchOperationsTest',
            projectId;

        before(function (done) {
            this.timeout(10000);
            requirejs(['js/client', 'text!gmeConfig.json'], function (Client_, gmeConfigJSON) {
                Client = Client_;
                gmeConfig = JSON.parse(gmeConfigJSON);
                client = new Client(gmeConfig);
                projectId = projectName2Id(projectName, gmeConfig, client);
                client.connectToDatabase(done);
            });
        });

        after(function (done) {
            client.disconnectFromDatabase(done);
        });

        it('should return null as textual id if there is no opened project', function () {
            expect(client.getActiveProjectId()).to.equal(null);
        });

        it('should return the valid textual id of the opened project', function (done) {
            client.selectProject(projectId, null, function (err) {
                expect(err).to.equal(null);

                expect(client.getActiveProjectId()).to.equal(projectId);
                done();
            });
        });

        it('getProjects should return array of objects with project name and rights', function (done) {
            client.getProjects({rights: true}, function (err, allProjects) {
                expect(err).to.equal(null);
                expect(allProjects instanceof Array).to.equal(true);
                expect(allProjects[0]).to.include.keys('name', 'rights', '_id');
                done();
            });
        });

        it('getProjectsAndBranches-true should return an object with branches and rights', function (done) {
            client.getProjectsAndBranches(true, function (err, projects) {
                var key;
                expect(err).to.equal(null);
                expect(typeof projects).to.equal('object');
                expect(projects instanceof Array).to.equal(false);
                for (key in projects) {
                    expect(projects[key]).to.include.keys('branches', 'rights');
                    expect(projects[key].rights).to.include.keys('read', 'write', 'delete');
                    expect(typeof projects[key].branches).to.equal('object');
                }
                done();
            });
        });

        it('getProjectsAndBranches-false should return an array of objects with branches and rights', function (done) {
            client.getProjectsAndBranches(false, function (err, projects) {
                var i;
                expect(err).to.equal(null);
                expect(projects instanceof Array).to.equal(true);
                for (i = 0; i < projects.length; i += 1) {
                    expect(projects[i]).to.include.keys('branches', 'rights', 'name');
                    expect(typeof projects[i].branches).to.equal('object');
                }
                done();
            });
        });

        it('should selects a given project', function (done) {
            client.selectProject(projectId, null, function (err) {
                expect(err).to.equal(null);

                expect(client.getActiveProjectId()).to.equal(projectId);
                done();
            });

        });

        it('should fail to select an unknown project', function (done) {
            client.selectProject('unknown_project', null, function (err) {
                expect(err.message).to.contain('Not authorized to read project');
                done();
            });
        });

        it('should fail to delete a nonexistent project', function (done) {
            client.deleteProject('unknown_project', function (err) {
                expect(err.message).to.contain('Not authorized to delete project');
                done();
            });
        });

        it('should delete a project', function (done) {
            var testProjectName = 'deleteProjectKarma',
                projectId;

            client.createProject(testProjectName, function (err, projectId_) {
                expect(err).to.equal(null);
                projectId = projectId_;

                client.getProjectsAndBranches(true, function (err, projects) {
                    expect(err).to.equal(null);

                    expect(projects).to.include.keys(projectId_);

                    client.deleteProject(projectId, function (err) {
                        expect(err).to.equal(null);

                        client.getProjectsAndBranches(true, function (err, projects) {
                            expect(err).to.equal(null);

                            expect(projects).not.to.include.keys(projectId_);
                            done();
                        });
                    });
                });
            });
        });

        it('should fail to create an already existing project', function (done) {
            var projectName = 'alreadyExists';
            client.createProject(projectName, function (err) {
                expect(err.message).to.contain('Project already exist');
                done();
            });
        });

        it('should list the available branches of the opened project', function (done) {
            var actualBranch,
                actualCommit;
            client.selectProject(projectId, null, function (err) {
                expect(err).to.equal(null);

                actualBranch = client.getActiveBranchName();
                actualCommit = client.getActiveCommitHash();

                client.getBranches(projectId, function (err, branches) {
                    expect(err).to.equal(null);

                    expect(Object.keys(branches)).to.have.length.of.at.least(1);
                    expect(branches[Object.keys(branches)[0]]).to.contain('#'); //TODO: Proper hash check.
                    done();
                });
            });
        });

        it('should select the given branch of the opened project', function (done) {
            client.selectProject(projectId, null, function (err) {
                expect(err).to.equal(null);

                client.selectBranch('master', null, function (err) {
                    expect(err).to.equal(null);
                    expect(client.getActiveBranchName()).to.equal('master');
                    done();
                });
            });
        });

        it('should select the given branch of the opened project when specified in selectProject', function (done) {
            client.selectProject('reset', null, function (err) {
                expect(client.getActiveProjectId()).to.equal(null);
                expect(err.message).to.include('Not authorized to read project');
                //TODO: FIXOTHERS: Reset all tests like this.

                client.selectProject(projectId, 'master', function (err) {
                    expect(err).to.equal(null);
                    expect(client.getActiveBranchName()).to.equal('master');
                    done();
                });
            });
        });

        it('should return error when selecting a nonexistent branch of the opened project', function (done) {
            client.selectProject(projectId, null, function (err) {
                expect(err).to.equal(null);

                client.selectBranch('does_not_exist', null, function (err) {
                    expect(err.message).to.contain('Branch "does_not_exist" does not ' +
                        'exist in project "');
                    done();
                });
            });
        });

        it('should return error when selecting a nonexistent branch in selectProject', function (done) {
            var projectName = 'branchWatcher',
                projectId = projectName2Id(projectName, gmeConfig, client);
            //FIXME: All these tests should select different projects or even have different client instances.
            client.selectProject(projectId, 'branch_does_not_exist', function (err) {
                expect(err.message).to.contain('Given branch does not exist "branch_does_not_exist"');
                expect(client.getActiveProjectId()).to.equal(null);
                done();
            });
        });

        it('should select a given commit', function (done) {
            client.selectProject(projectId, null, function (err) {
                expect(err).to.equal(null);

                client.selectBranch('master', null, function (err) {
                    var commitHash = client.getActiveCommitHash();
                    expect(err).to.equal(null);
                    expect(commitHash).to.contain('#');
                    expect(client.getActiveCommitHash()).to.have.length(41);
                    client.selectCommit(commitHash, function (err) {
                        expect(err).to.equal(null);

                        done();
                    });
                });
            });
        });

        it('should fail to select an unknown commit', function (done) {
            client.selectProject(projectId, null, function (err) {
                expect(err).to.equal(null);

                client.selectCommit('#unknown', function (err) {
                    expect(err.message).to.include('object does not exist #unknown');

                    done();
                });
            });
        });

        it('should return the latest n commits using time-stamp', function (done) {
            client.selectProject(projectId, null, function (err) {
                expect(err).to.equal(null);

                client.getCommits(projectId, (new Date()).getTime(), 10, function (err, commits) {
                    expect(err).to.equal(null);
                    expect(commits).not.to.equal(null);
                    expect(commits).not.to.equal(undefined);

                    expect(commits).to.have.length.least(1);
                    expect(commits[0]).to.contain.keys('_id', 'root', 'updater', 'time', 'message', 'type');
                    expect(commits[0]._id).to.equal(client.getActiveCommitHash());
                    done();
                });
            });
        });

        it('should return the latest n commits using commitHash and include it too.', function (done) {
            client.selectProject(projectId, null, function (err) {
                var commitHash = client.getActiveCommitHash();

                expect(err).to.equal(null);

                client.getCommits(projectId, commitHash, 10, function (err, commits) {
                    expect(err).to.equal(null);
                    expect(commits).not.to.equal(null);
                    expect(commits).not.to.equal(undefined);

                    expect(commits).to.have.length.least(1);
                    expect(commits[0]).to.contain.keys('_id', 'root', 'updater', 'time', 'message', 'type');
                    expect(commits[0]._id).to.equal(client.getActiveCommitHash());
                    done();
                });
            });
        });

        it('should return the actual commit hash', function (done) {
            client.selectProject(projectId, null, function (err) {
                expect(err).to.equal(null);

                client.selectBranch('master', null, function (err) {
                    expect(err).to.equal(null);

                    expect(client.getActiveCommitHash()).to.contain('#');
                    expect(client.getActiveCommitHash()).to.have.length(41);
                    done();
                });
            });
        });

        it('should return the name of the actual branch', function (done) {
            client.selectProject(projectId, null, function (err) {
                expect(err).to.equal(null);

                client.selectBranch('master', null, function (err) {
                    expect(err).to.equal(null);

                    expect(client.getActiveBranchName()).to.equal('master');
                    done();
                });
            });
        });

        it('should return the current network state', function (done) {
            setTimeout(function () {
                expect(client.getNetworkStatus()).to.equal(client.CONSTANTS.STORAGE.CONNECTED);
                done();
            }, 100);
        });

        it('should return the current branch state', function (done) {
            client.selectProject(projectId, null, function (err) {
                expect(err).to.equal(null);
                expect(client.getBranchStatus()).to.equal(client.CONSTANTS.BRANCH_STATUS.SYNC);

                done();
            });
        });

        it('should create a new branch from the given commit', function (done) {
            var actualBranch,
                actualCommit,
                newBranch = 'newBranch';
            client.selectProject(projectId, null, function (err) {
                expect(err).to.equal(null);

                actualBranch = client.getActiveBranchName();
                actualCommit = client.getActiveCommitHash();
                expect(actualBranch).to.equal('master');

                client.createBranch(projectId, newBranch, actualCommit, function (err) {
                    expect(err).to.equal(null);

                    expect(client.getActiveBranchName()).to.equal(actualBranch);

                    client.getBranches(projectId, function (err, branches) {
                        expect(err).to.equal(null);

                        expect(branches).to.include.keys(newBranch, 'master');

                        client.deleteBranch(projectId, newBranch, actualCommit, function (err) {
                            expect(err).to.equal(null);

                            done();
                        });
                    });
                });
            });
        });

        it('should delete the given branch', function (done) {
            var actualBranch,
                actualCommit,
                newBranch = 'deleteBranch';
            client.selectProject(projectId, null, function (err) {
                expect(err).to.equal(null);

                actualBranch = client.getActiveBranchName();
                actualCommit = client.getActiveCommitHash();
                expect(actualBranch).to.equal('master');

                client.createBranch(projectId, newBranch, actualCommit, function (err) {
                    expect(err).to.equal(null);

                    expect(client.getActiveBranchName()).to.equal(actualBranch);

                    client.getBranches(projectId, function (err, branches) {
                        expect(err).to.equal(null);

                        expect(branches).to.include.keys(newBranch, 'master');

                        client.deleteBranch(projectId, newBranch, actualCommit, function (err) {
                            expect(err).to.equal(null);
                            client.getBranches(projectId, function (err, branches) {
                                expect(err).to.equal(null);

                                expect(branches).not.to.include.keys(newBranch, actualBranch);
                                done();
                            });
                        });
                    });
                });
            });
        });

        it('should fail to remove an unknown branch', function (done) {
            client.deleteBranch('someProject', 'unknown_branch', 'unknown_hash', function (err) {
                //console.warn(err);
                expect(err).not.to.equal(null);

                done();
            });
        });

        it.skip('should create a new -no change- commit with the given message', function (done) {
            var oldCommit;
            client.selectProject(projectId, null, function (err) {
                expect(err).to.equal(null);
                oldCommit = client.getActiveCommitHash();

                client.commitAsync({message: 'just a commit'}, function (err) {
                    expect(err).to.equal(null);

                    expect(client.getActiveCommitHash()).not.to.equal(oldCommit);

                    done();
                });
            });
        });

        it('should give back the project object (which can be used to create core objects)', function (done) {
            client.selectProject(projectId, null, function (/*err*/) {
                var projectObject = client.getProjectObject();

                expect(projectObject).not.to.equal(null);
                expect(projectObject).to.include.keys('makeCommit');

                done();
            });
        });

        it('should return a list of projects extended with the \'in collection\' meta data', function (done) {
            var projectName = 'ProjectAndBranchOperationsTest',
                projectId = projectName2Id(projectName, gmeConfig, client);

            client.getProjectsAndBranches(true, function (err, projectsAndInfo) {
                expect(err).to.equal(null);

                expect(projectsAndInfo).not.to.equal(null);
                expect(projectsAndInfo).to.include.keys(projectId);
                expect(projectsAndInfo[projectId]).to.include.keys('name', 'branches', 'rights');
                expect(projectsAndInfo[projectId].name).to.equal(projectName);
                done();
            });

        });

        it('should create a new branch for the given project (not necessarily the opened)', function (done) {
            var actualProject,
                genericProjectName = 'createGenericBranch',
                genericProjectId = projectName2Id(genericProjectName, gmeConfig, client);
            client.selectProject(projectId, null, function (err) {
                expect(err).to.equal(null);

                actualProject = client.getActiveProjectId();
                expect(actualProject).to.equal(projectId);

                client.getBranches(genericProjectId, function (err, branches) {
                    expect(err).to.equal(null);
                    expect(branches.master).to.include('#');

                    client.createBranch(genericProjectId, 'genericBranch', branches.master, function (err) {
                        expect(err).to.equal(null);

                        client.getProjectsAndBranches(true, function (err, info) {
                            expect(err).to.equal(null);

                            expect(client.getActiveProjectId()).to.equal(actualProject);
                            expect(info).not.to.equal(null);
                            expect(info).to.include.keys(genericProjectId);
                            expect(info[genericProjectId]).to.include.keys('branches');
                            expect(info[genericProjectId].branches).to.include.keys('genericBranch', 'master');

                            expect(err).to.equal(null);
                            done();
                        });
                    });
                });
            });
        });

        it('should delete a branch form the given project (not necessarily the opened one)', function (done) {
            // deleteGenericBranchAsync
            var actualProject,
                genericProjectName = 'removeGenericBranch',
                genericProjectId = projectName2Id(genericProjectName, gmeConfig, client);

            client.selectProject(projectId, null, function (err) {
                expect(err).to.equal(null);

                actualProject = client.getActiveProjectId();

                client.getBranches(genericProjectId, function (err, branches) {
                    expect(err).to.equal(null);
                    expect(branches.master).to.include('#');

                    client.createBranch(genericProjectId, 'genericBranch', branches.master, function (err) {
                        expect(err).to.equal(null);

                        client.getProjectsAndBranches(true, function (err, info) {
                            expect(err).to.equal(null);

                            expect(client.getActiveProjectId()).to.equal(actualProject);
                            expect(info).not.to.equal(null);
                            expect(info).to.include.keys(genericProjectId);
                            expect(info[genericProjectId]).to.include.keys('branches');
                            expect(info[genericProjectId].branches).to.include.keys('genericBranch');

                            client.deleteBranch(genericProjectId,
                                'genericBranch',
                                branches.master,
                                function (err) {
                                    expect(err).to.equal(null);
                                    client.getProjectsAndBranches(true, function (err, info) {
                                        expect(err).to.equal(null);

                                        expect(client.getActiveProjectId()).to.equal(actualProject);
                                        expect(info).not.to.equal(null);
                                        expect(info).to.include.keys(genericProjectId);
                                        expect(info[genericProjectId]).to.include.keys('branches');
                                        expect(info[genericProjectId].branches)
                                            .not.to.include.keys('genericBranch');

                                        done();
                                    });
                                }
                            );
                        });
                    });
                });
            });
        });

        it('should create a new tag and delete it', function (done) {
            var genericProjectName = 'createGenericBranch',
                genericProjectId = projectName2Id(genericProjectName, gmeConfig, client);

            client.getBranches(projectId, function (err, branches) {
                expect(err).to.equal(null);

                client.createTag(genericProjectId, 'newTag', branches.master, function (err) {
                    expect(err).to.equal(null);

                    client.getTags(genericProjectId, function (err, tags) {
                        expect(err).to.equal(null);
                        expect(tags).to.deep.equal({newTag: branches.master});

                        client.deleteTag(genericProjectId, 'newTag', function (err, info) {
                            expect(err).to.equal(null);

                            client.getTags(genericProjectId, function (err, tags) {
                                expect(err).to.equal(null);
                                expect(tags).to.deep.equal({});
                                done();
                            });
                        });
                    });
                });
            });
        });

        it('should fork the active branch without giving commitHash', function (done) {
            var activeBranchName,
                forkName = 'forked',
                commitHash;

            client.selectProject(projectId, null, function (err) {
                expect(err).to.equal(null);
                activeBranchName = client.getActiveBranchName();
                commitHash = client.getActiveCommitHash();
                client.deleteBranch(projectId, forkName, commitHash, function (err) {
                    expect(err).to.equal(null);
                    client.forkCurrentBranch(forkName, null, function (err, name, hash) {
                        expect(err).to.equal(null);
                        expect(name).to.equal(forkName);
                        expect(hash).to.equal(commitHash);

                        client.getBranches(projectId, function (err, branches) {
                            expect(err).to.equal(null);
                            expect(branches).to.include.keys('forked');
                            expect(branches.forked).to.equal(commitHash);
                            done();
                        });
                    });
                });
            });
        });

        it('should fork the active branch without giving commitHash and forkName', function (done) {
            var activeBranchName,
                commitHash;

            client.selectProject(projectId, null, function (err) {
                expect(err).to.equal(null);
                activeBranchName = client.getActiveBranchName();
                commitHash = client.getActiveCommitHash();

                client.forkCurrentBranch(null, null, function (err, name, hash) {
                    expect(err).to.equal(null);
                    expect(hash).to.equal(commitHash);

                    client.getBranches(projectId, function (err, branches) {
                        expect(err).to.equal(null);
                        expect(branches).to.include.keys(name);
                        expect(branches[name]).to.equal(commitHash);
                        done();
                    });
                });
            });
        });

        it('should fork the active branch to given commitHash', function (done) {
            var activeBranchName,
                forkName = 'myForkWithGivenHash',
                commitHash;

            client.selectProject(projectId, null, function (err) {
                expect(err).to.equal(null);
                activeBranchName = client.getActiveBranchName();
                commitHash = client.getActiveCommitHash();
                expect(err).to.equal(null);

                client.deleteBranch(projectId, forkName, commitHash, function (err) {
                    expect(err).to.equal(null);

                    client.forkCurrentBranch(forkName, commitHash, function (err, name, hash) {
                        expect(err).to.equal(null);
                        expect(hash).to.equal(commitHash);
                        expect(name).to.equal(forkName);

                        client.getBranches(projectId, function (err, branches) {
                            expect(err).to.equal(null);
                            expect(branches).to.include.keys(name);
                            expect(branches[name]).to.equal(commitHash);
                            done();
                        });
                    });
                });
            });
        });

        it('should fail before forking with bogus commitHash', function (done) {
            var activeBranchName,
                forkName = 'willNotBeForked',
                commitHash = '#abc123';

            client.selectProject(projectId, null, function (err) {
                expect(err).to.equal(null);
                activeBranchName = client.getActiveBranchName();

                client.forkCurrentBranch(forkName, commitHash, function (err /*, name, hash*/) {
                    expect(err.message).to.include('Could not find specified commitHash');

                    client.getBranches(projectId, function (err, branches) {
                        expect(err).to.equal(null);

                        expect(branches).not.to.include.keys(forkName);
                        done();
                    });
                });
            });
        });
    });

    describe('branch status updates', function () {

    });

    describe('branch watchers', function () {
        var Client,
            gmeConfig,
            projectName = 'branchWatcher',
            projectId,
            masterHash,
            client;

        before(function (done) {
            this.timeout(10000);
            requirejs([
                    'js/client',
                    'text!gmeConfig.json'],
                function (Client_, gmeConfigJSON) {
                    Client = Client_;
                    gmeConfig = JSON.parse(gmeConfigJSON);
                    client = new Client(gmeConfig);
                    projectId = projectName2Id(projectName, gmeConfig, client);
                    client.connectToDatabase(function (err) {
                        expect(err).to.equal(null);

                        client.selectProject(projectId, null, function (err) {
                            expect(err).to.equal(null);
                            masterHash = client.getActiveCommitHash();
                            expect(masterHash).to.include('#');
                            done();
                        });
                    });
                }
            );
        });

        after(function (done) {
            client.disconnectFromDatabase(done);
        });

        it('should raise BRANCH_CREATED when a new branch is created', function (done) {
            var branchName = 'b1',
                triggered = false,
                handler = function (storage, eventData) {
                    expect(triggered).to.equal(false);
                    expect(eventData).to.not.equal(null);
                    expect(eventData).to.include.keys('etype', 'projectId', 'branchName', 'newHash', 'oldHash');
                    expect(eventData.etype).to.equal(client.CONSTANTS.STORAGE.BRANCH_CREATED);
                    expect(eventData.projectId).to.equal(projectId);
                    expect(eventData.branchName).to.equal(branchName);
                    expect(eventData.newHash).to.equal(masterHash);
                    expect(eventData.oldHash).to.equal('');

                    triggered = true;
                    unwatch();
                },
                unwatch = function () {
                    client.unwatchProject(projectId, handler, function (err) {
                        expect(err).to.equal(null);

                        client.deleteBranch(projectId, branchName, masterHash, function (err) {
                            expect(err).to.equal(null);
                            done(err);
                        });
                    });
                };

            client.watchProject(projectId, handler, function (err) {
                expect(err).to.equal(null);
                client.createBranch(projectId, branchName, masterHash, function (err) {
                    expect(err).to.equal(null);
                    console.error('created branch', projectId, branchName);
                });
            });
        });

        it('should raise BRANCH_DELETED when a branch is deleted', function (done) {
            var branchName = 'b2',
                triggered = 0,
                handler = function (storage, eventData) {
                    expect(triggered).to.be.below(2);
                    expect(eventData).to.not.equal(null);
                    expect(eventData).to.include.keys('etype', 'projectId', 'branchName', 'newHash', 'oldHash');
                    if (triggered === 0) {
                        expect(eventData.etype).to.equal(client.CONSTANTS.STORAGE.BRANCH_CREATED);
                        expect(eventData.projectId).to.equal(projectId);
                        expect(eventData.branchName).to.equal(branchName);
                        expect(eventData.newHash).to.equal(masterHash);
                        expect(eventData.oldHash).to.equal('');
                    } else if (triggered === 1) {
                        expect(eventData.etype).to.equal(client.CONSTANTS.STORAGE.BRANCH_DELETED);
                        expect(eventData.projectId).to.equal(projectId);
                        expect(eventData.branchName).to.equal(branchName);
                        expect(eventData.newHash).to.equal('');
                        expect(eventData.oldHash).to.equal(masterHash);
                        unwatch();
                    }

                    triggered += 1;
                },
                unwatch = function () {
                    client.unwatchProject(projectId, handler, function (err) {
                        done(err);
                    });
                };

            client.watchProject(projectId, handler, function (err) {
                expect(err).to.equal(null);
                client.createBranch(projectId, branchName, masterHash, function (err) {
                    expect(err).to.equal(null);
                    client.deleteBranch(projectId, branchName, masterHash, function (err) {
                        expect(err).to.equal(null);
                    });
                });
            });
        });

        it('should raise BRANCH_HASH_UPDATED when the branch is updated', function (done) {
            var branchName = 'b3',
                triggered = false,
                newHash,
                handler = function (storage, eventData) {
                    expect(triggered).to.equal(false);
                    expect(eventData).to.not.equal(null);
                    expect(eventData).to.include.keys('etype', 'projectId', 'branchName', 'newHash', 'oldHash');
                    expect(eventData.etype).to.equal(client.CONSTANTS.STORAGE.BRANCH_HASH_UPDATED);
                    expect(eventData.projectId).to.equal(projectId);
                    expect(eventData.branchName).to.equal(branchName);
                    expect(eventData.oldHash).to.equal(masterHash);
                    expect(eventData.newHash).to.not.equal(masterHash);
                    newHash = eventData.newHash;

                    triggered = true;
                    unwatch();
                },
                unwatch = function () {
                    client.unwatchProject(projectId, handler, function (err) {
                        expect(err).to.equal(null);

                        client.deleteBranch(projectId, branchName, newHash, function (err) {
                            expect(err).to.equal(null);
                            done(err);
                        });
                    });
                };

            client.createBranch(projectId, branchName, masterHash, function (err) {
                expect(err).to.equal(null);

                client.selectBranch(branchName, null, function (err) {
                    expect(err).to.equal(null);

                    client.watchProject(projectId, handler, function (err) {
                        expect(err).to.equal(null);
                        var loaded = false,
                            userGuid;

                        function nodeEventHandler(events) {
                            if (loaded) {
                                done(new Error('More than one node event'));
                            } else {
                                loaded = true;
                                expect(events.length).to.equal(2);
                                client.removeUI(userGuid);

                                client.setAttributes('', 'name', 'newRootName',
                                    'should raise BRANCH_HASH_UPDATED when the branch is updated.');
                            }
                        }

                        userGuid = client.addUI({}, nodeEventHandler);
                        client.updateTerritory(userGuid, {'': {children: 0}});
                    });
                });
            });
        });
    });

    describe('client/node tests', function () {
        var Client,
            gmeConfig,
            client,
            projectName = 'ClientNodeInquiryTests',
            projectId,
            clientNodePath = '/323573539',
            clientNode,
            factoryConsoleLog = console.log;

        before(function (done) {
            this.timeout(10000);
            requirejs(['js/client', 'text!gmeConfig.json'], function (Client_, gmeConfigJSON) {
                Client = Client_;
                gmeConfig = JSON.parse(gmeConfigJSON);
                client = new Client(gmeConfig);
                projectId = projectName2Id(projectName, gmeConfig, client);
                client.connectToDatabase(function (err) {
                    expect(err).to.equal(null);
                    client.selectProject(projectId, null, function (err) {
                        var user = {},
                            userPattern = {},
                            userGuid,
                            alreadyHandled = false;

                        userPattern[clientNodePath] = {children: 0};

                        function eventHandler(events) {

                            if (alreadyHandled === false) {
                                //expect(events).to.have.length(12);
                                expect(events[0]).to.contain.keys('eid', 'etype');
                                expect(events[0].etype).to.equal('complete');

                                alreadyHandled = true;
                                clientNode = client.getNode(clientNodePath);
                                expect(clientNode).not.to.equal(null);
                                client.startTransaction(); //to ensure that nothing will be saved
                                done();
                            }
                        }

                        expect(err).to.equal(null);

                        userGuid = client.addUI(user, eventHandler);
                        client.updateTerritory(userGuid, userPattern);
                    });
                });
            });
        });

        afterEach(function () {
            console.log = factoryConsoleLog;
        });

        after(function () {
            client.completeTransaction();
        });

        it('should return the path as identification of the node', function () {
            expect(clientNode.getId()).to.equal(clientNodePath);
        });

        it('should return the path of the container node', function () {
            expect(clientNode.getParentId()).to.equal('');
        });

        it('should return GUID of the node', function () {
            expect(clientNode.getGuid()).to.equal('b4c59092-3c77-ace8-cc52-66cd724c00f0');
        });

        it('should return the paths of the children nodes as an array', function () {
            var childrenIds = clientNode.getChildrenIds();

            expect(childrenIds).to.have.length(3);
            expect(childrenIds).to.contain('/323573539/1235767287', '/323573539/564787551', '/323573539/416651281');
        });

        it('should return the path of the base node', function () {
            expect(clientNode.getBaseId()).to.equal('/701504349');
        });

        it('should return the paths of the instances of the node', function () {
            expect(clientNode.getInheritorIds()).to.deep.equal(['/5185791']);
        });

        it('should return the list of available attribute names of the node', function () {
            var names = clientNode.getAttributeNames();
            expect(names).to.have.length(2);
            expect(names).to.include('name');
            expect(names).to.include('value');
        });

        it('should return the list of attribute names that has value defined on this level of inheritance',
            function () {
                var names = clientNode.getOwnAttributeNames();
                expect(names).to.have.length(1);
                expect(names).to.contain('name');
            }
        );

        it('should return the list of META-defined attribute names', function () {
            expect(clientNode.getValidAttributeNames()).to.have.members(['name', 'value']);
        });

        it('should return the value of the attribute under the defined name', function () {
            expect(clientNode.getAttribute('name')).to.equal('check');
            expect(clientNode.getAttribute('value')).to.equal(10);
        });

        it('should create and return the value of complex attribute without saving, then remove it', function () {
            var attribute = {
                text: 'something',
                number: 1
            };

            client.setAttributes(clientNodePath, 'newAttr', attribute);
            expect(clientNode.getAttributeNames()).to.include.members(['newAttr']);
            expect(clientNode.getAttribute('newAttr')).to.eql(attribute);
            expect(clientNode.getEditableAttribute('newAttr')).to.eql(attribute);
            expect(clientNode.getOwnEditableAttribute('newAttr')).to.eql(attribute);
            client.delAttributes(clientNodePath, 'newAttr');
        });

        it('in case of unknown attribute the result should be undefined', function () {
            expect(clientNode.getAttribute('unknown_attribute')).to.equal(undefined);
        });

        //TODO right now the object freezing is disabled
        // so we cannot test that the ordinary getAttribute not allows the modification if the attribute is complex
        it('should return an editable copy of the attribute', function () {
            expect(clientNode.getEditableAttribute('name')).to.equal('check');
            expect(clientNode.getEditableAttribute('value')).to.equal(10);
        });

        it('should return the attribute value defined on this level of inheritance', function () {
            expect(clientNode.getOwnAttribute('name')).to.equal('check');
            expect(clientNode.getOwnAttribute('value')).to.equal(undefined);
        });

        it('should return the copy of attribute value defined on this level of inheritance', function () {
            expect(clientNode.getOwnEditableAttribute('name')).to.equal('check');
            expect(clientNode.getOwnEditableAttribute('value')).to.equal(undefined);
        });

        it('should return the list of available registry names of the node', function () {
            var names = clientNode.getRegistryNames();
            expect(names).to.have.length(7);
            expect(names).to.include('position');
        });

        it('should return the list of registry names that has value defined on this level oof inheritance',
            function () {
                var names = clientNode.getOwnRegistryNames();
                expect(names).to.have.length(1);
                expect(names).to.include('position');
            });

        it('should return the value of the registry under the defined name', function () {
            expect(clientNode.getRegistry('position')).to.deep.equal({x: 300, y: 466});
        });

        it('in case of unknown attribute the result should be undefined', function () {
            expect(clientNode.getRegistry('unknown_registry')).to.equal(undefined);
        });

        //TODO right now the object freezing is disabled
        // so we cannot test that the ordinary getRegistry not allows the modification if the attribute is complex
        it('should return an editable copy of the registry', function () {
            expect(clientNode.getEditableRegistry('position')).to.deep.equal({x: 300, y: 466});
        });

        it('should return the registry value defined on this level of inheritance', function () {
            expect(clientNode.getOwnRegistry('position')).to.deep.equal({x: 300, y: 466});
        });

        it('should return the copy of registry value defined on this level of inheritance', function () {
            expect(clientNode.getOwnEditableRegistry('position')).to.deep.equal({x: 300, y: 466});
        });

        it('should create and return the value of a simple registry without saving, then remove it', function () {
            var registryItem = 'something';

            client.setRegistry(clientNodePath, 'newReg', registryItem);
            expect(clientNode.getRegistryNames()).to.include.members(['newReg']);
            expect(clientNode.getRegistry('newReg')).to.eql(registryItem);
            expect(clientNode.getEditableRegistry('newReg')).to.eql(registryItem);
            expect(clientNode.getOwnEditableRegistry('newReg')).to.eql(registryItem);
            client.delRegistry(clientNodePath, 'newReg');
        });

        it('should return the names of available pointers', function () {
            expect(clientNode.getPointerNames()).to.have.members(['ptr', 'base']);
        });

        it('should return the list of META-defined pointers', function () {
            expect(clientNode.getValidPointerNames()).to.have.members(['ptr']);
        });

        it('should return the names of available pointers which has a target on this inheritance level',
            function () {
                var names = clientNode.getOwnPointerNames();
                expect(names).to.have.length(1);
                expect(names).to.include('base');
            });

        //TODO this format should be refactored as it is not used, not completely implemented, and way to awkward
        it('should return the path of the target of the pointer', function () {
            expect(clientNode.getPointer('base')).to.deep.equal({to: '/701504349', from: []});
            expect(clientNode.getPointer('ptr')).to.deep.equal({to: null, from: []});
        });

        it('should return the path of the target of the pointer defined on the given level', function () {
            expect(clientNode.getOwnPointer('ptr')).to.deep.equal({to: undefined, from: []});
        });

        it('should return the list of available sets', function () {
            expect(clientNode.getSetNames()).to.deep.equal(['set']);
        });

        it('should return the list of paths of set members', function () {
            var members = clientNode.getMemberIds('set');

            expect(members).to.have.length(2);
            expect(members).to.include('/1697300825');
            expect(members).to.include('/1400778473');
        });

        it('should return an empty array for an unknown set', function () {
            try {
                clientNode.getMemberIds('unknown_set');
            } catch (e) {
                expect(e instanceof Error).to.eql(true);
                expect(e.name).to.eql('CoreIllegalOperationError');
            }
        });

        it('should return a list of available attributes of the set containment', function () {
            expect(clientNode.getMemberAttributeNames('set', '/1400778473')).to.empty;
        });

        it('should return the value of the attribute of the set containment', function () {
            expect(clientNode.getMemberAttribute('set', '/1400778473', 'no_attribute')).to.equal(undefined);
        });

        it('should return a copy of the value of the attribute of the set containment', function () {
            expect(clientNode.getEditableMemberAttribute('set', '/1400778473', 'no_attribute')).to.equal(null);
        });

        it('should return a list of available registry entries of the set containment', function () {
            expect(clientNode.getMemberRegistryNames('set', '/1400778473')).to.deep.equal(['position']);
        });

        it('should return the value of the registry entry of the set containment', function () {
            expect(clientNode.getMemberRegistry('set', '/1400778473', 'position')).to.deep.equal({x: 172, y: 207});
        });

        it('should return a copy of the value of the registry entry of the set containment', function () {
            expect(clientNode.getEditableMemberRegistry('set', '/1400778473', 'position'))
                .to.deep.equal({x: 172, y: 207});
        });

        it('should return null as copy of the value of unknown set registry item', function () {
            expect(clientNode.getEditableMemberRegistry('set', '/1400778473', 'no_registry')).to.equal(null);
        });

        it('should return a list of paths of the possible child node types', function () {
            expect(clientNode.getValidChildrenTypes()).to.deep.equal(['/701504349']);
        });

        it('should list the names of the defined constraints', function () {
            expect(clientNode.getConstraintNames()).to.have.members(['constraint', 'meta']);
        });

        it('should list the names of the constraints defined on this level of inheritance', function () {
            expect(clientNode.getOwnConstraintNames()).to.empty;
        });

        it('should return the constraint object of the given name', function () {
            var constraint = clientNode.getConstraint('constraint');

            expect(constraint).to.have.keys('info', 'script', 'priority');
            expect(constraint.info).to.contain('just a');
        });

        it('should return the list of nodes that have this node as a target of the given pointer', function () {
            var collectionPaths = clientNode.getCollectionPaths('ptr');

            expect(collectionPaths).to.have.length(2);
            expect(collectionPaths).to.include('/1697300825');
            expect(collectionPaths).to.include('/1400778473');
        });

        it('should return a textual identification of the node', function () {
            expect(clientNode.toString()).to.contain('check');
            expect(clientNode.toString()).to.contain('/323573539');
        });

        it('should return detailed information about the valid children types', function () {
            expect(clientNode.getValidChildrenTypesDetailed()).to.deep.equal({'/701504349': true});
        });

        it('should return detailed information about the valid set types', function () {
            expect(clientNode.getValidSetMemberTypesDetailed('set')).to.deep.equal({'/701504349': true});
        });

        it('should return all meta gme nodes synchronously', function () {
            var metaNodes = client.getAllMetaNodes();
            expect(metaNodes).to.have.length(2);
            expect(!!metaNodes[0].getId).to.equal(true);
            expect(!!metaNodes[1].getId).to.equal(true);
        });

        it('should check if the node is [connection]-like', function () {
            expect(clientNode.isConnection()).to.equal(false);
        });

        it('should check if the node is abstract', function () {
            expect(clientNode.isAbstract()).to.equal(false);
        });

        it('should return the list of defined aspect names of the node', function () {
            expect(clientNode.getValidAspectNames()).to.eql([]);
        });

        it('should copy the node with no parameters', function () {
            var rootNode = client.getNode(''),
                startChildren = rootNode.getChildrenIds().length,
                endChildren,
                params = {parentId: ''};

            params[clientNode.getId()] = {};
            client.copyMoreNodes(params);

            endChildren = rootNode.getChildrenIds().length;
            expect(endChildren).to.equal(startChildren + 1);
        });

        it('should preserve the relids of the original nodes', function () {
            var rootNode = client.getNode(''),
                container,
                resultIds,
                childrenIds = [],
                copyParams = {},
                original = 0,
                copy = 0,
                relid,
                relidPool = '0123456789qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM',
                node,
                i;

            container = client.getNode(client.createChild({parentId: ''}));

            copyParams.parentId = container.getId();

            for (i = 0; i < relidPool.length; i += 1) {
                relid = relidPool[i];
                node = client.getNode(client.createChild({parentId: container.getId(), relid: relid}));
                childrenIds.unshift(node.getId());
                copyParams[childrenIds[0]] = {attributes: {'name': 'copy'}};

                //we aslo set the name
                client.setAttributes(childrenIds[0], 'name', childrenIds[0]);
            }
            expect(childrenIds).to.have.length(62);

            //check names
            for (i = 0; i < childrenIds.length; i += 1) {
                node = client.getNode(childrenIds[i]);
                expect(node.getAttribute('name')).to.equal(childrenIds[i]);
            }

            //and now copy all under the same container
            client.copyMoreNodes(copyParams);

            //check if everything is in order
            resultIds = container.getChildrenIds();
            expect(resultIds).to.have.length(124);

            for (i = 0; i < resultIds.length; i += 1) {
                node = client.getNode(resultIds[i]);
                expect(node).not.to.equal(null);
                if (childrenIds.indexOf(node.getId()) !== -1) {
                    //console.log(++original,'original:',node.getId());
                    original += 1;
                    expect(node.getAttribute('name')).to.equal(node.getId());
                } else {
                    //console.log(++copy,'copy:',node.getId());
                    copy += 1;
                    expect(node.getAttribute('name')).to.equal('copy');
                }
            }

            expect(original).to.equal(relidPool.length);
            expect(copy).to.equal(relidPool.length);
        });

        it('should allow access to META nodes even if they are not part of the territory', function () {
            var metaNode = client.getNode('/1');
            expect(metaNode).not.to.eql(null);
        });
    });

    describe('basic territory tests', function () {
        var Client,
            gmeConfig,
            client,
            projectName = 'territoryProject',
            projectId,
            currentTestId,
            baseCommitHash;

        function buildUpForTest(branchName, next) {
            currentTestId = branchName;
            client.selectProject(projectId, null, function (err) {
                expect(err).to.equal(null);
                client.createBranch(projectId, branchName, baseCommitHash, function (err) {
                    expect(err).to.equal(null);
                    client.selectBranch(branchName, null, function (err) {
                        expect(err).to.equal(null);

                        next();
                    });
                });
            });
        }

        before(function (done) {
            this.timeout(10000);
            requirejs(['js/client', 'text!gmeConfig.json'], function (Client_, gmeConfigJSON) {
                Client = Client_;
                gmeConfig = JSON.parse(gmeConfigJSON);
                client = new Client(gmeConfig);
                projectId = projectName2Id(projectName, gmeConfig, client);
                client.connectToDatabase(function (err) {
                    expect(err).to.equal(null);
                    client.selectProject(projectId, null, function (err) {
                        expect(err).to.equal(null);

                        baseCommitHash = client.getActiveCommitHash();
                        done();
                    });
                });
            });
        });

        afterEach(function (done) {
            client._removeAllUIs();
            if (currentTestId && client.getActiveProjectId()) {
                var branchHash = client.getActiveCommitHash();
                client.selectBranch('master', null, function (err) {
                    if (err) {
                        done(err);
                        return;
                    }

                    client.deleteBranch(projectId, currentTestId, branchHash, function (err) {
                        currentTestId = null;
                        done(err);
                    });
                });
            } else {
                done();
            }
        });

        it('should remove UI even if unknown', function () {
            client.removeUI('anything');
        });

        it('should register the User Interface object', function (done) {
            var testId = 'basicAddUI',
                guid = null;
            buildUpForTest(testId, function () {
                guid = client.addUI({}, function () {
                });
                expect(guid).not.to.equal(null);

                client.removeUI(guid);
                done();
            });
        });

        it('should change the territory of the given User Interface object', function (done) {
            var testId = 'basicUpdateTerritory',
                testState = 'init',
                guid = null;

            function receiveEvents(events) {
                if (testState === 'init') {

                    expect(events).not.to.equal(null);
                    expect(events).to.have.length(2);
                    client.removeUI(guid);
                    done();
                }

                done(new Error('we should only get events once!'));
            }

            buildUpForTest(testId, function () {
                guid = client.addUI({}, receiveEvents);
                expect(guid).not.to.equal(null);

                client.updateTerritory(guid, {'/323573539': {children: 0}});
            });
        });

        it('should receive event even if the territory just emptied', function (done) {
            var testId = 'updateToEmpty',
                testState = 'init',
                guid = null;

            function receiveEvents(events) {
                if (testState === 'init') {

                    expect(events).not.to.equal(null);
                    expect(events).to.deep.equal([{eid: null, etype: 'complete'}]);
                    client.removeUI(guid);
                    done();
                }

                done(new Error('we should only get events once!'));
            }

            buildUpForTest(testId, function () {
                guid = client.addUI({}, receiveEvents);
                expect(guid).not.to.equal(null);

                client.updateTerritory(guid, {});
            });
        });

        it('should return a node object from the given path of the project to allow certain queries',
            function (done) {
                var testId = 'basicGetNode',
                    testState = 'init',
                    guid = null,
                    node = null;

                function receiveEvents(events) {
                    if (testState === 'init') {

                        expect(events).not.to.equal(null);
                        expect(events).to.include({eid: '/323573539', etype: 'load'});

                        node = client.getNode('/323573539');
                        expect(node).not.to.equal(null);
                        expect(node.__proto__).to.include.keys('getId', 'getBaseId', 'getParentId');

                        client.removeUI(guid);
                        done();
                    }

                    done(new Error('we should only get events once!'));
                }

                buildUpForTest(testId, function () {
                    guid = client.addUI({}, receiveEvents);
                    expect(guid).not.to.equal(null);

                    client.updateTerritory(guid, {'/323573539': {children: 0}});
                });
            });

        it('should unload the territory when project is closed', function (done) {
            var testId = 'basicUnloadTerritory',
                testState = 'init',
                guid = null;

            function receiveEvents(events) {
                if (testState === 'init') {
                    testState = 'close';

                    expect(events).not.to.equal(null);
                    expect(events).to.include({eid: '/323573539', etype: 'load'});

                    client.disconnectFromDatabase(function (err) {
                        expect(err).to.equal(null);

                        client.connectToDatabase(function (err) {
                            expect(err).to.equal(null);

                            done();
                        });
                    });

                    return;
                }

                if (testState === 'close') {
                    expect(events).not.to.equal(null);

                    expect(events).to.include({eid: '/323573539', etype: 'unload'});

                    client.removeUI(guid);
                    return;
                }

                done(new Error('we should only get events once!'));
            }

            buildUpForTest(testId, function () {
                guid = client.addUI({}, receiveEvents);
                expect(guid).not.to.equal(null);

                client.updateTerritory(guid, {'/323573539': {children: 0}});
            });
        });

        it('should call reLaunch in case of closing or switching project', function (done) {
            var testId = 'basicReLaunch',
                testState = 'init',
                guid = null,
                reLaunchCalled = false,
                UI = {
                    reLaunch: function () {
                        reLaunchCalled = true;
                    }
                };

            function receiveEvents(events) {
                if (testState === 'init') {
                    testState = 'close';

                    expect(events).not.to.equal(null);
                    expect(events).to.include({eid: '/323573539', etype: 'load'});

                    client.disconnectFromDatabase(function (err) {
                        expect(err).to.equal(null);

                        client.connectToDatabase(function (err) {
                            expect(err).to.equal(null);
                            expect(reLaunchCalled).to.equal(true);

                            client.removeUI(guid);
                            done();
                        });
                    });

                    return;
                }

                if (testState === 'close') {
                    expect(events).not.to.equal(null);

                    expect(events).to.include({eid: '/323573539', etype: 'unload'});

                    return;
                }

                done(new Error('we should only get events once!'));
            }

            buildUpForTest(testId, function () {
                guid = client.addUI(UI, receiveEvents);
                expect(guid).not.to.equal(null);

                client.updateTerritory(guid, {'/323573539': {children: 0}});
            });
        });

        it('should handle updateTerritory+modification requests in order', function (done) {
            var testId = 'updateTerritoryPlusModify',
                tOneState = 'init',
                tOneId = null,
                newNodePath = null,
                basicNodePaths = ['', '/1', '/701504349', '/5185791', '/1400778473', '/1697300825'];

            function tOneEvents(events) {
                var node,
                    parent,
                    i,
                    eventPaths = [],
                    expectedEventNodes = [],
                    getEventPaths = function (events) {
                        var i,
                            paths = [];
                        expect(events).to.have.length.above(1);
                        for (i = 1; i < events.length; i += 1) {
                            paths.push(events[i].eid);
                        }
                        return paths;
                    };

                if (tOneState === 'init') {
                    tOneState = 'tUpdate';
                    expect(events).to.have.length(2);
                    node = client.getNode(events[1].eid);
                    parent = client.getNode(node.getParentId());
                    client.updateTerritory(tOneId, {'': {children: 1}});
                    client.copyMoreNodes({parentId: '', '/323573539': {}}, 'duplicating node');

                } else if (tOneState === 'tUpdate') {
                    //first our territoryUpdate should be resolved
                    expect(events).to.have.length(8);
                    eventPaths = getEventPaths(events);
                    expect(eventPaths).to.include.members(basicNodePaths);
                    for (i = 1; i < events.length; i += 1) {
                        expect(events[i].etype).to.equal('load');
                        if (basicNodePaths.indexOf(events[i].eid) === -1) {
                            newNodePath = events[i].eid;
                        }
                    }

                    expect(newNodePath).to.not.equal(null);
                    tOneState = 'modified';
                    return;

                } else if (tOneState === 'modified') {
                    expect(events).to.have.length(6);

                    // There should be 5 nodes in the event list
                    // 1. root node (always)
                    expectedEventNodes.push('');
                    // 2. the base of the copied node
                    expectedEventNodes.push('/701504349');
                    // 3,4. the two members of the copied node
                    expectedEventNodes.push('/1697300825');
                    expectedEventNodes.push('/1400778473');
                    // 5. the raw data finds a load event and since the node is already loaded
                    //    from the updateTerritory - it will be treated as an update (#1172)
                    expectedEventNodes.push(newNodePath);

                    eventPaths = getEventPaths(events);
                    expect(eventPaths).to.have.members(expectedEventNodes, JSON.stringify(eventPaths) + ' vs ' +
                        JSON.stringify(expectedEventNodes));
                    for (i = 1; i < events.length; i += 1) {
                        expect(events[i].etype).to.equal('update');
                    }
                    client.removeUI(tOneId);
                    done();
                }
            }

            buildUpForTest(testId, function () {
                tOneId = client.addUI({}, tOneEvents);
                expect(tOneId).not.to.equal(null);

                client.updateTerritory(tOneId, {'/323573539': {children: 0}});
            });
        });

        it('should handle modification+updateTerritory requests order', function (done) {
            var testId = 'modifyPlusUpdateTerritory',
                tOneState = 'init',
                tOneId = null,
                newNodePath = null,
                basicNodePaths = ['', '/1', '/701504349', '/5185791', '/1400778473', '/1697300825'];

            function tOneEvents(events) {
                var node,
                    parent,
                    i,
                    eventPaths = [],
                    expectedEventNodes = [],
                    getEventPaths = function (events) {
                        var i,
                            paths = [];
                        expect(events).to.have.length.above(1);
                        for (i = 1; i < events.length; i += 1) {
                            paths.push(events[i].eid);
                        }
                        return paths;
                    };

                if (tOneState === 'init') {
                    tOneState = 'tUpdate';
                    expect(events).to.have.length(2);
                    node = client.getNode(events[1].eid);
                    parent = client.getNode(node.getParentId());
                    client.copyMoreNodes({parentId: parent.getId(), '/323573539': {}}, 'duplicating node');
                    client.updateTerritory(tOneId, {'': {children: 1}});
                } else if (tOneState === 'tUpdate') {
                    //first our territoryUpdate should be resolved
                    expect(events).to.have.length(8);
                    eventPaths = getEventPaths(events);
                    expect(eventPaths).to.include.members(basicNodePaths);
                    for (i = 1; i < events.length; i += 1) {
                        expect(events[i].etype).to.equal('load');
                        if (basicNodePaths.indexOf(events[i].eid) === -1) {
                            newNodePath = events[i].eid;
                        }
                    }

                    expect(newNodePath).to.not.equal(null);
                    tOneState = 'modified';
                    return;
                } else if (tOneState === 'modified') {
                    expect(events).to.have.length(6);

                    // There should be 5 nodes in the event list
                    // 1. root node (always)
                    expectedEventNodes.push('');
                    // 2. the base of the copied node
                    expectedEventNodes.push('/701504349');
                    // 3,4. the two memebers of the copied node
                    expectedEventNodes.push('/1697300825');
                    expectedEventNodes.push('/1400778473');
                    // 5. the raw data finds a load event and since the node is already loaded
                    //    from the updateTerritory - it will be treated as an update (#1172)
                    expectedEventNodes.push(newNodePath);

                    eventPaths = getEventPaths(events);
                    expect(eventPaths).to.have.members(expectedEventNodes);

                    for (i = 1; i < events.length; i += 1) {
                        expect(events[i].etype).to.equal('update');
                    }

                    client.removeUI(tOneId);
                    done();
                }
            }

            buildUpForTest(testId, function () {
                tOneId = client.addUI({}, tOneEvents);
                expect(tOneId).not.to.equal(null);

                client.updateTerritory(tOneId, {'/323573539': {children: 0}});
            });
        });

        // TODO redesign the testcase so it could run multiple times...
        it('should dispatch update event when inherited child with data is "removed"', function (done) {
            var testId = 'inheritedChildRemoval',
                tOneState = 'init',
                tOneId = null,
                territory = {'': {children: 1}},
                newNodeRelid = 'XXXXX',
                baseNodePath = '/323573539',
                baseChildRelid = '564787551',
                childPath;

            function tOneEvents(events) {
                var node,
                    i;

                if (tOneState === 'init') {
                    tOneState = 'tCreate';
                    //FIXME: extra events due to version update..
                    //expect(events).to.have.length(8);
                    client.createChild({parentId: '', baseId: baseNodePath, relid: newNodeRelid}, 'new instance node');
                } else if (tOneState === 'tCreate') {
                    tOneState = 'territoryUpdate';
                    expect(events.length).to.equal(4);
                    expect(events).to.include({etype: 'load', eid: '/XXXXX'});

                    territory['/' + newNodeRelid] = {children: 1};
                    client.updateTerritory(tOneId, territory);
                } else if (tOneState === 'territoryUpdate') {
                    tOneState = 'tUpdate';
                    // The three children should be loaded.
                    expect(events.length).to.equal(4);
                    for (i = 1; i < events.length; i += 1) {
                        expect(events[i].etype).to.equal('load');
                    }

                    childPath = '/' + newNodeRelid + '/' + baseChildRelid;
                    node = client.setRegistry(childPath, 'position', {x: 0, y: 0}, 'new position for child');
                } else if (tOneState === 'tUpdate') {
                    tOneState = 'tRemove';
                    // Root, parent and child should be updated.
                    expect(events.length).to.equal(4);
                    for (i = 1; i < events.length; i += 1) {
                        expect(events[i].etype).to.equal('update');
                    }

                    node = client.delMoreNodes([childPath]);
                } else if (tOneState === 'tRemove') {
                    tOneState = null;
                    // Root, parent and child should be updated,
                    expect(events.length).to.equal(4);
                    for (i = 1; i < events.length; i += 1) {
                        expect(events[i].etype).to.equal('update');
                    }
                    // and especially the child should be updated (#1172)!
                    expect(events).to.include({etype: 'update', eid: childPath});

                    client.removeUI(tOneId);
                    done();
                } else {
                    done(new Error('Unexpected event state: "' + tOneState + '"'));
                }
            }

            buildUpForTest(testId, function () {
                tOneId = client.addUI({}, tOneEvents);
                expect(tOneId).not.to.equal(null);

                client.updateTerritory(tOneId, territory);
            });
        });

        it('should dispatch no event when inherited child with no data is "removed"', function (done) {
            var testId = 'inheritedChildRemovalWithNoData',
                tOneState = 'init',
                tOneId = null,
                territory = {'': {children: 1}},
                newNodeRelid = 'XXXXX',
                baseNodePath = '/323573539',
                baseChildRelid = '564787551',
                childPath;

            function tOneEvents(events) {
                var node,
                    i;

                if (tOneState === 'init') {
                    tOneState = 'tCreate';
                    expect(events).to.have.length(8);
                    client.createChild({parentId: '', baseId: baseNodePath, relid: newNodeRelid}, 'new instance node');
                } else if (tOneState === 'tCreate') {
                    tOneState = 'territoryUpdate';
                    expect(events.length).to.equal(4);
                    expect(events).to.include({etype: 'load', eid: '/XXXXX'});

                    territory['/' + newNodeRelid] = {children: 1};
                    client.updateTerritory(tOneId, territory);
                } else if (tOneState === 'territoryUpdate') {
                    tOneState = 'tRemove';
                    // The three children should be loaded.
                    expect(events.length).to.equal(4);
                    for (i = 1; i < events.length; i += 1) {
                        expect(events[i].etype).to.equal('load');
                    }
                    childPath = '/' + newNodeRelid + '/' + baseChildRelid;
                    node = client.delMoreNodes([childPath]);
                } else if (tOneState === 'tRemove') {
                    tOneState = null;
                    // Only the root should have an event.
                    expect(events.length).to.equal(2);
                    expect(events).to.include({etype: 'update', eid: ''});

                    client.removeUI(tOneId);
                    done();
                } else {
                    done(new Error('Unexpected event state: "' + tOneState + '"'));
                }
            }

            buildUpForTest(testId, function () {
                tOneId = client.addUI({}, tOneEvents);
                expect(tOneId).not.to.equal(null);

                client.updateTerritory(tOneId, territory);
            });
        });

        //FIXME it is wrongly implemented as it should check if the given node is of a given meta type!!!
        it.skip('should receive the only the given types in the territory', function (done) {
            var testId = 'basicFilteredTerritory',
                testState = 'init',
                guid = null,
                node = null,
                i;

            function receiveEvents(events) {
                if (testState === 'init') {

                    expect(events).not.to.equal(null);
                    expect(events).to.have.length(7);

                    events.shift();
                    for (i = 0; i < events.length; i++) {
                        node = client.getNode(events[i].eid);
                        expect(node).not.to.equal(null);
                        if (events[i].eid !== '/701504349') {
                            expect(node.getBaseId()).to.equal('/701504349');
                        }
                    }
                    client.removeUI(guid);
                    done();
                }

                done(new Error('we should only get events once!'));
            }

            buildUpForTest(testId, function () {
                guid = client.addUI({}, receiveEvents);
                expect(guid).not.to.equal(null);

                client.updateTerritory(guid, {'': {children: 1, items: ['/701504349']}});
            });
        });
    });

    describe('node manipulations', function () {
        var Client,
            gmeConfig,
            client,
            currentTestId,
            projectId,
            projectName = 'nodeManipulationProject',
            baseCommitHash;

        function buildUpForTest(testId, patternObject, branchStatusHandler, eventCallback) {
            var branchName = testId;
            client.createBranch(projectId, branchName, baseCommitHash, function (err) {
                expect(err).to.equal(null);
                //console.log('##### created', branchName);
                client.selectBranch(branchName, null, function (err) {
                    var user = {},
                        userId = testId;
                    //console.log('##### opened', branchName);
                    expect(err).to.equal(null);
                    if (branchStatusHandler) {
                        client.getProjectObject().branches[branchName].addBranchStatusHandler(branchStatusHandler);
                    }
                    client.addUI(user, eventCallback, userId);
                    client.updateTerritory(userId, patternObject);
                });
            });
        }

        before(function (done) {
            this.timeout(10000);
            requirejs(['js/client', 'text!gmeConfig.json'], function (Client_, gmeConfigJSON) {
                Client = Client_;
                gmeConfig = JSON.parse(gmeConfigJSON);
                client = new Client(gmeConfig);
                projectId = projectName2Id(projectName, gmeConfig, client);
                client.connectToDatabase(function (err) {
                    expect(err).to.equal(null);
                    client.selectProject(projectId, null, function (err) {
                        expect(err).to.equal(null);
                        baseCommitHash = client.getActiveCommitHash();
                        //console.log('ProjectName, branchName, commitHash',
                        //    client.getActiveProjectId(), client.getActiveBranchName(), client.getActiveCommitHash());
                        done();
                    });
                });
            });
        });

        after(function (done) {
            client.disconnectFromDatabase(done);
        });

        afterEach(function (done) {
            var branchHash = client.getActiveCommitHash();
            client.removeUI(currentTestId);
            client.selectBranch('master', null, function (err) {
                if (err) {
                    done(err);
                    return;
                }
                client.deleteBranch(projectId, currentTestId, branchHash, done);
            });
        });

        it('should modify the attribute of the given node', function (done) {
            var testState = 'init',
                testId = 'basicSetAttribute',
                branchStatusHandler = function (status/*, commitQueue, updateQueue*/) {
                    if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                        done();
                    }
                },
                node;
            currentTestId = testId;
            buildUpForTest(testId, {'/323573539': {children: 0}}, branchStatusHandler, function (events) {
                if (testState === 'init') {
                    testState = 'checking';
                    expect(events).to.have.length(2);
                    expect(events[1]).to.deep.equal({eid: '/323573539', etype: 'load'});
                    node = client.getNode(events[1].eid);
                    expect(node).not.to.equal(null);
                    expect(node.getAttribute('name')).to.equal('check');

                    client.setAttributes(events[1].eid, 'name', 'checkModified', 'basic set attribute test');
                    return;
                }

                if (testState === 'checking') {
                    expect(events).to.have.length(2);
                    expect(events[1]).to.deep.equal({eid: '/323573539', etype: 'update'});
                    node = client.getNode(events[1].eid);
                    expect(node).not.to.equal(null);
                    expect(node.getAttribute('name')).to.equal('checkModified');
                }
            });
        });

        it('should delete the given attribute of the node', function (done) {
            var testState = 'init',
                testId = 'basicDelAttribute',
                branchStatusHandler = function (status/*, commitQueue, updateQueue*/) {
                    if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                        done();
                    }
                },
                node;

            currentTestId = testId;

            buildUpForTest(testId, {'/323573539': {children: 0}}, branchStatusHandler, function (events) {
                if (testState === 'init') {
                    testState = 'checking';

                    expect(events).to.have.length(2);
                    expect(events[1]).to.deep.equal({eid: '/323573539', etype: 'load'});

                    node = client.getNode(events[1].eid);
                    expect(node).not.to.equal(null);
                    expect(node.getAttribute('name')).to.equal('check');

                    client.delAttributes(events[1].eid, 'name', 'basic delete attribute test');
                    return;
                }

                if (testState === 'checking') {
                    expect(events).to.have.length(2);
                    expect(events[1]).to.deep.equal({eid: '/323573539', etype: 'update'});

                    node = client.getNode(events[1].eid);
                    expect(node).not.to.equal(null);
                    expect(node.getAttribute('name')).to.equal('node');
                }
            });
        });

        it('should sets the given registry entry of the node', function (done) {
            var testState = 'init',
                testId = 'basicSetRegistry',
                branchStatusHandler = function (status/*, commitQueue, updateQueue*/) {
                    if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                        done();
                    }
                },
                node;
            currentTestId = testId;

            buildUpForTest(testId, {'/323573539': {children: 0}}, branchStatusHandler, function (events) {
                if (testState === 'init') {
                    testState = 'checking';

                    expect(events).to.have.length(2);
                    expect(events[1]).to.deep.equal({eid: '/323573539', etype: 'load'});

                    node = client.getNode(events[1].eid);
                    expect(node).not.to.equal(null);
                    expect(node.getRegistry('position')).to.deep.equal({x: 300, y: 466});

                    client.setRegistry(events[1].eid, 'position', {x: 100, y: 100}, 'basic set registry test');
                    return;
                }

                if (testState === 'checking') {

                    expect(events).to.have.length(2);
                    expect(events[1]).to.deep.equal({eid: '/323573539', etype: 'update'});

                    node = client.getNode(events[1].eid);
                    expect(node).not.to.equal(null);
                    expect(node.getRegistry('position')).to.deep.equal({x: 100, y: 100});
                }
            });
        });

        it('should remove the given registry key of the node', function (done) {
            var testState = 'init',
                testId = 'basicDelRegistry',
                branchStatusHandler = function (status /*, commitQueue, updateQueue*/) {
                    if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                        done();
                    }
                },
                node;

            currentTestId = testId;

            buildUpForTest(testId, {'/323573539': {children: 0}}, branchStatusHandler, function (events) {
                if (testState === 'init') {
                    testState = 'checking';

                    expect(events).to.have.length(2);
                    expect(events[1]).to.deep.equal({eid: '/323573539', etype: 'load'});

                    node = client.getNode(events[1].eid);
                    expect(node).not.to.equal(null);
                    expect(node.getRegistry('position')).to.deep.equal({x: 300, y: 466});

                    client.delRegistry(events[1].eid, 'position', 'basic del registry test');
                    return;
                }

                if (testState === 'checking') {
                    expect(events).to.have.length(2);
                    expect(events[1]).to.deep.equal({eid: '/323573539', etype: 'update'});

                    node = client.getNode(events[1].eid);
                    expect(node).not.to.equal(null);
                    expect(node.getRegistry('position')).to.deep.equal({x: 371, y: 213});
                }
            });
        });

        it('should complete a transaction but not commit any changes', function (done) {
            var testId = 'basicCompleteTransaction',
                branchStatusHandler = function (/*status, commitQueue, updateQueue*/) {
                    done(new Error('Should not have committed empty'));
                };
            currentTestId = testId;

            buildUpForTest(testId, {}, branchStatusHandler, function () {
                client.removeUI(testId);//we do not need a UI and it would just make test code more complex
                client.completeTransaction('should not persist anything', function (err) {
                    expect(err).to.equal(null);
                    expect(baseCommitHash).to.equal(client.getActiveCommitHash());
                    done();
                });
            });
        });

        // FIXME: This throw an error.
        it.skip('should start a transaction', function (done) {
            var testId = 'basicStartTransaction',
                testState = 'init',
                commitHandler = function (queue, result, callback) {
                    callback(false);
                    done();
                },
                node = null;

            currentTestId = testId;

            buildUpForTest(testId, {'/1': {children: 0}}, commitHandler, function (events) {
                if (testState === 'init') {
                    testState = 'checking';

                    expect(events).to.have.length(2);
                    expect(events).to.include({eid: '/1', etype: 'load'});

                    node = client.getNode('/1');
                    expect(node).not.to.equal(null);
                    expect(node.getAttributeNames()).to.deep.equal(['name']);
                    expect(node.getAttribute('name')).to.equal('FCO');

                    client.startTransaction('starting a transaction');
                    client.setAttributes('/1', 'name', 'FCOmodified', 'change without commit');
                    client.setAttributes('/1', 'newAttribute', 42, 'another change without commit');
                    client.setRegistry('/1', 'position', {x: 50, y: 50});
                    client.completeTransaction('now will the events get generated');
                }

                if (testState === 'checking') {
                    testState = null;

                    expect(events).to.have.length(2);
                    expect(events).to.include({eid: '/1', etype: 'update'});

                    node = client.getNode('/1');
                    expect(node).not.to.equal(null);
                    expect(node.getAttributeNames()).to.include('newAttribute');
                    expect(node.getAttribute('name')).to.equal('FCOmodified');
                    expect(node.getAttribute('newAttribute')).to.equal(42);
                    expect(node.getRegistry('position')).to.deep.equal({x: 50, y: 50});

                    return;
                }

                if (testState === null) {
                    throw new Error('more than one set of events arrived during or after a transaction!');
                }
            });
        });

        it('should remove the given node', function (done) {
            var testState = 'init',
                testId = 'basicDelNode',
                branchStatusHandler = function (status /*, commitQueue, updateQueue*/) {
                    if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                        done();
                    }
                },
                node;
            currentTestId = testId;

            buildUpForTest(testId, {'/323573539': {children: 0}}, branchStatusHandler, function (events) {
                if (testState === 'init') {
                    testState = 'checking';

                    expect(events).to.have.length(2);
                    expect(events[1]).to.deep.equal({eid: '/323573539', etype: 'load'});

                    node = client.getNode(events[1].eid);
                    expect(node).not.to.equal(null);

                    client.delMoreNodes([events[1].eid], 'basic delete node test');
                    return;
                }

                if (testState === 'checking') {
                    expect(events).to.have.length(2);
                    expect(events[1]).to.deep.equal({eid: '/323573539', etype: 'unload'});

                    node = client.getNode(events[1].eid);
                    expect(node).to.equal(null);
                }
            });
        });

        it('should set the given pointer of the node to the specified target', function (done) {
            var testState = 'init',
                testId = 'basicMakePointer',
                branchStatusHandler = function (status /*, commitQueue, updateQueue*/) {
                    if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                        done();
                    }
                },
                node;
            currentTestId = testId;

            buildUpForTest(testId, {'/323573539': {children: 0}, '/1': {children: 0}}, branchStatusHandler,
                function (events) {
                    if (testState === 'init') {
                        testState = 'checking';

                        expect(events).to.have.length(3);
                        expect(events).to.include({eid: '/323573539', etype: 'load'});
                        expect(events).to.include({eid: '/1', etype: 'load'});

                        node = client.getNode(events[1].eid);
                        expect(node).not.to.equal(null);

                        client.setPointer('/323573539', 'ptr', '/1', 'set pointer test');
                        return;
                    }

                    if (testState === 'checking') {
                        expect(events).to.have.length(3,
                            'should set the given pointer of the node to the specified target');
                        expect(events).to.include({eid: '/323573539', etype: 'update'});
                        expect(events).to.include({eid: '/1', etype: 'update'});

                        node = client.getNode('/323573539');
                        expect(node).not.to.equal(null);
                        expect(node.getPointer('ptr')).to.deep.equal({to: '/1', from: []});
                    }
                }
            );
        });

        it('should set a null target', function (done) {
            var testState = 'init',
                testId = 'makeNullPointer',
                branchStatusHandler = function (status /*, commitQueue, updateQueue*/) {
                    if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                        done();
                    }
                },
                node;

            currentTestId = testId;
            buildUpForTest(testId, {'/1697300825': {children: 0}}, branchStatusHandler, function (events) {
                if (testState === 'init') {
                    testState = 'checking';

                    expect(events).to.have.length(2);
                    expect(events).to.include({eid: '/1697300825', etype: 'load'});

                    node = client.getNode(events[1].eid);
                    expect(node).not.to.equal(null);
                    expect(node.getPointer('ptr')).to.deep.equal({to: '/323573539', from: []});

                    client.makePointer('/1697300825', 'ptr', null, 'make null pointer test');
                    return;
                }

                if (testState === 'checking') {
                    expect(events).to.have.length(2);
                    expect(events).to.include({eid: '/1697300825', etype: 'update'});

                    node = client.getNode('/1697300825');
                    expect(node).not.to.equal(null);
                    expect(node.getPointer('ptr')).to.deep.equal({to: null, from: []});
                }
            });
        });

        it('should remove the given pointer of the node', function (done) {
            var testState = 'init',
                testId = 'basicDelPointer',
                branchStatusHandler = function (status /*, commitQueue, updateQueue*/) {
                    if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                        done();
                    }
                },
                node;

            currentTestId = testId;

            buildUpForTest(testId, {'/1697300825': {children: 0}}, branchStatusHandler, function (events) {
                if (testState === 'init') {
                    testState = 'checking';

                    expect(events).to.have.length(2);
                    expect(events[1]).to.deep.equal({eid: '/1697300825', etype: 'load'});

                    node = client.getNode(events[1].eid);
                    expect(node).not.to.equal(null);

                    expect(node.getPointer('ptr')).to.deep.equal({to: '/323573539', from: []});

                    client.delPointer([events[1].eid], 'ptr', 'basic delete pointer test');
                    return;
                }

                if (testState === 'checking') {
                    expect(events).to.have.length(2);
                    expect(events[1]).to.deep.equal({eid: '/1697300825', etype: 'update'});

                    node = client.getNode(events[1].eid);
                    expect(node).not.to.equal(null);

                    expect(node.getPointer('ptr')).to.deep.equal({to: null, from: []});
                }
            });
        });

        it('should copy the nodes under the given parent', function (done) {
            var testState = 'init',
                testId = 'basicCopyNodes',
                node,
                initialPaths = [],
                branchStatusHandler = function (status /*, commitQueue, updateQueue*/) {
                    if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                        done();
                    }
                },
                newPaths = [],
                i;

            currentTestId = testId;

            buildUpForTest(testId, {'': {children: 1}}, branchStatusHandler, function (events) {
                if (testState === 'init') {
                    testState = 'checking';

                    expect(events).to.have.length(8);
                    expect(events).to.include({eid: '/1697300825', etype: 'load'});
                    expect(events).to.include({eid: '/1400778473', etype: 'load'});

                    //save the paths of the initial nodes so that we can figure out the new nodes later
                    for (i = 1; i < events.length; i++) {
                        initialPaths.push(events[i].eid);
                    }

                    node = client.getNode('/1697300825');
                    expect(node).not.to.equal(null);
                    expect(node.getPointer('ptr')).to.deep.equal({to: '/323573539', from: []});

                    node = client.getNode('/1400778473');
                    expect(node).not.to.equal(null);
                    expect(node.getPointer('ptr')).to.deep.equal({to: '/323573539', from: []});

                    client.copyMoreNodes({
                            parentId: '',
                            '/1697300825': {attributes: {name: 'member2copy'}, registry: {}},
                            '/1400778473': {attributes: {name: 'member1copy'}}
                        },
                        'basic copy nodes test');
                    return;
                }

                if (testState === 'checking') {
                    //FIXME: extra events due to version update..
                    //expect(events).to.have.length(6);

                    //find out the new node paths
                    for (i = 1; i < events.length; i++) {
                        if (initialPaths.indexOf(events[i].eid) === -1) {
                            expect(events[i].etype).to.equal('load');
                            newPaths.push(events[i].eid);
                        }
                    }

                    expect(newPaths).to.have.length(2);

                    //old nodes remain untouched
                    node = client.getNode('/1697300825');
                    expect(node).not.to.equal(null);
                    expect(node.getPointer('ptr')).to.deep.equal({to: '/323573539', from: []});

                    node = client.getNode('/1400778473');
                    expect(node).not.to.equal(null);
                    expect(node.getPointer('ptr')).to.deep.equal({to: '/323573539', from: []});

                    //the copies keep the target
                    node = client.getNode(newPaths[0]);
                    expect(node).not.to.equal(null);
                    expect(node.getAttribute('name')).to.contain('copy');
                    expect(node.getPointer('ptr')).to.deep.equal({to: '/323573539', from: []});

                    node = client.getNode(newPaths[1]);
                    expect(node).not.to.equal(null);
                    expect(node.getAttribute('name')).to.contain('copy');
                    expect(node.getPointer('ptr')).to.deep.equal({to: '/323573539', from: []});
                }
            });
        });

        it('should copy the nodes under the given parent using transactions', function (done) {
            var testState = 'init',
                testId = 'basicCopyNodesTransaction',
                node,
                initialPaths = [],
                branchStatusHandler = function (status /*, commitQueue, updateQueue*/) {
                    if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                        done();
                    }
                },
                newPaths = [],
                i;

            currentTestId = testId;

            buildUpForTest(testId, {'': {children: 1}}, branchStatusHandler, function (events) {
                if (testState === 'init') {
                    testState = 'checking';

                    expect(events).to.have.length(8);
                    expect(events).to.include({eid: '/1697300825', etype: 'load'});
                    expect(events).to.include({eid: '/1400778473', etype: 'load'});

                    //save the paths of the initial nodes so that we can figure out the new nodes later
                    for (i = 1; i < events.length; i++) {
                        initialPaths.push(events[i].eid);
                    }

                    node = client.getNode('/1697300825');
                    expect(node).not.to.equal(null);
                    expect(node.getPointer('ptr')).to.deep.equal({to: '/323573539', from: []});

                    node = client.getNode('/1400778473');
                    expect(node).not.to.equal(null);
                    expect(node.getPointer('ptr')).to.deep.equal({to: '/323573539', from: []});

                    client.startTransaction();
                    client.copyMoreNodes({
                            parentId: '',
                            '/1697300825': {attributes: {name: 'member2copy'}, registry: {}},
                            '/1400778473': {attributes: {name: 'member1copy'}}
                        },
                        'basic copy nodes test');
                    client.completeTransaction();
                    return;
                }

                if (testState === 'checking') {
                    //FIXME: extra events due to version update..
                    //expect(events).to.have.length(6);

                    //find out the new node paths
                    for (i = 1; i < events.length; i++) {
                        if (initialPaths.indexOf(events[i].eid) === -1) {
                            expect(events[i].etype).to.equal('load');
                            newPaths.push(events[i].eid);
                        }
                    }

                    expect(newPaths).to.have.length(2);

                    //old nodes remain untouched
                    node = client.getNode('/1697300825');
                    expect(node).not.to.equal(null);
                    expect(node.getPointer('ptr')).to.deep.equal({to: '/323573539', from: []});

                    node = client.getNode('/1400778473');
                    expect(node).not.to.equal(null);
                    expect(node.getPointer('ptr')).to.deep.equal({to: '/323573539', from: []});

                    //the copies keep the target
                    node = client.getNode(newPaths[0]);
                    expect(node).not.to.equal(null);
                    expect(node.getAttribute('name')).to.contain('copy');
                    expect(node.getPointer('ptr')).to.deep.equal({to: '/323573539', from: []});

                    node = client.getNode(newPaths[1]);
                    expect(node).not.to.equal(null);
                    expect(node.getAttribute('name')).to.contain('copy');
                    expect(node.getPointer('ptr')).to.deep.equal({to: '/323573539', from: []});
                }
            });
        });

        it('copied nodes should keep copy-internal relations', function (done) {
            var testState = 'init',
                testId = 'internalRelationCopyNodes',
                node,
                initialPaths = [],
                newPaths = [],
                branchStatusHandler = function (status /*, commitQueue, updateQueue*/) {
                    if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                        done();
                    }
                },
                i,
                newTarget = null;

            currentTestId = testId;

            buildUpForTest(testId, {'': {children: 1}}, branchStatusHandler, function (events) {
                if (testState === 'init') {
                    testState = 'checking';

                    expect(events).to.have.length(8);
                    expect(events).to.include({eid: '/323573539', etype: 'load'});
                    expect(events).to.include({eid: '/1697300825', etype: 'load'});
                    expect(events).to.include({eid: '/1400778473', etype: 'load'});

                    //save the paths of the initial nodes so that we can figure out the new nodes later
                    for (i = 1; i < events.length; i++) {
                        initialPaths.push(events[i].eid);
                    }

                    node = client.getNode('/1697300825');
                    expect(node).not.to.equal(null);
                    expect(node.getPointer('ptr')).to.deep.equal({to: '/323573539', from: []});

                    node = client.getNode('/1400778473');
                    expect(node).not.to.equal(null);
                    expect(node.getPointer('ptr')).to.deep.equal({to: '/323573539', from: []});

                    node = client.getNode('/323573539');
                    expect(node).not.to.equal(null);
                    expect(node.getAttribute('name')).to.equal('check');

                    client.copyMoreNodes({
                            parentId: '',
                            '/1697300825': {attributes: {name: 'member2copy'}},
                            '/1400778473': {attributes: {name: 'member1copy'}},
                            '/323573539': {attributes: {name: 'check-copy'}, registry: {position: {x: 100, y: 100}}}
                        },
                        'basic copy nodes test');
                    return;
                }

                if (testState === 'checking') {
                    // events.forEach(function (e) {
                    //    console.log(e);
                    // });
                    //FIXME: extra events due to version update..
                    //expect(events).to.have.length(6);

                    //find out the new node paths
                    for (i = 1; i < events.length; i++) {
                        if (initialPaths.indexOf(events[i].eid) === -1) {
                            expect(events[i].etype).to.equal('load');
                            if (client.getNode(events[i].eid).getAttribute('name') === 'check-copy') {
                                newTarget = events[i].eid;
                            } else {
                                newPaths.push(events[i].eid);
                            }
                        }
                    }

                    expect(newPaths).to.have.length(2);
                    expect(newTarget).not.to.equal(null);

                    //the source nodes should be intact
                    node = client.getNode('/1697300825');
                    expect(node).not.to.equal(null);
                    expect(node.getPointer('ptr')).to.deep.equal({to: '/323573539', from: []});

                    node = client.getNode('/1400778473');
                    expect(node).not.to.equal(null);
                    expect(node.getPointer('ptr')).to.deep.equal({to: '/323573539', from: []});

                    node = client.getNode('/323573539');
                    expect(node).not.to.equal(null);
                    expect(node.getAttribute('name')).to.equal('check');

                    //the copies keep the target
                    node = client.getNode(newPaths[0]);
                    expect(node).not.to.equal(null);
                    expect(node.getAttribute('name')).to.contain('copy');
                    expect(node.getPointer('ptr')).to.deep.equal({to: newTarget, from: []});

                    node = client.getNode(newPaths[1]);
                    expect(node).not.to.equal(null);
                    expect(node.getAttribute('name')).to.contain('copy');
                    expect(node.getPointer('ptr')).to.deep.equal({to: newTarget, from: []});

                    node = client.getNode(newTarget);
                    expect(node).not.to.equal(null);
                    expect(node.getAttribute('name')).to.contain('copy');
                    expect(node.getRegistry('position')).to.deep.equal({x: 100, y: 100});
                }
            });
        });

        it('should copy a single node', function (done) {
            var testState = 'init',
                testId = 'copySingleNode',
                node,
                branchStatusHandler = function (status /*, commitQueue, updateQueue*/) {
                    if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                        done();
                    }
                },
                initialPaths = [],
                newPaths = [],
                i;

            currentTestId = testId;

            buildUpForTest(testId, {'': {children: 1}}, branchStatusHandler, function (events) {
                if (testState === 'init') {
                    testState = 'checking';

                    expect(events).to.have.length(8);
                    expect(events).to.include({eid: '/1400778473', etype: 'load'});

                    //save the paths of the initial nodes so that we can figure out the new nodes later
                    for (i = 1; i < events.length; i++) {
                        initialPaths.push(events[i].eid);
                    }

                    node = client.getNode('/1400778473');
                    expect(node).not.to.equal(null);
                    expect(node.getPointer('ptr')).to.deep.equal({to: '/323573539', from: []});

                    client.copyMoreNodes({
                            parentId: '',
                            '/1400778473': {
                                attributes: {name: 'member1copy'},
                                registry: {position: {x: 100, y: 100}}
                            }
                        },
                        'copy single node test');
                    return;
                }

                if (testState === 'checking') {
                    expect(events).to.have.length(5);

                    //find out the new node paths
                    for (i = 1; i < events.length; i++) {
                        if (initialPaths.indexOf(events[i].eid) === -1) {
                            expect(events[i].etype).to.equal('load');
                            newPaths.push(events[i].eid);
                        }
                    }

                    expect(newPaths).to.have.length(1);

                    //old nodes remain untouched
                    node = client.getNode('/1400778473');
                    expect(node).not.to.equal(null);
                    expect(node.getPointer('ptr')).to.deep.equal({to: '/323573539', from: []});

                    //the copies keep the target
                    node = client.getNode(newPaths[0]);
                    expect(node).not.to.equal(null);
                    expect(node.getAttribute('name')).to.contain('copy');
                    expect(node.getRegistry('position')).to.deep.equal({x: 100, y: 100});
                    expect(node.getPointer('ptr')).to.deep.equal({to: '/323573539', from: []});
                }
            });
        });

        it.skip('should put an error to the console if the container is wrongly given or missing', function (done) {
            var testId = 'copyFailureTests',
                failures = 0,
                wantedFailures = 2,
                commitHandler = function (queue, result, callback) {
                    callback(false);
                    done();
                },
                oldConsoleLog = console.log; //TODO awkward but probably should be changed in the code as well

            currentTestId = testId;

            buildUpForTest(testId, {'': {children: 1}}, commitHandler, function (/*events*/) {

                console.log = function (txt) {
                    expect(txt).to.contain('wrong');
                    if (++failures === wantedFailures) {
                        console.log = oldConsoleLog;
                        done();
                    }
                };

                client.copyMoreNodes({}, 'try to copy without parentId');
                client.copyMoreNodes({parentId: '/42/42'}, 'try to copy with unknown parentId');
            });
        });

        it('should create a child', function (done) {
            var testState = 'init',
                testId = 'basicCreateChild',
                node,
                newId = null,
                initialPaths = [],
                branchStatusHandler = function (status /*, commitQueue, updateQueue*/) {
                    if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                        done();
                    }
                },
                i;

            currentTestId = testId;

            buildUpForTest(testId, {'': {children: 1}}, branchStatusHandler, function (events) {
                if (testState === 'init') {
                    testState = 'checking';

                    expect(events).to.have.length(8);
                    expect(events).to.include({eid: '/323573539', etype: 'load'});
                    expect(events).to.include({eid: '', etype: 'load'});

                    //save the paths of the initial nodes so that we can figure out the new nodes later
                    for (i = 1; i < events.length; i++) {
                        initialPaths.push(events[i].eid);
                    }

                    client.createChild({parentId: '', baseId: '/323573539', position: {x: 200, y: 300}});
                    return;
                }

                if (testState === 'checking') {
                    expect(events).to.have.length(4);
                    expect(events).to.include({eid: '', etype: 'update'});

                    for (i = 1; i < events.length; i++) {
                        if (initialPaths.indexOf(events[i].eid) === -1) {
                            expect(events[i].etype).to.equal('load');
                            if (newId === null) {
                                newId = events[i].eid;
                            } else {
                                done(new Error('there should be only one new element in the territory!'));
                                return;
                            }
                        }
                    }

                    node = client.getNode(newId);
                    expect(node).not.to.equal(null);
                    expect(node.getAttribute('name')).to.equal('check');
                    expect(node.getRegistry('position')).to.deep.equal({x: 200, y: 300});
                    expect(node.getChildrenIds()).to.have.length(3, 'should create a child');
                }
            });
        });

        it('should create a child at default position', function (done) {
            var testState = 'init',
                testId = 'createChildDefaultPosition',
                node,
                branchStatusHandler = function (status /*, commitQueue, updateQueue*/) {
                    if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                        done();
                    }
                },
                newId = null,
                initialPaths = [],
                i;

            currentTestId = testId;

            buildUpForTest(testId, {'': {children: 1}}, branchStatusHandler, function (events) {
                if (testState === 'init') {
                    testState = 'checking';

                    expect(events).to.have.length(8);
                    expect(events).to.include({eid: '/323573539', etype: 'load'});
                    expect(events).to.include({eid: '', etype: 'load'});

                    //save the paths of the initial nodes so that we can figure out the new nodes later
                    for (i = 1; i < events.length; i++) {
                        initialPaths.push(events[i].eid);
                    }

                    client.createChild({parentId: '', baseId: '/323573539'});
                    return;
                }

                if (testState === 'checking') {
                    expect(events).to.have.length(4);
                    expect(events).to.include({eid: '', etype: 'update'});

                    for (i = 1; i < events.length; i++) {
                        if (initialPaths.indexOf(events[i].eid) === -1) {
                            expect(events[i].etype).to.equal('load');
                            if (newId === null) {
                                newId = events[i].eid;
                            } else {
                                throw new Error('there should be only one new element in the territory!');
                            }
                        }
                    }

                    node = client.getNode(newId);
                    expect(node).not.to.equal(null);
                    expect(node.getAttribute('name')).to.equal('check');
                    expect(node.getRegistry('position')).to.deep.equal({x: 100, y: 100});
                    expect(node.getChildrenIds()).to.have.length(3, 'should create a child at default position');
                }
            });
        });

        it('should create children', function (done) {
            var testState = 'init',
                testId = 'basicCreateChildren',
                node,
                initialPaths = [],
                branchStatusHandler = function (status /*, commitQueue, updateQueue*/) {
                    if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                        done();
                    }
                },
                newPaths = [],
                i,
                newTarget = null;

            currentTestId = testId;

            buildUpForTest(testId, {'': {children: 1}}, branchStatusHandler, function (events) {
                if (testState === 'init') {
                    testState = 'checking';

                    expect(events).to.have.length(8);
                    expect(events).to.include({eid: '/323573539', etype: 'load'});
                    expect(events).to.include({eid: '/1697300825', etype: 'load'});
                    expect(events).to.include({eid: '/1400778473', etype: 'load'});

                    //save the paths of the initial nodes so that we can figure out the new nodes later
                    for (i = 1; i < events.length; i++) {
                        initialPaths.push(events[i].eid);
                    }

                    node = client.getNode('/1697300825');
                    expect(node).not.to.equal(null);
                    expect(node.getPointer('ptr')).to.deep.equal({to: '/323573539', from: []});

                    node = client.getNode('/1400778473');
                    expect(node).not.to.equal(null);
                    expect(node.getPointer('ptr')).to.deep.equal({to: '/323573539', from: []});

                    node = client.getNode('/323573539');
                    expect(node).not.to.equal(null);
                    expect(node.getAttribute('name')).to.equal('check');

                    client.createChildren({
                            parentId: '',
                            '/1697300825': {attributes: {name: 'member2copy'}},
                            '/1400778473': {attributes: {name: 'member1copy'}},
                            '/323573539': {attributes: {name: 'check-copy'}, registry: {position: {x: 400, y: 400}}}
                        },
                        'basic copy nodes test');
                    return;
                }

                if (testState === 'checking') {
                    expect(events).to.have.length(8);

                    //find out the new node paths
                    for (i = 1; i < events.length; i++) {
                        if (initialPaths.indexOf(events[i].eid) === -1) {
                            expect(events[i].etype).to.equal('load');
                            if (client.getNode(events[i].eid).getAttribute('name') === 'check-copy') {
                                newTarget = events[i].eid;
                            } else {
                                newPaths.push(events[i].eid);
                            }
                        }
                    }

                    expect(newPaths).to.have.length(2);
                    expect(newTarget).not.to.equal(null);

                    //the source nodes should be intact
                    node = client.getNode('/1697300825');
                    expect(node).not.to.equal(null);
                    expect(node.getPointer('ptr')).to.deep.equal({to: '/323573539', from: []});

                    node = client.getNode('/1400778473');
                    expect(node).not.to.equal(null);
                    expect(node.getPointer('ptr')).to.deep.equal({to: '/323573539', from: []});

                    node = client.getNode('/323573539');
                    expect(node).not.to.equal(null);
                    expect(node.getAttribute('name')).to.equal('check');

                    //the copies keep the target
                    node = client.getNode(newPaths[0]);
                    expect(node).not.to.equal(null);
                    expect(node.getAttribute('name')).to.contain('copy');
                    expect(node.getPointer('ptr')).to.deep.equal({to: newTarget, from: []});

                    node = client.getNode(newPaths[1]);
                    expect(node).not.to.equal(null);
                    expect(node.getAttribute('name')).to.contain('copy');
                    expect(node.getPointer('ptr')).to.deep.equal({to: newTarget, from: []});

                    node = client.getNode(newTarget);
                    expect(node).not.to.equal(null);
                    expect(node.getAttribute('name')).to.contain('copy');
                    expect(node.getRegistry('position')).to.deep.equal({x: 400, y: 400});
                    expect(node.getBaseId()).to.equal('/323573539');
                }
            });
        });

        it('should move the given nodes', function (done) {
            var testState = 'init',
                testId = 'basicMoveNodes',
                node,
                first = true,
                branchStatusHandler = function (status /*, commitQueue, updateQueue*/) {
                    console.log(status);
                    if (status === client.CONSTANTS.BRANCH_STATUS.AHEAD_SYNC) {
                        if (first) {
                            first = false;
                        } else {
                            done();
                        }
                    }
                },
                containerId = null,
                initialPaths = [],
                extendedTerritory,
                i;

            currentTestId = testId;

            buildUpForTest(testId, {'': {children: 1}}, branchStatusHandler, function (events) {
                if (testState === 'init') {
                    testState = 'containerCreated';

                    expect(events).to.have.length(8);
                    expect(events).to.include({eid: '/1697300825', etype: 'load'});
                    expect(events).to.include({eid: '/1400778473', etype: 'load'});
                    expect(events).to.include({eid: '/701504349', etype: 'load'});

                    for (i = 1; i < events.length; i++) {
                        initialPaths.push(events[i].eid);
                    }

                    client.createChild({
                        parentId: '',
                        baseId: '/701504349'
                    }, 'move nodes test - create container');
                    return;
                }

                if (testState === 'containerCreated') {
                    testState = 'territoryExtended';

                    expect(events).to.have.length(4);

                    for (i = 1; i < events.length; i++) {
                        if (initialPaths.indexOf(events[i].eid) === -1) {
                            expect(events[i].etype).to.equal('load');
                            if (containerId === null) {
                                containerId = events[i].eid;
                            } else {
                                throw new Error('only one new element is expected!!');
                            }
                        }
                    }

                    extendedTerritory = {'': {children: 1}};
                    extendedTerritory[containerId] = {children: 1};
                    client.updateTerritory(testId, extendedTerritory);
                    return;
                }

                if (testState === 'territoryExtended') {
                    testState = 'final';

                    expect(events).to.have.length(1);

                    client.startTransaction();
                    client.moveMoreNodes({
                        parentId: containerId,
                        '/1697300825': {attributes: {name: 'member1moved'}, registry: {position: {x: 500, y: 600}}},
                        '/1400778473': {attributes: {name: 'member2moved'}}
                    });
                    client.completeTransaction('move nodes test - move nodes');
                    return;
                }

                if (testState === 'final') {
                    //FIXME: extra events from version upgrade
                    //expect(events).to.have.length(9);
                    expect(events).to.include({eid: '/1697300825', etype: 'unload'});
                    expect(events).to.include({eid: '/1400778473', etype: 'unload'});
                    expect(events).to.include({eid: containerId + '/1697300825', etype: 'load'});
                    expect(events).to.include({eid: containerId + '/1400778473', etype: 'load'});

                    node = client.getNode(containerId + '/1697300825');
                    expect(node).not.to.equal(null);
                    expect(node.getPointer('ptr')).to.deep.equal({to: '/323573539', from: []});
                    expect(node.getAttribute('name')).to.contain('moved');
                    expect(node.getRegistry('position')).to.deep.equal({x: 500, y: 600});

                    node = client.getNode(containerId + '/1400778473');
                    expect(node).not.to.equal(null);
                    expect(node.getPointer('ptr')).to.deep.equal({to: '/323573539', from: []});
                    expect(node.getAttribute('name')).to.contain('moved');
                    expect(node.getRegistry('position')).to.deep.equal({x: 79, y: 704});
                }
            });
        });

        it('should add or modify a constraint', function (done) {
            var testState = 'init',
                testId = 'basicSetConstraint',
                node,
                branchStatusHandler = function (status /*, commitQueue, updateQueue*/) {
                    if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                        done();
                    }
                },
                constraint = null;

            currentTestId = testId;

            buildUpForTest(testId, {'/1400778473': {children: 0}}, branchStatusHandler, function (events) {
                if (testState === 'init') {
                    testState = 'checking';

                    expect(events).to.have.length(2);
                    expect(events).to.include({eid: '/1400778473', etype: 'load'});

                    node = client.getNode('/1400778473');
                    expect(node).not.to.equal(null);
                    expect(node.getConstraintNames()).to.have.members(['constraint', 'meta']);
                    expect(node.getOwnConstraintNames()).to.empty;

                    client.setConstraint('/1400778473', 'myNewConstraint', {
                        info: 'just a plain constraint',
                        script: 'function(core,node,callback){callback(new Error(\'not implemented\'};',
                        priority: 11
                    });
                    return;
                }

                if (testState === 'checking') {
                    expect(events).to.have.length(2);
                    expect(events).to.include({eid: '/1400778473', etype: 'update'});

                    //the copies keep the target
                    node = client.getNode(events[1].eid);
                    expect(node).not.to.equal(null);
                    expect(node.getConstraintNames()).to.include('myNewConstraint');
                    expect(node.getOwnConstraintNames()).to.deep.equal(['myNewConstraint']);

                    constraint = node.getConstraint('myNewConstraint');
                    expect(constraint).not.to.equal(null);
                    expect(constraint).to.deep.equal({
                        info: 'just a plain constraint',
                        script: 'function(core,node,callback){callback(new Error(\'not implemented\'};',
                        priority: 11
                    });
                }
            });
        });

        it('should remove the constraint from the node data', function (done) {
            // delConstraint 701504349
            var testState = 'init',
                testId = 'basicDelConstraint',
                branchStatusHandler = function (status /*, commitQueue, updateQueue*/) {
                    if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                        done();
                    }
                },
                node;

            currentTestId = testId;

            buildUpForTest(testId, {'/701504349': {children: 0}}, branchStatusHandler, function (events) {
                if (testState === 'init') {
                    testState = 'checking';

                    expect(events).to.have.length(2);
                    expect(events).to.include({eid: '/701504349', etype: 'load'});

                    node = client.getNode('/701504349');
                    expect(node).not.to.equal(null);
                    expect(node.getConstraintNames()).to.have.members(['constraint', 'meta']);
                    expect(node.getOwnConstraintNames()).to.deep.equal(['constraint']);

                    client.delConstraint('/701504349', 'constraint');
                    return;
                }

                if (testState === 'checking') {
                    expect(events).to.have.length(2);
                    expect(events).to.include({eid: '/701504349', etype: 'update'});

                    //the copies keep the target
                    node = client.getNode(events[1].eid);
                    expect(node).not.to.equal(null);
                    expect(node.getConstraintNames()).not.to.include('constraint');
                    expect(node.getOwnConstraintNames()).to.empty;
                }
            });
        });

        it('should add the given node as a new member to the specified set of our node', function (done) {
            var testState = 'init',
                testId = 'basicAddMember',
                branchStatusHandler = function (status /*, commitQueue, updateQueue*/) {
                    if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                        done();
                    }
                },
                node;

            currentTestId = testId;

            buildUpForTest(testId, {'/323573539': {children: 0}, '/1697300825': {children: 0}}, branchStatusHandler,
                function (events) {
                    if (testState === 'init') {
                        testState = 'checking';

                        expect(events).to.have.length(3,
                            '[first] should add the given node as a new member to the specified set of our node');
                        expect(events).to.include({eid: '/323573539', etype: 'load'});
                        expect(events).to.include({eid: '/1697300825', etype: 'load'});

                        node = client.getNode('/323573539');
                        expect(node).not.to.equal(null);
                        expect(node.getSetNames()).not.to.include.members(['newSet']);

                        client.addMember('/323573539', '/1697300825', 'newSet', 'basic add member test');
                        return;
                    }

                    if (testState === 'checking') {
                        expect(events).to.have.length(3,
                            '[second] should add the given node as a new member to the specified set of our node');

                        node = client.getNode('/323573539');
                        expect(node).not.to.equal(null);
                        expect(node.getMemberIds('newSet')).to.deep.equal(['/1697300825']);
                    }
                }
            );
        });

        it('should remove the given member of the specified set of the node', function (done) {
            var testState = 'init',
                testId = 'basicRemoveMember',
                branchStatusHandler = function (status /*, commitQueue, updateQueue*/) {
                    if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                        done();
                    }
                },
                node;

            currentTestId = testId;

            buildUpForTest(testId, {'/323573539': {children: 0}, '/1697300825': {children: 0}}, branchStatusHandler,
                function (events) {
                    if (testState === 'init') {
                        testState = 'checking';

                        expect(events).to.have.length(3,
                            '[first] should remove the given member of the specified set of the node');
                        expect(events).to.include({eid: '/323573539', etype: 'load'});
                        expect(events).to.include({eid: '/1697300825', etype: 'load'});

                        node = client.getNode('/323573539');
                        expect(node).not.to.equal(null);
                        expect(node.getMemberIds('set')).to.include('/1697300825');

                        client.removeMember('/323573539', '/1697300825', 'set', 'basic remove member test');
                        return;
                    }

                    if (testState === 'checking') {
                        expect(events).to.have.length(3,
                            '[second] should remove the given member of the specified set of the node');

                        node = client.getNode('/323573539');
                        expect(node).not.to.equal(null);
                        expect(node.getMemberIds('set')).not.to.include('/1697300825');
                    }
                }
            );
        });

        it('should set the given attribute of the specified member of the set', function (done) {
            var testState = 'init',
                testId = 'basicSetMemberAttribute',
                branchStatusHandler = function (status /*, commitQueue, updateQueue*/) {
                    if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                        done();
                    }
                },
                node;

            currentTestId = testId;

            buildUpForTest(testId, {'/323573539': {children: 0}, '/1697300825': {children: 0}}, branchStatusHandler,
                function (events) {
                    if (testState === 'init') {
                        testState = 'checking';

                        expect(events).to.have.length(3,
                            'should set the given attribute of the specified member of the set');
                        expect(events).to.include({eid: '/323573539', etype: 'load'});
                        expect(events).to.include({eid: '/1697300825', etype: 'load'});

                        node = client.getNode('/323573539');
                        expect(node).not.to.equal(null);
                        expect(node.getMemberIds('set')).to.include('/1697300825');

                        client.setMemberAttribute('/323573539',
                            '/1697300825',
                            'set',
                            'name',
                            'set member',
                            'basic set member attribute test');
                        return;
                    }

                    if (testState === 'checking') {
                        expect(events).to.have.length(2);

                        node = client.getNode('/323573539');
                        expect(node).not.to.equal(null);
                        expect(node.getMemberIds('set')).to.include('/1697300825');
                        expect(node.getMemberAttributeNames('set', '/1697300825')).to.include('name');
                        expect(node.getEditableMemberAttribute('set', '/1697300825', 'name')).to.equal('set member');

                    }
                }
            );
        });

        it('should remove the specific attribute of the set member', function (done) {
            var testState = 'init',
                testId = 'basicDelMemberAttribute',
                first = true,
                branchStatusHandler = function (status /*, commitQueue, updateQueue*/) {
                    console.log(status);
                    if (status === client.CONSTANTS.BRANCH_STATUS.AHEAD_SYNC) {
                        if (first) {
                            first = false;
                        } else {
                            done();
                        }
                    }
                },
                node;

            currentTestId = testId;

            buildUpForTest(testId, {'/323573539': {children: 0}, '/1697300825': {children: 0}}, branchStatusHandler,
                function (events) {
                    if (testState === 'init') {
                        testState = 'add';
                        expect(events).to.have.length(3,
                            'should remove the specific attribute of the set member');
                        expect(events).to.include({eid: '/323573539', etype: 'load'});
                        expect(events).to.include({eid: '/1697300825', etype: 'load'});

                        node = client.getNode('/323573539');
                        expect(node).not.to.equal(null);
                        expect(node.getMemberIds('set')).to.include('/1697300825');

                        client.setMemberAttribute('/323573539',
                            '/1697300825',
                            'set',
                            'name',
                            'set membero',
                            'basic del member attribute test - set');
                        return;
                    }

                    if (testState === 'add') {
                        testState = 'del';
                        expect(events).to.have.length(2);
                        node = client.getNode('/323573539');
                        expect(node).not.to.equal(null);
                        expect(node.getMemberIds('set')).to.include('/1697300825');
                        expect(node.getMemberAttributeNames('set', '/1697300825')).to.include('name');
                        expect(node.getMemberAttribute('set', '/1697300825', 'name')).to.equal('set membero');

                        client.delMemberAttribute('/323573539',
                            '/1697300825',
                            'set',
                            'name',
                            'basic del member attribute test - del');
                        return;
                    }

                    if (testState === 'del') {
                        expect(events).to.have.length(2);
                        node = client.getNode('/323573539');
                        expect(node).not.to.equal(null);
                        expect(node.getMemberIds('set')).to.include('/1697300825');
                        expect(node.getMemberAttributeNames('set', '/1697300825')).not.to.include('name');
                        expect(node.getMemberAttribute('set', '/1697300825', 'name')).to.equal(undefined);
                    }
                });
        });

        it('should set the given registry key of the set member', function (done) {
            var testState = 'init',
                testId = 'basicSetMemberRegistry',
                branchStatusHandler = function (status /*, commitQueue, updateQueue*/) {
                    if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                        done();
                    }
                },
                node;

            currentTestId = testId;

            buildUpForTest(testId, {'/323573539': {children: 0}, '/1697300825': {children: 0}}, branchStatusHandler,
                function (events) {
                    if (testState === 'init') {
                        testState = 'checking';

                        expect(events).to.have.length(3, 'should set the given registry key of the set member');
                        expect(events).to.include({eid: '/323573539', etype: 'load'});
                        expect(events).to.include({eid: '/1697300825', etype: 'load'});

                        node = client.getNode('/323573539');
                        expect(node).not.to.equal(null);
                        expect(node.getMemberIds('set')).to.include('/1697300825');

                        client.setMemberRegistry('/323573539',
                            '/1697300825',
                            'set',
                            'name',
                            'set member',
                            'basic set member registry test');
                        return;
                    }

                    if (testState === 'checking') {
                        expect(events).to.have.length(2);

                        node = client.getNode('/323573539');
                        expect(node).not.to.equal(null);
                        expect(node.getMemberIds('set')).to.include('/1697300825');
                        expect(node.getMemberRegistryNames('set', '/1697300825')).to.include('name');
                        expect(node.getMemberRegistry('set', '/1697300825', 'name')).to.equal('set member');

                    }
                }
            );
        });

        it('should remove the specified registry key of the set member', function (done) {
            var testState = 'init',
                testId = 'basicDelMemberRegistry',
                first = true,
                branchStatusHandler = function (status /*, commitQueue, updateQueue*/) {
                    console.log(status);
                    if (status === client.CONSTANTS.BRANCH_STATUS.AHEAD_SYNC) {
                        if (first) {
                            first = false;
                        } else {
                            done();
                        }
                    }
                },
                node;

            currentTestId = testId;

            buildUpForTest(testId, {'/323573539': {children: 0}, '/1697300825': {children: 0}}, branchStatusHandler,
                function (events) {
                    if (testState === 'init') {
                        testState = 'add';

                        expect(events).to.have.length(3,
                            '[first] should remove the specified registry key of the set member');
                        expect(events).to.include({eid: '/323573539', etype: 'load'});
                        expect(events).to.include({eid: '/1697300825', etype: 'load'});

                        node = client.getNode('/323573539');
                        expect(node).not.to.equal(null);
                        expect(node.getMemberIds('set')).to.include('/1697300825');

                        client.setMemberRegistry('/323573539',
                            '/1697300825',
                            'set',
                            'name',
                            'set membere',
                            'basic del member registry test - set');
                        return;
                    }

                    if (testState === 'add') {
                        testState = 'del';
                        expect(events).to.have.length(2,
                            '[second] should remove the specified registry key of the set member');

                        node = client.getNode('/323573539');
                        expect(node).not.to.equal(null);
                        expect(node.getMemberIds('set')).to.include('/1697300825');
                        expect(node.getMemberRegistryNames('set', '/1697300825')).to.include('name');
                        expect(node.getMemberRegistry('set', '/1697300825', 'name')).to.equal('set membere');

                        client.delMemberRegistry('/323573539',
                            '/1697300825',
                            'set',
                            'name',
                            'basic del member registry test - del');
                        return;
                    }

                    if (testState === 'del') {
                        expect(events).to.have.length(2,
                            '[thrid] should remove the specified registry key of the set member');

                        node = client.getNode('/323573539');
                        expect(node).not.to.equal(null);
                        expect(node.getMemberIds('set')).to.include('/1697300825');
                        expect(node.getMemberRegistryNames('set', '/1697300825')).not.to.include('name');
                        expect(node.getMemberRegistry('set', '/1697300825', 'name')).to.equal(undefined);
                    }
                });
        });

        it('should create an empty set for the node with the given name', function (done) {
            var testState = 'init',
                testId = 'basicCreateSet',
                branchStatusHandler = function (status /*, commitQueue, updateQueue*/) {
                    if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                        done();
                    }
                },
                node;

            currentTestId = testId;

            buildUpForTest(testId, {'/323573539': {children: 0}}, branchStatusHandler, function (events) {
                if (testState === 'init') {
                    testState = 'checking';

                    expect(events).to.have.length(2);
                    expect(events).to.include({eid: '/323573539', etype: 'load'});

                    node = client.getNode('/323573539');
                    expect(node).not.to.equal(null);
                    expect(node.getSetNames()).not.to.include('newSet');

                    client.createSet('/323573539', 'newSet', 'basic create set test');
                    return;
                }

                if (testState === 'checking') {
                    expect(events).to.have.length(2);

                    node = client.getNode('/323573539');
                    expect(node).not.to.equal(null);
                    expect(node.getSetNames()).to.include('newSet');
                    expect(node.getMemberIds('newSet')).to.empty;
                }
            });
        });

        it('should remove the given set of the node', function (done) {
            var testState = 'init',
                testId = 'basicDeleteSet',
                branchStatusHandler = function (status /*, commitQueue, updateQueue*/) {
                    if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                        done();
                    }
                },
                node;

            currentTestId = testId;

            buildUpForTest(testId, {'/323573539': {children: 0}, '/701504349': {children: 0}}, branchStatusHandler,
                function (events) {
                    if (testState === 'init') {
                        testState = 'checking';

                        expect(events).to.have.length(3,
                            '[first] should remove the given set of the node');
                        expect(events).to.include({eid: '/323573539', etype: 'load'});
                        expect(events).to.include({eid: '/701504349', etype: 'load'});

                        node = client.getNode('/323573539');
                        expect(node).not.to.equal(null);
                        expect(node.getSetNames()).to.include('set');
                        expect(node.getMemberIds('set')).not.to.empty;

                        node = client.getNode('/701504349');
                        expect(node).not.to.equal(null);
                        expect(node.getSetNames()).to.include('set');
                        client.deleteSet('/701504349', 'set', 'basic delete set test');
                        return;
                    }

                    if (testState === 'checking') {
                        expect(events).to.have.length(3,
                            '[second] should remove the given set of the node');

                        node = client.getNode('/701504349');
                        expect(node).not.to.equal(null);
                        expect(node.getSetNames()).not.to.include('set');
                        expect(node.getMemberIds('set')).to.empty;

                        node = client.getNode('/323573539');
                        expect(node).not.to.equal(null);
                        //FIXME probably this set should be also removed, although it was overwritten
                        //expect(node.getSetNames()).not.to.include('set');
                        //expect(node.getMemberIds('set')).to.empty;
                    }
                }
            );
        });

        it('should change the ancestor of the given node', function (done) {
            var testState = 'init',
                testId = 'basicSetBase',
                node,
                branchStatusHandler = function (status /*, commitQueue, updateQueue*/) {
                    if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                        done();
                    }
                },
                newId = null;

            currentTestId = testId;

            buildUpForTest(testId, {'': {children: 1}}, branchStatusHandler, function (events) {

                if (testState === 'init') {
                    testState = 'checking';
                    expect(events).to.have.length(8);
                    expect(events).to.include({eid: '', etype: 'load'});
                    expect(events).to.include({eid: '/1', etype: 'load'});
                    expect(events).to.include({eid: '/701504349', etype: 'load'});

                    client.startTransaction();
                    newId = client.createChild({parentId: '', baseId: '/1'}, 'create a node - instance of FCO');

                    expect(newId).not.to.equal(null);
                    node = client.getNode(newId);
                    expect(node).not.to.equal(null);
                    expect(node.getAttribute('name')).to.equal('FCO');
                    expect(node.getBaseId()).to.equal('/1');

                    client.setBase(newId, '/701504349');
                    client.completeTransaction('basic set base test', function (err) {
                        expect(err).to.equal(null);
                        //done();
                    });

                    return;
                }

                if (testState === 'checking') {
                    expect(events).to.have.length(4);
                    expect(events).to.include({eid: newId, etype: 'load'});

                    node = client.getNode(newId);
                    expect(node).not.to.equal(null);
                    expect(node.getAttribute('name')).to.equal('node');
                    expect(node.getBaseId()).to.equal('/701504349');
                    expect(node.getAttributeNames()).to.include('value');
                }
            });
        });

        it('should remove the ancestor of the given node', function (done) {
            // TODO should we remove this from the 'public' API
            var testState = 'init',
                testId = 'basicDelBase',
                node,
                newId = null;

            currentTestId = testId;

            buildUpForTest(testId, {'': {children: 1}}, null, function (events) {

                if (testState === 'init') {
                    testState = 'checking';
                    expect(events).to.have.length(8);
                    expect(events).to.include({eid: '', etype: 'load'});
                    expect(events).to.include({eid: '/1', etype: 'load'});

                    client.startTransaction();
                    newId = client.createChild({parentId: '', baseId: '/1'}, 'create a node - instance of FCO');

                    expect(newId).not.to.equal(null);
                    node = client.getNode(newId);
                    expect(node).not.to.equal(null);
                    expect(node.getAttribute('name')).to.equal('FCO');
                    expect(node.getBaseId()).to.equal('/1');

                    client.delBase(newId);
                    client.completeTransaction('basic del base test', function (err) {
                        expect(err).to.equal(null);
                        done();
                    });

                    return;
                }

                if (testState === 'checking') {
                    expect(events).to.have.length(3);
                    expect(events).to.include({eid: newId, etype: 'load'});

                    node = client.getNode(newId);
                    expect(node).not.to.equal(null);
                    expect(node.getAttribute('name')).to.equal(undefined);
                    expect(node.getBaseId()).to.equal(null);
                    expect(node.getAttributeNames()).to.empty;

                }
            });
        });

    });

    describe('undo-redo tests', function () {
        var Client,
            gmeConfig,
            client,
            projectId,
            projectName = 'undoRedoTests',
            baseCommitHash;

        function buildUpForTest(branchName, patternObject, eventCallback) {
            //creates a branch then a UI for it, finally waits for the nodes to load
            client.createBranch(projectId, branchName, baseCommitHash, function (err) {
                expect(err).to.equal(null);

                client.selectBranch(branchName, null, function (err) {
                    expect(err).to.equal(null);

                    client.updateTerritory(client.addUI({}, eventCallback, branchName), patternObject);
                });
            });
        }

        before(function (done) {
            this.timeout(10000);
            requirejs(['js/client', 'text!gmeConfig.json'], function (Client_, gmeConfigJSON) {
                Client = Client_;
                gmeConfig = JSON.parse(gmeConfigJSON);
                client = new Client(gmeConfig);
                projectId = projectName2Id(projectName, gmeConfig, client);
                client.connectToDatabase(function (err) {
                    expect(err).to.equal(null);
                    client.selectProject(projectId, null, function (err) {
                        expect(err).to.equal(null);

                        baseCommitHash = client.getActiveCommitHash();
                        done();
                    });
                });
            });
        });

        it('should not allow undo as there is no modification in the client\'s branch', function (done) {
            var testId = 'noUndoTest';
            buildUpForTest(testId, {'/323573539': {children: 0}}, function (events) {
                //we should only receive events once at the init
                expect(events).to.have.length(2);
                expect(events[1]).to.deep.equal({eid: '/323573539', etype: 'load'});

                client.undo(client.getActiveBranchName(), function (err) {
                    expect(err).not.to.equal(null);
                    expect(err.message).to.contain('unable');

                    client.removeUI(testId);
                    done();
                });
            });
        });

        it('should not allow redo as we are at the latest commit by default', function (done) {
            var testId = 'noRedoTest';
            buildUpForTest(testId, {'/323573539': {children: 0}}, function (events) {
                //we should only receive events once at the init
                expect(events).to.have.length(2);
                expect(events[1]).to.deep.equal({eid: '/323573539', etype: 'load'});

                client.redo(client.getActiveBranchName(), function (err) {
                    expect(err).not.to.equal(null);
                    expect(err.message).to.contain('unable');

                    client.removeUI(testId);
                    done();
                });
            });
        });

        //TODO something is just not right with the karma framework, at some point the database screws up
        //FIXME
        it.skip('should allow to undo if we modified the project', function (done) {
            this.timeout(20000);
            var testId = 'basicUndoTest',
                testSate = 'init',
                node,
                undoExecuted = false,
                undoAvailable = function (clientObject, isAvailable) {
                    if (isAvailable && !undoExecuted) {
                        undoExecuted = true;
                        client.undo(client.getActiveBranchName(), function (err) {
                            expect(err).to.equal(null);

                            client.removeEventListener(client.events.UNDO_AVAILABLE, undoAvailable);
                            client.removeUI(testId);
                            done();
                        });
                    }
                };

            //first we add an event listener for the undo event
            client.addEventListener(client.events.UNDO_AVAILABLE, undoAvailable);

            buildUpForTest(testId, {'/323573539': {children: 0}}, function (events) {
                if (testSate === 'init') {
                    testSate = 'modify';

                    expect(events).to.have.length(2);
                    expect(events[1]).to.deep.equal({eid: '/323573539', etype: 'load'});

                    node = client.getNode(events[1].eid);
                    expect(node).not.to.equal(null);
                    expect(node.getOwnEditableAttribute('name')).to.equal('check');

                    client.setAttributes(events[1].eid, 'name', 'cm', 'undo test - modify something');
                    return;
                }

                if (testSate === 'modify') {
                    testSate = 'undo';
                    expect(events).to.have.length(2);
                    expect(events[1]).to.deep.equal({eid: '/323573539', etype: 'update'});

                    node = client.getNode(events[1].eid);
                    expect(node).not.to.equal(null);
                    expect(node.getOwnEditableAttribute('name')).to.equal('cm');
                    return;
                }

                if (testSate === 'undo') {
                    console.warn('we were here');
                    testSate = null;
                    expect(events).to.have.length(2);
                    expect(events[1]).to.deep.equal({eid: '/323573539', etype: 'update'});
                    node = client.getNode(events[1].eid);
                    expect(node).not.to.equal(null);
                    expect(node.getOwnEditableAttribute('name')).to.equal('check');

                    return;
                }

                done(new Error('some unexpected events received:' + events));
            });
        });

    });

    describe('import functions', function () {
        it.skip('should update the given library (sub-tree) with the specified import json', function () {
            // updateLibraryAsync

        });

        it.skip('should import the given library (sub-tree) from the specified json', function () {
            // addLibraryAsync

        });
        it.skip('should import a node (or a whole sub-tree) into the given container from the specified json',
            function () {
                // importNodeAsync

            });

        it.skip(' should merge the given node (or sub-tree) and the specified json', function () {
            // mergeNodeAsync

        });

        it.skip(' should create a project from the given json', function () {
            // createProjectFromFileAsync

        });

    });

    //TODO add only proxied functions
    describe('meta rule query and setting tests', function () {
        var Client,
            gmeConfig,
            client,
            currentTestId,
            projectId,
            projectName = 'metaQueryAndManipulationTest',
            baseCommitHash;

        function prepareBranchForTest(branchName, branchStatusHandler, next) {
            //creates a branch then a UI for it, finally waits for the nodes to load
            currentTestId = branchName;
            client.createBranch(projectId, branchName, baseCommitHash, function (err) {
                expect(err).to.equal(null);

                client.selectBranch(branchName, null, function (err) {
                    expect(err).to.equal(null);

                    //now we should load all necessary node, possibly in one step to allow the synchronous execution
                    //we handle only the first incoming set of events to not cause any confusion
                    var alreadyHandled = false;
                    client.updateTerritory(client.addUI({}, function (events) {
                        if (!alreadyHandled) {
                            expect(events).to.have.length(12);
                            expect(events[0]).to.contain.keys('eid', 'etype');
                            expect(events[0].etype).to.equal('complete');
                            if (branchStatusHandler) {
                                client.getProjectObject().branches[branchName]
                                    .addBranchStatusHandler(branchStatusHandler);
                            }
                            alreadyHandled = true;
                            next(null);
                        }
                    }, branchName), {'': {children: 1}});
                });
            });
        }

        before(function (done) {
            this.timeout(10000);
            requirejs(['js/client', 'text!gmeConfig.json'], function (Client_, gmeConfigJSON) {
                Client = Client_;
                gmeConfig = JSON.parse(gmeConfigJSON);
                client = new Client(gmeConfig);
                projectId = projectName2Id(projectName, gmeConfig, client);
                client.connectToDatabase(function (err) {
                    expect(err).to.equal(null);
                    client.selectProject(projectId, null, function (err) {
                        expect(err).to.equal(null);

                        baseCommitHash = client.getActiveCommitHash();
                        done();
                    });
                });
            });
        });

        after(function (done) {
            client.disconnectFromDatabase(done);
        });

        afterEach(function (done) {
            var branchHash = client.getActiveCommitHash();
            client.removeUI(currentTestId);
            client.selectBranch('master', null, function (err) {
                if (err) {
                    done(err);
                    return;
                }
                client.deleteBranch(projectId, currentTestId, branchHash, done);
            });
        });

        it('should return the meta rules of the given node in a json format', function (done) {
            prepareBranchForTest('simpleGet', null, function (err) {
                expect(err).to.equal(null);

                expect(client.getMeta('/1')).to.deep.equal({
                    attributes: {
                        name: {
                            type: 'string'
                        }
                    },
                    children: {
                        minItems: [],
                        maxItems: [],
                        items: []
                    },
                    pointers: {},
                    aspects: {},
                    "constraints": {
                        "meta": {
                            "script": "function(core, node, callback) {\n    \"use strict\";\n    var error = null,\n        returnValue = {hasViolation:false,message:\"\"},\n        i,\n        neededChekings = 4,\n        meta = core.getJsonMeta(node),\n        typeIndexOfChild = function(typePathsArray,childNode){\n            var index = -1;\n\n            while(childNode && index === -1){\n                index = typePathsArray.indexOf(core.getPath(childNode));\n                childNode = core.getBase(childNode);\n            }\n\n            return index;\n        },\n        checkChildrenRules = function(){\n            var childCount = [],\n                index;\n            core.loadChildren(node,function(err,children){\n                if(err){\n                    returnValue.message += \"error during loading of node\\'s children\\n\";\n                    error = error || err;\n                    return checkingDone();\n                }\n\n                //global count check\n                //min\n                if(meta.children.min && meta.children.min !== -1){\n                    if(children.length < meta.children.min){\n                        returnValue.hasViolation = true;\n                        returnValue.message += \"node hase fewer nodes than needed\\n\";\n                    }\n                }\n                //max\n                if(meta.children.max && meta.children.max !== -1){\n                    if(children.length > meta.children.max){\n                        returnValue.hasViolation = true;\n                        returnValue.message += \"node hase more nodes than allowed\\n\";\n                    }\n                }\n\n                //typedCounts\n                for(i=0;i<meta.children.items.length;i++){\n                    childCount.push(0);\n                }\n                for(i=0;i<children.length;i++){\n                    index = typeIndexOfChild(meta.children.items,children[i]);\n                    if(index === -1 ){\n                        returnValue.hasViolation = true;\n                        returnValue.message += \"child \" + core.getGuid(children[i]) +\" is from prohibited type\\n\";\n                    }\n                    else {\n                        childCount[index]++;\n                    }\n                }\n                for(i=0;i<meta.children.items.length;i++){\n                    //min\n                    if(meta.children.minItems[i] !== -1){\n                        if(meta.children.minItems[i] > childCount[i]){\n                            returnValue.hasViolation = true;\n                            returnValue.message += \"too few type \"+ meta.children.items[i] +\" children\\n\";\n                        }\n                    }\n                    //max\n                    if(meta.children.maxItems[i] !== -1){\n                        if(meta.children.maxItems[i] < childCount[i]){\n                            returnValue.hasViolation = true;\n                            returnValue.message += \"too many type \"+ meta.children.items[i] +\" children\\n\";\n                        }\n                    }\n                }\n                return checkingDone();\n            });\n        },\n        checkPointerRules = function(){\n            //TODO currently there is no quantity check\n            var validNames = core.getValidPointerNames(node),\n                names = core.getPointerNames(node),\n                checkPointer = function(name){\n                    core.loadPointer(node,name,function(err,target){\n                        if(err || !target){\n                            error = error || err;\n                            returnValue.message += \"error during pointer \"+ name +\" load\\n\";\n                            return checkDone();\n                        }\n\n                        if(!core.isValidTargetOf(target,node,name)){\n                            returnValue.hasViolation = true;\n                            returnValue.message += \"target of pointer \"+ name +\" is invalid\\n\";\n                        }\n                        return checkDone();\n                    });\n                },\n                checkDone = function(){\n                    if(--needs === 0){\n                        checkingDone();\n                    }\n                },\n                needs,i;\n            \n            needs = names.length;\n            if(needs > 0){\n                for(i=0;i<names.length;i++){\n                    if(validNames.indexOf(names[i]) === -1){\n                        returnValue.hasViolation = true;\n                        returnValue.message += \" invalid pointer \"+ names[i] +\" has been found\\n\";\n                        checkDone();\n                    } else {\n                        checkPointer(names[i]);\n                    }\n\n                }\n            } else {\n                checkDone();\n            }\n\n        },\n        checkSetRules = function(){\n            //TODO this part is missing yet\n            checkingDone();\n        },\n        checkAttributeRules = function(){\n            var names = core.getAttributeNames(node),\n                validNames = core.getValidAttributeNames(node);\n            for(i=0;i<names.length;i++){\n                if(validNames.indexOf(names[i]) !== -1){\n                    if(!core.isValidAttributeValueOf(node,names[i],core.getAttribute(node,names[i]))){\n                        returnValue.hasViolation = true;\n                        returnValue.message += \"attribute \"+names[i]+\" has invalid value\\n\";\n                    }\n                }\n                else {\n                    returnValue.hasViolation = true;\n                    returnValue.message += \"node has an undefined attribute: \"+names[i];\n                }\n            }\n            checkingDone();\n        },\n        checkingDone = function(){\n            if(--neededChekings === 0){\n                callback(error,returnValue);\n            }\n        };\n\n    checkChildrenRules();\n    checkPointerRules();\n    checkSetRules();\n    checkAttributeRules();\n}",
                            "priority": 10,
                            "info": "this constraint will check all the meta rules defined to an object"
                        }
                    }
                });
                done();
            });

        });

        it('should return the flattened meta rules of a node in json format', function (done) {
            prepareBranchForTest('inheritedGet', null, function (err) {
                expect(err).to.equal(null);
                var metaRules = client.getMeta('/1865460677');
                //FIXME: this fails on my machine /patrik

                expect(metaRules).to.have.keys('attributes', 'aspects', 'pointers', 'children', 'constraints');
                expect(metaRules.attributes).to.deep.equal({
                    name: {
                        type: 'string'
                    }
                });
                expect(metaRules.pointers).to.deep.equal({});
                expect(metaRules.aspects).to.deep.equal({
                    onlyOne: ['/1730437907']
                });
                expect(metaRules.children).to.include.keys('items', 'minItems', 'maxItems');
                expect(metaRules.children.min).to.equal(undefined);
                expect(metaRules.children.max).to.equal(undefined);
                expect(metaRules.children.maxItems).to.deep.equal([-1, -1]);
                expect(metaRules.children.minItems).to.deep.equal([-1, -1]);
                expect(metaRules.children.items).to.have.members(['/1730437907', '/1687616515']);
                done();
            });
        });

        it('should return null if the object is not loaded', function (done) {
            prepareBranchForTest('unknownGet', null, function (err) {
                expect(err).to.equal(null);

                expect(client.getMeta('/42/42')).to.equal(null);
                done();
            });
        });

        it('modify an empty ruleset to empty', function (done) {
            var branchStatusHandler = function (status/*, commitQueue, updateQueue*/) {
                if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                    done();
                }
            };
            prepareBranchForTest('noChangeSet', branchStatusHandler, function (err) {
                expect(err).to.equal(null);

                var old = client.getMeta('/1730437907');
                client.setMeta('/1730437907', {});
                expect(client.getMeta('/1730437907')).to.deep.equal(old);
            });
        });

        it('add some rule via setMeta', function (done) {
            var branchStatusHandler = function (status/*, commitQueue, updateQueue*/) {
                if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                    done();
                }
            };
            prepareBranchForTest('addWithSet', branchStatusHandler, function (err) {
                expect(err).to.equal(null);

                var old = client.getMeta('/1730437907'),
                    newAttribute = {type: 'string'};
                client.setMeta('/1730437907', {attributes: {newAttr: newAttribute}});
                //we extend our json format as well
                old.attributes.newAttr = newAttribute;
                expect(client.getMeta('/1730437907')).to.deep.equal(old);
            });
        });

        it('remove some rule via setMeta', function (done) {
            var branchStatusHandler = function (status/*, commitQueue, updateQueue*/) {
                if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                    done();
                }
            };
            prepareBranchForTest('removeWithSet', branchStatusHandler, function (err) {
                expect(err).to.equal(null);

                var meta = client.getMeta('/1');

                expect(meta.attributes).to.contain.keys('name');
                delete meta.attributes.name;
                client.setMeta('/1', meta);
                expect(client.getMeta('/1').attributes).not.to.include.keys('name');

            });
        });

        it('should setAttributeMeta with undefined and still persist correctly node', function (done) {
            var branchStatusHandler = function (status/*, commitQueue, updateQueue*/) {
                if (status === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                    done();
                } else if (status === client.CONSTANTS.BRANCH_STATUS.AHEAD_SYNC) {
                    //locally updating..
                } else {
                    done(new Error(status));
                }
            };
            prepareBranchForTest('setMeta', branchStatusHandler, function (err) {
                expect(err).to.equal(null);
                var attrSchema = {type: 'string', min: undefined, max: undefined, regexp: undefined};
                client.setAttributeMeta('/1730437907', 'newAttribute', attrSchema);
            });
        });

        it.skip('should return the \'children\' portion of the meta rules of the node', function () {
            // getChildrenMeta

        });

        it.skip('should set the \'children\' portion of the meta rules of the node according the given json',
            function () {
                // setChildrenMeta

            });

        it.skip('should return a specific parameter of the children rules', function () {
            // getChildrenMetaAttributes
            //not used - like global min and max

        });

        it.skip('should set a specific parameter of the children rules', function () {
            // setChildrenMetaAttribute
            // not used

        });

        it.skip('should return the directory of valid child types of the node', function () {
            // getValidChildrenItems

        });

        //    updateValidChildrenItem: META.updateValidChildrenItem,
        //    removeValidChildrenItem: META.removeValidChildrenItem,
        //    getAttributeSchema: META.getAttributeSchema,
        //    setAttributeSchema: META.setAttributeSchema,
        //    removeAttributeSchema: META.removeAttributeSchema,
        //    getPointerMeta: META.getPointerMeta,
        //    setPointerMeta: META.setPointerMeta,
        //    getValidTargetItems: META.getValidTargetItems,
        //    updateValidTargetItem: META.updateValidTargetItem,
        //    removeValidTargetItem: META.removeValidTargetItem,
        //    deleteMetaPointer: META.deleteMetaPointer,
        //    getOwnValidChildrenTypes: META.getOwnValidChildrenTypes,
        //    getOwnValidTargetTypes: META.getOwnValidTargetTypes,
        //    isValidChild: META.isValidChild,
        //    isValidTarget: META.isValidTarget,
        //    isValidAttribute: META.isValidAttribute,
        //    getValidChildrenTypes: META.getValidChildrenTypes,
        //    getValidTargetTypes: META.getValidTargetTypes,
        //    hasOwnMetaRules: META.hasOwnMetaRules,
        //    filterValidTarget: META.filterValidTarget,
        //    isTypeOf: META.isTypeOf,
        //    getValidAttributeNames: META.getValidAttributeNames,
        //    getOwnValidAttributeNames: META.getOwnValidAttributeNames,
        //    getMetaAspectNames: META.getMetaAspectNames,
        //    getOwnMetaAspectNames: META.getOwnMetaAspectNames,
        //    getMetaAspect: META.getMetaAspect,
        //    setMetaAspect: META.setMetaAspect,
        //    deleteMetaAspect: META.deleteMetaAspect,
        //    getAspectTerritoryPattern: META.getAspectTerritoryPattern,

    });

    describe('projectSeed', function () {
        var Client,
            gmeConfig,
            client;

        before(function (done) {
            this.timeout(10000);
            requirejs([
                    'js/client',
                    'text!gmeConfig.json'],
                function (Client_, gmeConfigJSON) {
                    Client = Client_;
                    gmeConfig = JSON.parse(gmeConfigJSON);
                    client = new Client(gmeConfig);

                    client.connectToDatabase(function (err) {
                        expect(err).to.equal(null);
                        done();
                    });
                }
            );
        });

        after(function (done) {
            client.disconnectFromDatabase(done);
        });

        it('should seed a project from an existing one', function (done) {
            this.timeout(5000);
            var projectName = 'seedTestBasicMaster',
                seedConfig = {
                    seedName: projectName2Id('projectSeedSingleMaster', gmeConfig, client),
                    projectName: projectName
                },
                projectId = projectName2Id(projectName, gmeConfig, client);

            client.seedProject(seedConfig, function (err, result) {
                expect(err).to.equal(null);
                expect(result.projectId).to.equal(projectId);
                //TODO: Check that the project is there.
                done();
            });
        });

        it('should seed a project from a seed file', function (done) {
            this.timeout(5000);
            var projectName = 'seedTestBasicFile',
                seedConfig = {
                    type: 'file',
                    seedName: 'SignalFlowSystem',
                    projectName: projectName
                },
                projectId = projectName2Id(projectName, gmeConfig, client);

            client.seedProject(seedConfig, function (err, result) {
                expect(err).to.equal(null);
                expect(result.projectId).to.equal(projectId);
                //TODO: Check that the project is there.
                done();
            });
        });

        it.skip('should seed a project and notify watcher', function (done) {
            this.timeout(5000);
            var projectName = 'watcherCreate',
                seedConfig = {
                    type: 'file',
                    seedName: 'EmptyProject',
                    projectName: projectName
                },
                triggered = false,
                handler = function (storage, eventData) {
                    expect(triggered).to.equal(false);
                    expect(eventData).to.not.equal(null);
                    expect(eventData).to.include.keys('etype', 'projectId');
                    expect(eventData.etype).to.equal(client.CONSTANTS.STORAGE.PROJECT_CREATED);
                    expect(eventData.projectId).to.equal(projectId);

                    triggered = true;
                    unwatch();
                },
                unwatch = function () {
                    client.unwatchDatabase(handler, function (err) {
                        expect(err).to.equal(null);
                        client.deleteProject(projectId, function (err) {
                            expect(err).to.equal(null);
                            done(err);
                        });
                    });
                },
                projectId = projectName2Id(projectName, gmeConfig, client);

            //* Triggers eventHandler(storage, eventData) on PROJECT_CREATED and PROJECT_DELETED.
            //*
            //* eventData = {
            //*    etype: PROJECT_CREATED||DELETED,
            //*    projectId: %id of project%
            //* }
            client.watchDatabase(handler, function (err) {
                expect(err).to.equal(null);

                client.seedProject(seedConfig, function (err) {
                    expect(err).to.equal(null);

                });
            });
        });

        it('should seed a project delete it and notify watcher', function (done) {
            this.timeout(5000);
            var projectName = 'watcherDelete',
                seedConfig = {
                    type: 'file',
                    seedName: 'EmptyProject',
                    projectName: projectName
                },
                triggered = false,
                handler = function (storage, eventData) {
                    expect(triggered).to.equal(false);
                    expect(eventData).to.not.equal(null);
                    expect(eventData).to.include.keys('etype', 'projectId');
                    expect(eventData.etype).to.equal(client.CONSTANTS.STORAGE.PROJECT_DELETED);
                    expect(eventData.projectId).to.equal(projectId);

                    triggered = true;
                    unwatch();
                },
                unwatch = function () {
                    client.unwatchDatabase(handler, function (err) {
                        done(err);
                    });
                },
                projectId = projectName2Id(projectName, gmeConfig, client);

            client.seedProject(seedConfig, function (err) {
                expect(err).to.equal(null);

                client.watchDatabase(handler, function (err) {
                    expect(err).to.equal(null);

                    client.deleteProject(projectId, function (err) {
                        expect(err).to.equal(null);
                    });
                });
            });
        });

        it('should seed a project from an existing one\'s given branch', function (done) {
            var projectName = 'seedTestBasicOther',
                seedConfig = {
                    seedName: projectName2Id('projectSeedSingleNonMaster', gmeConfig, client),
                    projectName: projectName,
                    seedBranch: 'other'
                },
                projectId = projectName2Id(projectName, gmeConfig, client);

            client.seedProject(seedConfig, function (err, result) {
                expect(err).to.equal(null);
                expect(result.projectId).to.equal(projectId);
                //TODO: Check that the project is there.
                done();
            });
        });

        it('should not allow to overwrite projects with seed', function (done) {
            var projectName = 'projectSeedSingleMaster',
                seedConfig = {
                    seedName: projectName2Id('projectSeedSingleMaster', gmeConfig, client),
                    projectName: projectName
                };

            client.seedProject(seedConfig, function (err) {
                expect(err).not.to.equal(null);
                console.error('seedProject', err);
                expect(err.message).to.contain('Project already exists');
                //TODO: Check that the project is there.
                done();
            });
        });

        it('should fail to seed from an unknown branch', function (done) {
            var projectName = 'noBranchSeedProject',
                seedConfig = {
                    seedName: projectName2Id('projectSeedSingleMaster', gmeConfig, client),
                    projectName: projectName,
                    seedBranch: 'unknownBranch'
                };

            client.seedProject(seedConfig, function (err) {
                expect(err).not.to.equal(null);

                expect(err.message).to.contain('unknownBranch');

                done();
            });
        });

        it('should fail to seed from an unknown seed file', function (done) {
            var projectName = 'noSeedFileProject',
                seedConfig = {
                    type: 'file',
                    seedName: 'UnknownSeedFile',
                    projectName: projectName
                };

            client.seedProject(seedConfig, function (err) {
                expect(err).not.to.equal(null);

                expect(err.message).to.contain('unknown file seed');

                done();
            });
        });
    });
});