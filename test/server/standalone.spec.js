/*globals require, describe, it, before, after, beforeEach, WebGMEGlobal, process*/
/**
 * @author lattmann / https://github.com/lattmann
 */

require('../_globals.js');
var should = require('chai').should(),
    WebGME = require('../../webgme'),
    requirejs = require('requirejs'),

    superagent = require('superagent'),
    mongodb = require('mongodb'),
    Q = require('q'),
    agent = superagent.agent(),

    server,
    serverBaseUrl;



describe('standalone server', function () {
    'use strict';

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

    describe('https server without authentication', function () {

        var NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

        before(function (done) {
            // we have to set the config here
            var config = WebGMEGlobal.getConfig();
            config.port = 9001;
            config.authentication = false;
            config.httpsecure = true;

            // TODO: would be nice to get this dynamically from server
            serverBaseUrl = 'https://127.0.0.1:' + config.port;

            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

            server = WebGME.standaloneServer(config);
            server.start(done);
        });

        after(function (done) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = NODE_TLS_REJECT_UNAUTHORIZED;

            server.stop(done);
        });

        it('should return 200 /', function (done) {
            agent.get(serverBaseUrl + '/').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                should.equal(res.status, 200);
                done();
            });
        });
    });

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

    describe('http server without authentication', function () {

        before(function (done) {
            // we have to set the config here
            var config = WebGMEGlobal.getConfig();
            config.port = 9001;
            config.authentication = false;

            // TODO: would be nice to get this dynamically from server
            serverBaseUrl = 'http://127.0.0.1:' + config.port;

            server = WebGME.standaloneServer(config);
            server.start(done);
        });

        after(function (done) {
            server.stop(done);
        });

        it('should return 200 /', function (done) {
            agent.get(serverBaseUrl + '/').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                should.equal(res.status, 200);
                done();
            });
        });

        it('should return 404 /doesnotexist', function (done) {
            agent.get(serverBaseUrl + '/doesnotexist').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                should.equal(res.status, 404);
                done();
            });
        });

        it('should return 404 /asdf', function (done) {
            agent.get(serverBaseUrl + '/asdf').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                should.equal(res.status, 404);
                done();
            });
        });

        it('should return 404 /doesnotexist.js', function (done) {
            agent.get(serverBaseUrl + '/doesnotexist.js').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 404);
                done();
            });
        });

        // TOKEN TESTS BEGIN
        it('should return 410 /gettoken', function (done) {
            agent.get(serverBaseUrl + '/gettoken').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 410);
                done();
            });
        });

        it('should return 410 /checktoken/doesnotexist', function (done) {
            agent.get(serverBaseUrl + '/checktoken/doesnotexist').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 410);
                done();
            });
        });

        // TOKEN TESTS END


        // LOGIN PAGES BEGINS
        // TODO: add POST test
        it('should return 200 /login', function (done) {
            agent.get(serverBaseUrl + '/login').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 200);
                done();
            });
        });

        // TODO: POST /login/client

        it('should return 404 GET /login/client', function (done) {
            agent.get(serverBaseUrl + '/login/client').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 404);
                done();
            });
        });

        it('should return 401 /login/client/fail', function (done) {
            agent.get(serverBaseUrl + '/login/client/fail').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 401);
                done();
            });
        });

        it('should return 200 /login/google/return', function (done) {
            agent.get(serverBaseUrl + '/login/google/return').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 200);
                done();
            });
        });

        it('should return 404 /login/forge', function (done) {
            agent.get(serverBaseUrl + '/login/forge').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 404);
                done();
            });
        });

        it('should return 200 /logout', function (done) {
            agent.get(serverBaseUrl + '/logout').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 200);
                done();
            });
        });

        // LOGIN PAGES ENDS

        // STATIC RESOURCES TESTS BEGIN
        it('should return 200 /bin/getconfig.js', function (done) {
            agent.get(serverBaseUrl + '/bin/getconfig.js').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 200);
                done();
            });
        });

        it('should return 200 /package.json', function (done) {
            agent.get(serverBaseUrl + '/package.json').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 200);
                done();
            });
        });

        it('should return 200 /index.html', function (done) {
            agent.get(serverBaseUrl + '/index.html').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 200);
                done();
            });
        });

        it('should return 404 /index2.html', function (done) {
            agent.get(serverBaseUrl + '/index2.html').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 404);
                done();
            });
        });

        it('should return 404 /docs/', function (done) {
            agent.get(serverBaseUrl + '/docs/').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 404);
                done();
            });
        });

        it('should return 200 /docs/tutorial.html', function (done) {
            agent.get(serverBaseUrl + '/docs/tutorial.html').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 200);
                done();
            });
        });

        // TODO: WE NEED A TEST THAT SUCCEEDS
        it('should return 404 /extlib/doesnotexist', function (done) {
            agent.get(serverBaseUrl + '/extlib/doesnotexist').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 404);
                done();
            });
        });

        // TODO: WHAT IS THIS RULE?
        it('should return 404 /pluginoutput/doesnotexist', function (done) {
            agent.get(serverBaseUrl + '/pluginoutput/doesnotexist').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 404);
                done();
            });
        });

        it('should return 404 /plugin', function (done) {
            agent.get(serverBaseUrl + '/plugin').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 404);
                done();
            });
        });

        it('should return 404 /plugin/doesnotexist', function (done) {
            agent.get(serverBaseUrl + '/plugin/doesnotexist').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 404);
                done();
            });
        });


        it('should return 200 /plugin/PluginBase.js', function (done) {
            agent.get(serverBaseUrl + '/plugin/PluginBase.js').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 200);
                done();
            });
        });

        it('should return 404 /plugin/', function (done) {
            agent.get(serverBaseUrl + '/plugin/').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 404);
                done();
            });
        });

        it('should return 404 /plugin/PluginGenerator', function (done) {
            agent.get(serverBaseUrl + '/plugin/PluginGenerator').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 404);
                done();
            });
        });

        it('should return 404 /plugin/PluginGenerator/PluginGenerator', function (done) {
            agent.get(serverBaseUrl + '/plugin/PluginGenerator/PluginGenerator').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 404);
                done();
            });
        });

        it('should return 200 /plugin/PluginGenerator/PluginGenerator/PluginGenerator', function (done) {
            agent.get(serverBaseUrl + '/plugin/PluginGenerator/PluginGenerator/PluginGenerator').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 200);
                done();
            });
        });

        it('should return 200 /plugin/PluginGenerator/PluginGenerator/PluginGenerator.js', function (done) {
            agent.get(serverBaseUrl + '/plugin/PluginGenerator/PluginGenerator/PluginGenerator.js').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 200);
                done();
            });
        });

        it('should return 200 /plugin/PluginGenerator/PluginGenerator/Templates/plugin.js.ejs', function (done) {
            agent.get(serverBaseUrl + '/plugin/PluginGenerator/PluginGenerator/Templates/plugin.js.ejs').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 200);
                done();
            });
        });


        it('should return 404 /decorators/', function (done) {
            agent.get(serverBaseUrl + '/decorators/').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 404);
                done();
            });
        });

        it('should return 404 /decorators/DefaultDecorator', function (done) {
            agent.get(serverBaseUrl + '/decorators/DefaultDecorator').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 404);
                done();
            });
        });

        it('should return 200 /decorators/DefaultDecorator/DefaultDecorator.js', function (done) {
            agent.get(serverBaseUrl + '/decorators/DefaultDecorator/DefaultDecorator.js').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 200);
                done();
            });
        });

        it('should return 200 /decorators/DefaultDecorator/DiagramDesigner/DefaultDecorator.DiagramDesignerWidget.css', function (done) {
            agent.get(serverBaseUrl + '/decorators/DefaultDecorator/DiagramDesigner/DefaultDecorator.DiagramDesignerWidget.css').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 200);
                done();
            });
        });

        it('should return 200 /decorators/DefaultDecorator/DiagramDesigner/DefaultDecorator.DiagramDesignerWidget.html', function (done) {
            agent.get(serverBaseUrl + '/decorators/DefaultDecorator/DiagramDesigner/DefaultDecorator.DiagramDesignerWidget.html').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 200);
                done();
            });
        });

        it('should return 200 /decorators/DefaultDecorator/DiagramDesigner/DefaultDecorator.DiagramDesignerWidget.js', function (done) {
            agent.get(serverBaseUrl + '/decorators/DefaultDecorator/DiagramDesigner/DefaultDecorator.DiagramDesignerWidget.js').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 200);
                done();
            });
        });

        it('should return 404 /decorators/DefaultDecorator/doesnotexist', function (done) {
            agent.get(serverBaseUrl + '/decorators/DefaultDecorator/doesnotexist').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 404);
                done();
            });
        });
        // STATIC RESOURCES TESTS END

        // REST TESTS BEGIN
        it('should return 404 /rest', function (done) {
            agent.get(serverBaseUrl + '/rest').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 404);
                done();
            });
        });

        it('should return 200 (unknown command) /rest/unknown', function (done) {
            agent.get(serverBaseUrl + '/rest/unknown').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 200);
                done();
            });
        });

        it('should return 200 (help command) /rest/help', function (done) {
            agent.get(serverBaseUrl + '/rest/help').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 200);
                done();
            });
        });

        it('should return 404 (etf command) /rest/etf', function (done) {
            agent.get(serverBaseUrl + '/rest/etf').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                //console.log(res);
                should.equal(res.status, 404);
                done();
            });
        });
        // REST TESTS END

        // WORKER TESTS BEGIN
        it('should return with 404 (not enough parameters) /worker/simpleResult', function (done) {
            agent.get(serverBaseUrl + '/worker/simpleResult').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                should.equal(res.status, 404);
                done();
            });
        });
        
        it('should return with 500 (bad parameter) /worker/simpleResult/bad_parameter', function (done) {
            agent.get(serverBaseUrl + '/worker/simpleResult/bad_parameter').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                should.equal(res.status, 500);
                done();
            });
        });
        // WORKER TESTS END


        // DYNAMIC RESOURCES START
        it('should return with all decorators /listAllDecorators', function (done) {
            agent.get(serverBaseUrl + '/listAllDecorators').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                should.equal(res.status, 200);
                done();
            });
        });

        it('should return with all plugins /listAllPlugins', function (done) {
            agent.get(serverBaseUrl + '/listAllPlugins').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                should.equal(res.status, 200);
                done();
            });
        });

        it('should return with all visualizers /listAllVisualizerDescriptors', function (done) {
            agent.get(serverBaseUrl + '/listAllVisualizerDescriptors').end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                should.equal(res.status, 200);
                done();
            });
        });
        // DYNAMIC RESOURCES END
    });


    describe('http server with authentication turned on', function () {
        var shouldAccessWithoutAuth,
            shouldRedirectToLogin;

        beforeEach(function () {
            agent = superagent.agent();
        });

        shouldAccessWithoutAuth = function (location, done) {
            agent.get(serverBaseUrl + location).end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                // no redirects
                should.equal(res.status, 200);
                //should.equal(res.res.url, location); // FIXME: should server response set the url?
                if (res.headers.location) {
                    should.equal(res.headers.location, location);
                }
                if (res.res.url) {
                    should.equal(res.res.url, location);
                }

                should.equal(res.redirects.length, 0);
                done();
            });
        };

        shouldRedirectToLogin = function (location, done) {
            agent.get(serverBaseUrl + location).end(function (err, res) {
                if (err) {
                    done(err);
                    return;
                }
                // redirected to login page
                should.equal(res.status, 200);
                should.equal(res.headers.location, '/login'); // FIXME: add redirect url
                should.not.equal(res.headers.location, location);
                should.equal(res.redirects.length, 1);

                done();
            });
        };

        var db;
        var collection;
        var gmeauth;
        before(function (done) {
            // we have to set the config here
            var config = WebGMEGlobal.getConfig();
            config.port = 9001;
            config.authentication = true;
            config.guest = false;
            config.mongodatabase = 'webgme_tests';

            var dbConn = Q.ninvoke(mongodb.MongoClient, 'connect', 'mongodb://127.0.0.1/' + config.mongodatabase, {
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
                                return Q.ninvoke(collection, 'remove')
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

            var gmeauthDeferred = Q.defer();
            requirejs(['auth/gmeauth'], function (gmeauth) {
                gmeauthDeferred.resolve(gmeauth({host: '127.0.0.1',
                    port: 27017,
                    database: config.mongodatabase
                }));
            }, function (err) {
                gmeauthDeferred.reject(err);
            });

            var userReady = gmeauthDeferred.promise.then(function (gmeauth_) {
                gmeauth = gmeauth_;
                return dbConn.then(function () {
                    return gmeauth.addUser('user', 'user@example.com', 'plaintext', true, {overwrite: true});
                }).then(function () {
                    return gmeauth.authorizeByUserId('user', 'project', 'create', {read: true, write: true, delete: false});
                }).then(function () {
                    return gmeauth.authorizeByUserId('user', 'unauthorized_project', 'create', {read: false, write: false, delete: false});
                });
            });

            var serverReady = Q.defer();
            // TODO: would be nice to get this dynamically from server
            serverBaseUrl = 'http://127.0.0.1:' + config.port;

            server = WebGME.standaloneServer(config);
            server.start(serverReady.makeNodeResolver());

            Q.all([serverReady, dbConn, userReady])
                .nodeify(done);
        });

        after(function (done) {
            db.close();
            gmeauth.unload();
            server.stop(done);
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

        // SHOULD ALL ACCESS TO
        it('should allow access to /lib/require/require.min.js', function (done) {
            shouldAccessWithoutAuth('/lib/require/require.min.js', done);
        });

        it('should allow access to /plugin/PluginResult.js', function (done) {
            shouldAccessWithoutAuth('/plugin/PluginResult.js', done);
        });

        it('should allow access to /common/storage/cache.js', function (done) {
            shouldAccessWithoutAuth('/common/storage/cache.js', done);
        });

        it('should allow access to /common/storage/client.js', function (done) {
            shouldAccessWithoutAuth('/common/storage/client.js', done);
        });

        it('should allow access to /middleware/blob/BlobClient.js', function (done) {
            shouldAccessWithoutAuth('/middleware/blob/BlobClient.js', done);
        });

        // SHOULD NOT ALL ACCESS AND SHOULD REDIRECT TO LOGIN PAGE
        it('should redirect to login for /', function (done) {
            shouldRedirectToLogin('/', done);
        });

        it('should redirect to login for /package.json', function (done) {
            shouldRedirectToLogin('/package.json', done);
        });


        it('should redirect to login for /file._js', function (done) {
            shouldRedirectToLogin('/file._js', done);
        });

        it('should redirect to login for /file.html', function (done) {
            shouldRedirectToLogin('/file.html', done);
        });

        it('should redirect to login for /file.gif', function (done) {
            shouldRedirectToLogin('/file.gif', done);
        });

        it('should redirect to login for /file.png', function (done) {
            shouldRedirectToLogin('/file.png', done);
        });

        it('should redirect to login for /file.bmp', function (done) {
            shouldRedirectToLogin('/file.bmp', done);
        });

        it('should redirect to login for /file.svg', function (done) {
            shouldRedirectToLogin('/file.svg', done);
        });

        it('should redirect to login for /file.json', function (done) {
            shouldRedirectToLogin('/file.json', done);
        });

        it('should redirect to login for /file.map', function (done) {
            shouldRedirectToLogin('/file.map', done);
        });

        it('should redirect to login for /listAllPlugins', function (done) {
            shouldRedirectToLogin('/listAllPlugins', done);
        });

        it('should redirect to login for /listAllDecorators', function (done) {
            shouldRedirectToLogin('/listAllDecorators', done);
        });

        it('should redirect to login for /listAllVisualizerDescriptors', function (done) {
            shouldRedirectToLogin('/listAllVisualizerDescriptors', done);
        });

        var logIn = function(callback) {
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
        };
        it('should log in', function (done) {
            logIn(function(err, res) {
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

        it('should auth with a new token', function (done) {
            gmeauth.generateTokenForUserId('user')
            .then(function (tokenId) {
                return Q.all([gmeauth.tokenAuthorization(tokenId, 'project'),
                    gmeauth.tokenAuthorization(tokenId, 'unauthorized_project'),
                    gmeauth.tokenAuthorization(tokenId, 'doesnt_exist_project')]);
            }).then(function (authorized) {
                authorized.should.deep.equal([true, false, false]);
            }).nodeify(done);
        });

        it('should have permissions', function (done) {
            return gmeauth.getAuthorizationInfoByUserId('user', 'project')
                .then(function (authorized) {
                    authorized.should.deep.equal({read: true, write: true, delete: false});
                }).then(function () {
                    return gmeauth.getProjectAuthorizationByUserId('user', 'project');
                }).then(function (authorized) {
                    authorized.should.deep.equal({read: true, write: true, delete: false});
                })
                .nodeify(done);
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

        it('should not be able to open an unauthorized project', function (done) {
            var projectName = 'unauthorized_project';
            openSocketIo()
                .then(function (socket) {
                    return Q.ninvoke(socket, 'emit', 'openProject', projectName)
                        .finally(function () {
                            socket.disconnect();
                        });
                }).then(function () {
                    return gmeauth.getProjectAuthorizationByUserId('user', projectName);
                }).then(function (authorized) {
                    authorized.should.deep.equal({read: true, write: true, delete: true});
                }).nodeify(function (err) {
                    if (!err) {
                        done('should have failed');
                    }
                    ('' + err).should.contain('missing necessary user rights');
                    done();
                });
        });


        it('should be able to revoke permissions', function (done) {
            return gmeauth.authorizeByUserId('user', 'project', 'delete', {})
                .then(function () {
                    return gmeauth.getAuthorizationInfoByUserId('user', 'project');
                }).then(function (authorized) {
                    authorized.should.deep.equal({read: false, write: false, delete: false});
                }).then(function () {
                    return gmeauth.getProjectAuthorizationByUserId('user', 'project');
                }).then(function (authorized) {
                    authorized.should.deep.equal({read: false, write: false, delete: false});
                })
                .nodeify(done);
        });

        var openSocketIo = function () {
            var io = require('socket.io-client');
            return Q.nfcall(logIn)
                .then(function (/*res*/) {
                    var socketReq = {url: serverBaseUrl};
                    agent.attachCookies(socketReq);
                    var socket = io.connect(serverBaseUrl,
                        {
                            'query': 'webGMESessionId=' + /webgmeSid=s:([^;.]+)/.exec(decodeURIComponent(socketReq.cookies))[1],
                            'transports': ['websocket'],
                            'multiplex': false
                        });
                    var defer = Q.defer();
                    socket.on('error', function (err) {
                        defer.reject(err);
                    });
                    socket.on('connect', function () {
                        defer.resolve(socket);
                    });
                    return defer.promise;
                });
        };

        it('should grant perms to newly-created project', function (done) {
            var projectName = 'ClientCreateProject';
            openSocketIo(projectName)
                .then(function (socket) {
                    return Q.ninvoke(socket, 'emit', 'openProject', projectName)
                        .finally(function () {
                            socket.disconnect();
                        });
                }).then(function () {
                    return gmeauth.getProjectAuthorizationByUserId('user', projectName);
                }).then(function (authorized) {
                    authorized.should.deep.equal({read: true, write: true, delete: true});
                }).nodeify(done);
        });

        it('should be able to add organization', function (done) {
            var orgName = 'org1';
            return gmeauth.addOrganization(orgName)
                .then(function () {
                    return gmeauth.getOrganization(orgName);
                }).then(function () {
                    return gmeauth.addUserToOrganization('user', orgName);
                }).then(function () {
                    return gmeauth.getOrganization(orgName);
                }).then(function (org) {
                    org.users.should.deep.equal([ 'user' ]);
                }).nodeify(done);
        });

        it('should fail to add dup organization', function (done) {
            var orgName = 'org1';
            gmeauth.addOrganization(orgName)
                .then(function () {
                    done('should have been rejected');
                }, function (/*err*/) {
                    done();
                });
        });

        it('should fail to add nonexistant organization', function (done) {
            var orgName = 'org_doesnt_exist';
            gmeauth.addUserToOrganization('user', orgName)
                .then(function () {
                    done('should have been rejected');
                }, function (/*err*/) {
                    done();
                });
        });

        it('should fail to add nonexistant user to organization', function (done) {
            var orgName = 'org1';
            gmeauth.addUserToOrganization('user_doesnt_exist', orgName)
                .then(function () {
                    done('should have been rejected');
                }, function (/*err*/) {
                    done();
                });
        });

        it('should authorize organization', function (done) {
            var orgName = 'org1';
            var projectName = 'org_project';
            return gmeauth.authorizeOrganization(orgName, projectName, 'create', {read: true, write: true, delete: false })
                .then(function () {
                    return gmeauth.getAuthorizationInfoByOrgId(orgName, projectName);
                }).then(function (rights) {
                    rights.should.deep.equal({read: true, write: true, delete: false});
                }).nodeify(done);
        });

        it('should give the user project permissions from the organization', function (done) {
            return  gmeauth.getAuthorizationInfoByUserId('user', 'org_project')
                .then(function (authorized) {
                    authorized.should.deep.equal({read: false, write: false, delete: false});
                }).then(function () {
                    return gmeauth.getProjectAuthorizationByUserId('user', 'org_project');
                }).then(function (authorized) {
                    authorized.should.deep.equal({read: true, write: true, delete: false});
                })
                .nodeify(done);
        });

        it('should deauthorize organization', function (done) {
            var orgName = 'org1';
            var projectName = 'org_project';
            return gmeauth.authorizeOrganization(orgName, projectName, 'delete', {})
                .then(function () {
                    return gmeauth.getAuthorizationInfoByOrgId(orgName, projectName);
                }).then(function (rights) {
                    rights.should.deep.equal({});
                }).nodeify(done);
        });

        it('should remove user from organization', function (done) {
            var orgName = 'org1';
            gmeauth.removeUserFromOrganization('user', orgName)
                .nodeify(done);
        });

        it('should remove organization', function (done) {
            var orgName = 'org1';
            gmeauth.removeOrganizationByOrgId(orgName)
                .nodeify(done);
        });

        it('should fail to remove organization twice', function (done) {
            var orgName = 'org1';
            gmeauth.removeOrganizationByOrgId(orgName)
                .then(function () {
                    done('should have been rejected');
                }, function (/*err*/) {
                    done();
                });
        });

    });
});
