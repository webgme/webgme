/*jshint node: true*/

/**
 * @author lattmann / https://github.com/lattmann
 * https://github.com/samxxu/ensureDir
 */

var path = require('path'),
    fs = require('fs');

function _ensureDir(dir, mode, callback) {
    'use strict';
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

    mode = mode || 0777 & (~process.umask());

    callback = callback || function () {
    };

    _ensureDir(dir, mode, callback);
}

module.exports = ensureDir;

