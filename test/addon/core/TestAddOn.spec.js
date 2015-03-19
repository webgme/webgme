/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../_globals');

describe('TestAddOn', function () {
    'use strict';

    var expect = testFixture.expect,
        WebGME = testFixture.WebGME,
        Core = testFixture.WebGME.core,
        addOnName = 'TestAddOn',
        TestAddOn = testFixture.requirejs('addon/' + addOnName + '/' + addOnName + '/' + addOnName);

    var getConnectedStorage = function (webGMESessionId, gmeConfig, callback) {
        var connStorage = new WebGME.clientStorage({
            globConf: gmeConfig,
            type: 'node',
            host: (gmeConfig.server.https.enable === true ? 'https' : 'http') + '://127.0.0.1',
            webGMESessionId: webGMESessionId
        });
        connStorage.openDatabase(function (err) {
            callback(err, connStorage);
        });
    };

    var getConnectedProject = function (storage, projectName, callback) {
        storage.getProjectNames(function (err, names) {
            if (err) {
                return callback(err);
            }
            console.log('names', names);
            if (names.indexOf(projectName) === -1) {
                return callback(new Error('nonexsistent project'));
            }
            storage.openProject(projectName, callback);
        });
    };

    it('should start', function (done) {
        var gmeConfig = testFixture.getGmeConfig(),
            server,
            importParam = {
                filePath: './test/asset/sm_basic.json',
                projectName: 'testAddOn',
                branchName: 'master',
                gmeConfig: gmeConfig,
                storage: null
            };
        server = WebGME.standaloneServer(gmeConfig);
        server.start(function () {
            getConnectedStorage('sessionId', gmeConfig, function (err, storage) {
                console.log('getConnectedStorage');
                expect(err).equal(null);
                importParam.storage = storage;
                testFixture.importProject(importParam, function (err, result) {
                    expect(err).equal(null);
                    console.log('importProject');
                    getConnectedProject(storage, importParam.projectName, function (err, project) {
                        console.log('getConnectedProject');
                        var startParam,
                            addon;
                        addon = new TestAddOn(Core, storage, gmeConfig);
                        expect(err).equal(null);
                        startParam = {
                            projectName: importParam.projectName,
                            branchName: importParam.branchName,
                            project: project
                        };
                        addon.start(startParam, function (err) {
                            expect(err).equal(null);
                            server.stop(done);
                        });
                    });

                });

            });
        });
    });
});
