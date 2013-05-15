/**
 * 
 */

var requirejs = require("requirejs");

requirejs.config({
	nodeRequire: require,
	baseUrl: ".."
});

requirejs([ "config/config" ], function (CONFIG) {
	"use strict";

	console.log(CONFIG);
});
