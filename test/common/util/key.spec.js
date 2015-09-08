/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */


var testFixture = require('../../_globals.js');

describe('key generator', function () {
    'use strict';
    var keyGenerator = testFixture.requirejs('common/util/key'),
        expect = testFixture.expect,
        KEY_REGEXP = /^[a-f0-9]{40}$/;

    it('should generate SHA1 hash based on object\'s content', function () {
        var obj = {
                z: 42,
                b: 'test string',
                a: [0, 1, 2],
                c: {
                    h: 'sample'
                }
            },
            key = keyGenerator(obj, {storage: {keyType: ''}});

        expect(key).to.match(KEY_REGEXP);
        expect(key).to.equal('b516a33d63e8e5317c296efa31942fe75611040b');

    });

    it('should generate matching SHA1 hash based on object\'s content', function () {
        var obj1 = {
                z: 42,
                b: 'test string',
                a: [0, 1, 2],
                c: {
                    h: 'sample'
                }
            },
            obj2 = {
                a: [0, 1, 2],
                b: 'test string',
                c: {
                    h: 'sample'
                },
                z: 42
            },
            key1 = keyGenerator(obj1, {storage: {keyType: ''}}),
            key2 = keyGenerator(obj2, {storage: {keyType: ''}});

        expect(key1).to.match(KEY_REGEXP);
        expect(key2).to.match(KEY_REGEXP);
        expect(key1).to.equal(key2);
    });

    it('should generate random 160 bits hash', function () {
        var obj = {
                z: 42,
                b: 'test string',
                a: [0, 1, 2],
                c: {
                    h: 'sample'
                }
            },
            key = keyGenerator(obj, {storage: {keyType: 'rand160Bits'}});

        expect(typeof key).to.equal('string');
        expect(key).to.match(KEY_REGEXP);
    });
});