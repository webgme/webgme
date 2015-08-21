/*jshint node:true*/

/**
 * @author rkereskenyi / https://github/rkereskenyi
 * @author brollb / https://github/brollb
 * @author pmeijer / https://github/pmeijer
 */

'use strict';
var requirejs = require('requirejs'),
    path = require('path'),
    fs = require('fs'),
    CONSTANTS,
    SVG_DIR,
    _outFileName = 'decoratorSVG.js',
    FILECONTENT = '/*\n' +
        '* GENERATED DECORATOR SVG ICON FILES *      \n' +
        '* DO NOT EDIT MANUALLY *    \n' +
        '* TO GENERATE PLEASE RUN node generate_decorator_svg_list.js    \n' +
        '*/  \n' +
        '\n' +
        'define([], function () {    \n' +
        '    \'use strict\';           \n' +
        '                            \n' +
        '    return {               \n' +
        '        DecoratorSVGIconList: ___FILELIST___  \n' +
        '    };                      \n' +
        '});';

requirejs.config({
    nodeRequire: require,
    baseUrl: path.join(__dirname, '..', '..'),
    paths: {
        underscore: 'client/lib/underscore/underscore-min',
        js: 'client/js'
    }
});

CONSTANTS = requirejs('client/js/Constants');
SVG_DIR = CONSTANTS.ASSETS_DECORATOR_SVG_FOLDER.replace('assets/', '');

//Recursively search through directories
function walk (dir, done) {
    var results = [];
    fs.readdir(dir, function (err, list) {
        if (err) {
            return done(err);
        }
        var pending = list.length;
        if (!pending) {
            return done(null, results);
        }
        list.forEach(function (file) {
            file = dir + '/' + file;
            fs.stat(file, function (err, stat) {
                if (stat && stat.isDirectory()) {
                    walk(file, function (err, res) {
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
}

walk(SVG_DIR.replace('/', ''), function (err, list) {
    if (!err) {
        var fileList = JSON.stringify(list).split(SVG_DIR).join('');
        fs.writeFileSync(_outFileName, FILECONTENT.replace('___FILELIST___', fileList));
        console.log(_outFileName + ' has been generated\n');
    } else {
        console.log('Failed with error: ' + err);
    }
});


