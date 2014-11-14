# Installation

* Fetch the latest version from git directly and start using it (check the package.json for node package dependencies)
* Install it with npm (`npm install webgme`), and you are ready to go

# Program usage

All runnable javascript programs are stored in the src/bin directory, you should start them with node, e.g. `node src/bin/start_server.js`.
Each script supports the `-help` command line parameter which will list all possible parameters.

* start_server: it start a webserver which open a data connection towards the configured mongoDb and functions as a webgme server as well.
* getconfig: creates a `config.js` local configuration file which can be used to overwrite the default configuration values in the `getconfig.js` (all command uses these configurations)  
* parse_xme: parses a gme classic xme file and inports it into a webgme database.
* database_info: prints out the projects and branches stored on the given database.
* serialize_to_xml: creates a classic gme xme file from the given webgme project
* update_project: updates the given branch of a project to the latest version of webGME. this ensures that all new functions will be available without negatively affecting already made data.
* project_clean_registry: cleans the visual only settings of a project creating an up-to-date version
* run_plugin: executes a plugin via a direct mongoDB connection

# Library usage

You can get all core functionality (not related to the GUI) by using node import `require('webgme')`, or get specific part of the library 
using requirejs (see the scripts in the src/bin directory). 

```
    //this example shows how you able to connect directly from code to your own mongoDB instance
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

# Developer guidelines

## Coding style

Please use JSHint. Consult .jshintrc for details.

Always declare your globals at the top of the source.

Use [JDDoc](http://en.wikipedia.org/wiki/JSDoc) syntax to annotate source code with documentation, eg. specify authors as:
```
/**
 * @author brollb / https://github.com/brollb
 */
```
