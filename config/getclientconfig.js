/*jshint node:true*/
/**
 * Strips away sensitive data from gmeConfig, use before sending it to the client.
 * @author pmeijer / https://github.com/pmeijer
 */

function getClientConfig(gmeConfig) {
    'use strict';
    var clientConfig = JSON.parse(JSON.stringify(gmeConfig));

    delete clientConfig.server.sessionCookieSecret;
    delete clientConfig.server.https.certificateFile;
    delete clientConfig.server.https.keyFile;
    delete clientConfig.executor.nonce;
    delete clientConfig.mongo;
    delete clientConfig.blob;

    return clientConfig;
}

module.exports = getClientConfig;