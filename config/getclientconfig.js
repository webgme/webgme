/*jshint node:true*/
/**
 * Strips away sensitive data from gmeConfig, use before sending it to the client.
 * @author pmeijer / https://github.com/pmeijer
 */

function getClientConfig(gmeConfig) {
    'use strict';
    var clientConfig = JSON.parse(JSON.stringify(gmeConfig));

    delete clientConfig.server;

    delete clientConfig.authentication.jwt.expiresIn;
    delete clientConfig.authentication.jwt.renewBeforeExpires;
    delete clientConfig.authentication.jwt.privateKey;
    delete clientConfig.authentication.jwt.publicKey;
    delete clientConfig.authentication.salts;
    delete clientConfig.authentication.authorizer;

    delete clientConfig.executor.nonce;
    delete clientConfig.mongo;
    delete clientConfig.blob;
    delete clientConfig.bin;
    delete clientConfig.socketIO.serverOptions;
    delete clientConfig.socketIO.adapter;
    delete clientConfig.storage.database;
    delete clientConfig.rest;

    clientConfig.storage.cache = clientConfig.storage.clientCacheSize;

    return clientConfig;
}

module.exports = getClientConfig;
