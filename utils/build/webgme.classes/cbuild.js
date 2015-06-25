({
  name: 'webgme.classes',
  out: '../../../dist/webgme.classes.build.js',
  baseUrl: '../../../src',
  paths: {
    'webgme.classes': '../utils/build/webgme.classes/webgme.classes',
    blob: './common/blob',
    executor: './common/executor',
    superagent: './client/lib/superagent/superagent-1.2.0',
    debug: './client/lib/debug/debug',
    q: './client/lib/q/q',
    js: './client/js/',
    lib: './client/lib/',
    'js/Dialogs/PluginConfig/PluginConfigDialog': '../utils/build/empty/empty',
    teststorage: '../teststorage'
  },
  optimize: 'none',
  generateSourceMaps: true,
  insertRequire: ['webgme.classes'],
  include: ['../node_modules/requirejs/require'],
  wrap: {
    startFile: 'start.frag',
    endFile: 'end.frag'
  }
})
