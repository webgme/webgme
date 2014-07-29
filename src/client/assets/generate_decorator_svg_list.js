/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.  *
 * @author rkereskenyi / https://github/rkereskenyi
 * @author brollb / https://github/brollb
 * 
 */

var requirejs = require("requirejs");

requirejs.config({
    nodeRequire: require,
    baseUrl: __dirname + "/../..",
    paths: {
        "underscore": 'client/lib/underscore/underscore-min'
    }
});

requirejs([ "fs", "client/js/Constants" ], function (fs, CONSTANTS) {
    "use strict";

    var SVG_DIR = CONSTANTS.ASSETS_DECORATOR_SVG_FOLDER.replace('assets/', ''),
        _outFileName = 'decoratorSVG.js',
        FILECONTENT = "/*\n" +
"* GENERATED DECORATOR SVG ICON FILES *      \n" +
"* DO NOT EDIT MANUALLY *    \n" +
"* TO GENERATE PLEASE RUN node generate_decorator_svg_list.js    \n" +
"*/  \n" +
"\n" +
"define([], function () {    \n" +
"    'use strict';           \n" +
"                            \n" +
"    return {               \n" +
"        'DecoratorSVGIconList': ___FILELIST___  \n" +
"    };                      \n" +
"});";

    //Recursively search through directories
    var walk = function(dir, done) {
        var results = [];
        fs.readdir(dir, function(err, list) {
            if (err) {
                return done(err);
            }
            var pending = list.length;
            if (!pending){ 
                return done(null, results);
            }
            list.forEach(function(file) {
                file = dir + '/' + file;
                fs.stat(file, function(err, stat) {
                    if (stat && stat.isDirectory()) {
                        walk(file, function(err, res) {
                            results = results.concat(res);
                            if (!--pending) {
                                done(null, results);
                            }
                        });
                    } else {
                        results.push(file);
                        if (!--pending) {
                            done(null, results);
                        }
                    }
                });
            });
        });
    };

    walk(SVG_DIR.replace('/',''), function(err, list){
        if (!err){
            var fileList = JSON.stringify(list).split(SVG_DIR).join("");
            fs.writeFileSync(_outFileName, FILECONTENT.replace('___FILELIST___', fileList));
            console.log(_outFileName + ' has been generated\n');
        } else {
            console.log("Failed with error: " + err);
        }
    });

});
