/*globals require*/
/*jshint node:true, mocha:true, expr:true*/
/*jscs:disable maximumLineLength*/

/**
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../../_globals.js');

describe('PROJECT REST API', function () {
    'use strict';

    var gmeConfig = testFixture.getGmeConfig(),
        logger = testFixture.logger.fork('index.project.spec'),
        WebGME = testFixture.WebGME,
        expect = testFixture.expect,
        Q = testFixture.Q,

        superagent = testFixture.superagent,
        projectName2Id = testFixture.projectName2Id;

    describe('PROJECT SPECIFIC API', function () {

        describe('auth enabled, allowGuests true', function () {
            var server,
                agent,
                projectName = 'project',
                importResult,
                unauthorizedProjectName = 'unauthorized_project',
                toDeleteProjectName = 'project_to_delete',
                safeStorage,
                gmeAuth,
                guestAccount = gmeConfig.authentication.guestAccount;

            function projectName2APIPath(projectName, user) {
                user = user || guestAccount;
                return guestAccount + '/' + projectName;
            }

            before(function (done) {
                var gmeConfig = testFixture.getGmeConfig();
                gmeConfig.authentication.enable = true;
                gmeConfig.authentication.allowGuests = true;

                testFixture.clearDBAndGetGMEAuth(gmeConfig,
                    [projectName, unauthorizedProjectName, toDeleteProjectName])
                    .then(function (gmeAuth_) {
                        gmeAuth = gmeAuth_;
                        safeStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                        return safeStorage.openDatabase();
                    })
                    .then(function () {
                        return Q.allDone([
                            testFixture.importProject(safeStorage, {
                                projectSeed: 'seeds/EmptyProject.webgmex',
                                projectName: projectName,
                                gmeConfig: gmeConfig,
                                logger: logger
                            }),
                            testFixture.importProject(safeStorage, {
                                projectSeed: 'seeds/EmptyProject.webgmex',
                                projectName: unauthorizedProjectName,
                                gmeConfig: gmeConfig,
                                logger: logger
                            }),
                            testFixture.importProject(safeStorage, {
                                projectSeed: 'seeds/EmptyProject.webgmex',
                                projectName: toDeleteProjectName,
                                gmeConfig: gmeConfig,
                                logger: logger
                            })
                        ]);
                    })
                    .then(function (results) {
                        importResult = results[0]; // projectName
                        return Q.allDone([
                            importResult.project.createTag('tag', importResult.commitHash),
                            importResult.project.createTag('tagPatched', importResult.commitHash),
                            gmeAuth.authorizeByUserId(guestAccount, projectName2Id(unauthorizedProjectName),
                                'create', {
                                    read: true,
                                    write: false,
                                    delete: false
                                }
                            ),
                            gmeAuth.addOrganization('org', null),
                            gmeAuth.addUser('userSiteAdmin', 'user@example.com', 'p', true, {
                                overwrite: true,
                                siteAdmin: true
                            })
                        ]);
                    })
                    .then(function () {
                        return Q.allDone([
                            gmeAuth.addUserToOrganization(guestAccount, 'org'),
                            gmeAuth.setAdminForUserInOrganization(guestAccount, 'org', true)
                        ]);
                    })
                    .then(function () {
                        server = WebGME.standaloneServer(gmeConfig);
                        return Q.ninvoke(server, 'start');
                    })
                    .nodeify(done);
            });

            after(function (done) {
                server.stop(function (err) {
                    if (err) {
                        done(new Error(err));
                        return;
                    }

                    Q.allDone([
                        gmeAuth.unload(),
                        safeStorage.closeDatabase()
                    ])
                        .nodeify(done);
                });
            });

            beforeEach(function () {
                agent = superagent.agent();
            });

            // NO AUTH methods
            it('should list projects /projects', function (done) {
                agent.get(server.getUrl() + '/api/projects').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    expect(res.body.length).to.equal(3);
                    res.body.forEach(function (projectData) {
                        expect(projectData).to.have.keys('_id', 'info', 'owner', 'name');
                    });
                    done();
                });
            });

            it('should create a project from fileSeed /projects/:ownerId/:projectName', function (done) {
                var toBeCreatedProjectName = 'myVeryNewFileProject';
                agent.put(server.getUrl() + '/api/projects/' + projectName2APIPath(toBeCreatedProjectName))
                    .send({type: 'file', seedName: 'EmptyProject'})
                    .end(function (err, res) {
                        expect(res.status).to.equal(204);

                        agent.get(server.getUrl() + '/api/projects')
                            .end(function (err, res) {
                                var wasIncluded = false;
                                expect(res.status).to.equal(200);
                                res.body.forEach(function (projectData) {
                                    if (projectData._id === testFixture.projectName2Id(toBeCreatedProjectName)) {
                                        expect(projectData.name).to.equal(toBeCreatedProjectName);
                                        expect(projectData.owner).to.equal('guest');
                                        wasIncluded = true;
                                    }
                                });
                                expect(wasIncluded).to.equal(true);
                                done();
                            });
                    });
            });

            it('should create a project from dbSeed /projects/:ownerId/:projectName', function (done) {
                var toBeCreatedProjectName = 'myVeryNewDBProject';
                agent.put(server.getUrl() + '/api/projects/' + projectName2APIPath(toBeCreatedProjectName))
                    .send({type: 'db', seedName: testFixture.projectName2Id('project'), seedBranch: 'master'})
                    .end(function (err, res) {
                        expect(res.status).to.equal(204);

                        agent.get(server.getUrl() + '/api/projects')
                            .end(function (err, res) {
                                var wasIncluded = false;
                                expect(res.status).to.equal(200);
                                res.body.forEach(function (projectData) {
                                    if (projectData._id === testFixture.projectName2Id(toBeCreatedProjectName)) {
                                        expect(projectData.name).to.equal(toBeCreatedProjectName);
                                        expect(projectData.owner).to.equal('guest');
                                        wasIncluded = true;
                                    }
                                });
                                expect(wasIncluded).to.equal(true);
                                done();
                            });
                    });
            });

            it('should create a project to an organization /projects/org/:projectName', function (done) {
                var toBeCreatedProjectName = 'ownedByOrg';
                agent.put(server.getUrl() + '/api/projects/org/' + toBeCreatedProjectName)
                    .send({type: 'file', seedName: 'EmptyProject'})
                    .end(function (err, res) {
                        expect(res.status).to.equal(204);

                        agent.get(server.getUrl() + '/api/projects')
                            .end(function (err, res) {
                                var wasIncluded = false;
                                expect(res.status).to.equal(200);
                                res.body.forEach(function (projectData) {
                                    if (projectData._id === testFixture.projectName2Id(toBeCreatedProjectName, 'org')) {
                                        expect(projectData.name).to.equal(toBeCreatedProjectName);
                                        expect(projectData.owner).to.equal('org');
                                        wasIncluded = true;
                                    }
                                });
                                expect(wasIncluded).to.equal(true);
                                done();
                            });
                    });
            });

            it('should get info and branches for project /projects/:ownerId/:projectId', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.have.property('branches');
                        expect(res.body).to.have.property('info');
                        expect(res.body.info).to.include.keys('creator', 'viewer', 'modifier',
                            'createdAt', 'viewedAt', 'modifiedAt');
                        done();
                    });
            });

            it('should patch info for project /projects/:ownerId/:projectId', function (done) {
                agent.patch(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName))
                    .send({creator: 'PerAlbinHansson'})
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.have.property('info');
                        expect(res.body.info).to.include.keys('creator', 'viewer', 'modifier',
                            'createdAt', 'viewedAt', 'modifiedAt');
                        expect(res.body.info.creator).to.equal('PerAlbinHansson');
                        done();
                    });
            });

            it('should not patch info for project if no write access /projects/:ownerId/:projectId', function (done) {
                agent.patch(server.getUrl() + '/api/projects/' + projectName2APIPath(unauthorizedProjectName))
                    .send({creator: 'PerAlbinHansson'})
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);
                        done();
                    });
            });

            it('should patch if siteAdmin /projects/:ownerId/:projectId', function (done) {
                agent.patch(server.getUrl() + '/api/projects/' + projectName2APIPath(unauthorizedProjectName))
                    .set('Authorization', 'Basic ' + new Buffer('userSiteAdmin:p').toString('base64'))
                    .send({creator: 'PerAlbinHansson'})
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.have.property('info');
                        expect(res.body.info).to.include.keys('creator', 'viewer', 'modifier',
                            'createdAt', 'viewedAt', 'modifiedAt');
                        expect(res.body.info.creator).to.equal('PerAlbinHansson');
                        done();
                    });
            });

            it('should not get info and branches for non-existent project', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath('does_not_exist'))
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);
                        done();
                    });
            });

            it('should branches for project /projects/:ownerId/:projectId/branches', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/branches')
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.have.property('master');

                        done();
                    });
            });

            it('should not get branches for non-existent project', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath('does_not_exist') +
                    '/branches').end(function (err, res) {
                    expect(res.status).equal(403, err);
                    done();
                });
            });

            it('should get branch information for project /projects/:ownerId/:projectId/branches/master',
                function (done) {
                    agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                        '/branches/master')
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            expect(res.body).to.have.property('projectId');
                            expect(res.body).to.have.property('branchName');
                            expect(res.body).to.have.property('commitObject');
                            expect(res.body).to.have.property('coreObjects');

                            expect(res.body.projectId).to.equal(projectName2Id(projectName));
                            expect(res.body.branchName).to.equal('master');

                            done();
                        });
                });

            it('should not get branch information for non-existent branch', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                    '/branches/does_not_exist')
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);
                        done();
                    });
            });

            it('should list commits for project /projects/:ownerId/:projectId/commits', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/commits')
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body.length).to.equal(1);
                        expect(res.body[0]).to.have.property('message');
                        expect(res.body[0]).to.have.property('parents');
                        expect(res.body[0]).to.have.property('root');
                        expect(res.body[0]).to.have.property('time');
                        expect(res.body[0]).to.have.property('type');
                        expect(res.body[0]).to.have.property('updater');
                        expect(res.body[0]).to.have.property('_id');
                        done();
                    });
            });

            it('should list commits for project /projects/:ownerId/:projectId/commits?n=1', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/commits?n=1')
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body.length).to.equal(1);
                        expect(res.body[0]).to.have.property('message');
                        expect(res.body[0]).to.have.property('parents');
                        expect(res.body[0]).to.have.property('root');
                        expect(res.body[0]).to.have.property('time');
                        expect(res.body[0]).to.have.property('type');
                        expect(res.body[0]).to.have.property('updater');
                        expect(res.body[0]).to.have.property('_id');
                        done();
                    });
            });

            it('should return commit for project /projects/:ownerId/:projectId/commits/:commitHash', function (done) {
                var url = server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/commits/' +
                    importResult.commitHash.substring(1);
                agent.get(url)
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.have.property('message');
                        expect(res.body).to.have.property('parents');
                        expect(res.body).to.have.property('root');
                        expect(res.body).to.have.property('time');
                        expect(res.body).to.have.property('type');
                        expect(res.body).to.have.property('updater');
                        expect(res.body).to.have.property('_id');
                        done();
                    });
            });

            it('should return commit for project /projects/:ownerId/:projectId/commits/:%23commitHash', function (done) {
                var url = server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/commits/%23' +
                    importResult.commitHash.substring(1);
                agent.get(url)
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.have.property('message');
                        expect(res.body).to.have.property('parents');
                        expect(res.body).to.have.property('root');
                        expect(res.body).to.have.property('time');
                        expect(res.body).to.have.property('type');
                        expect(res.body).to.have.property('updater');
                        expect(res.body).to.have.property('_id');
                        done();
                    });
            });

            it('should 404 commit for project /projects/:ownerId/:projectId/commits/:doesNotExist', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/commits/' +
                    'doesNotExist')
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);
                        done();
                    });
            });

            it('should 404 commit for project /projects/:ownerId/:doesNotExist/commits/:doesNotExist', function (done) {
                agent.get(server.getUrl() + '/api/projects/guest/doesNotExist/commits/' +
                    importResult.commitHash.substring(1))
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);
                        done();
                    });
            });

            it('should 404 commit for project /projects/:ownerId/:projectId/commits/:rootHash', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/commits/' +
                    importResult.rootHash.substring(1))
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);
                        done();
                    });
            });

            // Getting raw data nodes via commit
            it('should return rootNode for project /projects/:ownerId/:projectId/commits/:commitHash/tree/',
                function (done) {
                    var url = server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/commits/' +
                        importResult.commitHash.substring(1) + '/tree/';
                    agent.get(url)
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            expect(res.body).to.have.property('1');
                            expect(res.body).to.have.property('_id');
                            expect(res.body).to.have.property('_meta');
                            expect(res.body).to.have.property('atr');
                            expect(res.body).to.have.property('ovr');

                            done();
                        });
                }
            );

            it('should return fcoNode for project /projects/:ownerId/:projectId/commits/:commitHash/tree/1',
                function (done) {
                    var url = server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/commits/' +
                        importResult.commitHash.substring(1) + '/tree/1';
                    agent.get(url)
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            expect(res.body).to.not.have.property('1');
                            expect(res.body).to.have.property('_id');
                            expect(res.body).to.have.property('_meta');
                            expect(res.body).to.have.property('atr');
                            expect(res.body).to.have.property('ovr');

                            done();
                        });
                }
            );

            it('should return fcoNode for project /projects/:ownerId/:projectId/commits/:%23commitHash/tree/1',
                function (done) {
                    var url = server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/commits/%23' +
                        importResult.commitHash.substring(1) + '/tree/1';
                    agent.get(url)
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            expect(res.body).to.not.have.property('1');
                            expect(res.body).to.have.property('_id');
                            expect(res.body).to.have.property('_meta');
                            expect(res.body).to.have.property('atr');
                            expect(res.body).to.have.property('ovr');

                            done();
                        });
                }
            );

            it('should 404 /projects/:ownerId/:projectId/commits/:doesNotExist/tree/',
                function (done) {
                    var url = server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/commits/' +
                        'doesNotExist' + '/tree/';
                    agent.get(url)
                        .end(function (err, res) {
                            expect(res.status).equal(404, err);

                            done();
                        });
                }
            );

            it('should 404 /projects/:ownerId/:projectId/commits/:commitHash/tree/doesNotExist',
                function (done) {
                    var url = server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/commits/' +
                        importResult.commitHash.substring(1) + '/tree/doesNotExist';
                    agent.get(url)
                        .end(function (err, res) {
                            expect(res.status).equal(404, err);

                            done();
                        });
                }
            );

            it('should 404 /projects/:ownerId/:doesNotExist/commits/:commitHash/tree/',
                function (done) {
                    var url = server.getUrl() + '/api/projects/guest/doesNotExist/commits/' +
                        importResult.commitHash.substring(1) + '/tree/';
                    agent.get(url)
                        .end(function (err, res) {
                            expect(res.status).equal(404, err);

                            done();
                        });
                }
            );

            it('should get history for branch /projects/:ownerId/branches/:branchId/commits',
                function (done) {
                    var url = server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/branches/' +
                        'master/commits';
                    agent.get(url)
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            expect(res.body instanceof Array).to.equal(true);
                            expect(res.body.length).to.equal(1);
                            expect(res.body[0]._id).to.equal(importResult.commitHash);

                            done();
                        });
                }
            );

            it('should get history for branch /projects/:ownerId/branches/:branchId/commits?n=1',
                function (done) {
                    var url = server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/branches/' +
                        'master/commits?n=1';
                    agent.get(url)
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            expect(res.body instanceof Array).to.equal(true);
                            expect(res.body.length).to.equal(1);
                            expect(res.body[0]._id).to.equal(importResult.commitHash);

                            done();
                        });
                }
            );

            // Getting raw data nodes via branch
            it('should return rootNode for project /projects/:ownerId/:projectId/branches/:branchId/tree/',
                function (done) {
                    var url = server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/branches/' +
                        'master/tree/';
                    agent.get(url)
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            expect(res.body).to.have.property('1');
                            expect(res.body).to.have.property('_id');
                            expect(res.body).to.have.property('_meta');
                            expect(res.body).to.have.property('atr');
                            expect(res.body).to.have.property('ovr');

                            done();
                        });
                }
            );

            it('should return fcoNode for project /projects/:ownerId/:projectId/branches/:branchId/tree/1',
                function (done) {
                    var url = server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/branches/' +
                        'master/tree/1';
                    agent.get(url)
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            expect(res.body).to.not.have.property('1');
                            expect(res.body).to.have.property('_id');
                            expect(res.body).to.have.property('_meta');
                            expect(res.body).to.have.property('atr');
                            expect(res.body).to.have.property('ovr');

                            done();
                        });
                }
            );

            it('should 404 /projects/:ownerId/:projectId/branches/:doesNotExist/tree/',
                function (done) {
                    var url = server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/branches/' +
                        'doesNotExist/tree/';
                    agent.get(url)
                        .end(function (err, res) {
                            expect(res.status).equal(404, err);

                            done();
                        });
                }
            );

            it('should 404 /projects/:ownerId/:projectId/branches/:branchId/tree/doesNotExist',
                function (done) {
                    var url = server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/branches/' +
                        'master/tree/doesNotExist';
                    agent.get(url)
                        .end(function (err, res) {
                            expect(res.status).equal(404, err);

                            done();
                        });
                }
            );

            it('should 404 /projects/:ownerId/:doesNotExist/branches/:branchId/tree/',
                function (done) {
                    var url = server.getUrl() + '/api/projects/guest/doesNotExist/branches/master/tree/';
                    agent.get(url)
                        .end(function (err, res) {
                            expect(res.status).equal(404, err);

                            done();
                        });
                }
            );

            // Branch manipulation
            it('should create branch for project /projects/:ownerId/:projectId/branches/newBranch', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/branches/master')
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);

                        agent.put(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                            '/branches/newBranch')
                            .send({hash: res.body.commitObject._id})
                            .end(function (err, res) {
                                expect(res.status).equal(201, err);
                                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                                    '/branches')
                                    .end(function (err, res) {
                                        expect(res.status).equal(200, err);
                                        expect(res.body).to.have.property('master');
                                        expect(res.body).to.have.property('newBranch');
                                        done();
                                    });
                            });
                    });
            });

            it('should delete a branch for project /projects/:ownerId/:projectId/branches/newBranchToDelete',
                function (done) {
                    agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                        '/branches/master')
                        .end(function (err, res) {
                            var hash;
                            expect(res.status).equal(200, err);
                            hash = res.body.commitObject._id;

                            agent.put(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                                '/branches/newBranchToDelete')
                                .send({hash: hash})
                                .end(function (err, res) {
                                    expect(res.status).equal(201, err);

                                    agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                                        '/branches')
                                        .end(function (err, res) {
                                            expect(res.status).equal(200, err);
                                            expect(res.body).to.have.property('master');
                                            expect(res.body).to.have.property('newBranchToDelete');
                                            expect(res.body.newBranchToDelete).to.equal(hash);

                                            agent.del(server.getUrl() + '/api/projects/' +
                                                projectName2APIPath(projectName) +
                                                '/branches/newBranchToDelete')
                                                .end(function (err, res) {
                                                    expect(res.status).equal(204, err);

                                                    agent.get(server.getUrl() + '/api/projects/' +
                                                        projectName2APIPath(projectName) + '/branches')
                                                        .end(function (err, res) {
                                                            expect(res.status).equal(200, err);
                                                            expect(res.body).to.have.property('master');
                                                            expect(res.body).to.not.have.property('newBranchToDelete');
                                                            done();
                                                        });
                                                });
                                        });
                                });
                        });
                });

            it('should patch a branch for project /projects/:ownerId/:projectId/branches/newBranchToPatch',
                function (done) {
                    agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                        '/branches/master')
                        .end(function (err, res) {
                            var hash;
                            expect(res.status).equal(200, err);
                            hash = res.body.commitObject._id;

                            agent.put(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                                '/branches/newBranchToPatch')
                                .send({hash: hash})
                                .end(function (err, res) {
                                    expect(res.status).equal(201, err);

                                    agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                                        '/branches')
                                        .end(function (err, res) {
                                            var commitObject = importResult.project.createCommitObject([hash],
                                                importResult.rootHash,
                                                'tester',
                                                '15'),
                                                commitData = {
                                                    projectId: projectName2Id(projectName),
                                                    commitObject: commitObject,
                                                    coreObjects: []
                                                };

                                            expect(res.status).equal(200, err);
                                            expect(res.body).to.have.property('master');
                                            expect(res.body).to.have.property('newBranchToPatch');
                                            expect(res.body.newBranchToPatch).to.equal(hash);

                                            // we have to create a new commit to change the branch hash
                                            safeStorage.makeCommit(commitData)
                                                .then(function (result) {
                                                    expect(result.hasOwnProperty('hash')).to.equal(true);

                                                    agent.patch(server.getUrl() + '/api/projects/' +
                                                        projectName2APIPath(projectName) +
                                                        '/branches/newBranchToPatch')
                                                        .send({
                                                            oldHash: hash,
                                                            newHash: result.hash
                                                        })
                                                        .end(function (err, res) {
                                                            expect(res.status).equal(200, err);

                                                            agent.get(server.getUrl() + '/api/projects/' +
                                                                projectName2APIPath(projectName) + '/branches')
                                                                .end(function (err, res) {
                                                                    expect(res.status).equal(200, err);
                                                                    expect(res.body).to.have.property('master');
                                                                    expect(res.body).to.have.property('newBranchToPatch');
                                                                    expect(res.body.newBranchToPatch).to.equal(result.hash);
                                                                    done();
                                                                });
                                                        });
                                                })
                                                .catch(function (err) {
                                                    done(err);
                                                });
                                        });
                                });
                        });
                });

            it('should compare branches for project /projects/:ownerId/:projectId/compare/master...master',
                function (done) {
                    agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                        '/compare/master...master')
                        .end(function (err, res) {
                            expect(res.status).equal(200, err);
                            // expecting empty diff
                            expect(res.body).to.deep.equal({});
                            done();
                        });
                });

            it('should fail to compare non-existent branches for project /projects/:ownerId/:projectId/compare/doesnt_exist...master',
                function (done) {
                    agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                        '/compare/doesnt_exist...master')
                        .end(function (err, res) {
                            expect(res.status).equal(500, err);
                            // expecting empty diff
                            done();
                        });
                });

            it('should not get commits for non-existent project', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath('does_not_exist') +
                    '/commits').end(function (err, res) {
                    expect(res.status).equal(403, err);
                    done();
                });
            });

            it('should delete a project by id /projects/guest/project_to_delete', function (done) {
                agent.del(server.getUrl() + '/api/projects/' + projectName2APIPath(toDeleteProjectName))
                    .end(function (err, res) {
                        expect(res.status).equal(204, err);
                        done();
                    });
            });

            it('should fail to delete a non-existent project', function (done) {
                agent.del(server.getUrl() + '/api/projects/' + projectName2APIPath('does_not_exist'))
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);
                        done();
                    });
            });

            it('should fail to delete a branch if project does not exist', function (done) {
                agent.del(server.getUrl() + '/api/projects/' + projectName2APIPath('does_not_exist') + '/branches/master')
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);
                        done();
                    });
            });

            it('should fail to create a branch if project does not exist', function (done) {
                agent.put(server.getUrl() + '/api/projects/' + projectName2APIPath('does_not_exist') + '/branches/master')
                    .send({hash: '#hash'})
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);
                        done();
                    });
            });

            it('should fail to update branch if old and new hashes are not provided', function (done) {
                agent.patch(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/branches/master')
                    .send({})
                    .end(function (err, res) {
                        expect(res.status).equal(500, err);
                        done();
                    });
            });

            it('should fail to create a project with unknown owner', function (done) {
                var toBeCreatedProjectName = 'myVeryNewProject';
                agent.put(server.getUrl() + '/api/projects/noRealOwner/' + toBeCreatedProjectName)
                    .send({type: 'file', seedName: 'EmptyProject'})
                    .end(function (err, res) {
                        expect(res.status).to.equal(500);

                        done();
                    });
            });

            //Tags
            it('should getTags for project /projects/:ownerId/:projectId/tags', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/tags')
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.have.property('tag');

                        done();
                    });
            });

            it('should return commit for project /projects/:ownerId/:projectId/tags/:tagId', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/tags/tag')
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body.type).to.equal('commit');

                        done();
                    });
            });

            it('should 404 for project /projects/:ownerId/:projectId/tags/:notExist', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/tags/notExist')
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);

                        done();
                    });
            });

            it('should patch an existing tag /projects/:ownerId/:projectId/tags/tagPatched', function (done) {
                agent.patch(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/tags/tagPatched')
                    .send({hash: importResult.commitHash})
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/tags')
                            .end(function (err, res) {
                                expect(res.status).equal(200, err);
                                expect(res.body).to.have.property('tagPatched');

                                done();
                            });
                    });
            });

            it('should patch a non-existing tag /projects/:ownerId/:projectId/tags/didNotExist', function (done) {
                agent.patch(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/tags/newPatched')
                    .send({hash: importResult.commitHash})
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/tags')
                            .end(function (err, res) {
                                expect(res.status).equal(200, err);
                                expect(res.body).to.have.property('newPatched');

                                done();
                            });
                    });
            });

            it('should create tag for put project /projects/:ownerId/:projectId/tags/:newTag', function (done) {
                agent.put(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/tags/newTag')
                    .send({hash: importResult.commitHash})
                    .end(function (err, res) {
                        expect(res.status).equal(201, err);
                        agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/tags')
                            .end(function (err, res) {
                                expect(res.status).equal(200, err);
                                expect(res.body.newTag).to.equal(importResult.commitHash);

                                done();
                            });
                    });
            });

            it('should delete tag for del project /projects/:ownerId/:projectId/tags/:newTag', function (done) {
                agent.put(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/tags/toDel')
                    .send({hash: importResult.commitHash})
                    .end(function (err, res) {
                        expect(res.status).equal(201, err);
                        agent.del(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                            '/tags/toDel')
                            .end(function (err, res) {
                                expect(res.status).equal(204, err);
                                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) +
                                    '/tags')
                                    .end(function (err, res) {
                                        expect(res.status).equal(200, err);
                                        expect(res.body.hasOwnProperty('toDel')).to.equal(false);

                                        done();
                                    });
                            });

                    });
            });

            it('should 403 for project get /projects/not/Exist/tags', function (done) {
                agent.get(server.getUrl() + '/api/projects/not/Exist/tags')
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);

                        done();
                    });
            });

            it('should 403 for project get /projects/not/Exist/tags/notExist', function (done) {
                agent.get(server.getUrl() + '/api/projects/not/Exist/tags/notExist')
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);

                        done();
                    });
            });

            it('should 403 for project del /projects/not/Exist/tags/notExist', function (done) {
                agent.del(server.getUrl() + '/api/projects/not/Exist/tags/notExist')
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);

                        done();
                    });
            });

            it('should 403 for project put /projects/not/Exist/tags/notExist', function (done) {
                agent.put(server.getUrl() + '/api/projects/not/Exist/tags/notExist')
                    .send({hash: importResult.commitHash})
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);

                        done();
                    });
            });

            it('should 403 for project patch /projects/not/Exist/tags/notExist', function (done) {
                agent.put(server.getUrl() + '/api/projects/not/Exist/tags/notExist')
                    .send({hash: importResult.commitHash})
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);

                        done();
                    });
            });

            it('should list webhooks of project', function (done) {
                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/hooks').end(function (err, res) {
                    expect(res.status).equal(200, err);
                    expect(res.body).to.eql({});
                    done();
                });
            });

            it('should 403 on list webhooks of unknown project', function (done) {
                agent.get(server.getUrl() + '/api/projects/guest/unknown/hooks').end(function (err, res) {
                    expect(res.status).equal(403, err);
                    done();
                });
            });

            it('should create, list, and remove webhook', function (done) {
                var hookData = {
                    events: 'all',
                    url: 'http://any.address.at.all'
                };

                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/hooks')
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.eql({});
                        agent.put(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/hooks/one')
                            .send(hookData)
                            .end(function (err, res) {
                                expect(res.status).equal(200, err);

                                agent.get(server.getUrl() + '/api/projects/' +
                                    projectName2APIPath(projectName) + '/hooks/one')
                                    .end(function (err, res) {
                                        expect(res.status).equal(200, err);
                                        expect(res.body.events).to.equal(hookData.events);
                                        expect(res.body.url).to.equal(hookData.url);

                                        agent.get(server.getUrl() + '/api/projects/' +
                                            projectName2APIPath(projectName) + '/hooks')
                                            .end(function (err, res) {
                                                expect(res.status).equal(200, err);
                                                expect(res.body.one.events).to.equal(hookData.events);
                                                expect(res.body.one.url).to.equal(hookData.url);

                                                agent.delete(server.getUrl() + '/api/projects/' +
                                                    projectName2APIPath(projectName) + '/hooks/one')
                                                    .end(function (err, res) {
                                                        expect(res.status).equal(200, err);

                                                        agent.get(server.getUrl() + '/api/projects/' +
                                                            projectName2APIPath(projectName) + '/hooks')
                                                            .end(function (err, res) {
                                                                expect(res.status).equal(200, err);
                                                                expect(res.body).to.eql({});

                                                                done();
                                                            });
                                                    });
                                            });
                                    });
                            });
                    });
            });

            it('should create, then 403 on re-creating a webhook', function (done) {
                var hookData = {
                    events: 'all',
                    url: 'http://any.address.at.all'
                };

                agent.get(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/hooks')
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body).to.eql({});
                        agent.put(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/hooks/one')
                            .send(hookData)
                            .end(function (err, res) {
                                expect(res.status).equal(200, err);

                                agent.put(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/hooks/one')
                                    .send(hookData)
                                    .end(function (err, res) {
                                        expect(res.status).equal(403, err);

                                        agent.delete(server.getUrl() + '/api/projects/' +
                                            projectName2APIPath(projectName) + '/hooks/one')
                                            .end(function (err, res) {
                                                expect(res.status).equal(200, err);

                                                done();
                                            });
                                    });
                            });
                    });
            });

            it('should 403 on create a webhook for unauthorized project', function (done) {
                var hookData = {
                    events: 'all',
                    url: 'http://any.address.at.all'
                };

                agent.put(server.getUrl() + '/api/projects/' + projectName2APIPath(unauthorizedProjectName) + '/hooks/one')
                    .send(hookData)
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);

                        done();
                    });
            });

            it('should 403 on updating a webhook for unauthorized project', function (done) {
                var hookData = {
                    events: 'all',
                    url: 'http://any.address.at.all'
                };

                agent.patch(server.getUrl() + '/api/projects/' + projectName2APIPath(unauthorizedProjectName) + '/hooks/one')
                    .send(hookData)
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);

                        done();
                    });
            });

            it('should create, update, and delete a webhook', function (done) {
                var hookData = {
                        events: 'all',
                        url: 'http://any.address.at.all'
                    },
                    newUrl = 'http://other.than.before.com';

                agent.put(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/hooks/one')
                    .send(hookData)
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);

                        agent.patch(server.getUrl() + '/api/projects/' + projectName2APIPath(projectName) + '/hooks/one')
                            .send({url: newUrl, active:false})
                            .end(function (err, res) {
                                expect(res.status).equal(200, err);

                                expect(res.body.url).to.equal(newUrl);
                                agent.delete(server.getUrl() + '/api/projects/' +
                                    projectName2APIPath(projectName) + '/hooks/one')
                                    .end(function (err, res) {
                                        expect(res.status).equal(200, err);

                                        done();
                                    });
                            });
                    });
            });

            it('should 404 on listing unknown webhook', function (done) {
                agent.get(server.getUrl() + '/api/projects/' +
                    projectName2APIPath(projectName) + '/hooks/one')
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);

                        done();
                    });
            });

            it('should 404 on update unknown webhook', function (done) {
                agent.patch(server.getUrl() + '/api/projects/' +
                    projectName2APIPath(projectName) + '/hooks/one')
                    .send({})
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);

                        done();
                    });
            });
        });
    });

    describe('Assigning authorization for projects', function () {
        var server,
            agent,
            projectOwnedByUser = 'projectOwnedByUser',
            projectOwnedByOrg = 'projectOwnedByOrg',
            projectOwnedByOtherUser = 'projectOwnedByOtherUser',
            safeStorage,
            gmeAuth,
            projectAuthParams,
            pr2Id = testFixture.projectName2Id,
            guestAccount = gmeConfig.authentication.guestAccount;

        before(function (done) {
            var gmeConfig = testFixture.getGmeConfig();
            gmeConfig.authentication.enable = true;

            server = WebGME.standaloneServer(gmeConfig);

            testFixture.clearDBAndGetGMEAuth(gmeConfig)
                .then(function (gmeAuth_) {
                    gmeAuth = gmeAuth_;
                    projectAuthParams = {
                        entityType: gmeAuth.authorizer.ENTITY_TYPES.PROJECT
                    };
                    safeStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                    return safeStorage.openDatabase();
                })
                .then(function () {
                    return Q.allDone([
                        gmeAuth.addUser('user', 'user@example.com', 'p', true, {overwrite: true}),
                        gmeAuth.addUser('userWithRights1', 'user@example.com', 'p', true, {overwrite: true}),
                        gmeAuth.addUser('userWithRights2', 'user@example.com', 'p', true, {overwrite: true}),
                        gmeAuth.addUser('userWithRights3', 'user@example.com', 'p', true, {overwrite: true}),
                        gmeAuth.addUser('userOrgAdmin', 'user@example.com', 'p', true, {overwrite: true}),
                        gmeAuth.addUser('userSiteAdmin', 'user@example.com', 'p', true, {
                            overwrite: true,
                            siteAdmin: true
                        }),
                        gmeAuth.addOrganization('org', null)
                    ]);
                })
                .then(function () {
                    return Q.allDone([
                        gmeAuth.addUserToOrganization('userOrgAdmin', 'org'),
                        gmeAuth.setAdminForUserInOrganization('userOrgAdmin', 'org', true)
                    ]);
                })
                .then(function () {
                    return Q.allDone([
                        testFixture.importProject(safeStorage, {
                            projectSeed: 'seeds/EmptyProject.webgmex',
                            projectName: projectOwnedByUser,
                            gmeConfig: gmeConfig,
                            username: 'user',
                            logger: logger
                        }),
                        testFixture.importProject(safeStorage, {
                            projectSeed: 'seeds/EmptyProject.webgmex',
                            projectName: projectOwnedByOrg,
                            gmeConfig: gmeConfig,
                            username: 'userOrgAdmin',
                            logger: logger
                        }),
                        testFixture.importProject(safeStorage, {
                            projectSeed: 'seeds/EmptyProject.webgmex',
                            projectName: projectOwnedByOtherUser,
                            gmeConfig: gmeConfig,
                            logger: logger
                        })
                    ]);
                })
                .then(function () {
                    return Q.allDone([
                        gmeAuth.authorizeByUserOrOrgId(
                            'user',
                            pr2Id(projectOwnedByUser, 'user'),
                            'create',
                            {
                                read: true,
                                write: true,
                                delete: true
                            }
                        ),
                        gmeAuth.authorizeByUserOrOrgId(
                            'userWithRights1',
                            pr2Id(projectOwnedByUser, 'user'),
                            'create',
                            {
                                read: true,
                                write: true,
                                delete: true
                            }
                        ),
                        gmeAuth.authorizeByUserOrOrgId(
                            'userWithRights2',
                            pr2Id(projectOwnedByUser, 'user'),
                            'create',
                            {
                                read: true,
                                write: true,
                                delete: true
                            }
                        ),
                        gmeAuth.authorizeByUserOrOrgId(
                            'userWithRights3',
                            pr2Id(projectOwnedByOrg, 'org'),
                            'create',
                            {
                                read: true,
                                write: true,
                                delete: true
                            }
                        ),
                        gmeAuth.authorizeByUserOrOrgId(
                            'userOrgAdmin',
                            pr2Id(projectOwnedByOrg, 'userOrgAdmin'),
                            'create',
                            {
                                read: true,
                                write: true,
                                delete: true
                            }
                        ),
                        safeStorage.transferProject({
                            projectId: pr2Id(projectOwnedByOrg, 'userOrgAdmin'),
                            newOwnerId: 'org',
                            username: 'userOrgAdmin'
                        })
                    ]);
                })
                .then(function () {
                    return Q.allDone([
                        gmeAuth.addOrganization('orgTest1', null),
                        gmeAuth.addOrganization('orgTest2', null),
                        gmeAuth.addOrganization('orgTest3', null)
                    ]);
                })
                .then(function () {
                    return Q.allDone([
                        gmeAuth.addUser('userTest1', 'user@example.com', 'p', true, {overwrite: true}),
                        gmeAuth.addUser('userTest2', 'user@example.com', 'p', true, {overwrite: true}),
                        gmeAuth.addUser('userTest3', 'user@example.com', 'p', true, {overwrite: true}),
                        gmeAuth.addUser('userTest4', 'user@example.com', 'p', true, {overwrite: true}),
                        gmeAuth.addUser('userTest5', 'user@example.com', 'p', true, {overwrite: true}),
                        gmeAuth.addUser('userTest6', 'user@example.com', 'p', true, {overwrite: true}),
                    ]);
                })
                .then(function () {
                    return Q.ninvoke(server, 'start');
                })
                .nodeify(done);
        });

        after(function (done) {
            server.stop(function (err) {
                if (err) {
                    done(new Error(err));
                    return;
                }

                Q.allDone([
                    gmeAuth.unload(),
                    safeStorage.closeDatabase()
                ])
                    .nodeify(done);
            });
        });

        beforeEach(function () {
            agent = superagent.agent();
        });

        it('204 as owner should authorize /projects/user/projectOwnedByUser/authorize/userTest1/r', function (done) {
            agent.put(server.getUrl() + '/api/v1/projects/user/projectOwnedByUser/authorize/userTest1/rr')
                .set('Authorization', 'Basic ' + new Buffer('user:p').toString('base64'))
                .end(function (err, res) {
                    expect(res.status).equal(204, err);
                    gmeAuth.authorizer.getAccessRights('userTest1', pr2Id(projectOwnedByUser, 'user'), projectAuthParams)
                        .then(function (rights) {
                            expect(rights).to.deep.equal({
                                read: true,
                                write: false,
                                delete: false
                            });
                        })
                        .nodeify(done);
                });
        });

        it('204 as owner should authorize /projects/user/projectOwnedByUser/authorize/userTest2/w', function (done) {
            agent.put(server.getUrl() + '/api/v1/projects/user/projectOwnedByUser/authorize/userTest2/w')
                .set('Authorization', 'Basic ' + new Buffer('user:p').toString('base64'))
                .end(function (err, res) {
                    expect(res.status).equal(204, err);
                    gmeAuth.authorizer.getAccessRights('userTest2', pr2Id(projectOwnedByUser, 'user'), projectAuthParams)
                        .then(function (auth) {
                            expect(auth).to.deep.equal({
                                read: false,
                                write: true,
                                delete: false
                            });
                        })
                        .nodeify(done);
                });
        });

        it('204 as owner should authorize /projects/user/projectOwnedByUser/authorize/userTest3/rwd', function (done) {
            agent.put(server.getUrl() + '/api/v1/projects/user/projectOwnedByUser/authorize/userTest3/rwd')
                .set('Authorization', 'Basic ' + new Buffer('user:p').toString('base64'))
                .end(function (err, res) {
                    expect(res.status).equal(204, err);
                    gmeAuth.authorizer.getAccessRights('userTest3', pr2Id(projectOwnedByUser, 'user'), projectAuthParams)
                        .then(function (auth) {
                            expect(auth).to.deep.equal({
                                read: true,
                                write: true,
                                delete: true
                            });
                        })
                        .nodeify(done);
                });
        });

        it('404 as owner should not authorize /projects/user/projectOwnedByUser/authorize/notExists/r', function (done) {
            agent.put(server.getUrl() + '/api/v1/projects/user/projectOwnedByUser/authorize/notExists/r')
                .set('Authorization', 'Basic ' + new Buffer('user:p').toString('base64'))
                .end(function (err, res) {
                    expect(res.status).equal(404, err);
                    done();
                });
        });

        it('204 as owner should authorize /projects/user/projectOwnedByUser/authorize/orgTest1/r', function (done) {
            agent.put(server.getUrl() + '/api/v1/projects/user/projectOwnedByUser/authorize/orgTest1/r')
                .set('Authorization', 'Basic ' + new Buffer('user:p').toString('base64'))
                .end(function (err, res) {
                    expect(res.status).equal(204, err);
                    gmeAuth.authorizer.getAccessRights('orgTest1', pr2Id(projectOwnedByUser, 'user'), projectAuthParams)
                        .then(function (auth) {
                            expect(auth).to.deep.equal({
                                read: true,
                                write: false,
                                delete: false
                            });
                        })
                        .nodeify(done);
                });
        });

        it('204 as admin in owner org should authorize /projects/org/projectOwnedByOrg/authorize/userTest4/r',
            function (done) {
                agent.put(server.getUrl() + '/api/v1/projects/org/projectOwnedByOrg/authorize/userTest4/r')
                    .set('Authorization', 'Basic ' + new Buffer('userOrgAdmin:p').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(204, err);
                        gmeAuth.authorizer.getAccessRights('userTest4', pr2Id(projectOwnedByOrg, 'org'), projectAuthParams)
                            .then(function (auth) {
                                expect(auth).to.deep.equal({
                                    read: true,
                                    write: false,
                                    delete: false
                                });
                            })
                            .nodeify(done);
                    });
            }
        );

        it('204 as siteAdmin should authorize /projects/org/projectOwnedByOrg/authorize/userTest5/r',
            function (done) {
                agent.put(server.getUrl() + '/api/v1/projects/org/projectOwnedByOrg/authorize/userTest5/r')
                    .set('Authorization', 'Basic ' + new Buffer('userSiteAdmin:p').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(204, err);
                        gmeAuth.authorizer.getAccessRights('userTest5', pr2Id(projectOwnedByOrg, 'org'), projectAuthParams)
                            .then(function (auth) {
                                expect(auth).to.deep.equal({
                                    read: true,
                                    write: false,
                                    delete: false
                                });
                            })
                            .nodeify(done);
                    });
            }
        );

        it('403 should not authorize /projects/' + guestAccount + '/projectOwnedByOtherUser/authorize/userTest6/r',
            function (done) {
                agent.put(server.getUrl() + '/api/v1/projects/' + guestAccount + '/projectOwnedByOtherUser/authorize/userTest6/r')
                    .set('Authorization', 'Basic ' + new Buffer('user:p').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);
                        done();
                    });
            }
        );

        it('403 should not deauthorize /projects/user/projectOwnedByUser/authorize/userWithRights1',
            function (done) {
                agent.del(server.getUrl() + '/api/v1/projects/user/projectOwnedByUser/authorize/userWithRights1')
                    .set('Authorization', 'Basic ' + new Buffer('userOrgAdmin:p').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);
                        gmeAuth.authorizer.getAccessRights('userWithRights1', pr2Id(projectOwnedByUser, 'user'), projectAuthParams)
                            .then(function (auth) {
                                expect(auth).to.deep.equal({
                                    read: true,
                                    write: true,
                                    delete: true
                                });
                            })
                            .nodeify(done);
                    });
            }
        );

        // TODO: This might be the wrong behaviour
        it('204 should deauthorize /projects/user/projectOwnedByUser/authorize/notExists', function (done) {
            agent.del(server.getUrl() + '/api/v1/projects/user/projectOwnedByUser/authorize/notExists')
                .set('Authorization', 'Basic ' + new Buffer('user:p').toString('base64'))
                .end(function (err, res) {
                    expect(res.status).equal(204, err);
                    done();
                });
        });

        it('204 as owner should deauthorize /projects/user/projectOwnedByUser/authorize/userWithRights1',
            function (done) {
                agent.del(server.getUrl() + '/api/v1/projects/user/projectOwnedByUser/authorize/userWithRights1')
                    .set('Authorization', 'Basic ' + new Buffer('user:p').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(204, err);
                        gmeAuth.authorizer.getAccessRights('userWithRights1', pr2Id(projectOwnedByUser, 'user'), projectAuthParams)
                            .then(function (auth) {
                                expect(auth).to.deep.equal({
                                    read: false,
                                    write: false,
                                    delete: false
                                });
                            })
                            .nodeify(done);
                    });
            }
        );

        it('204 as siteAdmin should deauthorize /projects/user/projectOwnedByUser/authorize/userWithRights2',
            function (done) {
                agent.del(server.getUrl() + '/api/v1/projects/user/projectOwnedByUser/authorize/userWithRights2')
                    .set('Authorization', 'Basic ' + new Buffer('userSiteAdmin:p').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(204, err);
                        gmeAuth.authorizer.getAccessRights('userWithRights2', pr2Id(projectOwnedByUser, 'user'), projectAuthParams)
                            .then(function (auth) {
                                expect(auth).to.deep.equal({
                                    read: false,
                                    write: false,
                                    delete: false
                                });
                            })
                            .nodeify(done);
                    });
            }
        );

        it('204 as org admin should deauthorize /projects/org/projectOwnedByOrg/authorize/userWithRights3',
            function (done) {
                agent.del(server.getUrl() + '/api/v1/projects/org/projectOwnedByOrg/authorize/userWithRights3')
                    .set('Authorization', 'Basic ' + new Buffer('userOrgAdmin:p').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(204, err);
                        gmeAuth.authorizer.getAccessRights('userWithRights3', pr2Id(projectOwnedByOrg, 'org'), projectAuthParams)
                            .then(function (auth) {
                                expect(auth).to.deep.equal({
                                    read: false,
                                    write: false,
                                    delete: false
                                });
                            })
                            .nodeify(done);
                    });
            }
        );

        it('404 as org admin if project not exist /projects/org/unknown/authorize/userWithRights3/r',
            function (done) {
                agent.put(server.getUrl() + '/api/v1/projects/org/unknown/authorize/userWithRights3/r')
                    .set('Authorization', 'Basic ' + new Buffer('userOrgAdmin:p').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);
                        done();
                    });
            }
        );

        it('404 as (del) org admin if project not exist /projects/org/unknown/authorize/userWithRights3',
            function (done) {
                agent.del(server.getUrl() + '/api/v1/projects/org/unknown/authorize/userWithRights3')
                    .set('Authorization', 'Basic ' + new Buffer('userOrgAdmin:p').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);
                        done();
                    });
            }
        );

        it('403 as not org admin authorize /projects/org/projectOwnedByOrg/authorize/orgTest2/r',
            function (done) {
                agent.put(server.getUrl() + '/api/v1/projects/org/projectOwnedByOrg/authorize/orgTest2/r')
                    .set('Authorization', 'Basic ' + new Buffer('user:p').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);
                        done();
                    });
            }
        );

        it('403 (del) as not org admin authorize /projects/org/projectOwnedByOrg/authorize/orgTest3',
            function (done) {
                agent.del(server.getUrl() + '/api/v1/projects/org/projectOwnedByOrg/authorize/orgTest3')
                    .set('Authorization', 'Basic ' + new Buffer('user:p').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);
                        done();
                    });
            }
        );
    });

    describe('Transferring projects', function () {
        var server,
            agent,
            projectOwnedByUserOnlyWithAccess = 'projectOwnedByUserOnlyWithAccess',
            projectOwnedByOrgOnlyWithAccess = 'projectOwnedByOrgOnlyWithAccess',
            safeStorage,
            gmeAuth,
            projectAuthParams,
            pr2Id = testFixture.projectName2Id,
            guestAccount = gmeConfig.authentication.guestAccount;

        before(function (done) {
            var gmeConfig = testFixture.getGmeConfig();
            gmeConfig.authentication.enable = true;

            server = WebGME.standaloneServer(gmeConfig);

            testFixture.clearDBAndGetGMEAuth(gmeConfig)
                .then(function (gmeAuth_) {
                    gmeAuth = gmeAuth_;
                    projectAuthParams = {
                        entityType: gmeAuth.authorizer.ENTITY_TYPES.PROJECT
                    };
                    safeStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                    return safeStorage.openDatabase();
                })
                .then(function () {
                    return Q.allDone([
                        gmeAuth.addUser('userOnlyWithAccess', 'user@example.com', 'p', true, {overwrite: true}),
                        gmeAuth.addUser('userWithoutRights', 'user@example.com', 'p', true, {overwrite: true}),
                        gmeAuth.addUser('userOrgAdmin', 'user@example.com', 'p', true, {overwrite: true}),
                        gmeAuth.addUser('userSiteAdmin', 'user@example.com', 'p', true, {
                            overwrite: true, siteAdmin: true
                        }),

                        gmeAuth.addOrganization('orgOnlyWithAccess', null),
                        gmeAuth.addOrganization('orgWithoutRights', null),
                        gmeAuth.addOrganization('orgReceiveProjectTransfers', null)
                    ]);
                })
                .then(function () {
                    return Q.allDone([
                        gmeAuth.addUserToOrganization('userOrgAdmin', 'orgOnlyWithAccess'),
                        gmeAuth.addUserToOrganization('userOnlyWithAccess', 'orgReceiveProjectTransfers'),
                        gmeAuth.setAdminForUserInOrganization('userOrgAdmin', 'orgOnlyWithAccess', true),
                        gmeAuth.setAdminForUserInOrganization('userOnlyWithAccess', 'orgReceiveProjectTransfers', true)
                    ]);
                })
                .then(function () {
                    return Q.allDone([
                        testFixture.importProject(safeStorage, {
                            projectSeed: 'seeds/EmptyProject.webgmex',
                            projectName: projectOwnedByUserOnlyWithAccess,
                            gmeConfig: gmeConfig,
                            username: 'userOnlyWithAccess',
                            logger: logger
                        }),
                        testFixture.importProject(safeStorage, {
                            projectSeed: 'seeds/EmptyProject.webgmex',
                            projectName: projectOwnedByOrgOnlyWithAccess,
                            gmeConfig: gmeConfig,
                            username: 'userOrgAdmin',
                            logger: logger
                        })
                    ]);
                })
                .then(function () {
                    return Q.allDone([
                        gmeAuth.authorizeByUserOrOrgId(
                            'userOnlyWithAccess',
                            pr2Id(projectOwnedByUserOnlyWithAccess, 'userOnlyWithAccess'),
                            'create',
                            {
                                read: true,
                                write: true,
                                delete: true
                            }
                        ),
                        gmeAuth.authorizeByUserOrOrgId(
                            'userOrgAdmin',
                            pr2Id(projectOwnedByOrgOnlyWithAccess, 'userOrgAdmin'),
                            'create',
                            {
                                read: true,
                                write: true,
                                delete: true
                            }
                        ),
                        safeStorage.transferProject({
                            projectId: pr2Id(projectOwnedByOrgOnlyWithAccess, 'userOrgAdmin'),
                            newOwnerId: 'orgOnlyWithAccess',
                            username: 'userOrgAdmin'
                        })
                    ]);
                })
                .then(function () {
                    return Q.ninvoke(server, 'start');
                })
                .nodeify(done);
        });

        after(function (done) {
            server.stop(function (err) {
                if (err) {
                    done(new Error(err));
                    return;
                }

                Q.allDone([
                    gmeAuth.unload(),
                    safeStorage.closeDatabase()
                ])
                    .nodeify(done);
            });
        });

        beforeEach(function () {
            agent = superagent.agent();
        });

        it('403 user not authorized (user to org) /projects/userOnlyWithAccess/projectOwnedByUserOnlyWithAccess/transfer/userWithoutRights',
            function (done) {
                agent.post(server.getUrl() + '/api/v1/projects/userOnlyWithAccess/projectOwnedByUserOnlyWithAccess/transfer/userWithoutRights')
                    .set('Authorization', 'Basic ' + new Buffer('userWithoutRights:p').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);
                        done();
                    });
            }
        );

        it('200 should transfer to org /projects/userOnlyWithAccess/projectOwnedByUserOnlyWithAccess/transfer/orgReceiveProjectTransfers',
            function (done) {
                agent.post(server.getUrl() + '/api/v1/projects/userOnlyWithAccess/projectOwnedByUserOnlyWithAccess/transfer/orgReceiveProjectTransfers')
                    .set('Authorization', 'Basic ' + new Buffer('userOnlyWithAccess:p').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(200, err);
                        expect(res.body.owner).equal('orgReceiveProjectTransfers');
                        done();
                    });
            }
        );

        it('404 nonexistent project /projects/fakeOwnerId/fakeProjectName/transfer/orgReceiveProjectTransfers',
            function (done) {
                agent.post(server.getUrl() + '/api/v1/projects/fakeOwnerId/fakeProjectName/transfer/orgReceiveProjectTransfers')
                    .set('Authorization', 'Basic ' + new Buffer('userSiteAdmin:p').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(404, err);
                        done();
                    });
            }
        );

        it('403 user not authorized (org to org) /projects/orgOnlyWithAccess/projectOwnedByOrgOnlyWithAccess/transfer/orgWithoutRights',
            function (done) {
                agent.post(server.getUrl() + '/api/v1/projects/orgOnlyWithAccess/projectOwnedByOrgOnlyWithAccess/transfer/orgWithoutRights')
                    .set('Authorization', 'Basic ' + new Buffer('userWithoutRights:p').toString('base64'))
                    .end(function (err, res) {
                        expect(res.status).equal(403, err);
                        done();
                    });
            }
        );
    });
});