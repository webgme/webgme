Configuration
=============

The easiest way to set your custom configuration is to include the default configuration and overwrite/appended to the default fields.

```
config.mine.js
###

var config = require('./config.default');

config.addOns.enable = true;
config.addOns.basePaths.push('C:/addons');

module.exports = config;
```

### Which configuration file is being used?
To use any other configuration than the default you need to set the environment variable `NODE_ENV`. When the server starts the configuration file at `config/config.%NODE_ENV%.js` will be loaded. If `NODE_ENV` is not set it falls back to loading `config/config.default.js`.

To start the server using the configuration above:

`set NODE_ENV=mine; node ./src/bin/start_sever.js`

### Configuration groups

> **addOn**

> - `config.addOn.enable = false`
>  - If true enables add-ons.
> - `config.monitorTimeout = 5000`
>  - In milliseconds, the waiting time before add-ons (or the monitoring of such) is stopped after the last client leaves a branch.
> - `config.addOn.basePaths = ['./src/addon/core']`
>  - Array of paths to custom add-ons. If you have an add-on at `C:/SomeAddOns/MyAddOn/MyAddOn.js` the path to append would be `C:/SomeAddOns` or a relative path (from the current working directory). N.B. this will also expose any other add-on in that directory, e.g. `C:/SomeAddOns/MyOtherAddOn/MyOtherAddOn.js`.

> **authentication**

> - `config.authentication.enable = false`
>  - If true
> - `config.authentication.allowGuests = true`
>  - Generate a guest account for non-authenticated connections.
> - `config.authentication.guestAccount = 'guest'`
>  - User account which non-authenticated connections will access the storage.
> - `config.authentication.logOutUrl = '/'`
>  - Where clients are redirected after logout.
> - `config.authentication.salts = 10`
>  - Strength of the salting of the users'' passwords [bcrypt](https://github.com/dcodeIO/bcrypt.js).

> **bin**

> - `config.bin.log = see config`
>  - Logger settings when running bin scripts.

> **blob**

> - `config.blob.type = 'FS'`
>  - Currently only `FS` (file system) is supported.
> - `config.blob.fsDir = './blob-local-storage'`
>  - Directory where to store the blob files.
> - `config.blob.s3 = {}`
>  - **Not supported yet**

> **client**

> - `config.appDir = './src/client'`
>  - Directory from where to serve the static files for the webapp. This should only be modified if you are using a custom UI.
> - `config.log.level = 'debug'`
>  - When debug is activated in the browser (`localStorage.debug = gme*`) messages below this level will not be printed.
> - `config.client.usedDecorators = ['ModelDecorator', 'MetaDecorator', ... see config]`
>  - Decorators to load from the server before the editor starts.
> - `config.client.defaultProject.name = null`
>  - ID of Project to open when visiting the webapp (e.g. `guest+TestProject`). If the URL query is specified (`?project=SomeProject`) - the URL has higher priority.
> - `config.client.defaultProject.branch = null`
>  - Name of the default branch to open, (URL equivalent `?branch=master`).
> - `config.client.defaultProject.node = null`
>  - Path to the default node to open, URL equivalent (`?node=/1` or for the root-node `?node=root`).
> - `config.client.defaultConnectionRouter = 'basic3'`
>  - Default connection router to use when opening up a new model, available options (ordered by level of complexity and sophistication) are: 'basic', 'basic2' and 'basic3'.

> **core**

> - `config.enableCustomConstraints = false`
>  - If true will enable validation (which takes place on the server) of custom constraints defined in the meta nodes.

> **debug**

> - `config.debug = false`
>  - If true will add extra debug messages and also enable experimental Visualizers, (URL equivalent (only on client side) `?debug=true`).

> **executor**

> - `config.executor.enable = false`
>  - If true will enable the executor.
> - `config.executor.nonce = null`
>  - If defined this is the secret shared between the server and attached workers.
> - `config.executor.outputDir = './'`
>  - Directory where the state of the executor manager is stored (running jobs and workers attached) **will be deprecated when stored in the mongo database**.
> - `config.executor.workerRefreshInterval = 5000`
>  - Time interval in milliseconds that attached workers will request jobs from the server.
> - `config.executor.labelJobs = './labelJobs.json'`
>  - Path to configuration file for label jobs for the workers.

> **mongo**
> - `config.mongo.uri = 'mongodb://127.0.0.1:27017/multi'`
>  - [MongoDB connection uri](http://docs.mongodb.org/manual/reference/connection-string/)
> - `config.mongo.options = see config`
>  - [Options for MongoClient.connect](https://mongodb.github.io/node-mongodb-native/api-generated/mongoclient.html#connect)





