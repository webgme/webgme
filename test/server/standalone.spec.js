/*globals require, WebGMEGlobal*/
/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../_globals.js');

describe('standalone server', function () {
    'use strict';

    var WebGME = testFixture.WebGME,
        requirejs = require('requirejs'),

        should = testFixture.should,
        superagent = testFixture.superagent,
        mongodb = testFixture.mongodb,
        Q = testFixture.Q,

        agent = superagent.agent(),

        server,
        serverBaseUrl,

        scenarios,
        addScenario,
        addTest,
        i,
        j;

    it('should start and stop and start and stop', function (done) {
        // we have to set the config here
        var config = WebGMEGlobal.getConfig();
        config.port = 9001;
        config.authentication = false;

        server = WebGME.standaloneServer(config);
        server.start(function () {
            server.stop(function () {
                server.start(function () {
                    server.stop(done);
                });
            });
        });
    });

    scenarios = [{
        type: 'http',
        authentication: false,
        port: 9001,
        requests: [
            {code: 200, url: '/'},
            {code: 200, url: '/login'},
            {code: 200, url: '/login/google/return', redirectUrl: '/'},
            {code: 200, url: '/logout', redirectUrl: '/login'},
            {code: 200, url: '/bin/getconfig.js'},
            {code: 200, url: '/package.json'},
            {code: 200, url: '/index.html'},
            {code: 200, url: '/docs/tutorial.html'},
            {code: 200, url: '/plugin/PluginBase.js'},
            {code: 200, url: '/plugin/PluginBase.js'},
            {code: 200, url: '/plugin/PluginGenerator/PluginGenerator/PluginGenerator'},
            {code: 200, url: '/plugin/PluginGenerator/PluginGenerator/PluginGenerator.js'},
            {code: 200, url: '/plugin/PluginGenerator/PluginGenerator/Templates/plugin.js.ejs'},
            {code: 200, url: '/decorators/DefaultDecorator/DefaultDecorator.js'},
            {code: 200, url: '/decorators/DefaultDecorator/DiagramDesigner/DefaultDecorator.DiagramDesignerWidget.css'},
            {code: 200, url: '/decorators/DefaultDecorator/DiagramDesigner/DefaultDecorator.DiagramDesignerWidget.html'},
            {code: 200, url: '/decorators/DefaultDecorator/DiagramDesigner/DefaultDecorator.DiagramDesignerWidget.js'},
            {code: 200, url: '/rest/unknown'},
            {code: 200, url: '/rest/does_not_exist'},
            {code: 200, url: '/rest/help'},
            {code: 200, url: '/listAllDecorators'},
            {code: 200, url: '/listAllPlugins'},
            {code: 200, url: '/listAllVisualizerDescriptors'},

            {code: 401, url: '/login/client/fail'},

            {code: 404, url: '/login/forge'},
            {code: 404, url: '/extlib/does_not_exist'},
            {code: 404, url: '/pluginoutput/does_not_exist'},
            {code: 404, url: '/plugin'},
            {code: 404, url: '/plugin/'},
            {code: 404, url: '/plugin/PluginGenerator'},
            {code: 404, url: '/plugin/PluginGenerator/PluginGenerator'},
            {code: 404, url: '/plugin/does_not_exist'},
            {code: 404, url: '/decorators/'},
            {code: 404, url: '/decorators/DefaultDecorator'},
            {code: 404, url: '/decorators/DefaultDecorator/does_not_exist'},
            {code: 404, url: '/rest'},
            {code: 404, url: '/rest/etf'},
            {code: 404, url: '/worker/simpleResult'},
            {code: 404, url: '/login/client'},
            {code: 404, url: '/docs/'},
            {code: 404, url: '/index2.html'},
            {code: 404, url: '/does_not_exist'},
            {code: 404, url: '/does_not_exist.js'},
            {code: 404, url: '/asdf'},

            {code: 410, url: '/getToken'},
            {code: 410, url: '/checktoken/does_not_exist'},

            {code: 500, url: '/worker/simpleResult/bad_parameter'}
        ]
    }, {
        type: 'http',
        authentication: true,
        port: 9001,
        requests: [
            // should not allow access without auth
            {code: 200, url: '/', redirectUrl: '/login'},
            {code: 200, url: '/package.json', redirectUrl: '/login'},
            {code: 200, url: '/file._js', redirectUrl: '/login'},
            {code: 200, url: '/file.html', redirectUrl: '/login'},
            {code: 200, url: '/file.gif', redirectUrl: '/login'},
            {code: 200, url: '/file.png', redirectUrl: '/login'},
            {code: 200, url: '/file.bmp', redirectUrl: '/login'},
            {code: 200, url: '/file.svg', redirectUrl: '/login'},
            {code: 200, url: '/file.json', redirectUrl: '/login'},
            {code: 200, url: '/file.map', redirectUrl: '/login'},
            {code: 200, url: '/listAllPlugins', redirectUrl: '/login'},
            {code: 200, url: '/listAllDecorators', redirectUrl: '/login'},
            {code: 200, url: '/listAllVisualizerDescriptors', redirectUrl: '/login'},

            // should allow access without auth
            {code: 200, url: '/lib/require/require.min.js'},
            {code: 200, url: '/plugin/PluginResult.js'},
            {code: 200, url: '/common/storage/cache.js'},
            {code: 200, url: '/common/storage/client.js'},
            {code: 200, url: '/middleware/blob/BlobClient.js'}
        ]
    }, {
        type: 'https',
        authentication: false,
        port: 9001,
        requests: [
            {code: 200, url: '/'}
        ]
    }, {
        type: 'https',
        authentication: true,
        port: 9001,
        requests: [
            {code: 200, url: '/', redirectUrl: '/login'}
        ]
    }];

    addTest = function (serverUrl, requestTest) {
        var url = requestTest.url || '/',
            redirectText = requestTest.redirectUrl ? ' redirects to ' + requestTest.redirectUrl : ' ';

        it('returns ' + requestTest.code + ' for ' + url + redirectText, function (done) {
            // TODO: add POST/DELETE etc support
            agent.get(serverUrl + url).end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }

                should.equal(res.status, requestTest.code);

                if (requestTest.redirectUrl) {
                    // redirected
                    should.equal(res.status, 200);
                    if (res.headers.location) {
                        should.equal(res.headers.location, requestTest.redirectUrl);
                    }
                    should.not.equal(res.headers.location, url);
                    should.equal(res.redirects.length, 1);
                } else {
                    // was not redirected
                    //should.equal(res.res.url, url); // FIXME: should server response set the url?
                    if (res.headers.location) {
                        should.equal(res.headers.location, url);
                    }
                    if (res.res.url) {
                        should.equal(res.res.url, url);
                    }

                    should.equal(res.redirects.length, 0);
                }

                done();
            });
        });
    };

    addScenario = function (scenario) {

        describe(scenario.type + ' server ' + (scenario.authentication ? 'with' : 'without') + ' auth', function () {
            var nodeTLSRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED,
                serverUrl = scenario.type + '://127.0.0.1:' + scenario.port;

            before(function (done) {
                // we have to set the config here
                var config = WebGMEGlobal.getConfig();
                config.port = scenario.port;
                config.authentication = scenario.authentication;
                config.httpsecure = scenario.type === 'https';

                process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

                server = WebGME.standaloneServer(config);
                server.start(done);
            });

            beforeEach(function () {
                agent = superagent.agent();
            });

            after(function (done) {
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = nodeTLSRejectUnauthorized;

                server.stop(done);
            });

            // add all tests for this scenario
            for (j = 0; j < scenario.requests.length; j += 1) {
                addTest(serverUrl, scenario.requests[j]);
            }

        });
    };

    // create all scenarios
    for (i = 0; i < scenarios.length; i += 1) {
        addScenario(scenarios[i]);
    }


    describe('http server without decorators', function () {

        before(function (done) {
            // we have to set the config here
            var config = WebGMEGlobal.getConfig();
            config.port = 9001;
            config.authentication = false;
            config.decoratorpaths  = [];

            // TODO: would be nice to get this dynamically from server
            serverBaseUrl = 'http://127.0.0.1:' + config.port;

            server = WebGME.standaloneServer(config);
            server.start(done);
        });

        after(function (done) {
            server.stop(done);
        });

        it('should return 404 /decorators/DefaultDecorator/DefaultDecorator.js', function (done) {
            agent.get(serverBaseUrl + '/decorators/DefaultDecorator/DefaultDecorator.js').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                should.equal(res.status, 404);
                done();
            });
        });
    });

    describe('http server with authentication turned on', function () {

        var db,
            collection,
            gmeauth,
            sockets = [],
            socketId,
            logIn = function (callback) {
                agent.post(serverBaseUrl + '/login?redirect=%2F')
                    .type('form')
                    .send({ username: 'user'})
                    .send({ password: 'plaintext'})
                    .end(function (err, res) {
                        if (err) {
                            return callback(err);
                        }
                        should.equal(res.status, 200);
                        callback(err, res);
                    });
            },
            openSocketIo = function () {
                var io = require('socket.io-client');
                return Q.nfcall(logIn)
                    .then(function (/*res*/) {
                        var socket,
                            socketReq = {url: serverBaseUrl},
                            defer = Q.defer();

                        agent.attachCookies(socketReq);

                        socket = io.connect(serverBaseUrl,
                            {
                                'query': socketReq.cookies,
                                'transports': ['websocket'],
                                'multiplex': false
                            });

                        socket.on('error', function (err) {
                            defer.reject(err);
                        });
                        socket.on('connect', function () {
                            defer.resolve(socket);
                        });

                        sockets.push(socket);

                        return defer.promise;
                    });
            };

        beforeEach(function () {
            agent = superagent.agent();
        });

        before(function (done) {
            // we have to set the config here
            var dbConn,
                gmeauthDeferred,
                userReady,
                serverReady = Q.defer(),
                config = WebGMEGlobal.getConfig();

            config.port = 9001;
            config.authentication = true;
            config.guest = false;
            config.mongodatabase = 'webgme_tests';

            dbConn = Q.ninvoke(mongodb.MongoClient, 'connect', 'mongodb://127.0.0.1/' + config.mongodatabase, {
                    'w': 1,
                    'native-parser': true,
                    'auto_reconnect': true,
                    'poolSize': 20,
                    socketOptions: {keepAlive: 1}
                })
                .then(function (db_) {
                    db = db_;
                    return Q.all([
                        Q.ninvoke(db, 'collection', '_users')
                            .then(function (collection_) {
                                collection = collection_;
                                return Q.ninvoke(collection, 'remove');
                            }),
                        Q.ninvoke(db, 'collection', '_organizations')
                            .then(function (orgs_) {
                                return Q.ninvoke(orgs_, 'remove');
                            }),
                        Q.ninvoke(db, 'collection', 'ClientCreateProject')
                            .then(function (createdProject) {
                                return Q.ninvoke(createdProject, 'remove');
                            }),
                        Q.ninvoke(db, 'collection', 'project')
                            .then(function (project) {
                                return Q.ninvoke(project, 'remove')
                                    .then(function () {
                                        return Q.ninvoke(project, 'insert', {_id: '*info', dummy: true});
                                    });
                            }),
                        Q.ninvoke(db, 'collection', 'unauthorized_project')
                            .then(function (project) {
                                return Q.ninvoke(project, 'remove')
                                    .then(function () {
                                        return Q.ninvoke(project, 'insert', {_id: '*info', dummy: true});
                                    });
                            })
                    ]);
                });

            gmeauthDeferred = Q.defer();
            requirejs(['auth/gmeauth'], function (gmeauth) {
                gmeauthDeferred.resolve(gmeauth({host: '127.0.0.1',
                    port: 27017,
                    database: config.mongodatabase
                }));
            }, function (err) {
                gmeauthDeferred.reject(err);
            });

            userReady = gmeauthDeferred.promise.then(function (gmeauth_) {
                gmeauth = gmeauth_;
                return dbConn.then(function () {
                    return gmeauth.addUser('user', 'user@example.com', 'plaintext', true, {overwrite: true});
                }).then(function () {
                    return gmeauth.authorizeByUserId('user', 'project', 'create', {
                        read: true,
                        write: true,
                        delete: false
                    });
                }).then(function () {
                    return gmeauth.authorizeByUserId('user', 'unauthorized_project', 'create', {
                        read: false,
                        write: false,
                        delete: false
                    });
                });
            });

            // TODO: would be nice to get this dynamically from server
            serverBaseUrl = 'http://127.0.0.1:' + config.port;

            server = WebGME.standaloneServer(config);
            server.start(serverReady.makeNodeResolver());

            Q.all([serverReady, dbConn, userReady])
                .nodeify(done);
        });

        after(function (done) {
            db.close(true, function (err) {
                if (err) {
                    done(err);
                    return;
                }
                gmeauth.unload(function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    server.stop(function () {
                        //console.log('done');
                        done();
                    });

                    // destroy all socket io connections
                    // this will ensures that the server stops as soon as possible and the test will not timeout.
                    for (socketId in sockets) {
                        //console.log('socket', socketId, 'destroyed');
                        if (sockets.hasOwnProperty(socketId)) {
                            sockets[socketId].destroy();
                        }
                    }
                });
            });
        });

        //it('should start with sign in', loginUser(agent));
        //it('should sign the user out', function(done) {
        //});

        it('should return 200 POST /login', function (done) {
            agent.post(serverBaseUrl + '/login').send({username: 'test'}).end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 200);
                done();
            });
        });


        it('should log in', function (done) {
            logIn(function (err, res) {
                if (err) {
                    return done(err);
                }
                res.redirects.should.deep.equal([ serverBaseUrl + '/' ]);

                agent.get(serverBaseUrl + '/gettoken')
                    .end(function (err, res) {
                        should.equal(res.status, 410);
                        done();
                    });
            });
        });

        it('should not log in with incorrect password', function (done) {
            agent.post(serverBaseUrl + '/login?redirect=%2F')
                .type('form')
                .send({ username: 'user'})
                .send({ password: 'thisiswrong'})
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    should.equal(res.status, 200);
                    res.redirects.should.deep.equal([
                        'http://127.0.0.1:9001/login?username=user&redirect=%2F#failed'
                    ]);
                    done();
                });
        });


        it('should be able to open an authorized project', function (done) {
            var projectName = 'project';
            openSocketIo()
                .then(function (socket) {
                    return Q.ninvoke(socket, 'emit', 'openProject', projectName)
                        .finally(function () {
                            socket.disconnect();
                        });
                }).then(function () {
                    return gmeauth.getProjectAuthorizationByUserId('user', projectName);
                }).then(function (authorized) {
                    authorized.should.deep.equal({read: true, write: true, delete: false});
                }).nodeify(done);
        });

        // FIXME: Kevin please fix this test
        //it('should not be able to open an unauthorized project', function (done) {
        //    var projectName = 'unauthorized_project';
        //    openSocketIo()
        //        .then(function (socket) {
        //            return Q.ninvoke(socket, 'emit', 'openProject', projectName)
        //                .finally(function () {
        //                    socket.disconnect();
        //                });
        //        }).then(function () {
        //            return gmeauth.getProjectAuthorizationByUserId('user', projectName);
        //        }).then(function (authorized) {
        //            authorized.should.deep.equal({read: true, write: true, delete: true});
        //        }).nodeify(function (err) {
        //            if (!err) {
        //                done(new Error('should have failed'));
        //                return;
        //            }
        //            ('' + err).should.contain('missing necessary user rights');
        //            done();
        //        });
        //});

        it('should grant perms to newly-created project', function (done) {
            var projectName = 'ClientCreateProject';
            openSocketIo()
                .then(function (socket) {
                    return Q.ninvoke(socket, 'emit', 'openProject', projectName)
                        .finally(function () {
                            socket.disconnect();
                        });
                }).then(function () {
                    return auth.getProjectAuthorizationByUserId('user', projectName);
                }).then(function (authorized) {
                    authorized.should.deep.equal({read: true, write: true, delete: true});
                }).nodeify(done);
        });

    });
});
