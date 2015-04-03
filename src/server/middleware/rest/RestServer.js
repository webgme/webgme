/* globals module, require */
/**
 * @author kecso / https://github.com/kecso
 */

var REST = require('./rest');
function createExpressRest(__app, gmeConfig, __logger, ensureAuthenticated, restAuthorization, tokenToUserId, workerManager) {
    'use strict';

    var __REST = new REST({
            globConf: gmeConfig,
            baseUrl: '',
            authorization: restAuthorization,
            workerManager: workerManager,
            tokenToUserId: tokenToUserId
        }),
        logger = __logger.fork('rest');

    __app.get('/rest/:command', ensureAuthenticated, function (req, res) {
        __REST.setBaseUrl(gmeConfig.server.https.enable === true ? 'https://' : 'http://' + req.headers.host + '/rest');
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
                        console.log('backAgain',object);
                        res.header("Access-Control-Allow-Origin", "*");
                        res.header("Access-Control-Allow-Headers", "X-Requested-With");
                        if (req.params.command === __REST.command.etf) {
                            if (httpStatus === 200) {
                                var filename = 'exportedNode.json';
                                if (req.query.output) {
                                    filename = req.query.output;
                                }
                                if (filename.indexOf('.') === -1) {
                                    filename += '.json';
                                }
                                res.header("Content-Type", "application/json");
                                res.header("Content-Disposition", "attachment;filename=\"" + filename + "\"");
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