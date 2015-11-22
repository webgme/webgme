/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var BlobFSBackend = require('./BlobFSBackend'),
    BlobRunPluginClient = require('./BlobRunPluginClient');

function BlobClientWithFSBackend(gmeConfig) {
    var blobBackend = new BlobFSBackend(gmeConfig),
        blobClient = new BlobRunPluginClient(blobBackend);

    return blobClient;
}

module.exports = BlobClientWithFSBackend;