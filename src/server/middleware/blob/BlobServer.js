/*globals requireJS*/
/*jshint node:true*/

/**
 * @author ksmyth / https://github.com/ksmyth
 */

'use strict';

var mime = require('mime'),
    BlobMetadata = requireJS('blob/BlobMetadata'),
    ASSERT = requireJS('common/util/assert'),

    contentDisposition = require('content-disposition'),
    BlobFSBackend = require('./BlobFSBackend');
    //BlobFSBackend = require('./BlobS3Backend');

function createExpressBlob(options) {
    var express = require('express');
    var __app = express.Router();

    var blobBackend,
        ensureAuthenticated,
        getUserId,
        logger;
    ASSERT(typeof options.gmeConfig !== 'undefined', 'gmeConfig required');
    ASSERT(options.gmeConfig.blob.type === 'FS', 'Only FS blob backend is currently supported.');
    ASSERT(typeof options.ensureAuthenticated === 'function', 'ensureAuthenticated must be given.');
    ASSERT(typeof options.logger !== 'undefined', 'logger must be given.');

    ensureAuthenticated = options.ensureAuthenticated;
    getUserId = options.getUserId;
    logger = options.logger.fork('middleware:BlobServer');
    blobBackend = new BlobFSBackend(options.gmeConfig, logger);

    /* debugging:
    __app.use(function (req, res, next) {
        var info = req.method + ' ' + req.url;
        logger.debug(info);
        var end = res.end;
        res.end = function (chunk, encoding) {
            res.end = end;
            res.end(chunk, encoding);
            logger.debug(info + ' => ' + res.statusCode);
        };
        next();
    }); */

    __app.get('/metadata', ensureAuthenticated, function (req, res) {
        blobBackend.listAllMetadata(req.query.all, function (err, metadata) {
            if (err) {
                // FIXME: make sure we set the status code correctly like 404 etc.
                res.status(err.statusCode || 500);
                res.send(err.message || err);
            } else {
                res.status(200);
                res.setHeader('Content-type', 'application/json');
                res.end(JSON.stringify(metadata, null, 4));

            }
        });
    });

    __app.get('/metadata/:metadataHash', ensureAuthenticated, function (req, res) {
        blobBackend.getMetadata(req.params.metadataHash, function (err, hash, metadata) {
            if (err) {
                res.status(err.statusCode || 500);
                res.send(err.message || err);
            } else {
                res.status(200);
                res.setHeader('Content-type', 'application/json');
                res.end(JSON.stringify(metadata, null, 4));

            }
        });
    });

    __app.post('/createFile/:filename', ensureAuthenticated, function (req, res) {
        logger.debug('file creation request: user[' + getUserId(req) + '], filename[' + req.params.filename + ']');
        var filename = 'not_defined.txt';

        if (req.params.filename !== null && req.params.filename !== '') {
            filename = req.params.filename;
        }

        // regular file
        // TODO: add tags and isPublic flag
        blobBackend.putFile(filename, req, function (err, hash) {
            logger.debug('file creation request finished: user[' + getUserId(req) + '], filename[' +
                req.params.filename + '], error[' + err + '], hash:[' + hash + ']');
            if (err) {
                // FIXME: make sure we set the status code correctly like 404 etc.
                res.status(err.statusCode || 500);
                res.send(err.message || err);
            } else {
                // FIXME: it should be enough to send back the hash only
                blobBackend.getMetadata(hash, function (err, metadataHash, metadata) {
                    if (err) {
                        // FIXME: make sure we set the status code correctly like 404 etc.
                        res.status(err.statusCode || 500);
                        res.send(err.message || err);
                    } else {
                        res.status(200);
                        res.setHeader('Content-type', 'application/json');
                        var info = {};
                        info[hash] = metadata;
                        res.end(JSON.stringify(info, null, 4));
                    }
                });
            }
        });

    });

    __app.post('/createMetadata', ensureAuthenticated, function (req, res) {

        var data = '';

        req.addListener('data', function (chunk) {
            data += chunk;
        });

        req.addListener('end', function () {
            var metadata;
            try {
                metadata = new BlobMetadata(JSON.parse(data));
            } catch (e) {
                res.status(500);
                res.send(e);
                return;
            }
            blobBackend.putMetadata(metadata, function (err, hash) {
                if (err) {
                    // FIXME: make sure we set the status code correctly like 404 etc.
                    res.status(err.statusCode || 500);
                    res.send(err.message || err);
                } else {
                    // FIXME: it should be enough to send back the hash only
                    blobBackend.getMetadata(hash, function (err, metadataHash, metadata) {
                        if (err) {
                            // FIXME: make sure we set the status code correctly like 404 etc.
                            res.status(err.statusCode || 500);
                            res.send(err.message || err);
                        } else {
                            res.status(200);
                            res.setHeader('Content-type', 'application/json');
                            var info = {};
                            info[hash] = metadata;
                            res.end(JSON.stringify(info, null, 4));
                        }
                    });
                }
            });
        });
    });

    var sendBlobContent = function (req, res, metadataHash, subpartPath, download) {

        blobBackend.getMetadata(metadataHash, function (err, hash, metadata) {
            if (err) {
                res.status(err.statusCode || 500);
                res.send(err.message || err);
            } else {
                var filename = metadata.name;

                if (subpartPath) {
                    filename = subpartPath.substring(subpartPath.lastIndexOf('/') + 1);
                }

                var mimeType = mime.lookup(filename);

                if (download || mimeType === 'application/octet-stream' || mimeType === 'application/zip') {
                    res.setHeader('Content-Disposition', contentDisposition(filename, {type: 'attachment'}));
                }
                res.setHeader('Content-type', mimeType);


                // TODO: we need to get the content and save as a local file.
                // if we just proxy the stream we cannot set errors correctly.

                blobBackend.getFile(metadataHash, subpartPath, res, function (err /*, hash*/) {
                    if (err) {
                        // chrome gives error code: ERR_INVALID_RESPONSE if we don't do this:
                        res.removeHeader('Content-disposition');
                        res.removeHeader('Content-type');
                        //give more precise description about the error type and message. Resource if not available etc.
                        res.sendStatus(500);
                    } else {
                        //res.status(200);
                    }
                });
            }
        });
    };

    __app.get(/^\/download\/([0-9a-f]{40,40})(\/(.*))?$/, ensureAuthenticated, function (req, res) {
        var metadataHash = req.params[0];
        var subpartPath = req.params[2];

        sendBlobContent(req, res, metadataHash, subpartPath, true);
    });

    __app.get(/^\/view\/([0-9a-f]{40,40})(\/(.*))?$/, ensureAuthenticated, function (req, res) {
        var metadataHash = req.params[0];
        var subpartPath = req.params[2];

        sendBlobContent(req, res, metadataHash, subpartPath, false);
    });

    // end of blob rules

    return __app;
}

module.exports.createExpressBlob = createExpressBlob;
