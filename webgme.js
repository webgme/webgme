/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

var requirejs = require('requirejs');
requirejs.config({
	nodeRequire: require,
	baseUrl: __dirname,
    paths:{
        "logManager": "common/LogManager"
    }
});

module.exports = {
	clientStorage: requirejs('storage/clientstorage'),
	serverStorage: requirejs('storage/serverstorage'),
	core: requirejs('core/core'),
    standaloneServer: requirejs('server/standalone')
};
