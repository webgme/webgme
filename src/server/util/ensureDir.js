/*jshint node: true*/

/**
 * @module EnsureDir
 * @author lattmann / https://github.com/lattmann
 * @author https://github.com/samxxu/ensureDir
 */

'use strict';

var path = require('path'),
    fs = require('fs');

function _ensureDir(dir, mode, callback) {
    var existsFunction = fs.exists || path.exists;

    existsFunction(dir, function (exists) {
        if (exists) {
            return callback(null);
        }

        var current = path.resolve(dir);
        var parent = path.dirname(current);

        _ensureDir(parent, mode, function (err) {
            if (err) {
                return callback(err);
            }

            fs.mkdir(current, mode, function (err) {
                if (err) {
                    if (err.code === 'EEXIST') {
                        // this is ok as long as the directory exists
                        // FIXME: can it be a file?
                        callback(null);
                        return;
                    } else {
                        callback(err);
                        return;
                    }
                }
                callback(null);
            });
        });
    });
}

/**
 * ensure a directory exists, create it recursively if not.
 *
 * @param dir The directory you want to ensure it exists
 * @param mode Refer to fs.mkdir()
 * @param callback
 */

function ensureDir(dir, mode, callback) {
    if (mode && typeof mode === 'function') {
        callback = mode;
        mode = null;
    }

    //jshint bitwise: false
    mode = mode || parseInt('0777', 8) & (~process.umask());
    //jshint bitwise: true

    callback = callback || function () {
    };

    _ensureDir(dir, mode, callback);
}

module.exports = ensureDir;

