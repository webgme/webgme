/*globals requirejs, expect*/
/*jshint node: true, mocha: true*/
/**
 * @author kecso / https://github.com/kecso
 */
var WebGMEGlobal = {}; //jshint ignore: line

describe.skip('issue 171 server crashes when trying to switch to non-existent branch', function () {
    'use strict';
    var Client,
        gmeConfig,
        projectName = 'issue171';

    before(function (done) {
        this.timeout(10000);
        requirejs(['js/client', 'text!gmeConfig.json'], function (Client_, gmeConfigJSON) {
            Client = Client_;
            gmeConfig = JSON.parse(gmeConfigJSON);
            done();
        });
    });

    after(function (done) {
        var client = new Client(gmeConfig);

        client.connectToDatabase(function (err) {
            expect(err).to.equal(null);

            client.deleteProject(projectName, function (err) {
                expect(err).to.equal(null);

                done();
            });
        });
    });

    it('should send error without opened database connection', function (done) {
        var client = new Client(gmeConfig);

        client.selectBranch('other', null, function (err) {
            expect(err).not.to.equal(null);
            done();
        });
    });

    it('should send error without opened project', function (done) {
        var client = new Client(gmeConfig);
        client.connectToDatabase(function (err) {
            expect(err).to.equal(null);
            client.selectBranch('other', null, function (err) {
                expect(err).not.to.equal(null);
                done();
            });
        });
    });

    it('initially should be only the master branch', function (done) {
        this.timeout(5000);
        var client = new Client(gmeConfig),
            info = {};

        client.connectToDatabase(function (err) {
            expect(err).to.equal(null);

            client.deleteProject(projectName, function (err) {
                expect(err).to.equal(null);

                client.createProject(projectName, info, function (err) {
                    expect(err).to.equal(null);

                    client.selectProject(projectName, null, function (err) {
                        expect(err).to.equal(null);

                        client.getBranches(projectName, function (err, names) {
                            expect(err).to.equal(null);

                            expect(names).to.have.length(1);
                            expect(names[0]).to.include.keys('name');
                            expect(names[0].name).to.equal('master');

                            done();
                        });
                    });
                });
            });
        });
    });

    it('should get some error when selecting non-existent branch', function (done) {
        var client = new Client(gmeConfig),
            options = {},
            info = {};

        client.connectToDatabaseAsync(options, function (err) {
            expect(err).to.equal(null);

            client.deleteProjectAsync(projectName, function (err) {
                expect(err).to.equal(null);

                client.createProjectAsync(projectName, info, function (err) {
                    expect(err).to.equal(null);

                    client.selectProjectAsync(projectName, function (err) {
                        expect(err).to.equal(null);

                        client.selectBranchAsync('other', function (err) {
                            expect(err).not.to.equal(null);

                            done();
                        });
                    });
                });
            });
        });
    });
});