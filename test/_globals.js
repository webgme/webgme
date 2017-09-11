/*globals requireJS*/
/* jshint node:true */
/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('webgme-engine/test/_globals'),
    WEBGME_CONFIG_PATH = '../config';

var WebGME = testFixture.WebGME,
    gmeConfig = require(WEBGME_CONFIG_PATH),
    getGmeConfig = function () {
        'use strict';
        // makes sure that for each request it returns with a unique object and tests will not interfere
        if (!gmeConfig) {
            // if some tests are deleting or unloading the config
            gmeConfig = require(WEBGME_CONFIG_PATH);
        }
        return JSON.parse(JSON.stringify(gmeConfig));
    };

WebGME.addToRequireJsPaths(gmeConfig);

testFixture.getGmeConfig = getGmeConfig;

module.exports = testFixture;