/*jshint node:true, camelcase:false*/
/**
 * Test example for switching register end point..
 * gmeConfig.authentication.allowUserRegistration = <pathToThisFile>;
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';
module.exports = function getRegisterEndPoint(middlewareOpts) {
    var gmeConfig = middlewareOpts.gmeConfig,
        gmeAuth = middlewareOpts.gmeAuth;

    return function (req, res/*, next*/) {
        var receivedData = req.body;

        // Users must start with an "a"
        if (receivedData.userId.indexOf('a') !== 0) {
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