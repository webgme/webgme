/*globals requirejs, expect, before*/
/* jshint browser: true, mocha: true, expr: true */
/**
 * @author pmeijer / https://github.com/pmeijer
 */

describe('Plugin', function () {
    'use strict';
    var Client,
        allPlugins = [],
        gmeConfig,
        client,
        projectName = 'pluginProject',
        projectId,
        InterpreterManager,
        currentBranchName,
        currentBranchHash,
        originalCommitHash;

    before(function (done) {
        requirejs([
            'js/client',
            'text!gmeConfig.json',
            'superagent',
            'plugin/MinimalWorkingExample/MinimalWorkingExample/MinimalWorkingExample',
            'plugin/PluginForked/PluginForked/PluginForked'
        ], function (Client_, gmeConfigJSON, superagent, MinimalWorkingExample, PluginForked) {
            Client = Client_;
            gmeConfig = JSON.parse(gmeConfigJSON);
            client = new Client(gmeConfig);
            projectId = gmeConfig.authentication.guestAccount + client.CONSTANTS.STORAGE.PROJECT_ID_SEP +
                projectName;
            window.WebGMEGlobal = {};
            window.WebGMEGlobal.plugins = {};
            window.WebGMEGlobal.plugins.MinimalWorkingExample = MinimalWorkingExample;
            window.WebGMEGlobal.plugins.PluginForked = PluginForked;
            superagent.get('/api/plugins')
                .end(function (err, res) {
                    if (res.status === 200) {
                        allPlugins = res.body;
                        client.connectToDatabase(function (err) {
                            expect(err).to.equal(null);
                            client.selectProject(projectId, null, function (err) {
                                expect(err).to.equal(null);

                                originalCommitHash = client.getActiveCommitHash();
                                done();
                            });
                        });
                    } else {
                        done(new Error('/api/plugins failed'));
                    }
                });
        });
    });

    afterEach(function (done) {
        if (currentBranchName) {
            client.selectBranch('master', null, function (err) {
                client.deleteBranch(projectId, currentBranchName, currentBranchHash, function (err2) {
                    currentBranchName = null;
                    done(err || err2);
                });
            });
        } else {
            done();
        }
    });

    after(function (done) {
        client.disconnectFromDatabase(done);
    });

    function createSelectBranch(branchName, callback) {
        client.createBranch(projectId, branchName, originalCommitHash, function (err) {
            expect(err).to.equal(null);
            client.selectBranch(branchName, null, callback);
        });
    }

    it('MinimalWorkingExample, PluginGenerator and ExecutorPlugin should be avaliable in allPlugins', function () {
        expect(allPlugins).to.include('MinimalWorkingExample', 'PluginGenerator', 'ExecutorPlugin');
    });

    it('filterPlugins - should read from root-node when no nodePath given.', function () {
        var filtered = client.filterPlugins(allPlugins);
        expect(filtered.length).to.equal(2);
        expect(filtered).to.include('MinimalWorkingExample', 'PluginGenerator');
    });

    it('filterPlugins - should not return a plugin that is not in allPlugins.', function () {
        var filtered = client.filterPlugins(['MinimalWorkingExample']);
        expect(filtered.length).to.equal(1);
        expect(filtered).to.include('MinimalWorkingExample');
    });

    it('filterPlugins - should read from root-node when given nodePath not loaded.', function () {
        var filtered = client.filterPlugins(allPlugins, '/i');
        expect(filtered.length).to.equal(2);
        expect(filtered).to.include('MinimalWorkingExample', 'PluginGenerator');
    });

    it('filterPlugins - should read from given nodePath when node loaded.', function (done) {
        var loaded = false,
            userGuid;

        function eventHandler(events) {
            var filtered;
            if (loaded) {
                done(new Error('More than one event'));
            } else {
                loaded = true;
                expect(events.length).to.equal(2);

                filtered = client.filterPlugins(allPlugins, '/1');
                expect(filtered.length).to.equal(1);
                expect(filtered).to.include('ExecutorPlugin');
                client.removeUI(userGuid);
                done();
            }
        }

        userGuid = client.addUI({}, eventHandler);
        client.updateTerritory(userGuid, {'/1': {children: 0}});
    });

    it('should run PluginGenerator on the server and return a valid result using default settings', function (done) {
        var pluginId = 'PluginGenerator',
            context = {
                managerConfig: {
                    project: projectId,
                    activeNode: '',
                    commit: originalCommitHash,
                    branchName: 'master'
                }
            };
        //* @param {string} name - name of plugin.
        //* @param {object} context
        //* @param {object} context.managerConfig - where the plugin should execute.
        //* @param {string} context.managerConfig.project - name of project.
        //* @param {string} context.managerConfig.activeNode - path to activeNode.
        //* @param {string} [context.managerConfig.activeSelection=[]] - paths to selected nodes.
        //* @param {string} context.managerConfig.commit - commit hash to start the plugin from.
        //* @param {string} context.managerConfig.branchName - branch which to save to.
        //* @param {object} [context.pluginConfig=%defaultForPlugin%] - specific configuration for the plugin.
        //* @param {function} callback
        client.runServerPlugin(pluginId, context, function (err, pluginResult) {
            expect(err).to.equal(null);
            expect(pluginResult).not.to.equal(null);
            expect(pluginResult.success).to.equal(true, 'PluginGenerator did not succeed on server!');
            expect(pluginResult.commits.length).to.equal(1);
            expect(pluginResult.commits[0].branchName).to.equal('master');
            expect(pluginResult.commits[0].status).to.equal(client.CONSTANTS.STORAGE.SYNCED);
            done();
        });
    });

    it('should run MinimalWorkingExample in client and update the client', function (done) {
        var pluginId = 'MinimalWorkingExample',
            context = {
                managerConfig: {
                    project: client.getProjectObject(),
                    activeNode: '',
                    activeSelection: [],
                    commit: null,
                    branchName: 'MinimalWorkingExample1',
                },
                pluginConfig: {}
            },
            prevStatus;

        currentBranchName = 'MinimalWorkingExample1';

        function removeHandler() {
            client.removeEventListener(client.CONSTANTS.BRANCH_STATUS_CHANGED, eventHandler);
        }

        function eventHandler(__client, eventData) {
            if (prevStatus === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                expect(eventData.status).to.equal(client.CONSTANTS.BRANCH_STATUS.AHEAD_SYNC);
                prevStatus = eventData.status;
            } else if (prevStatus === client.CONSTANTS.BRANCH_STATUS.AHEAD_SYNC) {
                expect(eventData.status).to.equal(client.CONSTANTS.BRANCH_STATUS.SYNC);
                removeHandler();
                currentBranchHash = client.getActiveCommitHash();
                //done();
            } else {
                removeHandler();
                done(new Error('Unexpected BranchStatus ' + eventData.status));
            }
        }

        createSelectBranch(currentBranchName, function (err) {
            expect(err).to.equal(null);

            prevStatus = client.getBranchStatus();
            expect(prevStatus).to.equal(client.CONSTANTS.BRANCH_STATUS.SYNC);
            client.addEventListener(client.CONSTANTS.BRANCH_STATUS_CHANGED, eventHandler);

            context.managerConfig.commit = client.getActiveCommitHash();
            client.runBrowserPlugin(pluginId, context, function (err, pluginResult) {
                expect(err).to.equal(null);
                expect(pluginResult).not.to.equal(null);
                expect(pluginResult.success).to.equal(true, 'MinimalWorkingExample did not succeed');
                expect(pluginResult.commits.length).to.equal(2);
                expect(pluginResult.commits[0].branchName).to.equal('MinimalWorkingExample1');
                expect(pluginResult.commits[0].status).to.equal(client.CONSTANTS.STORAGE.SYNCED);
                expect(pluginResult.commits[1].branchName).to.include('MinimalWorkingExample1');
                expect(pluginResult.commits[1].status).to.equal(client.CONSTANTS.STORAGE.SYNCED);
                client.getBranches(projectId, function (err, branches) {
                    expect(err).to.equal(null);
                    expect(Object.keys(branches).length).to.equal(2);
                    done();
                });
            });
        });
    });

    it('should fork when client made changes after invocation', function (done) {
        var pluginId = 'PluginForked',
            context = {
                managerConfig: {
                    project: client.getProjectObject(),
                    activeNode: '',
                    activeSelection: [],
                    commit: null,
                    branchName: 'PluginForked1',
                },
                pluginConfig: {
                    timeout: 200,
                    forkName: 'PluginForked1Fork'
                }
            },
            branchName = 'PluginForked1';

        createSelectBranch(branchName, function (err) {
            expect(err).to.equal(null);

            var loaded = false,
                userGuid;

            function nodeEventHandler(events) {
                if (loaded) {
                    done(new Error('More than one event'));
                } else {
                    loaded = true;
                    expect(events.length).to.equal(2);
                    client.removeUI(userGuid);
                    setTimeout(function () {
                        client.setAttributes('', 'name', 'PluginForkedNameFromClient', 'conflicting change');
                    }, 50);
                }
            }
            context.managerConfig.commit = client.getActiveCommitHash();
            userGuid = client.addUI({}, nodeEventHandler);
            client.updateTerritory(userGuid, {'': {children: 0}});

            client.runBrowserPlugin(pluginId, context, function (err, pluginResult) {
                expect(pluginResult).not.to.equal(null);
                expect(pluginResult.success).to.equal(true, 'PluginForked did not succeed.');
                expect(pluginResult.commits.length).to.equal(2);
                expect(pluginResult.commits[0].branchName).to.equal(branchName);
                expect(pluginResult.commits[0].status).to.equal(client.CONSTANTS.STORAGE.SYNCED);
                expect(pluginResult.commits[1].branchName).to.equal('PluginForked1Fork');
                expect(pluginResult.commits[1].status).to.equal(client.CONSTANTS.STORAGE.FORKED);
                client.getBranches(projectId, function (err, branches) {
                    expect(err).to.equal(null);

                    expect(Object.keys(branches).length).to.equal(3);
                    expect(branches).to.include.keys('master', branchName, 'PluginForked1Fork');
                    client.deleteBranch(projectId, 'PluginForked1Fork', branches.PluginForked1Fork, function (err) {
                        expect(err).to.equal(null);

                        client.selectBranch('master', null, function (err) {
                            expect(err).to.equal(null);

                            client.deleteBranch(projectId, branchName, branches[branchName], function (err) {
                                expect(err).to.equal(null);

                                done();
                            });
                        });
                    });
                });
            });
        });
    });

    // TODO: setBranchHash called with an open branch does no longer count as an external change..
    it.skip('should fork with client when external changes are made', function (done) {
        var name = 'PluginForked',
            interpreterManager = new InterpreterManager(client, gmeConfig),
            silentPluginCfg = {
                activeNode: '',
                activeSelection: [],
                runOnServer: false,
                pluginConfig: {
                    fork: true, // This will inject changes to the branch
                    forkName: 'PluginForked2Fork'
                }
            },
            branchName = 'PluginForked2';

        createSelectBranch(branchName, function (err) {
            expect(err).to.equal(null);

            //* @param {string} name - name of plugin to be executed.
            //* @param {object} silentPluginCfg - if falsy dialog window will be shown.
            //* @param {object.string} silentPluginCfg.activeNode - Path to activeNode.
            //* @param {object.Array.<string>} silentPluginCfg.activeSelection - Paths to nodes in activeSelection.
            //* @param {object.boolean} silentPluginCfg.runOnServer - Whether to run the plugin on the server or not.
            //* @param {object.object} silentPluginCfg.pluginConfig - Plugin specific options.
            client.startTransaction('starting');
            interpreterManager.run(name, silentPluginCfg, function (pluginResult) {
                expect(pluginResult).not.to.equal(null);

                expect(pluginResult.success).to.equal(true, 'PluginForked did not succeed.');
                expect(pluginResult.commits.length).to.equal(2);
                expect(pluginResult.commits[0].branchName).to.equal('PluginForked2');
                expect(pluginResult.commits[0].status).to.equal(client.CONSTANTS.STORAGE.SYNCED);
                expect(pluginResult.commits[1].branchName).to.equal('PluginForked2Fork');
                expect(pluginResult.commits[1].status).to.equal(client.CONSTANTS.STORAGE.FORKED);
                client.completeTransaction('stopping');
                client.getBranches(projectId, function (err, branches) {
                    expect(err).to.equal(null);

                    expect(Object.keys(branches).length).to.equal(3);
                    expect(branches).to.include.keys('master', branchName, 'PluginForked2Fork');
                    client.deleteBranch(projectId, 'PluginForked2Fork', branches.PluginForked2Fork, function (err) {
                        expect(err).to.equal(null);

                        client.selectBranch('master', null, function (err) {
                            expect(err).to.equal(null);

                            client.deleteBranch(projectId, branchName, branches[branchName], function (err) {
                                expect(err).to.equal(null);

                                done();
                            });
                        });
                    });
                });
            });
        });
    });
});