[![Build Status](https://travis-ci.org/webgme/webgme.svg?branch=master)](https://travis-ci.org/webgme/webgme)
[![Version](https://badge.fury.io/js/webgme.svg)](https://www.npmjs.com/package/webgme)
[![Downloads](http://img.shields.io/npm/dm/webgme.svg?style=flat)](http://img.shields.io/npm/dm/webgme.svg?style=flat)

# Getting started

Options to deploy and run WebGME:

1. Fetch the latest version from git directly and start using it
 * install packages with npm `npm install`
 * launch mongod locally
 * start the server `npm start`
2. Use WebGME as a library
 * install webgme `npm install webgme`
 * create an `app.js` file and a `config.js`
	```javascript
	// app.js
	var gmeConfig = require('./config'),
	    webgme = require('webgme'),
	    myServer;
	
	webgme.addToRequireJsPaths(gmeConfig);
	
	myServer = new webgme.standaloneServer(gmeConfig);
	myServer.start(function () {
	    //console.log('server up');
	});
	```
	```javascript
	// config.js
	var config = require('webgme/config/config.default'),
	    validateConfig = require('webgme/config/validator');
	    
	// Overwrite options as needed
	config.server.port = 9091;
	config.mongo.uri = 'mongodb://127.0.0.1:27017/webgme_my_app';
	
	validateConfig(config);
	module.exports = config;
	```
 * launch mongod locally
 * start the server `node app.js`
3. For more complex usages see [webgme-boilerplate](https://github.com/webgme/webgme-boilerplate)
4. If you have Docker installed: `docker run -p <port>:80 -d webgme/compact`, where <port> is the public host port to be used (e.g.: 80)

After the webgme server is up and there are no error messages in the console. Open a valid webgme address in the browser. The default is `http://127.0.0.1:8888/`, you should see all valid addresses in the console where you started webgme.

# Command line interface

All runnable javascript programs are stored in the `src/bin` directory, you should start them with node from the root directory of the repository, e.g. `node src/bin/start_server.js` starts the web server.
Each script supports the `--help` or `-h` command line parameter, which will list all possible parameters.

* `start_server.js`: it starts a web server, which opens a connection to the configured MongoDB.
* `run_plugin.js`: executes a plugin via a direct MongoDB connection.
* `merge.js`: merges two branches if there are no conflicts.
* `usermanager.js`: manages users, organizations, and project authorization (read, write, delete).
* `export.js`: exports a (snapshot of a) branch into a json file.
* `import.js`: imports a (snapshot of a) branch into a webgme project.
* `parse_xme.js` __outdated__: parses a desktop GME xme file and imports it into a webgme database.
* `serialize_to_xml.js` __outdated__: creates a desktop GME xme file from a given webgme project.

# Extensions
* [Plugins](./src/plugin/README.md) - Model interpretation for e.g. code generation.
* [AddOns](./src/addons/README.md) - Continuous model interpretation for e.g. constraint evaluation.
* [Executor](./src/server/middleware/executor/Readme.md) - Code execution framework.

# License

See the [LICENSE](LICENSE) file.
