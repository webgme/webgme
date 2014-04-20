/**
 * Created by zsolt on 4/19/14.
 *
 * https://github.com/samxxu/ensureDir
 */

define(['path', 'fs'], function(path, fs) {

    /**
     * ensure a directory exists, create it recursively if not.
     *
     * @param dir The directory you want to ensure it exists
     * @param mode Refer to fs.mkdir()
     * @param callback
     */
    var ensureDir = function(dir, mode, callback) {
        if (mode && typeof mode === 'function') {
            callback = mode;
            mode = null;
        }

        mode = mode || 0777 & (~process.umask());

        callback = callback || function () {
        };

        _ensureDir(dir, mode, callback);
    };

    var _ensureDir = function(dir, mode, callback) {
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
    };

    return ensureDir;
});

