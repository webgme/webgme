/*jshint node:true, mocha:true, expr:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../../_globals.js');

describe('String stream writer', function () {
    'use strict';
    var StringStreamWriter = require('../../../src/server/util/StringStreamWriter'),
        expect = testFixture.expect;

    it('should create an instance and write data', function () {
        var stringStreamWriter = new StringStreamWriter();
        expect(stringStreamWriter).to.not.equal(null);
        stringStreamWriter.write('test string');
    });

    it('should serialize to string', function () {
        var stringStreamWriter = new StringStreamWriter();
        stringStreamWriter.write('test string');
        expect(stringStreamWriter.toString()).to.equal('test string');
    });


    it('should serialize to JSON', function () {
        var stringStreamWriter = new StringStreamWriter();
        stringStreamWriter.write('{"a": 42}');
        expect(stringStreamWriter.toJSON()).to.deep.equal({a: 42});
    });

    it('should getBuffer data', function () {
        var stringStreamWriter = new StringStreamWriter();
        stringStreamWriter.write('test string');
        expect(stringStreamWriter.getBuffer().length).to.equal('test string'.length);
    });
});