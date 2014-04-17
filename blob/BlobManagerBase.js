/**
 * Created by tkecskes on 4/11/2014.
 */
'use strict';
define(["jszip"], function (ZIP) {

    var BlobManagerBase = function () {

    };

    BlobManagerBase.prototype.save = function (info, blob, callback) {
        throw new Error('this function needs to be overridden');
    };

    BlobManagerBase.prototype.load = function (id, callback) {
        throw new Error('this function needs to be overridden');
    };

    BlobManagerBase.prototype.loadInfos = function (query, callback) {
        throw new Error('this function needs to be overridden');
    };

//
//    BlobManagerBase.prototype.putContent = function (name, extension, content, callback) {
//        var self = this;
//
//        if (extension === ".zip" || extension === ".fmu") {
//            // TODO: Would this scale for really big zip packages?
//            // open zip and save individual files
//            var zip = new ZIP(content);
//            var fileObjects = zip.filter(function(relativePath, file) {
//                return !file.options.dir;
//            });
//
//            var contentDescriptor = {};
//            var remainingObjects = fileObjects.length;
//            var error = '';
//            // TODO: would this scale with thousands of files in the zip?
//            for (var i = 0; i < fileObjects.length; i += 1) {
//                (function(fname, blob){
////                    var zip = new ZIP();
////                    zip.file(blob, fname);
//
//                    self.save({name:fname}, blob, function (err, hash) {
//                        remainingObjects -= 1;
//
//                        if (err) {
//                            error += err;
//                            return;
//                        }
//
//                        contentDescriptor[fname] = hash;
//
//                        if (remainingObjects === 0) {
//                            if (error) {
//                                callback(error);
//                                return;
//                            }
//
//                            var sortedDescriptor = {};
//
//                            var fnames = Object.keys(contentDescriptor);
//                            fnames.sort();
//                            for (var j = 0; j < fnames.length; j += 1) {
//                                sortedDescriptor[fnames[j]] = contentDescriptor[fnames[j]];
//                            }
//
//
//                            self.save({name:name, complex:true}, JSON.stringify(sortedDescriptor), callback);
//                        }
//                    });
//                })(fileObjects[i].name, zip.file(fileObjects[i].name).asBinary());
//            }
//
//        } else {
//            // 'regular' save
//            self.save({name:name}, content, callback);
//        }
//    };

    BlobManagerBase.prototype.getContent = function (hash, callback) {
        var self = this;

        var info = self.getInfo(hash);
        // replace extension to zip
        var filename = info.filename.substring(0, info.filename.lastIndexOf('.')) + '.zip';

        if (info.complex) {
            self.load(hash, function (err, content) {
                var desc = JSON.parse(content);
                var zip = new ZIP();

                var keys = Object.keys(desc);
                var remaining = keys.length;

                if (remaining === 0) {
                    // empty zip no files contained
                    // FIXME: this empty zip is not handled correctly.
                    callback(null, zip.generate({type:'nodeBuffer'}), filename);
                    return;
                }

                for (var i = 0; i < keys.length; i += 1) {
                    (function(subpartHash, subpartName){
                        //var subpartInfo = self.getInfo(subpartHash);
                        self.load(subpartHash, function (err, subpartContent) {
                            remaining -= 1;

                            // TODO: what if error?
                            zip.file(subpartName, subpartContent);

                            if (remaining === 0) {
                                callback(null, zip.generate({type:'nodeBuffer'}), filename);
                            }
                        });
                    })(desc[keys[i]], keys[i])
                }


            });
        } else {
            self.load(hash, callback);
        }
    };


    return BlobManagerBase
});
