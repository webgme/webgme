/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var TokenGeneratorBase = require('./tokengeneratorbase'),
    Q = require('q'),
    fs = require('fs');

/**
 *
 * @param {GmeLogger} mainLogger
 * @param {GmeConfig} gmeConfig
 * @param {JsonWebTokenModule} jwt
 * @constructor
 */
function LocalTokenGenerator(mainLogger, gmeConfig, jwt) {
    var self = this;
    this.privateKey = null;

    TokenGeneratorBase.call(self, mainLogger, gmeConfig, jwt);

    this.start = function (params, callback) {
        return Q.nfcall(fs.readFile, this.gmeConfig.authentication.jwt.privateKey, 'utf8')
            .then(function (privateKey) {
                self.privateKey = privateKey;
            })
            .nodeify(callback);
    };

    this.getToken = function (userId, callback) {
        return Q.ninvoke(jwt, 'sign', {userId: userId}, self.privateKey, self.jwtOptions).nodeify(callback);
    };
}

LocalTokenGenerator.prototype = Object.create(TokenGeneratorBase.prototype);
LocalTokenGenerator.prototype.constructor = LocalTokenGenerator;

module.exports = LocalTokenGenerator;