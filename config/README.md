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

### components.json
To configure the default behaviour of individual components (e.g. plugins, ui-widgets) that also support user settings - add the keys to the settings that you would like to overwrite inside of `components.json`.
`componentsGenericUIDefaults.json` contains all the default settings for the generic UI. For more info about how the settings are resolved see [Component Settings](https://github.com/webgme/webgme/wiki/Component-Settings).


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
- `config.authentication.allowUserRegistration = true`
 - Allow clients to create new users via the REST api.
- `config.authentication.guestAccount = 'guest'`
 - User account which non-authenticated connections will access the storage.
- `config.authentication.logInUrl = '/profile/login'`
 - Where clients are redirected if not authenticated.
- `config.authentication.logOutUrl = '/profile/login'`
 - Where clients are redirected after logout.
- `config.authentication.salts = 10`
 - Strength of the salting of the users' passwords [bcrypt](https://github.com/dcodeIO/bcrypt.js).
- `config.authentication.authorizer.path = './src/server/middleware/auth/defaultauthorizer'`
 - Path (absolute) to module implementing `AuthorizerBase` (located next to `deafultauthorizer`) for getting and setting authorization regarding projects.
- `config.authentication.authorizer.options = {}`
 - Optional options passed to authorizer module at initialization (via gmeConfig).
- `config.authentication.jwt.cookieId = 'access_token'`
 - Id of token used when placed inside of a cookie.
- `config.authentication.jwt.expiresIn = 3600 * 24 * 7`
 - Lifetime of tokens in seconds.
- `config.authentication.jwt.renewBeforeExpires = 3600`
 - Interval in seconds, if there is less time until expiration the token will be automatically renewed. (Set this to less or equal to 0 to disabled automatic renewal.)
- `config.authentication.jwt.privateKey = './src/server/middleware/auth/EXAMPLE_PRIVATE_KEY'`
 - Private RSA256 key used when generating tokens (N.B. if authentication is turned on - the defaults must be changed and the keys must reside outside of the app's root-directory or alt. a rule should be added to `config.server.extlibExcludes`).
- `config.authentication.jwt.publicKey = './src/server/middleware/auth/EXAMPLE_PRIVATE_KEY'`
 - Public RSA256 key used when evaluating tokens.

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
- `config.executor.workerRefreshInterval = 5000`
 - Time interval in milliseconds that attached workers will request jobs from the server.
- `config.executor.clearOutputTimeout = 60000`
 - Time in milliseconds that output is stored after a job has finished.
- `config.executor.clearOldDataAtStartUp = false`
 - If true, all data stored for jobs (jobInfos, outputs, workerInfos, etc.) is cleared when the server starts.
- `config.executor.labelJobs = './labelJobs.json'`
 - Path to configuration file for label jobs for the workers.

##### mongo
- `config.mongo.uri = 'mongodb://127.0.0.1:27017/multi'`
 - MongoDB connection [uri](http://docs.mongodb.org/manual/reference/connection-string/)
- `config.mongo.options = see config`
 - Options for [MongoClient.connect](https://mongodb.github.io/node-mongodb-native/api-generated/mongoclient.html#connect)

##### plugin
- `config.plugin.allowBrowserExecution = true`
 - If true will enable execution of plugins on the server.
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
 Paths added here will also be served under the given key, i.e. `{myPath: './aPath/aSubPath/'}` will expose files via `<host>/myPath/someFile.js`.


##### rest
- `config.rest.components = {}`
 - Routing path (keys) from `origin` and file-path (values) to custom REST components. Use the `RestRouterGenerator` plugin to generate a template router (see the generated file for more info).

##### seedProjects
- `config.seedProjects.enable = true`
 - Enables creation of new projects using seeds.
- `config.seedProjects.allowDuplication = true`
 - Enables duplication of entire project with full history (requires at least mongodb 2.6).
- `config.seedProjects.defaultProject = 'EmptyProject'`
 - Used by the GUI when highlighting/selecting the default project to seed from.
- `config.seedProjects.basePaths = ['./seeds']`
 - List of directories where project seeds are stored.

##### server
- `config.server.port = 8888`
 - Port the server is hosted from.
- `config.server.handle = null`
 - Optional handle object passed to [server.listen](https://nodejs.org/api/http.html#http_server_listen_handle_callback) (aligning port must still be given).
- `config.server.timeout = -1`
 - If greater than -1 will set the [timeout property of the http-server](https://nodejs.org/api/http.html#http_server_timeout). (This can be used to enable large, > 1Gb, file uploads.)
- `config.server.maxWorkers = 10`
 - Maximum number of child process spawned for workers.
- `config.server.log = see config`
 - Transports and options for the server (winston) logger.
- `config.server.extlibExcludes = ['.\.pem$', 'config\/config\..*\.js$']`
 - Array of regular expressions that will hinder access to files via the '/extlib/' route. Requests to files matching any of the provided pattern will result in 403.
- `config.server.behindSecureProxy = false`
 - Indicate if the webgme server is behind a secure proxy (needed for adding correct OG Metadata in index.html).
 
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
- `config.storage.maxEmittedCoreObjects = -1`
 - If greater than -1, the maximum number of core objects that will be emitted to other clients. N.B. this only applies to newly created nodes, any modified data will always be sent as patches.
- `config.storage.loadBucketSize = 100`
 - Size of bucket before triggering a load of objects from the server.
- `config.storage.loadBucketTimer = 10`
 - Time in milliseconds (after a new bucket has been created) before triggering a load of objects from the server.
- `config.storage.keyType = 'plainSha'`
 - Algorithm used when hashing the objects in the database, can be `'plainSHA1'`, `'rand160Bits'` or `'ZSSHA'`.
- `config.storage.autoMerge.enable = false`
 - (N.B. Experimental feature) If enable, incoming commits to branches that initially were `FORKED` will be attempted to be merged with the head of the branch. Use with caution as larger (+100k nodes) projects can slow down the commit rate.
- `config.storage.database.type = 'mongo'`
 - Type of database to store the data (metadata e.g. _users is always stored in mongo), can be `'mongo'`, `'redis'` or `'memory'`.
- `config.storage.database.options = '{}'`
 - Options passed to database client (unless mongo is specified, in that case `config.mongo.options` are used).

##### visualization
- `config.visualization.decoratorPaths = ['./src/client/decorators']`
 - Array of paths to decorators that should be available.
- `config.visualization.decoratorToPreload = null`
 - Array of decorators (by id) that should be downloaded from the server before the editor starts - when set to null all available decorators will be downloaded.
- `config.visualization.extraCss = []`
 - Array of paths (in the requirejs sense) to css files that should be loaded at start up. (To use this option a path would typically have to be added at `config.requirejsPaths`.)
- `config.visualization.svgDirs = []`
 - Array of paths to directories containing SVG-files that will be copied and made available as SVGs for decorators (`ConstraintIcons` is currently reserved).
- `config.visualization.visualizerDescriptors = ['../src/client/js/Visualizers.json']`
 - Array of paths to json-files containing meta-data about the used visualizers.
- `config.visualization.panelPaths = ['../src/client/js/Panels']`
 - Array of base paths that will be mapped from `'panels'` in requirejs.
- `config.visualization.layout.default = 'DefaultLayout'`
 - Specifies which layout to use (directory name must be present in any of the provided base-paths).
- `config.visualization.layout.basePaths = ['../src/client/js/Layouts']`
 - Array of base paths for the layouts.

##### webhooks
- `config.webhooks.enable = true`
 - If true will start a webhook-manager from the server.
- `config.webhooks.manager = 'memory'`
 - Type of webhook-manager for detecting events, can be `'memory'`, `'redis'`. Memory runs in the server process, whereas redis
 is running in a sub-process. Redis requires the socket.io adapter to be of type redis. (It is also possible to run the redis manager separately from the webgme server.)
