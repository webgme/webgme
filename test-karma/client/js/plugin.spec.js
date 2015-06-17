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
        InterpreterManager,
        baseCommitHash;

    before(function (done) {
        requirejs([
            'js/client',
            'text!gmeConfig.json',
            'superagent',
            'js/Utils/InterpreterManager'
        ], function (Client_, gmeConfigJSON, superagent, InterpreterManager_) {
            Client = Client_;
            gmeConfig = JSON.parse(gmeConfigJSON);
            client = new Client(gmeConfig);
            InterpreterManager = InterpreterManager_;
            superagent.get('/listAllPlugins')
                .end(function (err, res) {
                    if (res.status === 200) {
                        allPlugins = res.body.allPlugins;
                        client.connectToDatabase(function (err) {
                            expect(err).to.equal(null);
                            client.selectProject(projectName, function (err) {
                                expect(err).to.equal(null);

                                baseCommitHash = client.getActiveCommitHash();
                                done();
                            });
                        });
                    } else {
                        done(new Error('/listAllPlugins failed'));
                    }
                });
        });
    });

    after(function (done) {
        client.disconnectFromDatabase(done);
    });

    function createBranchForTest(branchName, next) {
        client.selectProject(projectName, function (err) {
            expect(err).to.equal(null);
            client.createBranch(projectName, branchName, baseCommitHash, function (err) {
                expect(err).to.equal(null);
                client.selectBranch(branchName, null, function (err) {
                    expect(err).to.equal(null);
                    next();
                });
            });
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
        var filtered = client.filterPlugins(allPlugins, '/1');
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
        var name = 'PluginGenerator',
            context = {
                managerConfig: {
                    project: projectName,
                    activeNode: '',
                    commit: baseCommitHash,
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
        client.runServerPlugin(name, context, function (err, pluginResult) {
            expect(err).to.equal(null);
            expect(pluginResult).not.to.equal(null);
            expect(pluginResult.success).to.equal(true, 'PluginGenerator did not succeed on server!');
            done();
        });
    });

    it.skip('should run PluginGenerator on in client and return a valid result using default settings', function (done) {
        var name = 'PluginGenerator',
            interpreterManager = new InterpreterManager(client, gmeConfig),
            silentPluginCfg = {
                activeNode: '',
                activeSelection: [],
                runOnServer: false,
                pluginConfig: {}
            };
        //* @param {string} name - name of plugin to be executed.
        //* @param {object} silentPluginCfg - if falsy dialog window will be shown.
        //* @param {object.string} silentPluginCfg.activeNode - Path to activeNode.
        //* @param {object.Array.<string>} silentPluginCfg.activeSelection - Paths to nodes in activeSelection.
        //* @param {object.boolean} silentPluginCfg.runOnServer - Whether to run the plugin on the server or not.
        //* @param {object.object} silentPluginCfg.pluginConfig - Plugin specific options.
        interpreterManager.run(name, silentPluginCfg, function (pluginResult) {
            expect(pluginResult).not.to.equal(null);
            expect(pluginResult.success).to.equal(true, 'PluginGenerator did not succeed on server!');
            done();
        });
    });
});