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
        baseCommitHash;

    before(function (done) {
        requirejs([
            'js/client',
            'text!gmeConfig.json',
            'superagent'
        ], function (Client_, gmeConfigJSON, superagent) {
            Client = Client_;
            gmeConfig = JSON.parse(gmeConfigJSON);
            client = new Client(gmeConfig);
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

    it.skip('should run PluginGenerator on the server and return a valid result using default settings', function (done) {
        var name = 'PluginGenerator',
            context = {
                project: projectName,
                activeNode: '',
                commit: baseCommitHash,
                branchName: 'master'
            };
        //* @param {object} context - where the plugin should execute.
        //* @param {string} context.project - name of project.
        //* @param {string} context.activeNode - path to activeNode.
        //* @param {string} [context.activeSelection=[]] - paths to selected nodes.
        //* @param {string} context.commit - commit hash to start the plugin from.
        //* @param {string} context.branchName - branch which to save to.
        //* @param {object} context.pluginConfig - specific configuration for the plugin.
        client.runServerPlugin(name, context, function (err, pluginResult) {
            expect(err).to.equal(null);
            expect(pluginResult).not.to.equal(null);
            expect(pluginResult.success).to.equal(true, 'PluginGenerator did not succeed on server!');
            done();
        });
    });
});