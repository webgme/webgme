[![Build Status](https://travis-ci.org/webgme/webgme.svg?branch=master)](https://travis-ci.org/webgme/webgme)
[![Version](https://badge.fury.io/js/webgme.svg)](https://www.npmjs.com/package/webgme)
[![Downloads](http://img.shields.io/npm/dm/webgme.svg?style=flat)](http://img.shields.io/npm/dm/webgme.svg?style=flat)

# Installation

Here are some options to deploy and try WebGME on your infrastructure:

* Fetch the latest version from git directly and start using it (check the package.json for node package dependencies)
* Install it with npm (`npm install webgme`), and you are ready to go
* If you have Docker installed: `docker run -p <port>:80 -d webgme/compact`, where <port> is the public host port to be used (e.g.: 80)

# Program usage

All runnable javascript programs are stored in the src/bin directory, you should start them with node, e.g. `node src/bin/start_server.js`.
Each script supports the `-help` command line parameter which will list all possible parameters.

* start_server: it starts a webserver which opens a connection to the configured MongoDB.
* getconfig: creates a `config.js` local configuration file which can be used to overwrite the default configuration values in the `getconfig.js` (all commands use this configuration file)  
* parse_xme: parses a gme classic xme file and inports it into a webgme database.
* database_info: prints out the projects and branches stored in the given database.
* serialize_to_xml: creates a classic gme xme file from the given webgme project
* update_project: updates the given branch of a project to the latest version of webGME. this ensures that all new functions will be available without negatively affecting already made data.
* project_clean_registry: cleans the visual only settings of a project creating an up-to-date version
* run_plugin: executes a plugin via a direct MongoDB connection

# Library usage

You can get all core functionality (not related to the GUI) by using node import `require('webgme')`, or get specific part of the library 
using requirejs (see the scripts in the src/bin directory). 

```
    //this example shows how you able to connect directly from code to your own MongoDB instance
	var webGME = require('webgme');
	var storage = new webGME.clientStorage({'type':'node'}); //other parameters of config can be override here as well, but this must be set
	storage.openDatabase(function(err){
		if(!err) {
		    storage.openProject(function(err,project){
		        if(!err){
		            var core = webGME.core(project); //for additional options check the code
		        }
		    }
		}
	});
```
```
    //this is an example how you can use webserver as a whole application
    var webGME = require('webgme');
    var server = webGME.standaloneServer(CONFIG); //you should gather all relevant configuration for the server like mongoip and port of the server
    server.start()
```

# Setting up a DSML repository with webgme as dependency
Have node/npm and MongoDB installed. Set up a new npm package, `npm init`, and add webgme as dependency in `package.json`.
(Until the release at 2014-02-16 point to the master at github)
`... "dependencies": {"webgme": "https://github.com/webgme/webgme/tarball/master"} ...`
## Starting webgme
* From the root of the repository run `node node_modules/webgme/src/bin/generate_dsml_repo_files.js`.
* With an open mongo-session (matching the setting in `config.js`) run `node app.js`.
* Visit localhost:port, where port is set in `config.js` and create a new project.

## Plugins
* Add `node_modules/webgme/src/plugin/coreplugins` to pluginBasePaths (restart the server `node app.js`).
* In an open project, select the rootNode and add `PluginGenerator` to `validPlugins` in the Property Editor.
* Run `PluginGenerator` (using the play-button) and download the files and follow the instructions from the results.

# Developer guidelines

## Coding style

Please use JSHint. Consult .jshintrc for details.

Always declare your globals at the top of the source.

Use [JSDoc](http://en.wikipedia.org/wiki/JSDoc) syntax to annotate source code with documentation, eg. specify authors as:
```
/**
 * @author <your_github_username> / https://github.com/<your_github_username>
 */
```
