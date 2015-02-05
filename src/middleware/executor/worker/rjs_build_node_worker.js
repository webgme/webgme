({
    name: "node_worker",
    out: "node_worker.classes.build.js",
    baseUrl: "./",
    paths: {
        eventDispatcher: "node_modules/webgme/src/common/EventDispatcher",
        logManager: "node_modules/webgme/src/common/LogManager",
        blob: "node_modules/webgme/src/middleware/blob",
        core: "node_modules/webgme/src/common/core",
        executor: "../src/rest/executor",
        superagent: "empty:",
        fs: "empty:",
        util: "empty:",
        events: "empty:",
        path: "empty:",
        child_process: "empty:",
        minimatch: "empty:",
        rimraf: "empty:",
        url: "empty:"
    },
    optimize: "none",
    include: ['./node_modules/requirejs/require'],
    wrap: {
        end: "module.exports.require = require;\nmodule.exports.requirejs = requirejs;\nmodule.exports.define = define;\n"
    }
})