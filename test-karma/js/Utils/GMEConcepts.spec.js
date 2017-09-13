/*globals requirejs, expect*/
/*jshint browser: true, mocha: true*/

/**
 * TODO: This mainly to illustrate that the context is setup correctly.
 * @author pmeijer / https://github.com/pmeijer
 */

describe('GMEConcepts', function () {
    'use strict';
    var projectName = 'GMEConcepts',
        GMEConcepts,
        client,
        gmeConfig,
        projectId;

    before(function (done) {
        this.timeout(15000);
        requirejs([
            'client/client',
            'js/Utils/GMEConcepts',
            'text!gmeConfig.json'
        ], function (Client, GMEConcepts_, gmeConfigJSON) {
            gmeConfig = JSON.parse(gmeConfigJSON);
            GMEConcepts = GMEConcepts_;
            client = new Client(gmeConfig);
            projectId = gmeConfig.authentication.guestAccount + client.CONSTANTS.STORAGE.PROJECT_ID_SEP +
                projectName;

            GMEConcepts.initialize(client);

            client.connectToDatabase(function (err) {
                if (err) {
                    return done(err);
                }

                client.selectProject(projectId, null, function (err) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
            });
        });
    });

    after(function (done) {
        client.disconnectFromDatabase(done);
    });

    it('client should return requested state', function () {
        expect(client.getActiveProjectId()).to.equal(projectId);
        expect(client.getActiveBranchName()).to.equal('master');
    });

    it('isConnection should return false for root node', function () {
        expect(GMEConcepts.isConnection('')).to.equal(false);
    });

    it('isValidReplaceableTarget should return false for root node and fco', function () {
        expect(GMEConcepts.isValidReplaceableTarget('', '/1')).to.equal(false);
    });
});