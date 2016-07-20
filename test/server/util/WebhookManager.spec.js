/*jshint node:true, mocha:true, expr:true*/
/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../_globals.js');

describe('Webhook Manager', function () {
    'use strict';
    var StorageMock = function () {
            var listeners = {};

            function add(event, eventFn) {
                listeners[event] = listeners[event] || [];
                listeners[event].push(eventFn);
            }

            function remove(eventFn) {
                var events = Object.keys(listeners),
                    i;
                for (i = 0; i < events.length; i += 1) {
                    if (listeners[events[i]].indexOf(eventFn) !== -1) {
                        listeners[events[i]].splice(listeners[events[i]].indexOf(eventFn), 1);
                        if (listeners[events[i]].length === 0) {
                            delete listeners[events[i]];
                        }
                    }
                }
            }

            function get() {
                return Object.keys(listeners);
            }

            function send(event, eventData) {
                var listenFunctions = listeners[event] || [],
                    i;

                for (i = 0; i < listenFunctions.length; i += 1) {
                    listenFunctions[i]({}, eventData);
                }
            }

            return {
                addEventListener: add,
                removeEventListener: remove,
                getRegisteredEvents: get,
                send: send
            };
        },
        EventGenerator = function () {
            var pub = redis.createClient('redis://127.0.0.1:6379');

            function stop() {
                pub.quit();
            }

            function send(eventType, eventData) {
                var msg = MSG.encode(['uid', {data: [eventType, eventData]}, {}]),
                    channel = 'socket.io#/#anything';
                pub.publish(channel, msg);
            }

            return {
                send: send,
                stop: stop
            };
        },
        redis = require('redis'),
        MSG = require('msgpack-js'),
        WebhookManager = require('../../../src/server/util/WebhookManager'),
        CONSTANTS = testFixture.requirejs('common/storage/constants'),
        logger = testFixture.logger.fork('WebhookManager.spec.js'),
        gmeConfig = testFixture.getGmeConfig(),
        expect = testFixture.expect,
        Q = testFixture.Q,
        projectName = 'hookProject',
        safeStorage,
        metadataStorage,
        express = require('express'),
        bodyParser = require('body-parser'),
        projectId,
        gmeAuth,
        listenerPort = 9009;

    function getHookListener(hookFn) {
        var app = express();
        app.use(bodyParser.json());
        app.post('/', hookFn);
        return app.listen(listenerPort);
    }

    before(function (done) {
        var gmeConfig = testFixture.getGmeConfig();

        testFixture.clearDBAndGetGMEAuth(gmeConfig,
            [projectName])
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                metadataStorage = gmeAuth.metadataStorage;
                safeStorage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return safeStorage.openDatabase();
            })
            .then(function () {
                return testFixture.importProject(safeStorage, {
                    projectSeed: 'seeds/EmptyProject.webgmex',
                    projectName: projectName,
                    gmeConfig: gmeConfig,
                    logger: logger
                });
            })
            .then(function (result) {
                projectId = result.projectId;
                return metadataStorage.updateProjectHooks(projectId,
                    {
                        hookOne: {
                            events: 'all',
                            url: 'http://127.0.0.1:' + listenerPort
                        }
                    });

            })
            .nodeify(done);
    });

    after(function (done) {
        Q.allDone([
            gmeAuth.unload(),
            safeStorage.closeDatabase()
        ])
            .nodeify(done);
    });

    it('should listen to all events if memory option is used', function (done) {
        var storage = new StorageMock(),
            memory = new WebhookManager(storage, logger, {
                mongo: {uri: gmeConfig.mongo.uri},
                webhooks: {enable: true, manager: 'memory'}
            });

        memory.start(function (err) {
            expect(err).to.equal(null);
            expect(storage.getRegisteredEvents()).to.have.members([
                CONSTANTS.BRANCH_HASH_UPDATED,
                CONSTANTS.PROJECT_DELETED,
                CONSTANTS.BRANCH_DELETED,
                CONSTANTS.BRANCH_CREATED,
                CONSTANTS.TAG_CREATED,
                CONSTANTS.TAG_DELETED,
                CONSTANTS.COMMIT,
            ]);

            memory.stop();
            expect(storage.getRegisteredEvents()).to.have.length(0);
            done();
        });
    });

    it('should fail to start in unknown mode', function () {
        var storage = new StorageMock(),
            memory = new WebhookManager(storage, logger, {
                mongo: {uri: gmeConfig.mongo.uri},
                webhooks: {enable: true, manager: 'unknown'}
            });

        expect(memory).to.eql({});
    });

    describe('in memory mode', function () {
        var storage = new StorageMock(),
            manager = new WebhookManager(storage, logger, {
                mongo: {uri: gmeConfig.mongo.uri},
                webhooks: {enable: true, manager: 'memory'}
            });

        before(function (done) {
            manager.start(done);
        });
        after(function (done) {
            manager.stop(done);
        });

        it('should forward TAG_CREATED event', function (done) {
            var hookListener = getHookListener(function (req) {
                    expect(req.body.event).to.equal(CONSTANTS.TAG_CREATED);
                    expect(req.body.data).to.eql(eventData);
                    hookListener.close();
                    done();
                }),
                eventData = {projectId: projectId, anything: 'really'};

            storage.send(CONSTANTS.TAG_CREATED, eventData);
        });

        it('should forward TAG_DELETED event', function (done) {
            var hookListener = getHookListener(function (req) {
                    expect(req.body.event).to.equal(CONSTANTS.TAG_DELETED);
                    expect(req.body.data).to.eql(eventData);
                    hookListener.close();
                    done();
                }),
                eventData = {projectId: projectId, anything: 'really'};

            storage.send(CONSTANTS.TAG_DELETED, eventData);
        });

        it('should forward BRANCH_CREATED event', function (done) {
            var hookListener = getHookListener(function (req) {
                    expect(req.body.event).to.equal(CONSTANTS.BRANCH_CREATED);
                    expect(req.body.data).to.eql(eventData);
                    hookListener.close();
                    done();
                }),
                eventData = {projectId: projectId, anything: 'really'};

            storage.send(CONSTANTS.BRANCH_CREATED, eventData);
        });

        it('should forward BRANCH_HASH_UPDATED event', function (done) {
            var hookListener = getHookListener(function (req) {
                    expect(req.body.event).to.equal(CONSTANTS.BRANCH_HASH_UPDATED);
                    expect(req.body.data).to.eql(eventData);
                    hookListener.close();
                    done();
                }),
                eventData = {projectId: projectId, anything: 'really'};

            storage.send(CONSTANTS.BRANCH_HASH_UPDATED, eventData);
        });

        it('should forward BRANCH_DELETED event', function (done) {
            var hookListener = getHookListener(function (req) {
                    expect(req.body.event).to.equal(CONSTANTS.BRANCH_DELETED);
                    expect(req.body.data).to.eql(eventData);
                    hookListener.close();
                    done();
                }),
                eventData = {projectId: projectId, anything: 'really'};

            storage.send(CONSTANTS.BRANCH_DELETED, eventData);
        });

        it('should forward PROJECT_DELETED event', function (done) {
            var hookListener = getHookListener(function (req) {
                    expect(req.body.event).to.equal(CONSTANTS.PROJECT_DELETED);
                    expect(req.body.data).to.eql(eventData);
                    hookListener.close();
                    done();
                }),
                eventData = {projectId: projectId, anything: 'really'};

            storage.send(CONSTANTS.PROJECT_DELETED, eventData);
        });

        it('should forward COMMIT event', function (done) {
            var hookListener = getHookListener(function (req) {
                    expect(req.body.event).to.equal(CONSTANTS.COMMIT);
                    expect(req.body.data).to.eql(eventData);
                    hookListener.close();
                    done();
                }),
                eventData = {projectId: projectId, anything: 'really'};

            storage.send(CONSTANTS.COMMIT, eventData);
        });

        it('should not forward BRANCH_UPDATED event', function (done) {
            var hookListener = getHookListener(function () {
                    throw new Error('BRANCH_UPDATED event should be filtered out by default');
                }),
                eventData = {projectId: projectId, anything: 'really'};

            setTimeout(function () {
                hookListener.close();
                done();
            }, 100);

            storage.send(CONSTANTS.BRANCH_UPDATED, eventData);
        });

        it('should not forward arbitrary event', function (done) {
            var hookListener = getHookListener(function () {
                    throw new Error('arbitrary event should be filtered out by default');
                }),
                eventData = {projectId: projectId, anything: 'really'};

            setTimeout(function () {
                hookListener.close();
                done();
            }, 100);

            storage.send('arbitrary', eventData);
        });

        it('should not forward the socket', function (done) {
            var hookListener = getHookListener(function (req) {
                    expect(req.body.event).to.equal(CONSTANTS.PROJECT_DELETED);
                    expect(req.body.data.projectId).to.eql(eventData.projectId);
                    expect(req.body.data.anything).to.eql(eventData.anything);
                    expect(typeof req.body.data.socket).to.eql('undefined');

                    hookListener.close();
                    done();
                }),
                eventData = {
                    projectId: projectId,
                    anything: 'notReallyCantHaveSocket',
                    socket: 'something'
                };

            storage.send(CONSTANTS.PROJECT_DELETED, eventData);
        });

    });

    describe('in redis mode', function () {
        var storage = new StorageMock(),
            gmeConfig = testFixture.getGmeConfig(),
            manager;

        before(function (done) {
            gmeConfig.webhooks = {enable: true, manager: 'redis'};
            manager = new WebhookManager(storage, logger, gmeConfig);
            manager.start(done);
        });
        after(function (done) {
            manager.stop(done);
        });

        it('should forward TAG_CREATED event', function (done) {
            var eventGenerator = new EventGenerator(),
                hookListener = getHookListener(function (req) {
                    expect(req.body.event).to.equal(CONSTANTS.TAG_CREATED);
                    expect(req.body.data).to.eql(eventData);
                    eventGenerator.stop();
                    hookListener.close();
                    done();
                }),
                eventData = {projectId: projectId, anything: 'really'};

            eventGenerator.send(CONSTANTS.TAG_CREATED, eventData);
        });

        it('should forward TAG_DELETED event', function (done) {
            var eventGenerator = new EventGenerator(),
                hookListener = getHookListener(function (req) {
                    expect(req.body.event).to.equal(CONSTANTS.TAG_DELETED);
                    expect(req.body.data).to.eql(eventData);
                    eventGenerator.stop();
                    hookListener.close();
                    done();
                }),
                eventData = {projectId: projectId, anything: 'really'};

            eventGenerator.send(CONSTANTS.TAG_DELETED, eventData);
        });

        it('should forward BRANCH_CREATED event', function (done) {
            var eventGenerator = new EventGenerator(),
                hookListener = getHookListener(function (req) {
                    expect(req.body.event).to.equal(CONSTANTS.BRANCH_CREATED);
                    expect(req.body.data).to.eql(eventData);
                    eventGenerator.stop();
                    hookListener.close();
                    done();
                }),
                eventData = {projectId: projectId, anything: 'really'};

            eventGenerator.send(CONSTANTS.BRANCH_CREATED, eventData);
        });

        it('should forward BRANCH_HASH_UPDATED event', function (done) {
            var eventGenerator = new EventGenerator(),
                hookListener = getHookListener(function (req) {
                    expect(req.body.event).to.equal(CONSTANTS.BRANCH_HASH_UPDATED);
                    expect(req.body.data).to.eql(eventData);
                    eventGenerator.stop();
                    hookListener.close();
                    done();
                }),
                eventData = {projectId: projectId, anything: 'really'};

            eventGenerator.send(CONSTANTS.BRANCH_HASH_UPDATED, eventData);
        });

        it('should forward BRANCH_DELETED event', function (done) {
            var eventGenerator = new EventGenerator(),
                hookListener = getHookListener(function (req) {
                    expect(req.body.event).to.equal(CONSTANTS.BRANCH_DELETED);
                    expect(req.body.data).to.eql(eventData);
                    eventGenerator.stop();
                    hookListener.close();
                    done();
                }),
                eventData = {projectId: projectId, anything: 'really'};

            eventGenerator.send(CONSTANTS.BRANCH_DELETED, eventData);
        });

        it('should forward PROJECT_DELETED event', function (done) {
            var eventGenerator = new EventGenerator(),
                hookListener = getHookListener(function (req) {
                    expect(req.body.event).to.equal(CONSTANTS.PROJECT_DELETED);
                    expect(req.body.data).to.eql(eventData);
                    eventGenerator.stop();
                    hookListener.close();
                    done();
                }),
                eventData = {projectId: projectId, anything: 'really'};

            eventGenerator.send(CONSTANTS.PROJECT_DELETED, eventData);
        });

        it('should forward COMMIT event', function (done) {
            var eventGenerator = new EventGenerator(),
                hookListener = getHookListener(function (req) {
                    expect(req.body.event).to.equal(CONSTANTS.COMMIT);
                    expect(req.body.data).to.eql(eventData);
                    eventGenerator.stop();
                    hookListener.close();
                    done();
                }),
                eventData = {projectId: projectId, anything: 'really'};

            eventGenerator.send(CONSTANTS.COMMIT, eventData);
        });

        it('should forward arbitrary event', function (done) {
            var eventGenerator = new EventGenerator(),
                hookListener = getHookListener(function (req) {
                    expect(req.body.event).to.equal('arbitrary');
                    expect(req.body.data).to.eql(eventData);
                    eventGenerator.stop();
                    hookListener.close();
                    done();
                }),
                eventData = {projectId: projectId, anything: 'really'};

            eventGenerator.send('arbitrary', eventData);
        });

        it('should not forward BRANCH_UPDATED event', function (done) {
            var eventGenerator = new EventGenerator(),
                hookListener = getHookListener(function () {
                    throw new Error('BRANCH_UPDATED event should be filtered out by default');
                }),
                eventData = {projectId: projectId, anything: 'really'};

            setTimeout(function () {
                eventGenerator.stop();
                hookListener.close();
                done();
            }, 100);

            eventGenerator.send(CONSTANTS.BRANCH_UPDATED, eventData);
        });
    });

});