/* jshint browser: true */
/**
 * @author lattmann / https://github.com/lattmann
 */

//var testFixture = require('./fixture');
// TODO: TEMPORARY FILE will be removed!
describe('First browser test', function () {
    'use strict';

    it('should pass', function () {
        expect(1).to.equal(1);
    });

    it.skip('should fail', function () {
        expect(1).to.equal(0);
    });
});