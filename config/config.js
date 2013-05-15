/*
 * CONFIG FILE
 */

define(["config/local"], function (LOCAL) {
	"use strict";

	var GLOBAL = {
		host: 'http://kecskes.isis.vanderbilt.edu',
		port: 80,
		project: "test",
		autorecconnect: true,
		reconndelay: 1000,
		reconnamount: 1000,
		autostart: false,

		//used by the server
		loglevel: 2, // 5 = ALL, 4 = DEBUG, 3 = INFO, 2 = WARNING, 1 = ERROR, 0 = OFF
		logfile: 'server.log',
		mongoip: "129.59.105.239",
		mongoport: 27017,
		mongodatabase: "multi"
	};

	for ( var key in LOCAL) {
		GLOBAL[key] = LOCAL[key];
	}

	return GLOBAL;
});
