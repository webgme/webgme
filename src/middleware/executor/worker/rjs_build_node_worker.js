({
    name: "node_worker",
    out: "node_worker.classes.build.js",
    baseUrl: "./",
    paths: {
        common: "../../../common",
        blob: "../../../middleware/blob",
        core: "../../../common/core",
        executor: "..",
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