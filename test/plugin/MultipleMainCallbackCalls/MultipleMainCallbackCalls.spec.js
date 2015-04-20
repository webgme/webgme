/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */


var testFixture = require('../../_globals');

describe('MultipleMainCallbackCalls', function () {
    'use strict';

    var runPlugin = require('../../../src/server/runplugin'),
        storage,
        gmeConfig,
        expect = testFixture.expect;

    before(function (done) {
        var importParam = {
            filePath: './test/asset/sm_basic.json',
            projectName: 'plugin_mmcc',
            branchName: 'master'
        };
        gmeConfig = testFixture.getGmeConfig();
        gmeConfig.plugin.basePaths.push('./test/plugin');
        testFixture.WebGME.addToRequireJsPaths(gmeConfig);
        storage = new testFixture.Storage({globConf: gmeConfig});
        importParam.storage = storage;
        importParam.gmeConfig = gmeConfig;
        testFixture.importProject(importParam, function (err, result) {
            expect(err).to.equal(null);
            done();
        });
    });

    it('should run MultipleMainCallbackCalls and return error at second cb', function (done) {
        var managerConfig = {
                pluginName: 'MultipleMainCallbackCalls',
                projectName: 'plugin_mmcc',
                branch: 'master'
            },
            pluginConfig = {},
            cnt = 0;

        runPlugin.main(storage, gmeConfig, managerConfig, pluginConfig, function (err, result) {
            if (cnt === 0) {
                expect(err).to.equal(null);
                expect(result.success).to.equal(true);
            } else if (cnt === 1) {
                expect(err).to.equal('The main callback is being called more than once!');
                expect(result.success).to.equal(false);
            } else {
                done(new Error('Main callback should only be called at most twice from PluginManagerBase'));
                return;
            }
            cnt += 1;
            if (cnt === 2) {
                done();
            }
        });
    });
});