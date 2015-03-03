/**
 * @author ksmyth / https://github.com/ksmyth
 */


define(['logManager',
        'mime',
        'blob/BlobMetadata'], function(logManager, mime, BlobMetadata) {

    function createExpressBlob(__app, blobBackend, ensureAuthenticated, __logger) {
        __app.get('/rest/blob/metadata', ensureAuthenticated, function (req, res) {
            blobBackend.listAllMetadata(req.query.all, function (err, metadata) {
                if (err) {
                    // FIXME: make sure we set the status code correctly like 404 etc.
                    res.status(500);
                    res.send(err);
                } else {
                    res.status(200);
                    res.end(JSON.stringify(metadata, null, 4));

                }
            });
        });

        __app.get('/rest/blob/metadata/:metadataHash', ensureAuthenticated, function (req, res) {
            blobBackend.getMetadata(req.params.metadataHash, function (err, hash, metadata) {
                if (err) {
                    // FIXME: make sure we set the status code correctly like 404 etc.
                    res.status(500);
                    res.send(err);
                } else {
                    res.status(200);
                    res.setHeader('Content-type', 'application/json');
                    res.end(JSON.stringify(metadata, null, 4));

                }
            });
        });

        __app.post('/rest/blob/createFile/:filename', ensureAuthenticated, function (req, res) {
            __logger.info('file creation request: user[' + req.session.udmId + '], filename[' + req.params.filename + ']');
            var filename = 'not_defined.txt';

            if (req.params.filename !== null && req.params.filename !== '') {
                filename = req.params.filename
            }

            // regular file
            // TODO: add tags and isPublic flag
            blobBackend.putFile(filename, req, function (err, hash) {
                __logger.info('file creation request finished: user[' + req.session.udmId + '], filename[' + req.params.filename + '], error[' + err + '], hash:[' + hash + ']');
                if (err) {
                    // FIXME: make sure we set the status code correctly like 404 etc.
                    res.status(500);
                    res.send(err);
                } else {
                    // FIXME: it should be enough to send back the hash only
                    blobBackend.getMetadata(hash, function (err, metadataHash, metadata) {
                        if (err) {
                            // FIXME: make sure we set the status code correctly like 404 etc.
                            res.status(500);
                            res.send(err);
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

        __app.post('/rest/blob/createMetadata', ensureAuthenticated, function (req, res) {

            var data = '';

            req.addListener('data', function (chunk) {
                data += chunk;
            });

            req.addListener('end', function () {
                try {
                    var metadata = new BlobMetadata(JSON.parse(data));
                } catch (e) {
                    res.status(500);
                    res.send(e);
                }
                blobBackend.putMetadata(metadata, function (err, hash) {
                    if (err) {
                        // FIXME: make sure we set the status code correctly like 404 etc.
                        res.status(500);
                        res.send(err);
                    } else {
                        // FIXME: it should be enough to send back the hash only
                        blobBackend.getMetadata(hash, function (err, metadataHash, metadata) {
                            if (err) {
                                // FIXME: make sure we set the status code correctly like 404 etc.
                                res.status(500);
                                res.send(err);
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
                    // FIXME: make sure we set the status code correctly like 404 etc.
                    res.status(500);
                    res.send(err);
                } else {
                    var filename = metadata.name;

                    if (subpartPath) {
                        filename = subpartPath.substring(subpartPath.lastIndexOf('/') + 1);
                    }

                    var mimeType = mime.lookup(filename);

                    if (download || mimeType === 'application/octet-stream' || mimeType === 'application/zip') {
                        res.setHeader('Content-disposition', 'attachment; filename=' + filename);
                    }
                    res.setHeader('Content-type', mimeType);


                    // TODO: we need to get the content and save as a local file.
                    // if we just proxy the stream we cannot set errors correctly.

                    blobBackend.getFile(metadataHash, subpartPath, res, function (err, hash) {
                        if (err) {
                            // give more precise description about the error type and message. Resource if not available etc.
                            res.send(500);
                        } else {
                            //res.status(200);
                        }
                    });
                }
            });
        };

        __app.get(/^\/rest\/blob\/download\/([0-9a-f]{40,40})(\/(.*))?$/, ensureAuthenticated, function (req, res) {
            var metadataHash = req.params[0];
            var subpartPath = req.params[2];

            sendBlobContent(req, res, metadataHash, subpartPath, true);
        });

        __app.get(/^\/rest\/blob\/view\/([0-9a-f]{40,40})(\/(.*))?$/, ensureAuthenticated, function (req, res) {
            var metadataHash = req.params[0];
            var subpartPath = req.params[2];

            sendBlobContent(req, res, metadataHash, subpartPath, false);
        });

        // end of blob rules
    };
    return {createExpressBlob: createExpressBlob};
});