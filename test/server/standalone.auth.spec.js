/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

describe('standalone http server with authentication turned on', function () {
    'use strict';
    var testFixture = require('../_globals.js'),
        WebGME = testFixture.WebGME,
        safeStorage,
        webgmeToken,
        gmeAuth,
        serverBaseUrl,
        expect = testFixture.expect,
        should = testFixture.should,
        superagent = testFixture.superagent,
        Q = testFixture.Q,
        logger,
        agent,
        server,
        authorizer,
        projectAuthParams,
        logIn = function (callback) {
            testFixture.logIn(server, agent, 'user', 'plaintext').nodeify(callback);
        },
        openSocketIo = function (callback) {
            return testFixture.openSocketIo(server, agent, 'user', 'plaintext')
                .then(function (result) {
                    webgmeToken = result.webgmeToken;
                    return result.socket;
                })
                .nodeify(callback);
        };

    beforeEach(function () {
        agent = superagent.agent();
    });

    before(function (done) {
        // we have to set the config here
        var project = 'project',
            unauthorizedProject = 'unauthorized_project',
            gmeConfig = testFixture.getGmeConfig();

        logger = testFixture.logger.fork('standalone.auth.spec');
        gmeConfig.authentication.enable = true;
        gmeConfig.authentication.allowGuests = false;
        gmeConfig.authentication.logInUrl = '/login';

        testFixture.clearDBAndGetGMEAuth(gmeConfig)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                authorizer = gmeAuth.authorizer;
                projectAuthParams = {
                    entityType: authorizer.ENTITY_TYPES.PROJECT,
                };

                safeStorage = testFixture.getMongoStorage(logger, gmeConfig, gmeAuth);
                return safeStorage.openDatabase();
            })
            .then(function () {
                return Q.allDone([
                    testFixture.importProject(safeStorage, {
                        projectSeed: 'seeds/EmptyProject.webgmex',
                        projectName: project,
                        gmeConfig: gmeConfig,
                        logger: logger
                    }),
                    testFixture.importProject(safeStorage, {
                        projectSeed: 'seeds/EmptyProject.webgmex',
                        projectName: unauthorizedProject,
                        gmeConfig: gmeConfig,
                        logger: logger
                    })
                ]);
            })
            .then(function () {
                return gmeAuth.addUser('user', 'user@example.com', 'plaintext', true, {overwrite: true});
            })
            .then(function () {
                return gmeAuth.authorizeByUserId('user', testFixture.projectName2Id('project'),
                    'create', {
                        read: true,
                        write: true,
                        delete: false
                    }
                );
            })
            .then(function () {
                return gmeAuth.authorizeByUserId('user', testFixture.projectName2Id('unauthorized_project'),
                    'create', {
                        read: false,
                        write: false,
                        delete: false
                    }
                );
            })
            .then(function () {
                server = WebGME.standaloneServer(gmeConfig);
                serverBaseUrl = server.getUrl();

                return Q.ninvoke(server, 'start');
            })
            .nodeify(done);
    });

    after(function (done) {
        server.stop(function (err) {
            if (err) {
                logger.error(err);
            }
            gmeAuth.unload()
                .nodeify(done);
        });
    });

    //it('should start with sign in', loginUser(agent));
    //it('should sign the user out', function(done) {
    //});

    it('should return 401 POST /login with non-existing user', function (done) {
        agent.post(serverBaseUrl + '/login').send({userId: 'test'}).end(function (err, res) {
            should.equal(res.status, 401);
            done();
        });
    });


    it('should log in', function (done) {
        logIn(function (err) {
            if (err) {
                return done(err);
            }

            agent.get(serverBaseUrl + '/api/user')
                .end(function (err, res) {
                    should.equal(res.status, 200);
                    should.equal(res.body._id, 'user');
                    done();
                });
        });
    });

    it('should not log in with incorrect password', function (done) {
        agent.post(serverBaseUrl + '/login?redirect=%2F')
            .type('form')
            .send({userId: 'user'})
            .send({password: 'thisiswrong'})
            .end(function (err, res) {
                should.equal(res.status, 401);
                done();
            });
    });


    it('should be able to open an authorized project', function (done) {
        var projectName = 'project',
            projectId = testFixture.projectName2Id(projectName);
        openSocketIo()
            .then(function (socket) {
                return Q.ninvoke(socket, 'emit', 'openProject', {projectId: projectId, webgmeToken: webgmeToken})
                    .finally(function () {
                        socket.disconnect();
                    });
            })
            .then(function () {
                return authorizer.getAccessRights('user', projectId, projectAuthParams);
            })
            .then(function (authorized) {
                authorized.should.deep.equal({read: true, write: true, delete: false});
            })
            .nodeify(done);
    });

    it('should not be able to open an unauthorized project', function (done) {
        var projectId = testFixture.projectName2Id('unauthorized_project');
        openSocketIo()
            .then(function (socket) {
                return Q.ninvoke(socket, 'emit', 'openProject', {projectId: projectId, webgmeToken: webgmeToken})
                    .finally(function () {
                        socket.disconnect();
                    });
            }).then(function () {
            return authorizer.getAccessRights('user', projectId, projectAuthParams);
        }).then(function (authorized) {
            authorized.should.deep.equal({read: true, write: true, delete: true});
        }).nodeify(function (err) {
            if (!err) {
                done(new Error('should have failed'));
                return;
            }
            ('' + err).should.contain('Not authorized to read project');
            done();
        });
    });


    it('should be able to export an authorized project /worker/simpleResult/:id/exported_branch', function (done) {
        var projectName = 'project',
            projectId = testFixture.projectName2Id(projectName),
            command = {
                command: 'exportProjectToFile',
                projectId: projectId,
                branchName: 'master',
                path: '' // ROOT_PATH
            };
        openSocketIo()
            .then(function (socket) {
                command.webgmeToken = webgmeToken;
                return Q.ninvoke(socket, 'emit', 'simpleRequest', command)
                    .finally(function () {
                        socket.disconnect();
                    });
            })
            .then(function (result) {
                expect(typeof result).to.equal('object');
                expect(result).to.have.property('hash');
                expect(typeof result.hash).to.equal('string');
                expect(result.downloadUrl).to.include('/rest/blob/download/');
            })
            .nodeify(done);
    });

    it('should grant perms to newly-created project', function (done) {
        var projectName = 'ClientCreateProject',
            projectId = testFixture.projectName2Id(projectName, 'user');

        openSocketIo()
            .then(function (socket) {
                return Q.ninvoke(socket, 'emit', 'createProject', {
                    projectName: projectName,
                    webgmeToken: webgmeToken
                })
                    .finally(function () {
                        socket.disconnect();
                    });
            }).then(function () {
            return authorizer.getAccessRights('user', projectId, projectAuthParams);
        }).then(function (authorized) {
            authorized.should.deep.equal({read: true, write: true, delete: true});
        }).nodeify(done);
    });


    it('should return a readable error', function (done) {
        var projectName = 'DoesntExist';
        openSocketIo()
            .then(function (socket) {
                return Q.ninvoke(socket, 'emit', 'openProject', projectName)
                    .then(function () {
                        return Q.ninvoke(socket, 'emit', 'findHash', projectName, 'asdf');
                    })
                    .finally(function () {
                        socket.disconnect();
                    });
            })
            .nodeify(function (err) {
                should.equal(typeof err, 'string');
                done();
            });
    });
});