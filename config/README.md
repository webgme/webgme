Configuration
=============

The easiest way to set your custom configuration is to include the default configuration and overwrite/appended to the default fields.

```
- ---------------------
./config/config.mine.js
- ---------------------

var config = require('./config.default');

config.addOns.enable = true;
config.addOns.basePaths.push('C:/addons');

module.exports = config;
```

### Which configuration file is being used?
To use any other configuration than the default you need to set the environment variable `NODE_ENV`. When the server starts the configuration file at `config/config.%NODE_ENV%.js` will be loaded. If `NODE_ENV` is not set it falls back to loading `config/config.default.js`.

To start the server using the configuration above,

windows

`set NODE_ENV=mine && npm start`

ubuntu

`NODE_ENV=mine npm start`

### Configuration groups

##### addOn

- `config.addOn.enable = false`
 - If true enables add-ons.
- `config.addOn.monitorTimeout = 5000`
 - In milliseconds, the waiting time before add-ons (or the monitoring of such) is stopped after the last client leaves a branch.
- `config.addOn.basePaths = ['./src/addon/core']`
 - Array of paths to custom add-ons. If you have an add-on at `C:/SomeAddOns/MyAddOn/MyAddOn.js` the path to append would be `C:/SomeAddOns` or a relative path (from the current working directory). N.B. this will also expose any other add-on in that directory, e.g. `C:/SomeAddOns/MyOtherAddOn/MyOtherAddOn.js`.

##### authentication

- `config.authentication.enable = false`
 - If true certain parts will require that users are authenticated.
- `config.authentication.allowGuests = true`
 - Generate a guest account for non-authenticated connections.
- `config.authentication.guestAccount = 'guest'`
 - User account which non-authenticated connections will access the storage.
- `config.authentication.logOutUrl = '/'`
 - Where clients are redirected after logout.
- `config.authentication.salts = 10`
 - Strength of the salting of the users' passwords [bcrypt](https://github.com/dcodeIO/bcrypt.js).

##### bin

- `config.bin.log = see config`
 - Logger settings when running bin scripts.

##### blob

- `config.blob.type = 'FS'`
 - Currently only `FS` (File System) is supported.
- `config.blob.fsDir = './blob-local-storage'`
 - Directory where to store the blob files.
- `config.blob.s3 = {}`
 - **Not supported yet**

##### client

- `config.client.appDir = './src/client'`
 - Directory from where to serve the static files for the webapp. This should only be modified if you are using a custom UI.
- `config.client.log.level = 'debug'`
 - When [debug](https://github.com/visionmedia/debug) is activated in the browser (type `localStorage.debug = gme*` in the console and refresh the page) messages below this level will not be printed.
- `config.client.usedDecorators = ['ModelDecorator', 'MetaDecorator', ... see config]`
 - Decorators to load from the server before the editor starts.
- `config.client.defaultContext.project = null`
 - ID of project to open when visiting the webapp (e.g. `guest+TestProject`). If the URL query is specified (`?project=SomeProject`) - the URL has higher priority.
- `config.client.defaultContext.branch = null`
 - Name of the default branch to open, (URL equivalent `?branch=master`).
- `config.client.defaultContext.node = null`
 - Path to the default node to open, URL equivalent (`?node=/1` or for the root-node `?node=root`).
- `config.client.defaultConnectionRouter = 'basic3'`
 - Default connection router to use when opening up a new model, available options (ordered by level of complexity and sophistication) are: 'basic', 'basic2' and 'basic3'.

##### core

- `config.core.enableCustomConstraints = false`
 - If true will enable validation (which takes place on the server) of custom constraints defined in the meta nodes.

##### debug

- `config.debug = false`
 - If true will add extra debug messages and also enable experimental Visualizers, (URL equivalent (only on client side) `?debug=true`).

##### executor

- `config.executor.enable = false`
 - If true will enable the executor.
- `config.executor.nonce = null`
 - If defined this is the secret shared between the server and attached workers.
- `config.executor.outputDir = './'`
 - Directory where the state of the executor manager is stored (running jobs and workers attached) **will be deprecated when stored in the mongo database**.
- `config.executor.workerRefreshInterval = 5000`
 - Time interval in milliseconds that attached workers will request jobs from the server.
- `config.executor.labelJobs = './labelJobs.json'`
 - Path to configuration file for label jobs for the workers.

##### mongo
- `config.mongo.uri = 'mongodb://127.0.0.1:27017/multi'`
 - MongoDB connection [uri](http://docs.mongodb.org/manual/reference/connection-string/)
- `config.mongo.options = see config`
 - Options for [MongoClient.connect](https://mongodb.github.io/node-mongodb-native/api-generated/mongoclient.html#connect)

##### plugin
- `config.plugin.allowServerExecution = false`
 - If true will enable execution of plugins on the server.
- `config.plugin.basePaths = ['./src/plugin/coreplugins']`
 - Same as for `config.addOns.basePath' [TODO: link to AddOns] but for plugins instead.
- `config.plugin.displayAll = false`
 - If true there is no need to register plugins on the root-node of project - all will be available from the drop-down.
- `config.plugin.serverResultTimeout = 60000`
 - Time, in milliseconds, results will be stored on the server after they have finished (when invoked via the REST api).


##### requirejsPaths
- `config.requirejsPaths = {}`
 - Custom paths that will be added to the `paths` of [requirejs configuration](http://requirejs.org/docs/api.html#config).


##### rest
- `config.rest.components = {}`
 -  Routing path (keys) from `/rest/external/` and file-path (values) to custom REST components.

##### seedProjects
- `config.seedProjects.enable = true`
 - Enables creation of new projects using seeds.
- `config.seedProjects.defaultProject = 'EmptyProject'`
 - Used by the GUI when highlighting/selecting the default project to seed from.
- `config.seedProjects.basePaths = ['./seeds']`
 - List of directories where project seeds are stored.

##### server
- `config.server.port = 8888`
 - Port the server is hosted from.
- `config.server.maxWorkers = 10`
 - Maximum number of child process spawned for workers.
- `config.server.sessionStore.type = 'Memory'`
 - Determines which type of storage will be used for the sessions, available options are `'Memory'`, `'Redis'` and `'Mongo'`.
- `config.server.sessionStore.options = {}`
 - Storage dependent options passed to the session store.
- `config.server.sessionStore.cookieSecret = 'meWebGMEez'`
 - Value used when encoding/decoding the session cookie.
- `config.server.sessionStore.cookieKey = 'webgmeSid'`
 - Name of session cookie.
- `config.server.log = see config`
 - Transports and options for the server (winston) logger.
- `config.server.https.enable = false`
 - If true the server will be hosted over the HTTPS protocol.
- `config.server.https.certificateFile = './certificates/sample-cert.pem'`
 - Path to certificate file for HTTPS (only applicable if https is enabled).
- `config.server.https.keyFile = './certificates/sample-key.pem'`
 - Path to key file for HTTPS (only applicable if https is enabled).
- `config.server.extlibExcludes = ['.\.pem$', 'config\/config\..*\.js$']`
 - Array of regular expressions that will hinder access to files via the '/extlib/' route. Requests to files matching any of the provided pattern will result in 403.

##### socketIO
- `config.socketIO.clientOptions = see config`
 - Options passed to the [socketIO client](https://github.com/socketio/socket.io-client#managerurlstring-optsobject) when connecting to the sever.
- `config.socketIO.serverOptions = see config`
 - Options passed to the [socketIO server](https://github.com/socketio/engine.io#methods-1) when attaching to the server.

##### storage
- `config.storage.cache = 2000`
 - Number of core-objects stored before emptying cache (server side).
- `config.storage.clientCache = 2000`
 - Number of core-objects stored before emptying cache (client side).
- `config.storage.broadcastProjectEvents = false`
 - If true, events regarding project/branch creation/deletion are only broadcasted and not emitted back to the socket who made the change. Only modify this if you are writing a custom GUI.
- `config.storage.emitCommittedCoreObjects = true`
 - If true, all the committed core objects (in a `makeCommit`) will be broadcasted to all sockets. If this is enabled the number of round-trips to the server can be reduced after a `BRANCH_HASH_UPDATED` event. However it also means that the server might send unused data to clients. If false, only the core object for the root node will be sent.
- `config.storage.loadBucketSize = 100`
 - Size of bucket before triggering a load of objects from the server.
- `config.storage.loadBucketTimer = 10`
 - Time in milliseconds (after a new bucket has been created) before triggering a load of objects from the server.
- `config.storage.keyType = 'plainSha'`
 - Algorithm used when hashing the objects in the database, can be `'plainSHA1'`, `'rand160Bits'` or `'ZSSHA'`.
- `config.storage.database.type = 'mongo'`
 - Type of database to store the data (metadata e.g. _users is always stored in mongo), can be `'mongo'`, `'redis'` or `'memory'`.
- `config.storage.database.options = '{}'`
 - Options passed to database client (unless mongo is specified, in that case `config.mongo.options` are used).

##### visualization
- `config.visualization.decoratorPaths = ['./src/client/decorators']`
 - Array of paths to decorators that should be available.
- `config.visualization.visualizerDescriptors = ['../src/client/js/Visualizers.json']`
 - Array of paths to json-files containing meta-data about the used visualizers.
- `config.visualization.panelPaths = ['../src/client/js/Panels']`
 - Array of base paths that will be mapped from `'panels'` in requirejs.
- `config.visualization.layout.default = 'DefaultLayout'`
 - Specifies which layout to use (directory name must be present in any of the provided base-paths).
- `config.visualization.layout.basePaths = ['../src/client/js/Layouts']`
 - Array of base paths for the layouts.
