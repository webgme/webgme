({
    name: 'node_worker',
    out: 'node_worker.classes.build.js',
    baseUrl: './',
    paths: {
        common: '../../../../common',
        blob: '../../../../common/blob',
        core: '../../../../common/core',
        executor: '../../../../common/executor',
        superagent: 'empty:',
        fs: 'empty:',
        util: 'empty:',
        events: 'empty:',
        path: 'empty:',
        child_process: 'empty:', // jshint ignore:line
        minimatch: 'empty:',
        rimraf: 'empty:',
        url: 'empty:',
        q: 'empty:'
    },
    optimize: 'none',
    include: ['./node_modules/requirejs/require'],
    wrap: {
        end: 'module.exports.require = require;\n' +
             'module.exports.requirejs = requirejs;\nmodule.exports.define = define;\n'
    }
});