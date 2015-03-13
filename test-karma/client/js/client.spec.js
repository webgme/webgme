/* jshint browser: true, mocha: true */
/**
 * @author lattmann / https://github.com/lattmann
 */

var WebGMEGlobal = {};

describe('Browser Client', function () {
    'use strict';
    var Client,
        gmeConfig;

    before(function (done) {
        this.timeout(10000);
        requirejs(['js/client', 'text!gmeConfig.json'], function (Client_, gmeConfigJSON) {
            Client = Client_;
            gmeConfig = JSON.parse(gmeConfigJSON);
            done();
        });
    });

    it('should have public API functions', function () {
        //console.log(gmeConfig);
        var client = new Client(gmeConfig);
        expect(client.hasOwnProperty('events')).to.equal(true);
    });


    it('should list projects', function (done) {
        //console.log(gmeConfig);
        var client = new Client(gmeConfig);

        client.connectToDatabaseAsync({}, function (err) {
            expect(err).to.equal(null);

            client.getFullProjectListAsync(function (err, projects) {
                var key;
                expect(err).to.equal(null);
                for (key in projects) {
                    console.log(key);
                    expect(projects[key].hasOwnProperty('read')).to.equal(true);
                    expect(projects[key].hasOwnProperty('write')).to.equal(true);
                    expect(projects[key].hasOwnProperty('delete')).to.equal(true);
                }
                done();
            });
        });
    });
});