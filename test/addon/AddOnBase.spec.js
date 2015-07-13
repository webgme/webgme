/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../_globals');

describe('AddOnBase', function () {
    'use strict';

    var expect = testFixture.expect,
        AddOnBase = testFixture.requirejs('addon/AddOnBase');

    it('should throw not implemented errors for getName', function () {
        var addOnBase = new AddOnBase(); // do not pass any parameters.
        expect(addOnBase.getName).to.throw(Error, /implement this function in the derived class/);
    });

    it('should throw not implemented errors for update', function (done) {
        var addOnBase = new AddOnBase(); // do not pass any parameters.
        addOnBase.update(null, function (err) {
            expect(err).to.match(/must be overwritten/);
            done();
        });
    });

    it('should throw not implemented errors for query', function (done) {
        var addOnBase = new AddOnBase(); // do not pass any parameters.
        addOnBase.query(null, function (err) {
            expect(err).to.match(/must be overwritten/);
            done();
        });
    });
});
