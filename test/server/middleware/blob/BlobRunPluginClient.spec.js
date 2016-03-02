/*jshint node:true, mocha:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

var testFixture = require('../../../_globals.js');

describe('BlobServer', function () {
    'use strict';

    var BlobClient = require('../../../../src/server/middleware/blob/BlobRunPluginClient'),
        BlobFSBackend = require('../../../../src/server/middleware/blob/BlobFSBackend'),
        BlobMetadata = testFixture.requirejs('common/blob/BlobMetadata'),
        gmeConfig = testFixture.getGmeConfig(),
        blobBackend,
        logger = testFixture.logger.fork('BlobServer'),
        expect = testFixture.expect,
        rimraf = testFixture.rimraf;

    beforeEach(function (done) {
        // TODO: delete blob directory

        rimraf(gmeConfig.blob.fsDir, function (err) {
            if (err) {
                done(err);
                return;
            }
            blobBackend = new BlobFSBackend(gmeConfig, logger);
            done();
        });
    });

    it('should have public API functions', function () {
        var bc = new BlobClient(blobBackend, logger.fork('blob'));
        expect(typeof bc.getMetadata === 'function').to.equal(true);
        expect(typeof bc.getObject === 'function').to.equal(true);
        expect(typeof bc.putMetadata === 'function').to.equal(true);
        expect(typeof bc.putFile === 'function').to.equal(true);
    });


    it('should fail to get object with invalid hash', function (done) {
        var bc = new BlobClient(blobBackend, logger.fork('blob'));

        bc.getObject('invalid', function (err /*, res*/) {
            if (err === 'Blob hash is invalid') {
                done();
                return;
            } else if (err) {
                done(new Error('should have failed with a different error than: ' + err));
                return;
            }
            done(new Error('should have failed'));
        });
    });

    it('should create metadata', function (done) {
        var bc = new BlobClient(blobBackend, logger.fork('blob')),
            metadataToAdd = (new BlobMetadata({})).serialize();

        metadataToAdd.name = 'new name.text';
        metadataToAdd.size = 2345;
        metadataToAdd.tags = ['a', 'b', 'c'];
        metadataToAdd.content = null;


        bc.putMetadata(metadataToAdd, function (err, hash) {
            if (err) {
                done(err);
                return;
            }
            bc.getMetadata(hash, function (err, metadata) {
                if (err) {
                    done(err);
                    return;
                }
                // update lastModified field, since it is automatically generated
                metadataToAdd.lastModified = metadata.lastModified;
                expect(metadata).to.deep.equal(metadataToAdd);
                done();
            });
        });
    });

    it('should create file from empty buffer', function (done) {
        var bc = new BlobClient(blobBackend, logger.fork('blob'));

        bc.putFile('test.txt', new Buffer(0), function (err, hash) {
            if (err) {
                done(err);
                return;
            }
            bc.getMetadata(hash, function (err, metadata) {
                if (err) {
                    done(err);
                    return;
                }
                expect(metadata.mime).to.equal('text/plain');
                bc.getObject(hash, function (err, res) {
                    if (err) {
                        done(err);
                        return;
                    }
                    expect(typeof res).to.equal('object');
                    expect(typeof res.prototype).to.equal('undefined');
                    //expect(res[1]).to.equal(2);
                    done();
                });
            });
        });
    });

    it('should create json', function (done) {
        var bc = new BlobClient(blobBackend, logger.fork('blob'));

        bc.putFile('test.json', str2ab('{"1":2}'), function (err, hash) {
            if (err) {
                done(err);
                return;
            }
            bc.getMetadata(hash, function (err, metadata) {
                if (err) {
                    done(err);
                    return;
                }
                expect(metadata.mime).to.equal('application/json');
                bc.getObject(hash, function (err, res) {
                    if (err) {
                        done(err);
                        return;
                    }
                    expect(typeof res).to.equal('object');
                    expect(typeof res.prototype).to.equal('undefined');
                    //expect(res[1]).to.equal(2);
                    done();
                });
            });
        });
    });

    it('should create strange filenames', function (done) {
        var bc = new BlobClient(blobBackend, logger.fork('blob'));

        bc.putFile('te%s#t.json', '{"1":2}', function (err, hash) {
            if (err) {
                done(err);
                return;
            }
            bc.getMetadata(hash, function (err, metadata) {
                if (err) {
                    done(err);
                    return;
                }
                expect(metadata.mime).to.equal('application/json');
                bc.getObject(hash, function (err, res) {
                    if (err) {
                        done(err);
                        return;
                    }
                    expect(typeof res).to.equal('object');
                    expect(typeof res.prototype).to.equal('undefined');
                    //expect(res[1]).to.equal(2);
                    done();
                });
            });
        });
    });

    it('should putFile unicode', function (done) {
        var bc = new BlobClient(blobBackend, logger.fork('blob')),
            input = '1111\nmu \u03BC\n1111\n\\U+10400 DESERET CAPITAL LETTER LONG I \uD801\uDC00';

        bc.putFile('1111\u03BC222\uD801\uDC00.bin', input, function (err, hash) {
            if (err) {
                done(err);
                return;
            }
            bc.getMetadata(hash, function (err, metadata) {
                if (err) {
                    done(err);
                    return;
                }
                expect(metadata.mime).to.equal('application/octet-stream');
                bc.getObject(hash, function (err, res) {
                    if (err) {
                        done(err);
                        return;
                    }
                    expect(typeof res).to.equal('object');
                    expect(typeof res.prototype).to.equal('undefined');
                    expect(res.toString('utf8')).to.equal(input);
                    //expect(res[1]).to.equal(2);
                    done();
                });
            });
        });
    });


    // FIXME: DUPLICATE CODE FROM BloBClient.spec.js
    function str2ab(str) {
        var buf = new ArrayBuffer(str.length),
            bufView = new Uint8Array(buf),
            i, strLen;
        for (i = 0, strLen = str.length; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }

        return typeof global === 'undefined' ? buf : ab2buffer(buf);
    }

    function ab2buffer(ab) {
        var buffer = new Buffer(ab.byteLength);
        var view = new Uint8Array(ab);
        for (var i = 0; i < buffer.length; ++i) {
            buffer[i] = view[i];
        }
        return buffer;
    }
});