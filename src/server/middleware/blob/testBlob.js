/**
 * Created by zsolt on 4/19/14.
 */

var fs = require('fs');

var requirejs = require('requirejs');
requirejs.config({
    baseUrl: __dirname + '../../..',
    nodeRequire: require
});

var BlobBackend = requirejs('server/middleware/blob/BlobFSBackend');
//var BlobBackend = requirejs('blob/BlobS3Backend');
var blobBackend = new BlobBackend();

var filename = 'sample.js';
blobBackend.putFile(filename, fs.createReadStream(filename), function (err, hash) {
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

var addFilesFromTestDir = function (testdir, callback) {
    var path = require('path');
    var sourceFiles = fs.readdirSync(testdir);
    var maxItems = 20;
    var remaining = Math.min(sourceFiles.length, maxItems);

    var startTime = new Date();

    if (sourceFiles.length === 0) {
        callback();
    }

    for (var i = 0; i < Math.min(sourceFiles.length, maxItems); i += 1) {
        var fname = path.join(testdir, sourceFiles[i]);
        (function (file) {

            blobBackend.putFile(file, fs.createReadStream(file), function (err, hash) {
                if (err) {
                    console.log(err);
                }

                console.log(file + ' : ' + hash);

                remaining -= 1;
                //numFiles += 1;
                //size += blobStorage.getMetadata(hash).size;

                if (remaining === 0) {
                    // done
                    //done(numFiles, size);
                    var diff = (new Date()) - startTime;
                    console.log(diff / 1000 + 's');
                    callback();
                }
            });
        })(fname);
    }
};

var done = function() {
    blobBackend.listAllMetadata(true, function (err, allMetadata) {
        if (err) {
            console.log(err);
        }

        console.log(allMetadata);
    });
};


// 4GB, 22 files -> 42sec - FS
// 2GB, 21 files -> 18sec - FS
// 2GB, 21 files -> 65sec - fakeS3 2GB file copyObject failed
//addFilesFromTestDir('test-files');

// 2GB, 1025 files -> 19.2sec - FS
// 2GB, 1025 files -> 51.4sec - fakeS3 (2GB file copyObject failed)
addFilesFromTestDir('test-many-files', function () {
    done();
});


//blobBackend.listObjects(blobBackend.metadataBucket, function (err, hashes) {
//    if (err) {
//        console.log(err);
//    }
//
//    console.log(hashes);
//});

