/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../_globals');

describe('AddOnBase', function () {
    'use strict';

    var expect = testFixture.expect,
        gmeConfig = testFixture.getGmeConfig(),
        logger = testFixture.logger.fork('AddOnBaseTest'),
        AddOnBase = testFixture.requirejs('addon/AddOnBase');

    it('should throw not implemented errors for getName', function () {
        var addOnBase = new AddOnBase(logger, gmeConfig);
        expect(addOnBase.getName).to.throw(Error, /implement this function in the derived class/);
    });

    it('should throw not implemented errors for update', function (done) {
        var addOnBase = new AddOnBase(logger, gmeConfig);

        addOnBase.update(null, null, function (err, data) {
            expect(err).to.match(/must be overwritten/);
            done();
        });
    });

    it('should throw not implemented errors for query', function (done) {
        var addOnBase = new AddOnBase(logger, gmeConfig);

        addOnBase.query(null, null, function (err) {
            expect(err).to.match(/must be overwritten/);
            done();
        });
    });
});
