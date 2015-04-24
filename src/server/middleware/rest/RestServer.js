/*globals module, require, requireJS*/
/*jshint node: true*/
/**
 * @author kecso / https://github.com/kecso
 */

var ASSERT = requireJS('common/util/assert'),
    REST = require('./rest');

function createExpressRest(__app, baseUrl, options) {
    'use strict';
    ASSERT(typeof baseUrl === 'string', 'baseUrl must be given.');
    ASSERT(typeof options.gmeConfig !== 'undefined', 'gmeConfig required');
    ASSERT(typeof options.logger !== 'undefined', 'logger must be given.');
    ASSERT(typeof options.gmeAuth !== 'undefined', 'gmeAuth must be given.');
    ASSERT(typeof options.workerManager !== 'undefined', 'workerManager must be given.');
    ASSERT(typeof options.ensureAuthenticated === 'function', 'ensureAuthenticated must be given.');
    ASSERT(typeof options.gmeAuth.tokenAuthorization === 'function', 'restAuthorization must be given.');
    ASSERT(typeof options.gmeAuth.tokenAuth === 'function', 'tokenToUserId must be given.');

    var __REST = new REST({
            globConf: options.gmeConfig,
            baseUrl: '', // FIXME: this should take the baseUrl = '/rest'
            authorization: options.gmeAuth.tokenAuthorization, //TODO: why not keep the same name here?
            tokenToUserId: options.gmeAuth.tokenAuth, //TODO: why not keep the same name here?
            workerManager: options.workerManager,
            logger: options.logger
        }),
        logger = options.logger.fork('middleware:RestServer'),
        ensureAuthenticated = options.ensureAuthenticated;

    __app.get(baseUrl + '/:command', ensureAuthenticated, function (req, res) {
        __REST.setBaseUrl(
            options.gmeConfig.server.https.enable === true ? 'https://' : 'http://' + req.headers.host + baseUrl
        );
        __REST.initialize(function (err) {
            if (err) {
                res.sendStatus(500);
            } else {
                __REST.doRESTCommand(
                    __REST.request.GET,
                    req.params.command,
                    req.headers.webGMEToken,
                    req.query,
                    function (httpStatus, object) {
                        res.header('Access-Control-Allow-Origin', '*');
                        res.header('Access-Control-Allow-Headers', 'X-Requested-With');
                        if (req.params.command === __REST.command.etf) {
                            if (httpStatus === 200) {
                                var filename = 'exportedNode.json';
                                if (req.query.output) {
                                    filename = req.query.output;
                                }
                                if (filename.indexOf('.') === -1) {
                                    filename += '.json';
                                }
                                res.header('Content-Type', 'application/json');
                                res.header('Content-Disposition', 'attachment;filename=\"' + filename + '\"');
                                res.status(httpStatus);
                                res.end(/*CANON*/JSON.stringify(object, null, 2));
                            } else {
                                logger.warn(httpStatus, JSON.stringify(object, null, 2));
                                res.status(httpStatus).send(object);
                            }
                        } else {
                            res.status(httpStatus).json(object || null);
                        }
                    }
                );
            }
        });
    });
}
module.exports.createExpressRest = createExpressRest;