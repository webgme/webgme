/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../../../_globals.js');

describe('BlobFSBackend.spec', function () {
    'use strict';

    var expect = testFixture.expect,
        fs = testFixture.fs,
        gmeConfig = testFixture.getGmeConfig(),
        logger = testFixture.logger.fork('BlobFSBackend.spec'),
        StringStreamReader = require('../../../../src/server/util/StringStreamReader'),
        BlobFSBackend = require('../../../../src/server/middleware/blob/BlobFSBackend');

    it('should instantiate the BlobFSBackend', function () {
        new BlobFSBackend(gmeConfig, logger);
    });

    it('should putFile when passing in string', function (done) {
        var bb = new BlobFSBackend(gmeConfig, logger);

        bb.putFile('fromString.txt', 'txt content', function (err, metadataHash) {
            expect(err).to.equal(null);
            expect(typeof metadataHash).to.equal('string');
            done();
        });
    });

    it('should putFile when passing in StringStreamReader', function (done) {
        var bb = new BlobFSBackend(gmeConfig, logger),
            readStream = new StringStreamReader('someContent');

        bb.putFile('fromStream.txt', readStream, function (err, metadataHash) {
            expect(err).to.equal(null);
            expect(typeof metadataHash).to.equal('string');
            done();
        });
    });

    it('should return abort error when putFile when passing in fs.createReadStream and destroy', function (done) {
        var bb = new BlobFSBackend(gmeConfig, logger),
            readStream = new fs.createReadStream('./test/server/middleware/blob/BlobFsBackend/content.txt');

        readStream.on('data', function () {
            readStream.destroy();
        });

        bb.putFile('fromStream.txt', readStream, function (err) {
            expect(err.message).to.equal('ReadStream was closed while writing file!');
            done();
        });
    });
});
