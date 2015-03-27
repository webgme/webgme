//TODO: This file must be revised

var nodeRequire = require;

if (process.argv.length != 4) {
    throw new Error("Usage: node " + process.argv[1] + " URL (zipfile or *.zip)");
}
var webGMEUrl = process.argv[2];
var filearg = process.argv[3];

var requirejs = require('requirejs');
requirejs.config({
    baseUrl: __dirname + '/..',
    paths: {
        //WebGME custom modules
        "eventDispatcher": '../webgme/common/EventDispatcher',
        "notificationManager": 'js/NotificationManager',
        "clientUtil": 'js/util',
        "loaderCircles": "js/Loader/LoaderCircles",
        "loaderProgressBar": "js/Loader/LoaderProgressBar",

        "codemirror": 'lib/codemirror/codemirror.amd',
        "jquery-csszoom": 'lib/jquery/jquery.csszoom',

        "jszip": 'lib/jszip/jszip',
        "executor": 'src/rest/executor',
        "executor_old": 'src/rest/executor_old',
        'blob': '../webgme/src/middleware/blob',
        'superagent': 'lib/superagent/superagent'
        },
    nodeRequire: nodeRequire
});

var url = require('url');
var path = require('path');
var fs = require('fs');
var webGMEPort = url.parse(webGMEUrl).port || (url.parse(webGMEUrl).protocol === 'https:' ? 443 : 80);
GLOBAL.WebGMEGlobal =  { getConfig: function() { return { server: url.parse(webGMEUrl).hostname, serverPort: webGMEPort, httpsecure: url.parse(webGMEUrl).protocol === 'https:' }; } };

requirejs(['blob/BlobClient', 'minimatch'], function(BlobClient, minimatch) {
    var files;
    if (filearg === "*.zip" || filearg === "*zip")
        files = fs.readdirSync(".").filter(minimatch.filter("*.zip", {matchBase: true}));
    else
        files = [filearg];

    var hashes = {};
    var blobClient = new BlobClient(GLOBAL.WebGMEGlobal.getConfig());
    var completed = 0;
    
    for (var i = 0; i < files.length; i++) {
        (function putFile(zipfile) {
        blobClient.putFile(path.basename(zipfile), fs.readFileSync(zipfile), function (err, hash) {
            if (err) fatal(err);
            // console.log(zipfile + " hash " + hash);
            hashes[path.basename(zipfile, ".zip")] = hash
            if (++completed === files.length) {
                console.log(JSON.stringify(hashes, null, 4));
            }
        });
        })(files[i]);
    }
});

function fatal(msg) {
    console.error(msg);
    process.exit(2);
}
