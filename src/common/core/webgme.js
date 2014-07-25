/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

var requirejs = require('requirejs');
requirejs.config({
	nodeRequire: require,
	baseUrl: __dirname + '/..'
});

module.exports = {
	storage: {
		cache: requirejs('storage/cache'),
		commit: requirejs('storage/commit'),
		failsafe: requirejs('storage/failsafe'),
		local: requirejs('storage/local'),
		log: requirejs('storage/log'),
		mongo: requirejs('storage/mongo'),
		socketioclient: requirejs('storage/socketioclient'),
		socketioserver: requirejs('storage/socketioserver')
	},
	core: {
		core: requirejs('core/core'),
		setcore: requirejs('core/setcore')
	}
};
