/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../_globals.js');

describe('standalone server', function () {
    'use strict';

    var WebGME = testFixture.WebGME,
        logger = testFixture.logger,

        should = testFixture.should,
        expect = testFixture.expect,
        superagent = testFixture.superagent,
        Q = testFixture.Q,

        agent = superagent.agent(),

        serverBaseUrl,

        scenarios,
        i,
        j;

    scenarios = [{
        type: 'http',
        authentication: false,
        port: 9008,
        requests: [
            {code: 200, url: '/'},
            {code: 200, url: '/gmeConfig.json'},
            {code: 200, url: '/package.json'},
            {code: 200, url: '/index.html'},
            {code: 200, url: '/plugin/PluginBase.js'},
            {code: 200, url: '/common/blob/BlobClient.js'},
            {code: 200, url: '/client/logger.js'},

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
            {code: 200, url: '/panel/ModelEditor/ModelEditorControl.js'},
            {code: 200, url: '/panel/ModelEditor/ModelEditorControl'},
            {code: 200, url: '/panel/SplitPanel/SplitPanel.js'},
            {code: 200, url: '/layout/DefaultLayout/DefaultLayout/DefaultLayout.js'}
        ]
    }];

    function addScenario(scenario) {

        describe(scenario.type + ' server ' + (scenario.authentication ? 'with' : 'without') + ' auth', function () {
            var gmeAuth,
                server,
                gmeConfig = testFixture.getGmeConfig();

            before(function (done) {
                gmeConfig.server.port = scenario.port;
                gmeConfig.authentication.enable = scenario.authentication;
                gmeConfig.authentication.allowGuests = false;
                gmeConfig.authentication.guestAccount = 'guestUserName';
                server = WebGME.standaloneServer(gmeConfig);
                serverBaseUrl = server.getUrl();

                testFixture.clearDBAndGetGMEAuth(gmeConfig)
                    .then(function (gmeAuth_) {
                        gmeAuth = gmeAuth_;
                        var account = gmeConfig.authentication.guestAccount;

                        return Q.allDone([
                            gmeAuth.addUser(account, account + '@example.com', account, true, {overwrite: true}),
                            gmeAuth.addUser('user', 'user@example.com', 'plaintext', true, {overwrite: true})
                        ]);
                    })
                    .then(function () {
                        return gmeAuth.authorizeByUserId('user', 'project', 'create', {
                            read: true,
                            write: true,
                            delete: false
                        });
                    })
                    .then(function () {
                        return gmeAuth.authorizeByUserId('user', 'unauthorized_project', 'create', {
                            read: false,
                            write: false,
                            delete: false
                        });
                    })
                    .then(function () {
                        return gmeAuth.unload();
                    })
                    .then(function () {
                        return Q.ninvoke(server, 'start');
                    })
                    .nodeify(done);
            });

            beforeEach(function () {
                agent = superagent.agent();
            });

            after(function (done) {
                server.stop(done);
            });

            function addTest(requestTest) {
                var url = requestTest.url || '/',
                    redirectText = requestTest.redirectUrl ? ' redirects to ' + requestTest.redirectUrl : ' ';
                it('returns ' + requestTest.code + ' for ' + url + redirectText, function (done) {
                    // TODO: add POST/DELETE etc support
                    agent.get(serverBaseUrl + url).end(function (err, res) {
                        if (err && err.message.indexOf('connect ECONNREFUSED') > -1) {
                            console.log('Is server running?', server.isRunning());
                            done(err);
                            return;
                        }

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
            }

            // add all tests for this scenario
            for (j = 0; j < scenario.requests.length; j += 1) {
                addTest(scenario.requests[j]);
            }

        });
    }

    // create all scenarios
    for (i = 0; i < scenarios.length; i += 1) {
        addScenario(scenarios[i]);
    }


    describe('http svgs', function () {
        var server;

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

        it('should list svgs at /assets/decoratorSVGList.json', function (done) {
            agent.get(serverBaseUrl + '/assets/decoratorSVGList.json').end(function (err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.include.members([
                    'Attribute.svg',
                    'BluePort.svg',
                    'Chain.svg'
                ]);

                expect(Object.keys(res.body).length > 60).to.equal(true);
                done();
            });
        });

        it('should return svg file if exists /assets/DecoratorSVG/Attribute.svg', function (done) {
            agent.get(serverBaseUrl + '/assets/DecoratorSVG/Attribute.svg').end(function (err, res) {
                expect(res.status).to.equal(200);
                expect(res.body.toString('utf8')).to.contain('</svg>');
                done();
            });
        });
    });
});
