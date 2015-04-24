/*jshint node:true, bitwise: false*/

/**
 * @author lattmann / https://github.com/lattmann
 */
'use strict';

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');


function zeroPad(num, places) {
    var zero = places - num.toString().length + 1;
    return new Array(+(zero > 0 && zero)).join('0') + num;
}

//var makeBigFiles = function (testDir) {
//    if (fs.existsSync(testDir) === false) {
//        fs.mkdirSync(testDir);
//    }
//
//    for (var i = 0; i <= 21; i += 1) {
//        var filename = path.join(testDir, 'test' + zeroPad(i, 2) + '.bin');
//        if (fs.existsSync(filename)) {
//            fs.unlinkSync(filename);
//        }
//        var kbytes = 1 << i;
//
//        console.log(filename, kbytes);
//
//        for (var k = 0; k < kbytes; k += 1) {
//            var buf = crypto.randomBytes(1024);
//            fs.appendFileSync(filename, buf);
//        }
//    }
//};

var makeManyFiles = function (testDir) {
    if (fs.existsSync(testDir) === false) {
        fs.mkdirSync(testDir);
    }

    for (var i = 0; i <= 1024; i += 1) {
        var filename = path.join(testDir, 'test' + zeroPad(i, 8) + '.bin');
        if (fs.existsSync(filename)) {
            fs.unlinkSync(filename);
        }
        var kbytes = 1 << 11;

        console.log(filename, kbytes);

        for (var k = 0; k < kbytes; k += 1) {
            var buf = crypto.randomBytes(1024);
            fs.appendFileSync(filename, buf);
        }
    }
};

//makeBigFiles('test-files');
makeManyFiles('test-many-files');