({
  name: "webgme.classes",
  out: "../../../dist/webgme.classes.build.js",
  baseUrl: "../../../",
  paths: {
    "webgme.classes": "./utils/build/webgme.classes/webgme.classes",
    util: "./src/common/util",
    eventDispatcher: "./src/common/EventDispatcher",
    core: "./src/common/core",
    coreclient: "./src/common/core/users",
    storage: "./src/common/storage",
    logManager: "./src/common/LogManager",
    blob: "./src/middleware/blob",
    superagent: "./node_modules/superagent/superagent",
    client: "./src/client/js/client",
    plugin: "./src/plugin",
    js: './src/client/js/',
    'js/Dialogs/PluginConfig/PluginConfigDialog': './utils/build/empty/empty'
  },
  optimize: "none",
  generateSourceMaps: true,
  insertRequire: ["webgme.classes"],
  include: ['./node_modules/requirejs/require'],
  wrap: {
    start: "var GME = GME || {}; GME.classes = GME.classes || {};(function(){",
    end: "}());"
  }
})