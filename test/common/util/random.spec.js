/*jshint node:true, mocha:true*/
/**
 * @author kecso / https://github.com/kecso
 */
var testFixture = require('../../_globals.js');

describe('random generation', function () {
    'use strict';
    var random = testFixture.requirejs('common/util/random'),
        REGEXP = testFixture.requirejs('common/regexp'),
        expect = testFixture.expect;

    it('should generate proper and different GUIDs', function () {
        var guids = [],
            guid,
            number = 1000,
            i;

        for (i = 0; i < number; i += 1) {
            guid = random.generateGuid();
            expect(REGEXP.GUID.test(guid)).to.equal(true);
            expect(guids.indexOf(guid)).to.equal(-1);
            guids.push(guid);
        }
    });

    it('should be able to check any string for relid validity', function () {
        expect(random.isValidRelid('1')).to.equal(true);
        expect(random.isValidRelid('a')).to.equal(true);
        expect(random.isValidRelid('D')).to.equal(true);
        expect(random.isValidRelid('12345678901234567890')).to.equal(true);
        expect(random.isValidRelid('1aA1aA1aA1aA1aA1aA')).to.equal(true);
        expect(random.isValidRelid('-123')).to.equal(true);
        expect(random.isValidRelid('twoOrMore')).to.equal(true);
        expect(random.isValidRelid('attribute')).to.equal(true);
        expect(random.isValidRelid('registry')).to.equal(true);
        expect(random.isValidRelid('atrStillValid')).to.equal(true);
        expect(random.isValidRelid('overMore')).to.equal(true);

        expect(random.isValidRelid('')).to.equal(false);
        expect(random.isValidRelid('-')).to.equal(false);
        expect(random.isValidRelid('--')).to.equal(false);
        expect(random.isValidRelid('onlyFirst-')).to.equal(false);
        expect(random.isValidRelid('_noUnderScore')).to.equal(false);
        expect(random.isValidRelid('_')).to.equal(false);
        expect(random.isValidRelid('atr')).to.equal(false);
        expect(random.isValidRelid('reg')).to.equal(false);
        expect(random.isValidRelid('ovr')).to.equal(false);
        expect(random.isValidRelid('no spaces')).to.equal(false);
        expect(random.isValidRelid('$')).to.equal(false);
        expect(random.isValidRelid('@')).to.equal(false);
        expect(random.isValidRelid('%')).to.equal(false);
        expect(random.isValidRelid('^')).to.equal(false);
        expect(random.isValidRelid('&')).to.equal(false);
        expect(random.isValidRelid('*')).to.equal(false);
        expect(random.isValidRelid('(')).to.equal(false);
        expect(random.isValidRelid(')')).to.equal(false);
    });

    it('should generate valid and minimal length relids', function () {
        var data = {},
            i,
            relids = [],
            relid;
        for (i = 0; i < 5; i += 1) {
            relid = random.generateRelid(data);
            expect(relids.indexOf(relid)).to.equal(-1);
            expect(relid).to.have.length.below(6);
            relids.push(relid);
            data[relid] = {};
        }
    });

    it('should generate minimum possible length relids', function () {
        var pool = '0123456789qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM',
            data = {},
            i,
            relids = [],
            relid;

        //fill data
        for (i = 0; i < pool.length; i += 1) {
            relids.push(pool.charAt(i));
            data[pool.charAt(i)] = {};
        }

        for (i = 0; i < 100; i += 1) {
            expect(random.generateRelid(data)).to.have.length(2);
        }
    });

    it('should generate huge number of relids for the same object without any issues', function () {
        var data = {},
            i,
            number = 5000,
            relids = [],
            relid;

        for (i = 0; i < number; i += 1) {
            relid = random.generateRelid(data);
            expect(relids.indexOf(relid)).to.equal(-1);
            relids.push(relid);
            data[relid] = {};
        }
    });

    //it('should convert string relids to numbers',function(){
    //    expect(random.)
    //});
});