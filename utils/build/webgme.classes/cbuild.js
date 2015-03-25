({
  name: "webgme.classes",
  out: "../../../dist/webgme.classes.build.js",
  baseUrl: "../../../src",
  paths: {
    "webgme.classes": "../utils/build/webgme.classes/webgme.classes",
    blob: "./middleware/blob",
    executor: "./middleware/executor",
    superagent: "./client/lib/superagent/superagent",
    js: './client/js/',
    'js/Dialogs/PluginConfig/PluginConfigDialog': '../utils/build/empty/empty'
  },
  optimize: "none",
  generateSourceMaps: true,
  insertRequire: ["webgme.classes"],
  include: ['../node_modules/requirejs/require'],
  wrap: {
    startFile: 'start.frag',
    endFile: 'end.frag'
  }
})