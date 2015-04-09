/*globals requirejs, expect, console, before*/
/* jshint browser: true, mocha: true */
/**
 * @author lattmann / https://github.com/lattmann
 */

var WebGMEGlobal = {};

describe('GME client', function () {
    'use strict';

    var superagent = null;
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


            //eventer related API
            expect(client).to.include.keys(
                'events',
                'networkStates',
                'branchStates',
                '_eventList',
                '_getEvent',
                'addEventListener',
                'removeEventListener',
                'removeAllEventListeners',
                'dispatchEvent'
            );

            //project, branch and connection related API
            expect(client).to.include.keys(
                'connect',
                'getUserId',
                'getActiveProjectName',
                'getAvailableProjectsAsync',
                'getViewableProjectsAsync',
                'getFullProjectListAsync',
                'getProjectAuthInfoAsync',
                'connectToDatabaseAsync',
                'selectProjectAsync',
                'createProjectAsync',
                'deleteProjectAsync',
                'getBranchesAsync',
                'selectCommitAsync',
                'getCommitsAsync',
                'getActualCommit',
                'getActualBranch',
                'getActualNetworkStatus',
                'getActualBranchStatus',
                'createBranchAsync',
                'deleteBranchAsync',
                'selectBranchAsync',
                'commitAsync',
                'goOffline',
                'goOnline',
                'isProjectReadOnly',
                'isCommitReadOnly',
                'getProjectObject',
                'undo',
                'redo',
                'getFullProjectsInfoAsync',
                'createGenericBranchAsync',
                'deleteGenericBranchAsync',
                'setProjectInfoAsync',
                'getProjectInfoAsync',
                'getAllInfoTagsAsync'
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
                'delBase',
                'setConstraint',
                'delConstraint'
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
                'isValidAttribute',
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

            //addOn related API
            expect(client).to.include.keys(
                'validateProjectAsync',
                'validateModelAsync',
                'validateNodeAsync',
                'setValidationCallback',
                'getDetailedHistoryAsync',
                'getRunningAddOnNames',
                'addOnsAllowed'
            );

            //territory related API
            expect(client).to.include.keys(
                'addUI',
                'removeUI',
                'updateTerritory',
                'getNode'
            );

            //export - import API
            expect(client).to.include.keys(
                'getAvailableDecoratorNames',
                'getAvailableInterpreterNames',
                'runServerPlugin',
                'exportItems',
                'getExportItemsUrlAsync',
                'dumpNodeAsync',
                'importNodeAsync',
                'mergeNodeAsync',
                'createProjectFromFileAsync',
                'getDumpURL',
                'getExportLibraryUrlAsync',
                'updateLibraryAsync',
                'addLibraryAsync'
            );
        });

        it('should not contain merge related functions', function () {
            var client = new Client(gmeConfig);
            expect(client).not.to.include.keys('getBaseOfCommits',
                'getDiffTree',
                'getConflictOfDiffs',
                'applyDiff',
                'merge',
                'getResolve',
                'resolve');
        });

    });

    describe('database connection', function () {
        var Client,
            gmeConfig,
            projectName = 'ProjectAndBranchOperationsTest',
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

        it('should connect to the database', function (done) {
            var options = {};

            client.connectToDatabaseAsync(options, function (err) {
                expect(err).to.equal(null);
                done();
            });
        });

        it('should connect to the database even if we already connected', function (done) {
            var options = {};

            client.connectToDatabaseAsync(options, function (err) {
                expect(err).to.equal(null);

                client.connectToDatabaseAsync(options, function (err) {
                    expect(err).to.equal(null);
                    done();
                });
            });
        });

        it('should connect to the database but close the project if it was opened before', function (done) {

            client.connectToDatabaseAsync({}, function (err) {
                expect(err).to.equal(null);
                client.selectProjectAsync(projectName, function (err) {
                    expect(err).to.equal(null);

                    expect(client.getActiveProjectName()).to.equal(projectName);
                    client.connectToDatabaseAsync({}, function (err) {
                        expect(err).to.equal(null);

                        expect(client.getActiveProjectName()).to.equal(null);
                        done();
                    });
                });
            });
        });

        it('should connect and open the given project', function (done) {

            client.connectToDatabaseAsync({open: true, project: projectName}, function (err) {
                expect(err).to.equal(null);
                expect(client.getActiveProjectName()).to.equal(projectName);

                done();
            });
        });

        //FIXME we should remove this functionality
        it('should connect and open the \'first\' project', function (done) {

            client.connectToDatabaseAsync({open: true}, function (err) {
                expect(err).to.equal(null);
                expect(client.getActiveProjectName()).not.to.equal(null);

                done();
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

        it('should fail to get available project list', function (done) {
            client.getAvailableProjectsAsync(function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('no open database');

                done();
            });
        });

        it('should fail to get filtered project list', function (done) {
            client.getViewableProjectsAsync(function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('no open database');

                done();
            });
        });

        it('should fail to get authorization info of a project', function (done) {
            client.getProjectAuthInfoAsync('any project', function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('no open database');

                done();
            });
        });

        //FIXME - this should also fail
        it.skip('should fail to full project list', function (done) {
            client.getFullProjectListAsync(function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('no open database');

                done();
            });
        });

        it('should fail to select project', function (done) {
            client.selectProjectAsync('any project', function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('no open database');

                done();
            });
        });

        it('should fail to create project', function (done) {
            client.createProjectAsync('any project', {}, function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('no open database');

                done();
            });
        });

        it('should fail to delete project', function (done) {
            client.deleteProjectAsync('any project', function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('no open database');

                done();
            });
        });

        //FIXME - harmonize error texts
        it('should fail to get branch names', function (done) {
            client.getBranchesAsync(function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('no opened database');

                done();
            });
        });

        it('should fail to select branch', function (done) {
            client.selectBranchAsync('any branch', function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('no open database');

                done();
            });
        });

        it('should fail to select commit', function (done) {
            client.selectCommitAsync('any commit', function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('no open database');

                done();
            });
        });

        it('should fail to get commits', function (done) {
            client.getCommitsAsync('any commit', 'any number', function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('no open database');

                done();
            });
        });

        it('should fail to create branch', function (done) {
            client.createBranchAsync('any branch', 'any commit', function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('no open database');

                done();
            });
        });

        it('should fail to delete branch', function (done) {
            client.deleteBranchAsync('any branch', function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('no open database');

                done();
            });
        });

        it('should fail to make a commit', function (done) {
            var commitOptions = {message: 'any message'};

            client.commitAsync(commitOptions, function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.contain('no open database');

                done();
            });
        });

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
            projectName = 'ProjectAndBranchOperationsTest';

        before(function (done) {
            this.timeout(10000);
            requirejs(['js/client', 'text!gmeConfig.json'], function (Client_, gmeConfigJSON) {
                Client = Client_;
                gmeConfig = JSON.parse(gmeConfigJSON);
                gmeConfig.storage.timeout = 1000;
                client = new Client(gmeConfig);

                done();
            });
        });

        beforeEach(function (done) {
            client.connectToDatabaseAsync({}, function (err) {
                expect(err).to.equal(null);

                done();
            });
        });

        it('should return null as textual id if there is no opened project', function () {
            expect(client.getActiveProjectName()).to.equal(null);
        });

        it('should return the valid textual id of the opened project', function (done) {
            client.selectProjectAsync(projectName, function (err) {
                expect(err).to.equal(null);

                expect(client.getActiveProjectName()).to.equal(projectName);
                done();
            });
        });

        //TODO inlcude checks for all imported projects that should be in the database
        it('should return the list of textual ids of available projects', function (done) {
            client.getAvailableProjectsAsync(function (err, names) {
                expect(err).to.equal(null);

                expect(names).to.have.length.least(1);
                expect(names).to.include(projectName);
                done();
            });
        });

        //TODO inlcude checks for all imported projects that should be in the database
        it('should return a filtered list of textual project ids, where the user have read access', function (done) {
            client.getViewableProjectsAsync(function (err, names) {
                expect(err).to.equal(null);

                expect(names).to.have.length.least(1);
                expect(names).to.include(projectName);
                done();
            });
        });

        it('list of viewable projects should be equal to list of all projects without authentication', function (done) {
            client.getAvailableProjectsAsync(function (err, allNames) {
                expect(err).to.equal(null);

                client.getViewableProjectsAsync(function (err, viewableNames) {
                    expect(err).to.equal(null);

                    expect(viewableNames).to.deep.equal(allNames);
                    done();
                });
            });
        });

        it('should return the authorization info of a given project', function (done) {
            client.getProjectAuthInfoAsync(projectName, function (err, authInfo) {
                expect(err).to.equal(null);
                expect(authInfo).to.deep.equal({read: true, write: true, delete: true});
                done();
            });
        });

        //FIXME check how it should behave in these scenario - drop error at least under authentication
        it('should return unknown project error for an unknown project', function (done) {
            client.getProjectAuthInfoAsync('unknown_project', function (err) {
                //expect(err).not.to.equal(null);
                expect(err).to.equal(null);
                done();
            });
        });

        it('should return the complete project list, with branches and authorization info', function (done) {
            client.getFullProjectListAsync(function (err, projects) {
                var key;
                expect(err).to.equal(null);
                for (key in projects) {
                    expect(projects[key].hasOwnProperty('read')).to.equal(true);
                    expect(projects[key].hasOwnProperty('write')).to.equal(true);
                    expect(projects[key].hasOwnProperty('delete')).to.equal(true);
                }
                done();
            });
        });

        it('should selects a given project', function (done) {
            client.selectProjectAsync(projectName, function (err) {
                expect(err).to.equal(null);

                expect(client.getActiveProjectName()).to.equal(projectName);
                done();
            });

        });

        it('should fail to select an unknown project', function (done) {
            client.selectProjectAsync('unknown_project', function (err) {
                expect(err.message).to.contain('no such project');
                done();
            });
        });

        it('should be able to delete a nonexistent project', function (done) {
            client.deleteProjectAsync('unknown_project', function (err) {
                expect(err).to.equal(null);
                done();
            });
        });

        it('should delete a project', function (done) {
            var testProjectName = 'deleteProject',
                projectInfo = {};

            client.deleteProjectAsync(testProjectName, function (err) {
                expect(err).to.equal(null);

                client.createProjectAsync(testProjectName, projectInfo, function (err) {
                    expect(err).to.equal(null);

                    client.getAvailableProjectsAsync(function (err, names) {
                        expect(err).to.equal(null);

                        expect(names).to.include(testProjectName);

                        client.deleteProjectAsync(testProjectName, function (err) {
                            expect(err).to.equal(null);

                            client.getAvailableProjectsAsync(function (err, names) {
                                expect(err).to.equal(null);

                                expect(names).not.to.include(testProjectName);
                                done();
                            });
                        });
                    });
                });
            });
        });

        it('should create a project with info data', function (done) {
            var testProjectName = 'createProject',
                info = {property: 'value'};

            client.deleteProjectAsync(testProjectName, function (err) {
                expect(err).to.equal(null);

                client.createProjectAsync(testProjectName, info, function (err) {
                    expect(err).to.equal(null);

                    client.getAvailableProjectsAsync(function (err, names) {
                        expect(err).to.equal(null);
                        expect(names).to.include(testProjectName);

                        done();
                    });
                });
            });
        });

        it('should fail to create an already existing project', function (done) {
            client.createProjectAsync(projectName, {}, function (err) {
                expect(err).to.contain('already exists!');
                done();
            });
        });


        it('should list the available branches of the opened project', function (done) {
            var actualBranch,
                actualCommit;
            client.selectProjectAsync(projectName, function (err) {
                expect(err).to.equal(null);

                actualBranch = client.getActualBranch();
                actualCommit = client.getActualCommit();

                client.getBranchesAsync(function (err, branches) {
                    expect(err).to.equal(null);

                    expect(branches).to.have.length.of.at.least(1);
                    expect(branches).to.include({name: actualBranch, commitId: actualCommit, sync: true});
                    done();
                });
            });
        });

        it('should select the given branch of the opened project', function (done) {
            client.selectProjectAsync(projectName, function (err) {
                expect(err).to.equal(null);

                client.selectBranchAsync('master', function (err) {
                    expect(err).to.equal(null);
                    done();
                });
            });
        });

        it('should select a nonexistent branch of the opened project', function (done) {
            client.selectProjectAsync(projectName, function (err) {
                expect(err).to.equal(null);

                client.selectBranchAsync('does_not_exist', function (err) {
                    expect(err.message).to.equal('there is no such branch!');
                    done();
                });
            });
        });

        it('should select a given commit', function (done) {
            client.selectProjectAsync(projectName, function (err) {
                expect(err).to.equal(null);

                client.selectCommitAsync(client.getActualCommit(), function (err) {
                    expect(err).to.equal(null);

                    done();
                });
            });
        });

        //FIXME - possible fault that it 'switches branch' before it checks if the commit is known or not
        it('should fail to select an unknown commit', function (done) {
            client.selectProjectAsync(projectName, function (err) {
                expect(err).to.equal(null);

                client.selectCommitAsync('#unknown', function (err) {
                    expect(err).not.to.equal(null);

                    done();
                });
            });
        });

        it('should return the latest n commits', function (done) {
            client.selectProjectAsync(projectName, function (err) {
                var commitHash; //testing if it is not initialized

                expect(err).to.equal(null);

                client.getCommitsAsync(commitHash, 10, function (err, commits) {
                    expect(err).to.equal(null);
                    expect(commits).not.to.equal(null);
                    expect(commits).not.to.equal(undefined);

                    expect(commits).to.have.length.least(1);
                    expect(commits[0]).to.contain.keys('_id', 'root', 'updater', 'time', 'message', 'type');
                    expect(commits[0]['_id']).to.equal(client.getActualCommit());
                    done();
                });
            });
        });

        it('should return the actual commit hash', function (done) {
            client.selectProjectAsync(projectName, function (err) {
                expect(err).to.equal(null);

                client.selectBranchAsync('master', function (err) {
                    expect(err).to.equal(null);

                    expect(client.getActualCommit()).to.contain('#');
                    expect(client.getActualCommit()).to.have.length(41);
                    done();
                });
            });
        });

        it('should return the name of the actual branch', function (done) {
            client.selectProjectAsync(projectName, function (err) {
                expect(err).to.equal(null);

                client.selectBranchAsync('master', function (err) {
                    expect(err).to.equal(null);

                    expect(client.getActualBranch()).to.equal('master');
                    done();
                });
            });
        });

        it('should return the current network state', function (done) {
            setTimeout(function () {
                expect(client.getActualNetworkStatus()).to.equal('connected');
                done();
            }, 100);
        });

        it('should return the current branch state', function (done) {
            client.selectProjectAsync(projectName, function (err) {
                expect(err).to.equal(null);
                expect(client.getActualBranchStatus()).to.equal('inSync');

                done();
            });
        });

        it('should create a new branch from the given commit', function (done) {
            var actualBranch,
                actualCommit,
                newBranch = 'newBranch';
            client.selectProjectAsync(projectName, function (err) {
                expect(err).to.equal(null);

                actualBranch = client.getActualBranch();
                actualCommit = client.getActualCommit();
                expect(actualBranch).to.equal('master');

                client.createBranchAsync(newBranch, actualCommit, function (err) {
                    expect(err).to.equal(null);

                    expect(client.getActualBranch()).to.equal(actualBranch);

                    client.getBranchesAsync(function (err, branches) {
                        expect(err).to.equal(null);

                        expect(branches).to.include({name: newBranch, commitId: actualCommit, sync: true});

                        client.deleteBranchAsync(newBranch, function (err) {
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
            client.selectProjectAsync(projectName, function (err) {
                expect(err).to.equal(null);

                actualBranch = client.getActualBranch();
                actualCommit = client.getActualCommit();
                expect(actualBranch).to.equal('master');

                client.createBranchAsync(newBranch, actualCommit, function (err) {
                    expect(err).to.equal(null);

                    expect(client.getActualBranch()).to.equal(actualBranch);

                    client.getBranchesAsync(function (err, branches) {
                        expect(err).to.equal(null);

                        expect(branches).to.include({name: newBranch, commitId: actualCommit, sync: true});

                        client.deleteBranchAsync(newBranch, function (err) {
                            expect(err).to.equal(null);
                            client.getBranchesAsync(function (err, branches) {
                                expect(err).to.equal(null);

                                expect(branches).not.to.include({name: newBranch, commitId: actualCommit, sync: true});
                                done();
                            });
                        });
                    });
                });
            });
        });

        //FIXME - nondeterministic behaviour
        it('should fail to remove an unknown branch', function (done) {
            client.selectProjectAsync(projectName, function (err) {
                expect(err).to.equal(null);
                client.deleteBranchAsync('unknown_branch', function (err) {
                    console.warn(err);
                    expect(err).not.to.equal(null);

                    done();
                });
            });
        });

        it('should create a new -no change- commit with the given message', function (done) {
            var oldCommit;
            client.selectProjectAsync(projectName, function (err) {
                expect(err).to.equal(null);
                oldCommit = client.getActualCommit();

                client.commitAsync({message: 'just a commit'}, function (err) {
                    expect(err).to.equal(null);

                    expect(client.getActualCommit()).not.to.equal(oldCommit);

                    done();
                });
            });
        });

        it('should give back the project object (which can be used to create core objects)', function (done) {
            client.selectProjectAsync(projectName, function (err) {
                var projectObject = client.getProjectObject();

                expect(projectObject).not.to.equal(null);
                expect(projectObject).to.include.keys('makeCommit');

                done();
            });
        });

        it('should return the list of available decorator names', function () {
            expect(client.getAvailableDecoratorNames()).to.have.length.least(1);
        });

        //TODO change the name, plus make the core plugins available if possible
        it('should return the list of available plugin names', function () {
            expect(client.getAvailableInterpreterNames()).to.empty;
        });

        it('should return a list of projects extended with the \'in collection\' meta data', function (done) {
            client.getFullProjectsInfoAsync(function (err, projectsAndInfo) {
                expect(err).to.equal(null);

                expect(projectsAndInfo).not.to.equal(null);
                expect(projectsAndInfo).to.include.keys('ProjectAndBranchOperationsTest');
                expect(projectsAndInfo.ProjectAndBranchOperationsTest).to.include.keys('info', 'branches', 'rights');
                done();
            });

        });

        it('should return the \'in collection\' meta data of a project', function (done) {
            client.getProjectInfoAsync('ProjectAndBranchOperationsTest', function (err, info) {
                expect(err).to.equal(null);

                //we cannot check the info at this point as no nothing about it
                done();
            });
        });

        it('should set the \'in collection\' meta data of a project', function (done) {
            // setProjectInfoAsync
            client.setProjectInfoAsync('ProjectAndBranchOperationsTest',
                {some: {arbitrary: 'info'}},
                function (err) {
                    expect(err).to.equal(null);

                    client.getProjectInfoAsync('ProjectAndBranchOperationsTest', function (err, info) {
                        expect(err).to.equal(null);

                        //FIXME it is not working??!!!??
                        // expect(info).to.deep.equal({some: {arbitrary: info}});
                        done();
                    });
                }
            );
        });

        it('should return a list of used tags in the \'in collection\' meta data', function (done) {
            client.getAllInfoTagsAsync(function (err, tags) {
                expect(err).to.equal(null);

                //FIXME we cannot check the info at this point as no nothing about it
                done();
            });
        });

        it('should create a new branch for the given project (not necessarily the opened)', function (done) {
            var actualProject,
                genericProjectName = 'createGenericBranch';

            client.selectProjectAsync(projectName, function (err) {
                expect(err).to.equal(null);

                actualProject = client.getActiveProjectName();

                expect(actualProject).to.equal(projectName);

                client.deleteProjectAsync(genericProjectName, function (err) {
                    expect(err).to.equal(null);
                    client.createProjectAsync(genericProjectName, {}, function (err) {
                        expect(err).to.equal(null);

                        client.createGenericBranchAsync(genericProjectName, 'genericBranch', '#424242', function (err) {
                            expect(err).to.equal(null);

                            client.getFullProjectsInfoAsync(function (err, info) {
                                expect(err).to.equal(null);

                                expect(client.getActiveProjectName()).to.equal(actualProject);
                                expect(info).not.to.equal(null);
                                expect(info).to.include.keys(genericProjectName);
                                expect(info[genericProjectName]).to.include.keys('branches');
                                expect(info[genericProjectName].branches).to.include.keys('genericBranch');

                                done();
                            });
                        });
                    });
                });
            });

        });

        it('should delete a branch form the given project (not necessarily the opened one)', function (done) {
            // deleteGenericBranchAsync
            var actualProject,
                genericProjectName = 'removeGenericBranch';

            client.selectProjectAsync(projectName, function (err) {
                expect(err).to.equal(null);

                actualProject = client.getActiveProjectName();

                client.deleteProjectAsync(genericProjectName, function (err) {
                    expect(err).to.equal(null);
                    client.createProjectAsync(genericProjectName, {}, function (err) {
                        expect(err).to.equal(null);

                        client.createGenericBranchAsync(genericProjectName, 'genericBranch', '#424242', function (err) {
                            expect(err).to.equal(null);

                            client.getFullProjectsInfoAsync(function (err, info) {
                                expect(err).to.equal(null);

                                expect(client.getActiveProjectName()).to.equal(actualProject);
                                expect(info).not.to.equal(null);
                                expect(info).to.include.keys(genericProjectName);
                                expect(info[genericProjectName]).to.include.keys('branches');
                                expect(info[genericProjectName].branches).to.include.keys('genericBranch');

                                client.deleteGenericBranchAsync(genericProjectName,
                                    'genericBranch',
                                    '#424242',
                                    function (err) {
                                        expect(err).to.equal(null);
                                        client.getFullProjectsInfoAsync(function (err, info) {
                                            expect(err).to.equal(null);

                                            expect(client.getActiveProjectName()).to.equal(actualProject);
                                            expect(info).not.to.equal(null);
                                            expect(info).to.include.keys(genericProjectName);
                                            expect(info[genericProjectName]).to.include.keys('branches');
                                            expect(info[genericProjectName].branches)
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
        });

    });

    describe('client/node tests', function () {
        var Client,
            gmeConfig,
            client,
            projectName = 'ClientNodeInquiryTests',
            clientNodePath = '/323573539',
            clientNode,
            factoryConsoleLog = console.log;


        before(function (done) {
            this.timeout(10000);
            requirejs(['js/client', 'text!gmeConfig.json'], function (Client_, gmeConfigJSON) {
                Client = Client_;
                gmeConfig = JSON.parse(gmeConfigJSON);
                client = new Client(gmeConfig);

                client.connectToDatabaseAsync({}, function (err) {
                    expect(err).to.equal(null);
                    client.selectProjectAsync(projectName, function (err) {
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

        //TODO not implemented, do we need it???
        it('should return the paths of the instances of the node', function () {
            //expect(clientNode.getInheritorIds()).to.deep.equal(['/5185791']);
            expect(clientNode.getInheritorIds()).to.be.empty;
        });

        it('should return the list of available attribute names of the node', function () {
            var names = clientNode.getAttributeNames();
            expect(names).to.have.length(2);
            expect(names).to.include('name');
            expect(names).to.include('value');
        });

        it('should return the list of attribute names that has value defined on this level oof inheritance',
            function () {
                var names = clientNode.getOwnAttributeNames();
                expect(names).to.have.length(1);
                expect(names).to.contain('name');
            });

        it('should return the value of the attribute under the defined name', function () {
            expect(clientNode.getAttribute('name')).to.equal('check');
            expect(clientNode.getAttribute('value')).to.equal(10);
        });

        it('in case of unknown attribute the result should be undefined', function () {
            expect(clientNode.getAttribute('unknown_attribute')).to.equal(undefined);
        });

        //TODO right now the object freezing is disabled so we cannot test that the ordinary getAttribute not allows the modification if the attribute is complex
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

        //TODO right now the object freezing is disabled so we cannot test that the ordinary getRegistry not allows the modification if the attribute is complex
        it('should return an editable copy of the registry', function () {
            expect(clientNode.getEditableRegistry('position')).to.deep.equal({x: 300, y: 466});
        });

        it('should return the registry value defined on this level of inheritance', function () {
            expect(clientNode.getOwnRegistry('position')).to.deep.equal({x: 300, y: 466});
        });

        it('should return the copy of registry value defined on this level of inheritance', function () {
            expect(clientNode.getOwnEditableRegistry('position')).to.deep.equal({x: 300, y: 466});
        });

        it('should return the names of available pointers', function () {
            var names = clientNode.getPointerNames();
            expect(names).to.have.length(2);
            expect(names).to.include('ptr');
            expect(names).to.include('base');
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
            expect(clientNode.getMemberIds('unknown_set')).to.empty;
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
            expect(clientNode.getConstraintNames()).to.deep.equal(['constraint', 'meta']);
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

        //TODO refactor this function or remove if no need for it
        it('should print the content of the node to the console', function (done) {
            var oldConsoleLog = console.log;
            console.log = function (txt1, err, txt2, jNode) {
                console.log = oldConsoleLog;
                expect(jNode).to.have.ownProperty('attributes');
                expect(jNode).to.have.ownProperty('pointers');
                expect(jNode).to.have.ownProperty('children');
                expect(jNode.attributes).to.have.ownProperty('name');
                expect(jNode.attributes.name).to.equal('check');
                done();
            };
            clientNode.printData();
        });

        it('should return a textual identification of the node', function () {
            expect(clientNode.toString()).to.contain('check');
            expect(clientNode.toString()).to.contain('/323573539');
        });
    });

    describe('basic territory tests', function () {
        var Client,
            gmeConfig,
            client,
            projectName = 'territoryProject',
            baseCommitHash;

        function buildUpForTest(branchName, next) {
            client.selectProjectAsync(projectName, function (err) {
                expect(err).to.equal(null);
                client.createBranchAsync(branchName, baseCommitHash, function (err) {
                    expect(err).to.equal(null);
                    client.selectBranchAsync(branchName, function (err) {
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

                client.connectToDatabaseAsync({}, function (err) {
                    expect(err).to.equal(null);
                    client.selectProjectAsync(projectName, function (err) {
                        expect(err).to.equal(null);

                        baseCommitHash = client.getActualCommit();
                        done();
                    });
                });
            });
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
                        expect(node).to.include.keys('getId', 'getBaseId', 'getParentId');

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

                    client.connectToDatabaseAsync({}, function (err) {
                        expect(err).to.equal(null);
                        done();
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
                        return;
                    }
                };

            function receiveEvents(events) {
                if (testState === 'init') {
                    testState = 'close';

                    expect(events).not.to.equal(null);
                    expect(events).to.include({eid: '/323573539', etype: 'load'});

                    client.connectToDatabaseAsync({}, function (err) {
                        expect(err).to.equal(null);
                        expect(reLaunchCalled).to.equal(true);

                        client.removeUI(guid);
                        done();
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
            projectName = 'nodeManipulationProject',
            baseCommitHash;

        function buildUpForTest(testId, patternObject, eventCallback) {
            var branchName = testId;

            client.createBranchAsync(branchName, baseCommitHash, function (err) {
                expect(err).to.equal(null);

                client.selectBranchAsync(branchName, function (err) {
                    var user = {},
                        userId = testId;

                    expect(err).to.equal(null);

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

                client.connectToDatabaseAsync({}, function (err) {
                    expect(err).to.equal(null);
                    client.selectProjectAsync(projectName, function (err) {
                        expect(err).to.equal(null);

                        baseCommitHash = client.getActualCommit();
                        done();
                    });
                });
            });
        });

        it('should modify the attribute of the given node', function (done) {
            var testState = 'init',
                testId = 'basicSetAttribute',
                node;
            buildUpForTest(testId, {'/323573539': {children: 0}}, function (events) {
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

                    client.removeUI(testId);
                    done();
                }
            });
        });

        it('should delete the given attribute of the node', function (done) {
            var testState = 'init',
                testId = 'basicDelAttribute',
                node;
            buildUpForTest(testId, {'/323573539': {children: 0}}, function (events) {
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

                    client.removeUI(testId);
                    done();
                }
            });
        });

        it('should sets the given registry entry of the node', function (done) {
            var testState = 'init',
                testId = 'basicSetRegistry',
                node;
            buildUpForTest(testId, {'/323573539': {children: 0}}, function (events) {
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

                    client.removeUI(testId);
                    done();

                }
            });
        });

        it('should remove the given registry key of the node', function (done) {
            var testState = 'init',
                testId = 'basicDelRegistry',
                node;
            buildUpForTest(testId, {'/323573539': {children: 0}}, function (events) {
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

                    client.removeUI(testId);
                    done();

                }
            });
        });

        it('should complete a transaction and commit the changes', function (done) {
            var testId = 'basicCompleteTransaction';
            buildUpForTest(testId, {}, function () {
                client.removeUI(testId);//we do not need a UI and it would just make test code more complex
                client.completeTransaction('should indicate a commit', function (err) {
                    expect(err).to.equal(null);
                    expect(baseCommitHash).not.to.equal(client.getActualCommit());
                    done();
                });
            });
        });

        it('should start a transaction', function (done) {
            var testId = 'basicStartTransaction',
                testState = 'init',
                node = null;
            buildUpForTest(testId, {'/1': {children: 0}}, function (events) {
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
                    client.completeTransaction('now will the events get generated', function (err) {
                        expect(err).to.equal(null);
                        client.removeUI(testId);
                        done();
                    });
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
                    done(new Error('more than one set of events arrived during or after a transaction!'));
                    return;
                }
            });
        });

        it('should remove the given node', function (done) {
            var testState = 'init',
                testId = 'basicDelNode',
                node;
            buildUpForTest(testId, {'/323573539': {children: 0}}, function (events) {
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

                    client.removeUI(testId);
                    done();
                }
            });
        });

        it('should set the given pointer of the node to the specified target', function (done) {
            var testState = 'init',
                testId = 'basicMakePointer',
                node;
            buildUpForTest(testId, {'/323573539': {children: 0}, '/1': {children: 0}}, function (events) {
                if (testState === 'init') {
                    testState = 'checking';

                    expect(events).to.have.length(3);
                    expect(events).to.include({eid: '/323573539', etype: 'load'});
                    expect(events).to.include({eid: '/1', etype: 'load'});

                    node = client.getNode(events[1].eid);
                    expect(node).not.to.equal(null);

                    client.makePointer('/323573539', 'ptr', '/1', 'basic make pointer test');
                    return;
                }

                if (testState === 'checking') {
                    expect(events).to.have.length(3);
                    expect(events).to.include({eid: '/323573539', etype: 'update'});
                    expect(events).to.include({eid: '/1', etype: 'update'});

                    node = client.getNode('/323573539');
                    expect(node).not.to.equal(null);
                    expect(node.getPointer('ptr')).to.deep.equal({to: '/1', from: []});

                    client.removeUI(testId);
                    done();
                }
            });
        });

        it('should set a null target', function (done) {
            var testState = 'init',
                testId = 'makeNullPointer',
                node;
            buildUpForTest(testId, {'/1697300825': {children: 0}}, function (events) {
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

                    client.removeUI(testId);
                    done();
                }
            });
        });

        it('should remove the given pointer of the node', function (done) {
            var testState = 'init',
                testId = 'basicDelPointer',
                node;
            buildUpForTest(testId, {'/1697300825': {children: 0}}, function (events) {
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

                    client.removeUI(testId);
                    done();
                }
            });
        });

        it('should copy the nodes under the given parent', function (done) {
            var testState = 'init',
                testId = 'basicCopyNodes',
                node,
                initialPaths = [],
                newPaths = [],
                i;
            buildUpForTest(testId, {'': {children: 1}}, function (events) {
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
                            '/1697300825': {attributes: {name: 'member2copy'}},
                            '/1400778473': {attributes: {name: 'member1copy'}}
                        },
                        'basic copy nodes test');
                    return;
                }

                if (testState === 'checking') {
                    //FIXME why the update events missing about the source nodes - it works correctly with single node copying
                    expect(events).to.have.length(8);

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

                    client.removeUI(testId);
                    done();
                }
            });
        });

        it('copied nodes should keep copy-internal relations', function (done) {
            var testState = 'init',
                testId = 'internalRelationCopyNodes',
                node,
                initialPaths = [],
                newPaths = [],
                i,
                newTarget = null;
            buildUpForTest(testId, {'': {children: 1}}, function (events) {
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
                    expect(node.getRegistry('position')).to.deep.equal({x: 100, y: 100});

                    client.removeUI(testId);
                    done();
                }
            });
        });

        it('should copy a single node', function (done) {
            var testState = 'init',
                testId = 'copySingleNode',
                node,
                initialPaths = [],
                newPaths = [],
                i;
            buildUpForTest(testId, {'': {children: 1}}, function (events) {
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
                    expect(events).to.have.length(9);

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

                    client.removeUI(testId);
                    done();
                }
            });
        });

        it('should put an error to the console if the container is wrongly given or missing', function (done) {
            var testId = 'copyFailureTests',
                failures = 0,
                wantedFailures = 2,
                oldConsoleLog = console.log; //TODO awkward but probably should be changed in the code as well

            buildUpForTest(testId, {'': {children: 1}}, function (events) {

                console.log = function (txt) {
                    expect(txt).to.contain('wrong');
                    if (++failures === wantedFailures) {
                        console.log = oldConsoleLog;
                        done();
                    }
                };

                client.copyMoreNodes({}, 'try to copy without parentId');
                client.copyMoreNodes({parentId: '/42/42'}, 'try to copy with unknown parentId');
                return;
            });
        });

        it('should create a child', function (done) {
            var testState = 'init',
                testId = 'basicCreateChild',
                node,
                newId = null,
                initialPaths = [],
                i;
            buildUpForTest(testId, {'': {children: 1}}, function (events) {
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
                    expect(events).to.have.length(9);
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
                    expect(node.getChildrenIds()).to.have.length(3);

                    client.removeUI(testId);
                    done();
                }
            });
        });

        it('should create a child at default position', function (done) {
            var testState = 'init',
                testId = 'createChildDefaultPosition',
                node,
                newId = null,
                initialPaths = [],
                i;
            buildUpForTest(testId, {'': {children: 1}}, function (events) {
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
                    expect(events).to.have.length(9);
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
                    expect(node.getRegistry('position')).to.deep.equal({x: 100, y: 100});
                    expect(node.getChildrenIds()).to.have.length(3);

                    client.removeUI(testId);
                    done();
                }
            });
        });

        it('should create children', function (done) {
            var testState = 'init',
                testId = 'basicCreateChildren',
                node,
                initialPaths = [],
                newPaths = [],
                i,
                newTarget = null;
            buildUpForTest(testId, {'': {children: 1}}, function (events) {
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
                    expect(events).to.have.length(11);

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

                    client.removeUI(testId);
                    done();
                }
            });
        });

        it('should move the given nodes', function (done) {
            var testState = 'init',
                testId = 'basicMoveNodes',
                node,
                containerId = null,
                initialPaths = [],
                extendedTerritory,
                i;
            buildUpForTest(testId, {'': {children: 1}}, function (events) {
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

                    expect(events).to.have.length(9);

                    for (i = 1; i < events.length; i++) {
                        if (initialPaths.indexOf(events[i].eid) === -1) {
                            expect(events[i].etype).to.equal('load');
                            if (containerId === null) {
                                containerId = events[i].eid;
                            } else {
                                done(new Error('only one new element is expected!!'));
                                return;
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
                    client.completeTransaction('move nodes test - move nodes', function (err) {

                        //this callback is called after we handled the events
                        //TODO should we fix it??? how???
                        client.removeUI(testId);
                        expect(err).to.equal(null);
                        done();
                    });
                    return;
                }

                if (testState === 'final') {

                    expect(events).to.have.length(11);
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

                    return;
                }
            });
        });

        it('should add or modify a constraint', function (done) {
            var testState = 'init',
                testId = 'basicSetConstraint',
                node,
                constraint = null;
            buildUpForTest(testId, {'/1400778473': {children: 0}}, function (events) {
                if (testState === 'init') {
                    testState = 'checking';

                    expect(events).to.have.length(2);
                    expect(events).to.include({eid: '/1400778473', etype: 'load'});

                    node = client.getNode('/1400778473');
                    expect(node).not.to.equal(null);
                    expect(node.getConstraintNames()).to.deep.equal(['constraint', 'meta']);
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

                    client.removeUI(testId);
                    done();
                }
            });
        });

        it('should remove the constraint from the node data', function (done) {
            // delConstraint 701504349
            var testState = 'init',
                testId = 'basicDelConstraint',
                node,
                constraint = null;
            buildUpForTest(testId, {'/701504349': {children: 0}}, function (events) {
                if (testState === 'init') {
                    testState = 'checking';

                    expect(events).to.have.length(2);
                    expect(events).to.include({eid: '/701504349', etype: 'load'});

                    node = client.getNode('/701504349');
                    expect(node).not.to.equal(null);
                    expect(node.getConstraintNames()).to.deep.equal(['constraint', 'meta']);
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

                    client.removeUI(testId);
                    done();
                }
            });
        });

        it('should add the given node as a new member to the specified set of our node', function (done) {
            var testState = 'init',
                testId = 'basicAddMember',
                node;
            buildUpForTest(testId, {'/323573539': {children: 0}, '/1697300825': {children: 0}}, function (events) {
                if (testState === 'init') {
                    testState = 'checking';

                    expect(events).to.have.length(3);
                    expect(events).to.include({eid: '/323573539', etype: 'load'});
                    expect(events).to.include({eid: '/1697300825', etype: 'load'});

                    node = client.getNode('/323573539');
                    expect(node).not.to.equal(null);
                    expect(node.getMemberIds('newSet')).to.empty;


                    client.addMember('/323573539', '/1697300825', 'newSet', 'basic add member test');
                    return;
                }

                if (testState === 'checking') {
                    expect(events).to.have.length(3);

                    node = client.getNode('/323573539');
                    expect(node).not.to.equal(null);
                    expect(node.getMemberIds('newSet')).to.deep.equal(['/1697300825']);

                    client.removeUI(testId);
                    done();
                }
            });
        });

        it('should remove the given member of the specified set of the node', function (done) {
            var testState = 'init',
                testId = 'basicRemoveMember',
                node;
            buildUpForTest(testId, {'/323573539': {children: 0}, '/1697300825': {children: 0}}, function (events) {
                if (testState === 'init') {
                    testState = 'checking';

                    expect(events).to.have.length(3);
                    expect(events).to.include({eid: '/323573539', etype: 'load'});
                    expect(events).to.include({eid: '/1697300825', etype: 'load'});

                    node = client.getNode('/323573539');
                    expect(node).not.to.equal(null);
                    expect(node.getMemberIds('set')).to.include('/1697300825');


                    client.removeMember('/323573539', '/1697300825', 'set', 'basic remove member test');
                    return;
                }

                if (testState === 'checking') {
                    expect(events).to.have.length(3);

                    node = client.getNode('/323573539');
                    expect(node).not.to.equal(null);
                    expect(node.getMemberIds('set')).not.to.include('/1697300825');

                    client.removeUI(testId);
                    done();
                }
            });
        });

        it('should set the given attribute of the specified member of the set', function (done) {
            var testState = 'init',
                testId = 'basicSetMemberAttribute',
                node;
            buildUpForTest(testId, {'/323573539': {children: 0}, '/1697300825': {children: 0}}, function (events) {
                if (testState === 'init') {
                    testState = 'checking';

                    expect(events).to.have.length(3);
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
                    expect(events).to.have.length(3);

                    node = client.getNode('/323573539');
                    expect(node).not.to.equal(null);
                    expect(node.getMemberIds('set')).to.include('/1697300825');
                    expect(node.getMemberAttributeNames('set', '/1697300825')).to.include('name');
                    expect(node.getEditableMemberAttribute('set', '/1697300825', 'name')).to.equal('set member');

                    client.removeUI(testId);
                    done();
                }
            });
        });

        it('should remove the specific attribute of the set member', function (done) {
            var testState = 'init',
                testId = 'basicDelMemberAttribute',
                node;
            buildUpForTest(testId, {'/323573539': {children: 0}, '/1697300825': {children: 0}}, function (events) {
                if (testState === 'init') {
                    testState = 'add';

                    expect(events).to.have.length(3);
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
                        'basic del member attribute test - set');
                    return;
                }

                if (testState === 'add') {
                    testState = 'del'
                    expect(events).to.have.length(3);

                    node = client.getNode('/323573539');
                    expect(node).not.to.equal(null);
                    expect(node.getMemberIds('set')).to.include('/1697300825');
                    expect(node.getMemberAttributeNames('set', '/1697300825')).to.include('name');
                    expect(node.getMemberAttribute('set', '/1697300825', 'name')).to.equal('set member');


                    client.delMemberAttribute('/323573539',
                        '/1697300825',
                        'set',
                        'name',
                        'basic del member attribute test - del');
                    return;
                }

                if (testState === 'del') {
                    expect(events).to.have.length(3);

                    node = client.getNode('/323573539');
                    expect(node).not.to.equal(null);
                    expect(node.getMemberIds('set')).to.include('/1697300825');
                    expect(node.getMemberAttributeNames('set', '/1697300825')).not.to.include('name');
                    expect(node.getMemberAttribute('set', '/1697300825', 'name')).to.equal(undefined);

                    client.removeUI(testId);
                    done();
                }
            });
        });

        it('should set the given registry key of the set member', function (done) {
            var testState = 'init',
                testId = 'basicSetMemberRegistry',
                node;
            buildUpForTest(testId, {'/323573539': {children: 0}, '/1697300825': {children: 0}}, function (events) {
                if (testState === 'init') {
                    testState = 'checking';

                    expect(events).to.have.length(3);
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
                    expect(events).to.have.length(3);

                    node = client.getNode('/323573539');
                    expect(node).not.to.equal(null);
                    expect(node.getMemberIds('set')).to.include('/1697300825');
                    expect(node.getMemberRegistryNames('set', '/1697300825')).to.include('name');
                    expect(node.getMemberRegistry('set', '/1697300825', 'name')).to.equal('set member');

                    client.removeUI(testId);
                    done();
                }
            });
        });

        it('should remove the specified registry key of the set member', function (done) {
            var testState = 'init',
                testId = 'basicDelMemberRegistry',
                node;
            buildUpForTest(testId, {'/323573539': {children: 0}, '/1697300825': {children: 0}}, function (events) {
                if (testState === 'init') {
                    testState = 'add';

                    expect(events).to.have.length(3);
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
                        'basic del member registry test - set');
                    return;
                }

                if (testState === 'add') {
                    testState = 'del'
                    expect(events).to.have.length(3);

                    node = client.getNode('/323573539');
                    expect(node).not.to.equal(null);
                    expect(node.getMemberIds('set')).to.include('/1697300825');
                    expect(node.getMemberRegistryNames('set', '/1697300825')).to.include('name');
                    expect(node.getMemberRegistry('set', '/1697300825', 'name')).to.equal('set member');


                    client.delMemberRegistry('/323573539',
                        '/1697300825',
                        'set',
                        'name',
                        'basic del member registry test - del');
                    return;
                }

                if (testState === 'del') {
                    expect(events).to.have.length(3);

                    node = client.getNode('/323573539');
                    expect(node).not.to.equal(null);
                    expect(node.getMemberIds('set')).to.include('/1697300825');
                    expect(node.getMemberRegistryNames('set', '/1697300825')).not.to.include('name');
                    expect(node.getMemberRegistry('set', '/1697300825', 'name')).to.equal(undefined);

                    client.removeUI(testId);
                    done();
                }
            });
        });

        it('should create an empty set for the node with the given name', function (done) {
            var testState = 'init',
                testId = 'basicCreateSet',
                node;
            buildUpForTest(testId, {'/323573539': {children: 0}}, function (events) {
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

                    client.removeUI(testId);
                    done();
                }
            });
        });

        it('should remove the given set of the node', function (done) {
            var testState = 'init',
                testId = 'basicDeleteSet',
                node;
            buildUpForTest(testId, {'/323573539': {children: 0}, '/701504349': {children: 0}}, function (events) {
                if (testState === 'init') {
                    testState = 'checking';

                    expect(events).to.have.length(3);
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
                    expect(events).to.have.length(3);

                    node = client.getNode('/701504349');
                    expect(node).not.to.equal(null);
                    expect(node.getSetNames()).not.to.include('set');
                    expect(node.getMemberIds('set')).to.empty;

                    node = client.getNode('/323573539');
                    expect(node).not.to.equal(null);
                    //FIXME probably this set should be also removed, although it was overwritten
                    //expect(node.getSetNames()).not.to.include('set');
                    //expect(node.getMemberIds('set')).to.empty;

                    client.removeUI(testId);
                    done();
                }
            });
        });

        it('should change the ancestor of the given node', function (done) {
            var testState = 'init',
                testId = 'basicSetBase',
                node,
                newId = null;
            buildUpForTest(testId, {'': {children: 1}}, function (events) {

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
                        client.removeUI(testId);
                        expect(err).to.equal(null);
                        done();
                    });

                    return;
                }

                if (testState === 'checking') {
                    expect(events).to.have.length(9);
                    expect(events).to.include({eid: newId, etype: 'load'});

                    node = client.getNode(newId);
                    expect(node).not.to.equal(null);
                    expect(node.getAttribute('name')).to.equal('node');
                    expect(node.getBaseId()).to.equal('/701504349');
                    expect(node.getAttributeNames()).to.include('value');

                    return;
                }
            });
        });

        it('should remove the ancestor of the given node', function (done) {
            // TODO should we remove this from the 'public' API
            var testState = 'init',
                testId = 'basicDelBase',
                node,
                newId = null;
            buildUpForTest(testId, {'': {children: 1}}, function (events) {

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
                        client.removeUI(testId);
                        expect(err).to.equal(null);
                        done();
                    });

                    return;
                }

                if (testState === 'checking') {
                    expect(events).to.have.length(9);
                    expect(events).to.include({eid: newId, etype: 'load'});

                    node = client.getNode(newId);
                    expect(node).not.to.equal(null);
                    expect(node.getAttribute('name')).to.equal(undefined);
                    expect(node.getBaseId()).to.equal(null);
                    expect(node.getAttributeNames()).to.empty;

                    return;
                }
            });
        });

    });

    describe('undo-redo tests', function () {
        var Client,
            gmeConfig,
            client,
            projectName = 'undoRedoTests',
            baseCommitHash;

        function buildUpForTest(branchName, patternObject, eventCallback) {
            //creates a branch then a UI for it, finally waits for the nodes to load
            client.createBranchAsync(branchName, baseCommitHash, function (err) {
                expect(err).to.equal(null);

                client.selectBranchAsync(branchName, function (err) {
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

                client.connectToDatabaseAsync({}, function (err) {
                    expect(err).to.equal(null);
                    client.selectProjectAsync(projectName, function (err) {
                        expect(err).to.equal(null);

                        baseCommitHash = client.getActualCommit();
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

                client.undo(client.getActualBranch(), function (err) {
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

                client.redo(client.getActualBranch(), function (err) {
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
                        client.undo(client.getActualBranch(), function (err) {
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
                return;
            });
        });

    });

    describe('REST-like functions', function () {
        var Client,
            gmeConfig,
            client,
            projectName = 'RESTLikeTests';

        before(function (done) {
            this.timeout(10000);
            requirejs(['js/client', 'text!gmeConfig.json'], function (Client_, gmeConfigJSON) {
                Client = Client_;
                gmeConfig = JSON.parse(gmeConfigJSON);
                gmeConfig.storage.timeout = 1000;
                client = new Client(gmeConfig);

                client.connectToDatabaseAsync({}, function (err) {
                    expect(err).to.equal(null);

                    client.selectProjectAsync(projectName, function (err) {
                        expect(err).to.equal(null);

                        client.addUI({}, function (events) {
                            expect(events).to.have.length.least(3); //technical event, the root and the FCO

                            done();
                        }, projectName);
                        client.updateTerritory(projectName, {'': {children: 1}});
                    });
                });
            });
        });

        it('should export the list of nodes in a REST-API format', function (done) {
            client.exportItems(['', '/1'], function (err, exportedItems) {
                expect(err).to.equal(null);

                expect(exportedItems).have.length(2);
                done();
            });
        });

        it('should fail to export not loaded object', function (done) {
            client.exportItems(['/42/42'], function (err) {
                expect(err).not.to.equal(null);
                done();
            });
        });

        it('should return a url which would download the given list of nodes', function (done) {
            client.getExportItemsUrlAsync(['', '/1'], 'output', function (err, url) {
                expect(err).to.equal(null);
                expect(url).to.contain('output');
                expect(url).to.contain('/worker/simpleResult/');

                //FIXME why server crashes at the end if we get the result??
                //superagent.get(url).end(function (err, res) {
                //
                //    expect(err).to.equal(null);
                //
                //    expect(res.status).to.equal(200);
                //
                //    expect(res.body).not.to.equal(null);
                //
                //    expect(res.body).to.have.length(2);
                //
                //    done();
                //});
                done();
            });
        });

        it('should return a url where the given library (sub-tree) is available', function (done) {
            client.getExportLibraryUrlAsync('', 'output', function (err, url) {
                expect(err).to.equal(null);
                expect(url).to.contain('output');
                expect(url).to.contain('/worker/simpleResult/');

                done();
            });
        });

        it('should return a json format of the node (or a sub-tree)', function (done) {
            client.dumpNodeAsync('', function (err, dump) {
                expect(err).to.equal(null);

                expect(dump).not.to.equal(null);

                done();
            });
        });

        it('should fail to dump not loaded node', function (done) {
            // dumpNodeAsync
            client.dumpNodeAsync('/42/42', function (err) {
                expect(err).not.to.equal(null);

                done();
            });
        });

        it('should return a url for dumping the whole project', function () {
            expect(client.getDumpURL({})).to.contain('dump_url.out');
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

    it.skip('should execute the given plugin on the server and return its result', function () {
        // runServerPlugin

    });

//TODO add only proxied functions
    describe('meta rule query and setting tests', function () {
        var Client,
            gmeConfig,
            client,
            projectName = 'metaQueryAndManipulationTest',
            baseCommitHash;


        before(function (done) {
            this.timeout(10000);
            requirejs(['js/client', 'text!gmeConfig.json'], function (Client_, gmeConfigJSON) {
                Client = Client_;
                gmeConfig = JSON.parse(gmeConfigJSON);
                client = new Client(gmeConfig);

                client.connectToDatabaseAsync({}, function (err) {
                    expect(err).to.equal(null);
                    client.selectProjectAsync('metaQueryAndManipulationTest', function (err) {
                        expect(err).to.equal(null);

                        baseCommitHash = client.getActualCommit();
                        done();
                    });
                });
            });
        });

        it('should return the meta rules of the given node in a json format', function (done) {
            prepareBranchForTest('simpleGet', function (err) {
                expect(err).to.equal(null);

                expect(client.getMeta('/1')).to.deep.equal({
                    'attributes': {
                        'name': {
                            'type': 'string'
                        }
                    },
                    'children': {
                        'minItems': [],
                        'maxItems': [],
                        'items': [],
                        'min': undefined,
                        'max': undefined
                    },
                    'pointers': {},
                    'aspects': {}
                });
                done();
            });

        });

        it('should return the flattened meta rules of a node in json format', function (done) {
            prepareBranchForTest('inheritedGet', function (err) {
                expect(err).to.equal(null);
                var metaRules = client.getMeta('/1865460677');
                //FIXME: this fails on my machine /patrik

                expect(metaRules).to.have.keys('attributes', 'aspects', 'pointers', 'children');
                expect(metaRules.attributes).to.deep.equal({
                    'name': {
                        'type': 'string'
                    }
                });
                expect(metaRules.pointers).to.deep.equal({});
                expect(metaRules.aspects).to.deep.equal({
                    'onlyOne': {
                        'items': [
                            {$ref: '/1730437907'}
                        ]
                    }
                });
                expect(metaRules.children).to.have.keys('items', 'minItems', 'maxItems', 'min', 'max');
                expect(metaRules.children.min).to.equal(undefined);
                expect(metaRules.children.max).to.equal(undefined);
                expect(metaRules.children.maxItems).to.deep.equal([-1, -1]);
                expect(metaRules.children.minItems).to.deep.equal([-1, -1]);
                expect(metaRules.children.items).to.have.length(2);
                expect(metaRules.children.items).to.include({$ref: '/1730437907'});
                expect(metaRules.children.items).to.include({$ref: '/1687616515'});
                done();
            });
        });

        it('should return null if the object is not loaded', function (done) {
            prepareBranchForTest('unknownGet', function (err) {
                expect(err).to.equal(null);

                expect(client.getMeta('/42/42')).to.equal(null);
                done();
            });
        });

        it('modify an empty ruleset to empty', function (done) {
            prepareBranchForTest('noChangeSet', function (err) {
                expect(err).to.equal(null);

                var old = client.getMeta('/1730437907');
                client.setMeta('/1730437907', {});
                expect(client.getMeta('/1730437907')).to.deep.equal(old);
                done();
            });

        });

        it('add some rule via setMeta', function (done) {
            prepareBranchForTest('addWithSet', function (err) {
                expect(err).to.equal(null);

                var old = client.getMeta('/1730437907'),
                    newAttribute = {'type': 'string'};
                client.setMeta('/1730437907', {'attributes': {'newAttr': newAttribute}});
                //we extend our json format as well
                old.attributes.newAttr = newAttribute;
                expect(client.getMeta('/1730437907')).to.deep.equal(old);
                done();
            });
        });

        it('remove some rule via setMeta', function (done) {
            prepareBranchForTest('removeWithSet', function (err) {
                expect(err).to.equal(null);

                var meta = client.getMeta('/1');

                expect(meta.attributes).to.contain.keys('name');
                delete meta.attributes.name;
                client.setMeta('/1', meta);
                expect(client.getMeta('/1').attributes).not.to.include.keys('name');
                done();

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

        function prepareBranchForTest(branchName, next) {
            //creates a branch then a UI for it, finally waits for the nodes to load
            client.createBranchAsync(branchName, baseCommitHash, function (err) {
                expect(err).to.equal(null);

                client.selectBranchAsync(branchName, function (err) {
                    expect(err).to.equal(null);

                    //now we should load all necessary node, possibly in one step to allow the synchronous execution
                    //we handle only the first incoming set of events to not cause any confusion
                    var alreadyHandled = false;
                    client.updateTerritory(client.addUI({}, function (events) {
                        if (!alreadyHandled) {
                            expect(events).to.have.length(12);
                            expect(events[0]).to.contain.keys('eid', 'etype');
                            expect(events[0].etype).to.equal('complete');

                            alreadyHandled = true;
                            next(null);
                        }
                    }), {'': {children: 1}});
                });
            });
        }

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
            client,
            refNodeProj,
            refMetaProj,
            refSFSProj;

        before(function (done) {
            this.timeout(10000);
            requirejs([
                    'js/client',
                    'text!gmeConfig.json',
                    'text!karmatest/client/js/client/clientNodeTestProject.json',
                    'text!karmatest/client/js/client/metaTestProject.json',
                    'text!seeds/SignalFlowSystem.json'],
                function (Client_, gmeConfigJSON, nodeProjectJSON, metaProjectJSON, SFSProjectJSON) {
                    Client = Client_;
                    gmeConfig = JSON.parse(gmeConfigJSON);
                    refNodeProj = JSON.parse(nodeProjectJSON);
                    refMetaProj = JSON.parse(metaProjectJSON);
                    refSFSProj = JSON.parse(SFSProjectJSON);
                    client = new Client(gmeConfig);

                    client.connectToDatabaseAsync({}, function (err) {
                        expect(err).to.equal(null);
                        done();
                    });
                }
            );
        });
        after(function (done) {
            //remove all create projects
            done();
        });

        it('should seed a project from an existing one', function (done) {
            var projectName = 'seedTestBasicMaster',
                seedConfig = {
                    seedName: 'projectSeedSingleMaster',
                    projectName: projectName
                },
                url;
            client.deleteProjectAsync(projectName, function (err) {
                expect(err).to.equal(null);

                client.seedProjectAsync(seedConfig, function (err) {
                    expect(err).to.equal(null);

                    url = client.getDumpURL({
                        project: projectName,
                        branch: 'master',
                        output: 'seedTestOutput'
                    });

                    superagent.get(url, function (err, result) {
                        expect(err).to.equal(null);
                        expect(result.body).to.deep.equal(refNodeProj);

                        done();
                    });
                });
            });
        });

        it('should seed a project from a seed file', function (done) {
            var projectName = 'seedTestBasicFile',
                seedConfig = {
                    type: 'file',
                    seedName: 'SignalFlowSystem',
                    projectName: projectName
                },
                url;
            client.deleteProjectAsync(projectName, function (err) {
                expect(err).to.equal(null);

                client.seedProjectAsync(seedConfig, function (err) {
                    expect(err).to.equal(null);

                    url = client.getDumpURL({
                        project: projectName,
                        branch: 'master',
                        output: 'seedTestOutput'
                    });

                    superagent.get(url, function (err, result) {
                        expect(err).to.equal(null);
                        expect(result.body).to.deep.equal(refSFSProj);

                        done();
                    });
                });
            });
        });

        //FIXME what is with the superagent stuff???
        it('should seed a project from an existing one\'s given branch', function (done) {
            var projectName = 'seedTestBasicOther',
                seedConfig = {
                    seedName: 'projectSeedSingleNonMaster',
                    projectName: projectName,
                    seedBranch: 'other'
                },
                url;
            client.deleteProjectAsync(projectName, function (err) {
                expect(err).to.equal(null);

                client.seedProjectAsync(seedConfig, function (err) {
                    expect(err).to.equal(null);

                    url = client.getDumpURL({
                        project: projectName,
                        branch: 'other',
                        output: 'seedTestOutput'
                    });

                    console.warn(url);
                    done();
                    //superagent.get(url, function (err, result) {
                    //    console.warn('whaaat');
                    //    expect(err).to.equal(null);
                    //    //expect(result.body).to.deep.equal(refNodeProj);
                    //
                    //    done();
                    //});
                });
            });
        });

        it('should not allow to overwrite projects with seed', function (done) {
            var projectName = 'projectSeedSingleMaster',
                seedConfig = {
                    seedName: 'projectSeedSingleMaster',
                    projectName: projectName
                };

            client.seedProjectAsync(seedConfig, function (err) {
                expect(err).not.to.equal(null);

                expect(err).to.contain('overwrite');

                done();
            });
        });
    });
})
;