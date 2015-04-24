/*jshint node:true*/

/**
 * Client module for accessing the blob.
 *
 * @author lattmann / https://github.com/lattmann
 */

'use strict';

var requirejs = require('requirejs');
requirejs.config({
    baseUrl: __dirname,
    nodeRequire: require
});

var BlobManager = requirejs('./BlobManagerFS');
var blobManager = new BlobManager();

blobManager.initialize(function (err) {
    if (err) {
        console.error(err);
        return;
    }


    blobManager.putContent('x', '.txt', 'sssssss', function (err /*, hash*/) {
        if (err) {
            console.error(err);
            return;
        }

        console.log('ok');
    });


    var fs = require('fs');
    var path = require('path');

    var testdir = 'files';
    var sourceFiles = fs.readdirSync(testdir);
    var remaining = sourceFiles.length;

    var savedContentHashes = [];

    var readitBack = function () {
        console.log('reading them back');
        function writeContent(hash, desc) {
            blobManager.getContent(hash, function (err, content) {
                if (err) {
                    console.log(err);
                    return;
                }
                fs.writeFileSync(desc.filename, content);
            });
        }
        for (var i = 0; i < savedContentHashes.length; i += 1) {
            writeContent(savedContentHashes[i], blobManager.getMetadata(savedContentHashes[i]));
        }
    };

    function putContent(file) {
        blobManager.putContent(path.basename(file), path.extname(file), fs.readFileSync(file), function (err, hash) {
            remaining -= 1;

            if (err) {
                console.error(err);
                return;
            }

            savedContentHashes.push(hash);

            if (remaining === 0) {
                console.log(sourceFiles.length + ' are stored');
                readitBack();
            }
        });
    }
    for (var i = 0; i < sourceFiles.length; i += 1) {
        putContent(path.join(testdir, sourceFiles[i]));
    }
});