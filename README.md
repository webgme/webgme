# Installation

* Fetch the latest version from git directly and start using it (check the package.json for node package dependencies)
* Install it with npm (`npm install webgme`), and you are ready to go

# Program usage

All runnable javascript programs are stored in the bin directory, you should start them with node, e.g. `node bin/combined_server.js`. 
Each script supports the `-help` command line parameter which will list all possible parameters.

* combined_server: starts the webgme storage server and the http server which serves the client application.
* getconfig: creates a `config.js` local configuration file which can be used to overwrite the default configuration values in the `getconfig.js`  
* parse_xme: parses a gme classic xme file and inports it into a webgme database.
* database_info: prints out the projects and branches stored on the given database.

# Library usage

You can get all core functionality (not related to the GUI) by using node import `require('webgme')`, or get specific part of the library 
using requirejs (see the scripts in the bin directory). 

``` 
	var webGME = require('webgme');
	var storage = new webgme.storage.mongo({host:'my database address', port:'port to communicate with mongoDB' });
	storage.openDatabase(function(err){
		if(!err) {
		}
	});
```
