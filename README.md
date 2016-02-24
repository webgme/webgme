[![Build Status](https://travis-ci.org/webgme/webgme.svg?branch=master)](https://travis-ci.org/webgme/webgme)
[![Version](https://badge.fury.io/js/webgme.svg)](https://www.npmjs.com/package/webgme)
[![Downloads](http://img.shields.io/npm/dm/webgme.svg?style=flat)](http://img.shields.io/npm/dm/webgme.svg?style=flat)

# Getting started

WebGME require [NodeJS](https://nodejs.org/) and [MongoDB](https://www.mongodb.com/) installed on the host system (the server).

Options to deploy and run WebGME:

1. [webgme-setup-tool](https://github.com/webgme/webgme-cli). This is the preferred way of using webgme as it allows you to:
 * Automatically generate boilerplate code for [extensions](#Extensions) (w/o manual configurating paths etc.).
 * Reuse extensions from other users.
 * Publish and share your work with others.
 * As it uses webgme as dependency, updating to newer webgme releases only requires a `npm install webgme` that won't cause any conflicts.

2. For webgme developers, clone this repo.
 * install packages with npm `npm install`
 * launch mongod (>=2.6) locally
 * start the server `npm start`

After the webgme server is up and there are no error messages in the console. Open a valid webgme address in the browser. The default is `http://127.0.0.1:8888/`, you should see all valid addresses in the console where you started webgme.

# Command line interface

All runnable javascript programs are stored in the `src/bin` directory, you should start them with node from the root directory of the repository, e.g. `node src/bin/start_server.js` starts the web server.
Each script supports the `--help` or `-h` command line parameter, which will list all possible parameters.

* `start_server.js`: it starts a web server, which opens a connection to the configured MongoDB.
* `run_plugin.js`: executes a plugin via a direct MongoDB connection.
* `merge.js`: merges two branches if there are no conflicts.
* `usermanager.js`: manages users, organizations, and project authorization (read, write, delete).
* `clean_up.js`: lists/removes projects based on supplied criteria (commits, branches, regex etc.).
* `export.js`: exports a (snapshot of a) branch into a json file.
* `import.js`: imports a (snapshot of a) branch into a webgme project.

# Extensions
* [Plugins](./src/plugin/README.md) - Model interpretation for e.g. code generation.
* [AddOns](./src/addon/README.md) - Continuous model interpretation for e.g. constraint evaluation.
* [Executor](./src/server/middleware/executor/Readme.md) - Code execution framework.

# Contributing
See [CONTRIBUTING.md](./CONTRIBUTING.md)

# License

See the [LICENSE](LICENSE) file.
