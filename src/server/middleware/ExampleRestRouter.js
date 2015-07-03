/*jshint node:true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

'use strict';

var express = require('express'),
    router = express.Router();

function getUserId(req) {
    return req.session.hasOwnProperty('udmId') ? req.session.udmId : null;
}

function initialize(middlewareOpts) {
    var gmeConfig = middlewareOpts.gmeConfig,
        logger = middlewareOpts.logger.fork('ExampleRestRouter'),
        ensureAuthenticated = middlewareOpts.ensureAuthenticated;

    logger.debug('initializing ...');

    // ensure authenticated can be used only after this rule
    router.use('*', function (req, res, next) {
        // TODO: set all headers, check rate limit, etc.
        res.setHeader('X-WebGME-Media-Type', 'webgme.v1');
        next();
    });

    // all endpoints require authentication
    router.use('*', ensureAuthenticated);

    router.get('/getExample', function (req, res/*, next*/) {
        var userId = getUserId(req);

        res.json({userId: userId, message: 'get request was handled'});
    });

    router.patch('/patchExample', function (req, res/*, next*/) {
        res.sendStatus(200);
    });


    router.post('/postExample', function (req, res/*, next*/) {
        res.sendStatus(201);
    });

    router.delete('/deleteExample', function (req, res/*, next*/) {
        res.sendStatus(204);
    });

    router.get('/error', function (req, res, next) {
        next(new Error('error example'));
    });

    logger.debug('ready');
}


module.exports = {
    initialize: initialize,
    router: router
};