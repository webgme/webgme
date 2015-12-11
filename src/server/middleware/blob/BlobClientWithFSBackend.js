/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var BlobFSBackend = require('./BlobFSBackend'),
    BlobRunPluginClient = require('./BlobRunPluginClient');

function BlobClientWithFSBackend(gmeConfig, logger) {
    var blobBackend = new BlobFSBackend(gmeConfig, logger),
        blobClient = new BlobRunPluginClient(blobBackend, logger);

    return blobClient;
}

module.exports = BlobClientWithFSBackend;