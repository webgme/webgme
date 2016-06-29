/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../_globals.js');

describe.only('standalone server', function () {
    'use strict';

    var WebGME = testFixture.WebGME,
        logger = testFixture.logger,

        should = testFixture.should,
        expect = testFixture.expect,
        superagent = testFixture.superagent,
        mongodb = testFixture.mongodb,
        Q = testFixture.Q,

        agent = superagent.agent(),

        http = require('http'),
        fs = require('fs'),

        server,
        serverBaseUrl,

        scenarios,
        addScenario,
        addTest,
        i,
        j;

    it('should start and stop and start and stop', function (done) {
        this.timeout(5000);
        // we have to set the config here
        var gmeConfig = testFixture.getGmeConfig();

        server = WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            server.stop(function () {
                server.start(function () {
                    server.stop(done);
                });
            });
        });
    });

    it.skip('should start and start and stop', function (done) {
        this.timeout(5000);
        // we have to set the config here
        var gmeConfig = testFixture.getGmeConfig();

        server = WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            server.start(function () {
                server.stop(done);
            });
        });
    });

    it.skip('should stop if not started', function (done) {
        this.timeout(5000);
        // we have to set the config here
        var gmeConfig = testFixture.getGmeConfig();

        server = WebGME.standaloneServer(gmeConfig);
        server.stop(done);
    });


    it('should fail to start http server if port is in use', function (done) {
        this.timeout(5000);
        // we have to set the config here
        var gmeConfig = testFixture.getGmeConfig(),
            httpServer = http.createServer();

        gmeConfig.server.port = gmeConfig.server.port + 1;

        httpServer.listen(gmeConfig.server.port, function (err) {
            expect(err).to.equal(undefined);

            server = WebGME.standaloneServer(gmeConfig);
            server.start(function (err) {
                expect(err.code).to.equal('EADDRINUSE');
                httpServer.close(done);
            });
        });
    });

    describe('[https]', function () {
        var nodeTLSRejectUnauthorized;

        before(function () {
            nodeTLSRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        });

        after(function () {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = nodeTLSRejectUnauthorized;
        });

        it('should get main page with an https reverse proxy', function (done) {
            var gmeConfig = testFixture.getGmeConfig(),
                httpProxy = require('http-proxy'),
                path = require('path'),
                proxyServerPort = gmeConfig.server.port - 1,
                proxy;

            server = WebGME.standaloneServer(gmeConfig);
            //
            // Create the HTTPS proxy server in front of a HTTP server
            //
            proxy = new httpProxy.createServer({
                target: {
                    host: 'localhost',
                    port: gmeConfig.server.port
                },
                ssl: {
                    key: fs.readFileSync(path.join(__dirname, '..', 'certificates', 'sample-key.pem'), 'utf8'),
                    cert: fs.readFileSync(path.join(__dirname, '..', 'certificates', 'sample-cert.pem'), 'utf8')
                }
            });

            server.start(function (err) {
                if (err) {
                    done(err);
                    return;
                }
                proxy.listen(proxyServerPort, function (err) {
                    if (err) {
                        done(err);
                        return;
                    }

                    agent.get('https://localhost:' + proxyServerPort + '/index.html').end(function (err, res) {
                        if (err) {
                            done(err);
                            return;
                        }
                        should.equal(res.status, 200, err);
                        should.equal(/WebGME/.test(res.text), true, 'Index page response must contain WebGME');

                        server.stop(function (err) {
                            proxy.close(function (err1) {
                                done(err || err1);
                            });
                        });
                    });
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
            {code: 404, url: '/login'},
            //{code: 200, url: '/login/google/return', redirectUrl: '/'},
            {code: 404, url: '/logout'},
            {code: 200, url: '/bin/getconfig.js'},
            {code: 200, url: '/gmeConfig.json'},
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
            {
                code: 200,
                url: '/decorators/DefaultDecorator/DiagramDesigner/DefaultDecorator.DiagramDesignerWidget.html'
            },
            {
                code: 200,
                url: '/decorators/DefaultDecorator/DiagramDesigner/DefaultDecorator.DiagramDesignerWidget.js'
            },
            //{code: 200, url: '/rest/unknown'},
            //{code: 200, url: '/rest/does_not_exist'},
            //{code: 200, url: '/rest/help'},
            {code: 200, url: '/api/decorators'},
            {code: 200, url: '/api/plugins'},
            {code: 200, url: '/api/visualizers'},
            {code: 200, url: '/api/seeds'},

            //{code: 401, url: '/login/client/fail'},

            {code: 404, url: '/login/forge'},
            {code: 404, url: '/extlib/does_not_exist'}, // ending without a forward slash
            {code: 404, url: '/extlib/does_not_exist/'}, // ending with a forward slash
            //{code: 404, url: '/pluginoutput/does_not_exist'},
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
            {code: 404, url: '/docs/'},
            {code: 404, url: '/index2.html'},
            {code: 404, url: '/does_not_exist'},
            {code: 404, url: '/does_not_exist.js'},
            {code: 404, url: '/asdf'},

            //excluded extlib paths.
            {code: 200, url: '/extlib/config/index.js'},
            {code: 403, url: '/extlib/config/config.default.js'},

            //{code: 410, url: '/getToken'},
            //{code: 410, url: '/checktoken/does_not_exist'},

            {code: 404, url: '/worker/simpleResult/bad_parameter'}
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

            // should allow access without auth
            {code: 200, url: '/lib/require/require.min.js'},
            {code: 200, url: '/plugin/PluginResult.js'},
            {code: 200, url: '/common/storage/browserstorage.js'},
            {code: 200, url: '/common/storage/constants.js'},
            {code: 200, url: '/common/blob/BlobClient.js'},
            {code: 200, url: '/gmeConfig.json'},

            {code: 401, url: '/api/plugins'},
            {code: 401, url: '/api/decorators'},
            {code: 401, url: '/api/visualizers'}
        ]
    }];

    addTest = function (requestTest) {
        var url = requestTest.url || '/',
            redirectText = requestTest.redirectUrl ? ' redirects to ' + requestTest.redirectUrl : ' ';

        it('returns ' + requestTest.code + ' for ' + url + redirectText, function (done) {
            // TODO: add POST/DELETE etc support
            agent.get(server.getUrl() + url).end(function (err, res) {

                should.equal(res.status, requestTest.code, err);

                if (requestTest.redirectUrl) {
                    // redirected
                    should.equal(res.status, 200);
                    if (res.headers.location) {
                        should.equal(res.headers.location, requestTest.redirectUrl);
                    }
                    should.not.equal(res.headers.location, url);
                    logger.debug(res.headers.location, url, requestTest.redirectUrl);
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
                gmeauth = require('../../src/server/middleware/auth/gmeauth'),
                db;

            before(function (done) {
                // we have to set the config here
                var dbConn,
                    userReady,
                    auth,
                    serverReady = Q.defer(),
                    gmeConfig = testFixture.getGmeConfig();

                gmeConfig.server.port = scenario.port;
                gmeConfig.authentication.enable = scenario.authentication;
                gmeConfig.authentication.allowGuests = false;
                gmeConfig.authentication.guestAccount = 'guestUserName';

                dbConn = Q.ninvoke(mongodb.MongoClient, 'connect', gmeConfig.mongo.uri, gmeConfig.mongo.options)
                    .then(function (db_) {
                        db = db_;
                        return Q.allDone([
                            Q.ninvoke(db, 'collection', '_users')
                                .then(function (collection_) {
                                    return Q.ninvoke(collection_, 'remove');
                                }),
                            //Q.ninvoke(db, 'collection', '_organizations')
                            //    .then(function (orgs_) {
                            //        return Q.ninvoke(orgs_, 'remove');
                            //    }),
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

                auth = gmeauth(null /* session */, gmeConfig);

                server = WebGME.standaloneServer(gmeConfig);
                serverBaseUrl = server.getUrl();
                server.start(serverReady.makeNodeResolver());

                Q.allDone([serverReady, dbConn])
                    .then(function () {
                        return auth.connect();
                    })
                    .then(function (gmeauth_) {
                        var account = gmeConfig.authentication.guestAccount;
                        gmeauth = auth;
                        return gmeauth.addUser(account, account + '@example.com', account, true, {overwrite: true});
                    })
                    .then(function () {
                        return gmeauth.addUser('user', 'user@example.com', 'plaintext', true, {overwrite: true});
                    })
                    .then(function () {
                        return gmeauth.authorizeByUserId('user', 'project', 'create', {
                            read: true,
                            write: true,
                            delete: false
                        });
                    })
                    .then(function () {
                        return gmeauth.authorizeByUserId('user', 'unauthorized_project', 'create', {
                            read: false,
                            write: false,
                            delete: false
                        });
                    })
                    .nodeify(done);
            });

            beforeEach(function () {
                agent = superagent.agent();
            });

            after(function (done) {
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = nodeTLSRejectUnauthorized;
                db.close(true, function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    server.stop(function () {
                        logger.debug('server stopped');
                        done();
                    });
                });
            });

            // add all tests for this scenario
            for (j = 0; j < scenario.requests.length; j += 1) {
                addTest(scenario.requests[j]);
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
            var gmeConfig = testFixture.getGmeConfig();
            gmeConfig.visualization.decoratorPaths = [];

            server = WebGME.standaloneServer(gmeConfig);
            serverBaseUrl = server.getUrl();
            server.start(done);
        });

        after(function (done) {
            server.stop(done);
        });

        it('should return 404 /decorators/DefaultDecorator/DefaultDecorator.js', function (done) {
            agent.get(serverBaseUrl + '/decorators/DefaultDecorator/DefaultDecorator.js').end(function (err, res) {
                should.equal(res.status, 404, err);
                done();
            });
        });
    });
});
