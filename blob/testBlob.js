/**
 * Created by zsolt on 4/19/14.
 */

var fs = require('fs');

var requirejs = require('requirejs');
requirejs.config({
    baseUrl: __dirname + '/..',
    nodeRequire: require
});

//var BlobBackend = requirejs('blob/BlobFSBackend');
var BlobBackend = requirejs('blob/BlobS3Backend');
var blobBackend = new BlobBackend();

var filename = 'sample.js';
blobBackend.addFile(filename, fs.createReadStream(filename), function (err, hash) {
    if (err) {
        console.log(err);
        return;
    }

    console.log(hash);

    blobBackend.getFile(hash, process.stdout, function (err, filename, contentType) {
        if (err) {
            console.log(err);
            return;
        }


    });
});
