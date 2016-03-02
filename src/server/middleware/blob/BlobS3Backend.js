/*globals requireJS*/
/*jshint node:true*/

/**
 * @author lattmann / https://github.com/lattmann
 */

'use strict';

var fs = require('fs'),
    crypto = require('crypto'),
    AWS = require('aws-sdk'),

    GUID = requireJS('common/util/guid'),

    StringStreamReader = require('../../util/StringStreamReader'),
    BlobBackendBase = require('./BlobBackendBase');

var BlobS3Backend = function (gmeConfig, logger) {
    BlobBackendBase.call(this, logger);
    this.awsConfig = {
        accessKeyId: '123', // TODO get this from an environment variable
        secretAccessKey: 'abc', // TODO get this from an environment variable
        region: '',
        endpoint: 'localhost:4567', // TODO get this from a configuration
        sslEnabled: false
    };
    // NOTE: development mode
    // install https://github.com/jubos/fake-s3
    // make sure you apply my patch: https://github.com/jubos/fake-s3/issues/53
    // build and install it
    // Add to your /etc/hosts
    // 127.0.0.1 wg-content.localhost
    // 127.0.0.1 wg-metadata.localhost
    // 127.0.0.1 wg-temp.localhost

    AWS.config.update(this.awsConfig);
    this.s3 = new AWS.S3();

    // also tried creating an `EndPoint`:
    this.s3.endpoint = new AWS.Endpoint(this.awsConfig.endpoint);
};

// Inherits from BlobManagerBase
BlobS3Backend.prototype = Object.create(BlobBackendBase.prototype);

// Override the constructor with this object's constructor
BlobS3Backend.prototype.constructor = BlobS3Backend;


BlobS3Backend.prototype.putObject = function (readStream, bucket, callback) {
    // TODO generate a GUID or something for the temporary filename to allow parallel functioning
    var self = this,
        tempName = GUID() + '.tbf',// TODO: create this in the system temp folder
        shasum = crypto.createHash(this.shaMethod),
        size = 0;

    // body must be a string or a readable file stream.
    var ready = function (body) {
        self.s3.putObject({Bucket: self.tempBucket, Key: tempName, Body: body}, function (err, data) {
            // TODO: error handling here
            if (err) {
                callback(err);
                return;
            }

            var hash = shasum.digest('hex');

            self.s3.copyObject({
                CopySource: self.tempBucket + '/' + tempName,
                Bucket: bucket,
                Key: hash
            }, function (err, data) {
                if (err) {
                    callback(err);
                    return;
                }

                self.s3.deleteObject({Bucket: self.tempBucket, Key: tempName}, function (err, data) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    callback(null, hash, size);
                });

            });
        });
    };

    if (readStream instanceof StringStreamReader) {
        readStream = readStream.toString();
        shasum.update(readStream);
        size += readStream.length;
        ready(readStream);
    } else if (readStream instanceof fs.ReadStream) {
        readStream.on('data', function (chunk) {
            shasum.update(chunk);
            size += chunk.length; //TODO does it really have a length field always???
        });
        ready(readStream);
    } else {
        var contentTemp = GUID() + '.tmp';
        var writeStream2 = fs.createWriteStream(contentTemp);

        writeStream2.on('finish', function () {
            var readStream2 = fs.createReadStream(contentTemp);

            readStream2.on('data', function (chunk) {
                shasum.update(chunk);
                size += chunk.length; //TODO does it really have a length field always???
            });

            readStream2.on('close', function () {
                fs.unlink(contentTemp);
            });

            ready(readStream2);
        });

        readStream.pipe(writeStream2);
    }
};

BlobS3Backend.prototype.getObject = function (hash, writeStream, bucket, callback) {
    var self = this,
        obj = {
            Bucket: bucket,
            Key: hash
        };

    self.s3.getObject(obj).createReadStream().pipe(writeStream);

    writeStream.on('finish', function () {
        // FIXME: any error handling here?
        // FIXME: get the last modified date for the object
        self.s3.headObject(obj, function (err, data) {
            if (err) {
                callback(err);
                return;
            }

            callback(null, {lastModified: (new Date(data.LastModified)).toISOString()});
        });

    });
};

BlobS3Backend.prototype.listObjects = function (bucket, callback) {
    var self = this;

    // FIXME: this returns only with the first 1000 objects
    self.s3.listObjects({Bucket: bucket}, function (err, data) {
        if (err) {
            callback(err);
            return;
        }

        var hashes = [];

        for (var i = 0; i < data.Contents.length; i += 1) {
            hashes.push(data.Contents[i].Key);
        }

        callback(null, hashes);
    });
};

module.exports = BlobS3Backend;