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

#### addOn

- `config.addOn.enable = false`
 - If true enables add-ons.
- `config.addOn.workerUrl = null`
 - If given the webgme server will not spawn a child process for running add-ons and instead post the related events to the url. Use [addon_handler.js](../src/bin/addon_handler.js) for a machine handling such requests.
- `config.addOn.monitorTimeout = 120000`
 - In milliseconds, the waiting time before add-ons are stopped after no activity (new clients joined or hash updates) in the branch.
- `config.addOn.basePaths = ['node_modules/webgme-engine/src/addon/core']`
 - Note, this is handled by [webgme-cli](https://github.com/webgme/webgme-cli). Array of paths to custom add-ons. If you have an add-on at `C:/SomeAddOns/MyAddOn/MyAddOn.js` the path to append would be `C:/SomeAddOns` or a relative path (from the current working directory). N.B. this will also expose any other add-on in that directory, e.g. `C:/SomeAddOns/MyOtherAddOn/MyOtherAddOn.js`.

#### authentication

- `config.authentication.enable = false`
 - If true certain parts will require that users are authenticated.
- `config.authentication.allowGuests = true`
 - Generate a guest account for non-authenticated connections.
- `config.authentication.guestAccount = 'guest'`
 - User account which non-authenticated connections will access the storage.
- `config.authentication.allowUserRegistration = true`
 - Allows user-creation via the REST api without being an authenticated site admin. Provide a path to a module if you want to add your own custom registration path (see [default register end-point](https://github.com/webgme/webgme/blob/master/src/server/api/defaultRegisterEndPoint.js) for structure).
- `config.authentication.registeredUsersCanCreate = true`
 - Use this option if user registration is set to `true` and you want to control if registered users should be able to create projects directly after registered (site-admins can edit the `canCreate` property post-hoc for existing users).
- `config.authentication.inferredUsersCanCreate = false`
 - Users authenticated by externally generated tokens are automatically put in the database at their first login. By default these users cannot create new projects unless this option is set to `true`.
- `config.authentication.logInUrl = '/profile/login'`
 - Where clients are redirected if not authenticated.
- `config.authentication.logOutUrl = '/profile/login'`
 - Where clients are redirected after logout. Leave this empty to logout to the referrer (if none it will fall back on `config.authentication.logInUrl`).
- `config.authentication.userManagementPage = 'webgme-user-management-page'`
 - Replaceable user-management page to use (use this if you have a fork of [webgme-user-management-page](https://github.com/webgme/user-management-page)).
 Given router will be mounted at `/profile`.
- `config.authentication.salts = 10`
 - Strength of the salting of the users' passwords [bcrypt](https://github.com/dcodeIO/bcrypt.js).
- `config.authentication.authorizer.path = 'node_modules/webgme-engine/src/server/middleware/auth/defaultauthorizer'`
 - Path (absolute) to module implementing `AuthorizerBase` (located next to `defaultauthorizer`) for getting and setting authorization regarding projects and project creation.
- `config.authentication.authorizer.options = {}`
 - Optional options passed to authorizer module at initialization (via gmeConfig).
- `config.authentication.jwt.cookieId = 'access_token'`
 - Id of token used when placed inside of a cookie.
- `config.authentication.jwt.expiresIn = 3600 * 24 * 7`
 - Lifetime of tokens in seconds.
- `config.authentication.jwt.renewBeforeExpires = 3600`
 - Interval in seconds, if there is less time until expiration the token will be automatically renewed. (Set this to less or equal to 0 to disabled automatic renewal.)
- `config.authentication.jwt.privateKey = 'node_modules/webgme-engine/src/server/middleware/auth/EXAMPLE_PRIVATE_KEY'`
 - Private RSA256 key used when generating tokens (N.B. if authentication is turned on - the defaults must be changed and the keys must reside outside of the app's root-directory or alt. a rule should be added to `config.server.extlibExcludes`).
- `config.authentication.jwt.publicKey = 'node_modules/webgme-engine/src/server/middleware/auth/EXAMPLE_PRIVATE_KEY'`
 - Public RSA256 key used when evaluating tokens.
- `config.authentication.jwt.algorithm = 'RS256'`
 - The algorithm used for encryption (should not be edited w/o changing keys appropriately).
- `config.authentication.jwt.tokenGenerator = 'node_modules/webgme-engine/src/server/middleware/auth/localtokengenerator.js'`
 - Replaceable module for generating tokens in case webgme should not generated new tokens by itself.
- `config.authentication.adminAccount = null`
 - If specified, will create an admin account at the given username at server startup. By default a random password will be generated and logged in the terminal - to specify a password add a `:`, e.g. `'admin:password'`.
(Once the admin exists the password will not be updated at startup.)
- `config.authentication.publicOrganizations = []`
 - Array of organizations to be created at server startup. New users will be added as members to these organizations. (Note that the guest account will not be added to the organizations.)
- `config.authentication.encryption.algorithm = aes-256-cbc`
 - The type of algorithm used for data encryption. To get an idea of what algorithms you can use, check the [nodejs](https://nodejs.org/dist/latest-v12.x/docs/api/crypto.html#crypto_crypto_createcipheriv_algorithm_key_iv_options) descriptions as well as [openSSL](https://www.openssl.org/docs/man1.0.2/man1/ciphers.html).
- `config.authentication.encryption.key` = './src/server/middleware/auth/EXAMPLE_ENCRYPTION_KEY'`
 - Key file used for data cipher.
- `config.authentication.allowPasswordReset = false`
 - Allows password reset functionality (option to change password without successful login). For maximum security check [mailer](#mailer) options.
- `config.authentication.allowedResetInterval = 3600000`
 - The frequency in milliseconds of the allowed reset requests.
- `config.authentication.resetTimeout = 1200000`
 - The maximum interval of validity of the reset. This means that the password has to be changed within this interval (otherwise the user has to wait until a new request can be made).
- `config.authentication.resetUrl = '/profile/reset'`
 - Location of the reset page where the user should be guided to input the new password. The whole reset procedure can be done with purely REST API calls, but it is usually safer to include an email in the process.

##### azureActiveDirectory
- `config.authentication.azureActiveDirectory.enable = false`
 - When set to true, WebGME will try to authenticate users with the configured azure endpoints. It is also going to
 maintain an additional token in case there is an azure service also configured. Check for further config and deployment info on the [wiki page](https://github.com/webgme/webgme/wiki/Using-Azure-Active-Directory).
- `config.authentication.azureActiveDirectory.clientId = 'Example_Client_Id'`
 - The id of the azure app that is configured to cover the WebGME deployment.
- `config.authentication.azureActiveDirectory.authority = 'Example_authority_URI'`
 - The URI of the azure endpoint that handles the authentication (usually the org that has the accounts).
- `config.authentication.azureActiveDirectory.jwksUri = 'https://login.microsoftonline.com/common/discovery/keys'`
 - The URI where WebGME can ask for the JSON web key sets for AAD issued token verification.
- `config.authentication.azureActiveDirectory.issuer = 'Example_token_issuer_for_verification'`
 - The URI of the entity who issued the token - almost the same as the authority, but this one is version sensitive
 so they cannot share the config value.
- `config.authentication.azureActiveDirectory.audience = 'Example_audience_for_token_validation'`
 - The azure application id who was the target of the token. When an accessScope is defined, this id should be
 the application id of the scope's provider. Without it, it can simply be the WebGME azure application id (clientId).
- `config.authentication.azureActiveDirectory.clientSecret = 'Example_client_Secret'`
 - This is the secret that is generated on azure so the web application and the 'WebGME client' can share it for
 authentication purposes - be sure not to make it public in any way.
- `config.authentication.azureActiveDirectory.cookieId = 'webgme_aad'`
 - The cookieId for the access token - if configured.
- `config.authentication.azureActiveDirectory.redirectUri = 'need to set this temp, would be nice to deduct it'`
 - The URI where azure should send the post 'response' request once the user gets authenticated. This configuration
 has to match to one entry in the azure configuration of the WebGME.
- `config.authentication.azureActiveDirectory.accessScope = null`
 - If set, it points to an azure service that the users/WebGME components might want to access. The token cookie will
 only get populated if this field is set. Also, as we only deal with access tokens, fields 
 `cookieId, jwksUri, issuer, audience` are only used (but also required) if this field is set.

#### api

- `config.api.useEnhancedStarterPage = false`
 - When set to true, the index page will be returned as a fully featured HTML instead of the plain JSON response.

#### bin

- `config.bin.log = see webgme-engine config.default`
 - Logger settings when running bin scripts.

#### blob
- `config.blob.compressionLevel = 0`
 - Compression level of DEFLATE (between 0 and 9) to use when serving bundled complex artifacts.
- `config.blob.type = 'FS'`
 - Type of storage, available options: `'FS'` (File System), `'S3'` (Simple Storage Service).
- `config.blob.fsDir = './blob-local-storage'`
 - Directory where to store the blob files in case of `'FS'`.
- `config.blob.namespace = ''`
 - If defined and not empty the blob buckets will be put under the given namespace.
- `config.blob.s3 = {}`
 - S3 configuration passed to `aws-sdk` module. See config.default.js for local mock example.

#### client

- `config.client.appDir = './src/client'`
 - Directory from where to serve the static files for the webapp. This should only be modified if you are using a custom UI.
- `config.client.faviconPath = 'img/favicon.ico'`
 - Path to favicon (e.g. put an ico file in your app's root dir and set this to `/extlib/favicon.ico`).
- `config.client.pageTitle = null`
 - Custom title for app, if not given the default title will be the name/id of the open project (or WebGME).
- `config.client.log.level = 'debug'`
 - When [debug](https://github.com/visionmedia/debug) is activated in the browser (type `localStorage.debug = gme*` in the console and refresh the page) messages below this level will not be printed.
- `config.client.defaultConnectionRouter = 'basic3'`
 - Default connection router to use when opening up a new model, available options (ordered by level of complexity and sophistication) are: 'basic', 'basic2' and 'basic3'.
- `config.client.errorReporting.enable = false`
 - Enable [raven-js](https://docs.sentry.io/clients/javascript/) to automatically send reports to the provided url. [Sentry.io](https://sentry.io) provides free plans and comes with an easy ui that supports releases, source maps etc.
- `config.client.errorReporting.DSN = ''`
 - Url like endpoint for raven-js e.g. 'https://****@sentry.io/999999'.
- `config.client.errorReporting.ravenOptions = null`
 - Options passed to the [raven-client](https://docs.sentry.io/clients/javascript/config/), if not specified {release: <webgmeversion>} will be passed.
- `config.client.allowUserDefinedSVG = true`
 - Set to false to disabled injection of user-defined svgs into the DOM.

#### core

- `config.core.enableCustomConstraints = false`
 - If true will enable validation (which takes place on the server) of custom constraints defined in the meta nodes.

#### debug

- `config.debug = false`
 - If true will add extra debug messages and also enable experimental Visualizers, (URL equivalent (only on client side) `?debug=true`).

#### executor

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

#### mongo
- `config.mongo.uri = 'mongodb://127.0.0.1:27017/multi'`
 - MongoDB connection [uri](http://docs.mongodb.org/manual/reference/connection-string/)
- `config.mongo.options = see webgme-engine config.default`
 - Options for [MongoClient.connect](https://mongodb.github.io/node-mongodb-native/api-generated/mongoclient.html#connect)

#### plugin
- `config.plugin.allowBrowserExecution = true`
 - If true will enable execution of plugins in the browser.
- `config.plugin.allowServerExecution = false`
 - If true will enable execution of plugins on the server.
- `config.plugin.basePaths = ['node_modules/webgme-engine/src/plugin/coreplugins']`
 - Note, this is handled by [webgme-cli](https://github.com/webgme/webgme-cli).
- `config.plugin.displayAll = false`
 - If true there is no need to register plugins on the root-node of project - all will be available from the drop-down.
- `config.plugin.serverResultTimeout = 60000`
 - Time, in milliseconds, results will be stored on the server after they have finished (when invoked via the REST api).


#### requirejsPaths
- `config.requirejsPaths = {}`
 - Custom paths that will be added to the `paths` of [requirejs configuration](http://requirejs.org/docs/api.html#config).
 Paths added here will also be served under the given key, i.e. `{myPath: './aPath/aSubPath/'}` will expose files via `<host>/myPath/someFile.js`.


##### rest
- `config.rest.components = {}`
 - Collection of external rest routes index by their (unique) ids. The value is an object with keys; `src` file-path (or name)
 to the module defining the router, `mount` where the router will be mounted relative the <host>, `options` an object with setting for the specific router.
 Use the `RestRouterGenerator` plugin to generate a template router (see the generated file for more info).

#### seedProjects
- `config.seedProjects.enable = true`
 - Enables creation of new projects using seeds.
- `config.seedProjects.allowDuplication = true`
 - Enables duplication of entire project with full history (requires at least mongodb 2.6).
- `config.seedProjects.defaultProject = 'EmptyProject'`
 - Used by the GUI when highlighting/selecting the default project to seed from.
- `config.seedProjects.basePaths = ['node_modules/webgme-engine/seeds']`
 - List of directories where project seeds are stored.
- `config.seedProjects.createAtStartup= []`
 - Array of descriptions of projects to be created at server start up. The descriptions have the following form:
```
{
  seedId: 'EmptyProject',
  projectName: 'StartProject',
  creatorId: 'siteAdminOrAnAdminInOwnerOrg', // If not given the creator will be the auth.admin
  ownerId: 'MyPublicOrg' // If not given will be the creator
  rights: {
    MyPublicOrg: { read: true, write: false, delete: false }, // The owner will have full access by default
    guest: { read: true }
  }
}
```

#### server
- `config.server.port = 8888`
 - Port the server is hosted from.
- `config.server.handle = null`
 - Optional handle object passed to [server.listen](https://nodejs.org/api/http.html#http_server_listen_handle_callback) (aligning port must still be given).
- `config.server.timeout = -1`
 - If greater than -1 will set the [timeout property of the http-server](https://nodejs.org/api/http.html#http_server_timeout). (This can be used to enable large, > 1Gb, file uploads.)
- `config.server.maxWorkers = 10`
 - Maximum number of child processes spawned by the default worker manager (plus one waiting).
- `config.server.maxQueuedWorkerRequests = -1`
 - Maximum number of queued server worker requests when all workers are busy (if `-1` there is no limit). When the limit is met, the worker request will return with an error immediately.
- `config.server.workerDisconnectTimeout = 2000`
 - After a disconnection, the time in ms that a worker will wait for reconnection before terminating its execution.
- `config.server.workerManager.path = 'node_modules/webgme-engine/src/server/worker/serverworkermanager'`
 - Path to module (implementing `node_modules/webgme-engine/src/server/worker/WorkerManagerBase`) handling worker requests.
- `config.server.workerManager.options = {}`
 - Options for non-default workerManager (valid fields depend on type of worker-manager).
- `config.server.log = see webgme-engine default.config`
 - Transports and options for the server (winston) logger.
- `config.server.extlibExcludes = ['.\.pem$', 'config\/config\..*\.js$']`
 - Array of regular expressions that will hinder access to files via the '/extlib/' route. Requests to files matching any of the provided pattern will result in 403.
- `config.server.behindSecureProxy = false`
 - Indicate if the webgme server is behind a secure proxy (needed for adding correct OG Metadata in index.html).

#### socketIO
- `config.socketIO.clientOptions = see webgme-engine default.config`
 - Options passed to the [socketIO client](https://github.com/socketio/socket.io-client#managerurlstring-optsobject) when connecting to the sever.
- `config.socketIO.serverOptions = see webgme-engine default.config`
 - Options passed to the [socketIO server](https://github.com/socketio/engine.io#methods-1) when attaching to the server.

#### storage
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
- `config.storage.disableHashChecks = false`
 - Since v2.6.2 patched objects on the server are being checked for consistency w.r.t. the provided hash before insertion into database. If true, no checking at all will take place.
- `config.storage.requireHashesToMatch = true`
 - If `config.storage.disableHashChecks` is set to false and this option is set to true, will not insert objects if the hashes do not match. Set this to false to only log the errors.
- `config.storage.autoMerge.enable = false`
 - (N.B. Experimental feature) If enable, incoming commits to branches that initially were `FORKED` will be attempted to be merged with the head of the branch. Use with caution as larger (+100k nodes) projects can slow down the commit rate.
- `config.storage.database.type = 'mongo'`
 - Type of database to store the data (metadata e.g. _users is always stored in mongo), can be `'mongo'`, `'redis'` or `'memory'`.
- `config.storage.database.options = '{}'`
 - Options passed to database client (unless mongo is specified, in that case `config.mongo.options` are used).

#### visualization
- `config.visualization.decoratorPaths = ['../src/client/decorators']`
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

#### webhooks
- `config.webhooks.enable = true`
 - If true will start a webhook-manager from the server.
- `config.webhooks.manager = 'memory'`
 - Type of webhook-manager for detecting events, can be `'memory'`, `'redis'`. Memory runs in the server process, whereas redis
 is running in a sub-process. Redis requires the socket.io adapter to be of type redis. (It is also possible to run the redis manager separately from the webgme server.)
- `config.webhooks.defaults = {}`
 - Collection of hooks that should be added to every new project. Keys are webhook-ids and values are object with at least `url` and `events` defined, see [wiki](https://github.com/webgme/webgme/wiki/GME-WebHooks) for available fields.
 Optionally an `options` object can be passed to be used by the specific webhook (to disable automatic addition leave out the `url` field).
