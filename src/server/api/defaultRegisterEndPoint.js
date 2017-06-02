/*jshint node:true, camelcase:false*/
/**
 * This is the default registration end point. It either allows or disallows users to register.
 * It will be used if gmeConfig.authentication.allowUserRegistration is either false or true.
 * To plugin your deployment specific end-point set gmeConfig.authentication.allowUserRegistration to
 * a path to a module with the same signature as this.
 *
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';
module.exports = function getRegisterEndPoint(middlewareOpts) {
    var gmeConfig = middlewareOpts.gmeConfig,
        gmeAuth = middlewareOpts.gmeAuth;

    return function (req, res/*, next*/) {
        var receivedData = req.body;

        if (gmeConfig.authentication.enable === false) {
            res.sendStatus(404);
            return;
        }

        if (gmeConfig.authentication.allowUserRegistration === false) {
            res.sendStatus(404);
            return;
        }

        // TODO: Add regex for userId and check other data too.
        if (typeof receivedData.password !== 'string' || receivedData.password.length === 0 ||
            typeof receivedData.userId !== 'string' || receivedData.userId.length === 0) {
            res.sendStatus(400);
            return;
        }

        gmeAuth.addUser(receivedData.userId,
            receivedData.email,
            receivedData.password,
            gmeConfig.authentication.registeredUsersCanCreate,
            {overwrite: false},
            function (err/*, updateData*/) {
                if (err) {
                    res.sendStatus(400);
                    return;
                }

                gmeAuth.getUser(receivedData.userId, function (err, data) {
                    if (err) {
                        res.sendStatus(500);
                        return;
                    }

                    res.json(data);
                });
            });
    };
};