/*jshint node:true, mocha:true, expr:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../_globals');

describe('Plugin Result', function () {
    'use strict';

    var should = testFixture.should,
        PluginResult = testFixture.requirejs('plugin/PluginResult'),
        PluginMessage = testFixture.requirejs('plugin/PluginMessage');

    it('should instantiate PluginResult and have defined properties', function () {
        var pluginResult = new PluginResult();

        should.exist(pluginResult);
        pluginResult.should.have.property('getSuccess');
        pluginResult.should.have.property('setSuccess');
        pluginResult.should.have.property('getMessages');
        pluginResult.should.have.property('addMessage');
        pluginResult.should.have.property('getArtifacts');
        pluginResult.should.have.property('addArtifact');
        pluginResult.should.have.property('getPluginName');
        pluginResult.should.have.property('setPluginName');
        pluginResult.should.have.property('getStartTime');
        pluginResult.should.have.property('setStartTime');
        pluginResult.should.have.property('getFinishTime');
        pluginResult.should.have.property('setFinishTime');
        pluginResult.should.have.property('getError');
        pluginResult.should.have.property('setError');
        pluginResult.should.have.property('serialize');

        // default values
        pluginResult.success.should.equal(false);
        pluginResult.messages.should.deep.equal([]);
        pluginResult.artifacts.should.deep.equal([]);
        pluginResult.pluginName.should.equal('PluginName N/A');
        should.not.exist(pluginResult.startTime);
        should.not.exist(pluginResult.finishTime);
        should.not.exist(pluginResult.error);
    });

    it('should get and set success', function () {
        var pluginResult = new PluginResult();

        pluginResult.setSuccess(true);
        pluginResult.getSuccess().should.be.true;
        pluginResult.setSuccess(false);
        pluginResult.getSuccess().should.be.false;
    });

    it('should add message and get messages', function () {
        var pluginResult = new PluginResult(),
            message = new PluginMessage();

        pluginResult.getMessages().length.should.equal(0);
        pluginResult.addMessage(message);
        pluginResult.getMessages().length.should.equal(1);
        pluginResult.getMessages()[0].should.equal(message);
        pluginResult.addMessage(new PluginMessage());
        pluginResult.getMessages().length.should.equal(2);
    });

    it('should add artifact hash and get artifacts', function () {
        var pluginResult = new PluginResult(),
            artifactHash = 'abcdefg123';

        pluginResult.getArtifacts().length.should.equal(0);
        pluginResult.addArtifact(artifactHash);
        pluginResult.getArtifacts().length.should.equal(1);
        pluginResult.getArtifacts()[0].should.equal(artifactHash);
        pluginResult.addArtifact(artifactHash);
        pluginResult.getArtifacts().length.should.equal(2);
    });

    it('should get set plugin name', function () {
        var pluginResult = new PluginResult(),
            pluginName = 'test plugin 42';

        pluginResult.setPluginName(pluginName);
        pluginResult.getPluginName().should.equal(pluginName);
    });

    it('should get set start time', function () {
        var pluginResult = new PluginResult(),
            time = (new Date()).toISOString();

        pluginResult.setStartTime(time);
        pluginResult.getStartTime().should.equal(time);
    });

    it('should get set finish time', function () {
        var pluginResult = new PluginResult(),
            time = (new Date()).toISOString();

        pluginResult.setFinishTime(time);
        pluginResult.getFinishTime().should.equal(time);
    });

    it('should get set error', function () {
        var pluginResult = new PluginResult(),
            error = 'some error message comes here';

        pluginResult.setError(error);
        pluginResult.getError().should.equal(error);
    });

    it('should serialize', function () {
        var pluginResult = new PluginResult(),
            message = new PluginMessage();


        pluginResult.setSuccess(true);
        pluginResult.addMessage(message);
        pluginResult.addMessage(new PluginMessage());

        pluginResult.addArtifact('hash1');
        pluginResult.addArtifact('hash2');
        pluginResult.setPluginName('test plugin 11');
        pluginResult.setProjectId('guest+Test');
        pluginResult.setStartTime('2015-03-09T19:32:10.202Z');
        pluginResult.setFinishTime('2015-03-09T19:32:10.202Z');
        pluginResult.setError(null);

        pluginResult.serialize().should.deep.equal({
            artifacts: [
                'hash1',
                'hash2'
            ],
            commits: [],
            error: null,
            finishTime: '2015-03-09T19:32:10.202Z',
            messages: [
                {
                    activeNode: {
                        id: '',
                        name: ''
                    },
                    commitHash: '',
                    message: '',
                    severity: 'info'
                },
                {
                    activeNode: {
                        id: '',
                        name: ''
                    },
                    commitHash: '',
                    message: '',
                    severity: 'info'
                }
            ],
            pluginName: 'test plugin 11',
            projectId: 'guest+Test',
            startTime: '2015-03-09T19:32:10.202Z',
            success: true
        });
    });

    it('should serialize and deserialize', function () {
        var pluginResult = null,
            pluginResultTest = {
                artifacts: [
                    'hash1',
                    'hash2'
                ],
                commits: [{
                    commitHash: 'hash123',
                    status: 'FORKED',
                    branchName: 'branch12'
                }],
                error: null,
                finishTime: '2015-03-09T19:32:10.202Z',
                messages: [
                    {
                        activeNode: {
                            id: '',
                            name: ''
                        },
                        commitHash: '',
                        message: '',
                        severity: 'info'
                    }
                ],
                pluginName: 'test plugin 11',
                projectId: 'guest+Test',
                startTime: '2015-03-09T19:32:10.202Z',
                success: true
            };

        pluginResultTest.messages.push(new PluginMessage());

        pluginResult = new PluginResult(pluginResultTest);
        pluginResult.serialize().should.deep.equal({
            artifacts: [
                'hash1',
                'hash2'
            ],
            commits: [{
                commitHash: 'hash123',
                status: 'FORKED',
                branchName: 'branch12'
            }],
            error: null,
            finishTime: '2015-03-09T19:32:10.202Z',
            messages: [
                {
                    activeNode: {
                        id: '',
                        name: ''
                    },
                    commitHash: '',
                    message: '',
                    severity: 'info'
                },
                {
                    activeNode: {
                        id: '',
                        name: ''
                    },
                    commitHash: '',
                    message: '',
                    severity: 'info'
                }
            ],
            pluginName: 'test plugin 11',
            projectId: 'guest+Test',
            startTime: '2015-03-09T19:32:10.202Z',
            success: true
        });
    });
});