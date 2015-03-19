/*globals WebGMEGlobal*/
/*jshint node:true, mocha:true*/
/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../../_globals');

describe('Client tests', function () {
    'use strict';

    var gmeConfig = testFixture.getGmeConfig(),
        should = testFixture.should,
        WebGME = testFixture.WebGME,
        requirejs = testFixture.requirejs,

        ClientClass,

        server, // webgme server instance
        client, // webgme client instance communicating with server using socket.io
        fcoId,
        commitHash,
        projectName = 'test_client_basic_' + new Date().getTime(),
        territory,

        testTerritory;

    gmeConfig.addOn.enable = true;

    requirejs.config({
        paths: {
            'eventDispatcher': 'common/EventDispatcher',
            ' /socket.io/socket.io.js': 'socketio-client'
        }
    });

    ClientClass = requirejs('client/js/client');

    testTerritory = function (level, cb) {
        var next = function (events) {
                cb(events);
            },
            event = function (events) {
                //TODO maybe some checking can be done here as well
                next(events);
            },
            guid = client.addUI(this, event);

        function finish() {
            client.removeUI(guid);
        }

        function setNext(fn) {
            next = fn;
        }

        setTimeout(function () {
            client.updateTerritory(guid, {'': {children: level}});
        }, 1);

        return {
            setNext: setNext,
            finish: finish
        };
    };

    function createTestProject(callback) {

        client.connectToDatabaseAsync({}, function (err) {
            if (err) {
                callback(err);
                return;
            }

            client.createProjectAsync(projectName, {}, function (err) {
                if (err) {
                    callback(err);
                    return;
                }

                client.selectProjectAsync(projectName, function (err) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    //TODO it would be best to use the actual constant values
                    client.startTransaction();
                    client.setRegistry('', 'validPlugins', '');
                    client.setRegistry('', 'usedAddOns', 'ConstraintAddOn');
                    fcoId = client.createChild({
                        parentId: '',
                        guid: 'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045',
                        relid: '1'
                    });
                    client.setMeta('', {
                        children: {
                            items: [{$ref: fcoId}],
                            minItems: [-1],
                            maxItems: [-1]
                        },
                        attributes: {
                            name: {type: 'string'}
                        },
                        pointers: {}
                    });
                    client.setMeta(fcoId, {
                        children: {},
                        attributes: {
                            name: {type: 'string'}
                        },
                        pointers: {}
                    });

                    //TODO constraint

                    client.setAttributes('', 'name', 'ROOT');
                    client.setRegistry('', 'ProjectRegistry', {FCO_ID: fcoId});

                    client.setAttributes(fcoId, 'name', 'FCO');
                    client.setRegistry(fcoId, 'decorator', '');
                    client.setRegistry(fcoId, 'isPort', false);
                    client.setRegistry(fcoId, 'isAbstract', false);
                    client.setRegistry(fcoId, 'SVGIcon', '');
                    client.setRegistry(fcoId, 'SVGIcon', '');
                    client.setRegistry(fcoId, 'PortSVGIcon', '');
                    client.setRegistry(fcoId, 'DisplayFormat', '$name');

                    client.createSet('', 'MetaAspectSet');
                    client.addMember('', fcoId, 'MetaAspectSet');

                    client.createSet('', 'MetaAspectSet_000');
                    client.setRegistry('', 'MetaSheets', [{SetID: 'MetaAspectSet_000', order: 0, title: 'META'}]);
                    client.addMember('', fcoId, 'MetaAspectSet_000');
                    client.setMemberRegistry('', fcoId, 'MetaAspectSet_000', 'position', {x: 100, y: 100});

                    client.completeTransaction('basic project seed', function (err) {
                        if (err) {
                            callback(err);
                            return;
                        }

                        commitHash = client.getActualCommit();
                        callback();
                    });
                });
            });
        });
    }

    before(function (done) {

        server = new WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            client = new ClientClass(gmeConfig);

            createTestProject(done);
        });
    });

    after(function (done) {
        this.timeout(5000);
        client.deleteProjectAsync(projectName, function (err) {
            //client.closeDatabase(function (err) {
                server.stop(function (serverError) {
                    done(err || serverError);
                });
            //});
        });
    });

    describe('Client Basic Project Branch', function () {
        it('checks if the newly created project is among the available ones', function (done) {
            client.getAvailableProjectsAsync(function (err, projects) {
                if (err) {
                    return done(err);
                }
                if (projects.indexOf(projectName) === -1) {
                    return done(new Error('the test project is missing'));
                }
                done();
            });
        });

        it('checks if the newly created project is among the viewable ones', function (done) {
            client.getViewableProjectsAsync(function (err, projects) {
                if (err) {
                    return done(err);
                }
                if (projects.indexOf(projectName) === -1) {
                    return done(new Error('the test project is missing'));
                }
                done();
            });
        });

        it('checks if the newly created project is in the full project list', function (done) {
            client.getFullProjectListAsync(function (err, projects) {
                if (err) {
                    return done(err);
                }
                if (!projects[projectName]) {
                    return done(new Error('the test project is missing'));
                }
                done();
            });
        });

        it('checks the authorization info of the new project', function (done) {
            client.getProjectAuthInfoAsync(projectName, function (err, info) {
                if (err) {
                    return done(err);
                }
                if (info.read !== true || info.write !== true || info.delete !== true) {
                    return done(new Error('insufficient authorization info'));
                }
                done();
            });
        });

        it('checks if the active project is the one we just created', function () {
            if (client.getActiveProjectName() !== projectName) {
                throw new Error('wrong active project name');
            }
        });

        it('checks the available branches', function (done) {
            client.getBranchesAsync(function (err, branches) {
                if (err) {
                    return done(err);
                }
                if (branches.length !== 1) {
                    return done(new Error('only one branch should exist'));
                }
                if (branches[0].name !== 'master') {
                    return done(new Error('the only branch name should be \'master\''));
                }
                done();
            });
        });

        it('creates another branch', function (done) {
            commitHash = client.getActualCommit();
            client.createBranchAsync('another', commitHash, done);
        });

        it('selects the new branch', function (done) {
            client.selectBranchAsync('another', done);
        });

        it('makes some small modification', function (done) {
            client.setAttributes(fcoId, 'value', 'one', 'changing the new branch');
            done();
        });

        it('checks the actual branch', function () {
            if (client.getActualBranch() !== 'another') {
                throw new Error('wrong branch is the actual one');
            }
        });

        it('checks addon loading', function (done) {
            // TODO: client should provide a callback for this. Then we won't have to poll
            var i = 0,
                interval = setInterval(function () {
                    i += 1;
                    if (i > 30) {
                        clearInterval(interval);
                        done('addon load timed out');
                    }
                    if (client.getRunningAddOnNames().length === 1) {
                        clearInterval(interval);
                        done();
                    }
                }, 50);
        });

        it('removes the new branch', function (done) {
            client.selectBranchAsync('master', function (err) {
                if (err) {
                    return done(err);
                }
                client.deleteBranchAsync('another', done);
            });
        });
    });

    describe('Client#Basic#Territory', function () {
        it('creating a territory and receiving events', function (done) {
            territory = client.addUI({}, function (events) {
                var ids = [],
                    allLoad = true,
                    i;

                for (i = 0; i < events.length; i++) {
                    if (events[i].eid !== null) {
                        ids.push(events[i].eid);
                    }
                    if (events[i].etype !== 'load' && events[i].etype !== 'complete' &&
                        events[i].etype !== 'incomplete') {
                        allLoad = false;
                    }
                }
                if (ids.length !== 2 || allLoad === false || ids.indexOf('') === -1 || ids.indexOf('/1') === -1) {
                    client.removeUI(territory);
                    return done(new Error('wrong events'));
                }
                client.removeUI(territory);
                done();
            });
            client.updateTerritory(territory, {'': {children: 1}});
        });
        it('creates a new child under the root ascendant of FCO and check the events', function (done) {
            var myTerritory = testTerritory(1, function (/* events */) {
                    //we are loaded the initial territory
                    myTerritory.setNext(stepOne);
                    client.createChild({baseId: '/1', parentId: '', relid: '2'}, 'creating first new children');
                }),
                stepOne = function (events) {
                    //check if the new child is created
                    var i,
                        correct = false,
                        node,
                        ids;

                    for (i = 0; i < events.length; i++) {
                        if (events[i].eid === '/2' && events[i].etype === 'load') {
                            correct = true;
                        }
                    }
                    myTerritory.finish();
                    if (!correct) {
                        return done(new Error('new object has not been created'));
                    }
                    node = client.getNode('/2');

                    if (node.getAttribute('name') !== 'FCO') {
                        return done(new Error('new child has wrong name'));
                    }
                    if (node.getRegistry('position').x !== 100 || node.getRegistry('position').y !== 100) {
                        return done(new Error('new node has wrong position'));
                    }
                    if (node.getParentId() !== '') {
                        return done(new Error('new node has insufficient parent'));
                    }
                    if (node.getBaseId() !== '/1') {
                        return done(new Error('new node has insufficient ancestor'));
                    }

                    node = client.getNode('');
                    ids = node.getChildrenIds();
                    if (!(ids.length === 2 &&
                          ((ids[0] === '/1' && ids[1] === '/2') || (ids[0] === '/2' && ids[1] === '/1')))) {
                        return done(new Error('new node not visible in parents children list'));
                    }
                    done();
                };
        });
        it('creates multiple children and removes some and checks the events', function (done) {
            var myTerritory = testTerritory(1, function (/* events */) {
                    //we are loaded the initial territory
                    myTerritory.setNext(stepCreate);
                    client.createChild({baseId: '/1', parentId: '', relid: '3'}, 'creating first new children');
                    client.createChild({baseId: '/1', parentId: '', relid: '4'}, 'creating second new children');
                }),
                creates = 2,

                stepCreate = function (/* events */) {
                    //check if the new child is created
                    var node;
                    creates -= 1;
                    if (creates === 0) {
                        node = client.getNode('/3');
                        if (!node) {
                            myTerritory.finish();
                            return done(new Error('new node \'/3\' is missing'));
                        }
                        node = client.getNode('/4');
                        if (!node) {
                            myTerritory.finish();
                            return done(new Error('new node \'/4\' is missing'));
                        }

                        myTerritory.setNext(stepRemove);
                        client.delMoreNodes(['/4'], 'removing the second node');
                    }
                },

                stepRemove = function (events) {
                    var node,
                        correct = false,
                        i;

                    myTerritory.finish();

                    for (i = 0; i < events.length; i += 1) {
                        if (events[i].eid === '/4' && events[i].etype === 'unload') {
                            correct = true;
                        }
                    }

                    if (!correct) {
                        return done(new Error('unload event is missing'));
                    }

                    node = client.getNode('/4');
                    if (node !== null) {
                        return done(new Error('removed node should not be available'));
                    }

                    done();
                };
        });
    });

    // TODO: move this to plugin tests???
    describe.skip('Run plugins', function () {
        var runPluginOnServer = function (pluginName, config, pluginConfig, callback) {
            requirejs(['plugin/' + pluginName + '/' + pluginName + '/' + pluginName],
                function (PluginClass) {
                    var plugin = new PluginClass(),
                        pluginConfigParam,
                        context = {
                            managerConfig: config,
                            pluginConfigs: plugin.getDefaultConfig()
                        };

                    pluginConfig = pluginConfig || {};

                    for (pluginConfigParam in pluginConfig) {
                        if (pluginConfig.hasOwnProperty(pluginConfigParam)) {
                            context.pluginConfigs[pluginConfigParam] = pluginConfig[pluginConfigParam];
                        }
                    }

                    client.runServerPlugin(pluginName, context, function (err, result) {
                        callback(err, result);
                    });
                },
                function (err) {
                    callback(err);
                }
            );
        };


        it('should run PluginGenerator on server side', function (done) {
            var config = {
                    project: projectName,
                    token: '',
                    activeNode: null, // active object in the editor
                    activeSelection: [],
                    commit: null, //'#668b3babcdf2ddcd7ba38b51acb62d63da859d90',
                    branchName: 'master' // this has priority over the commit if not null
                },
                pluginConfig = {};

            runPluginOnServer('PluginGenerator', config, pluginConfig, function (err, result) {
                if (err) {
                    done(err);
                    return;
                }

                // TODO: check/assert on result as needed
                //console.log(result);

                should.equal(result.success, true);
                should.equal(result.error, null);
                should.equal(result.artifacts.length, 1, 'should generate one artifact');

                done();
            });

        });
    });
});
