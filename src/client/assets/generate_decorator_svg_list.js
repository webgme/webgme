/*jshint node:true*/

/**
 * @author rkereskenyi / https://github/rkereskenyi
 * @author brollb / https://github/brollb
 * @author pmeijer / https://github/pmeijer
 */

'use strict';
var fs = require('fs'),
    Q = require('q'),
    path = require('path'),
    _outFileName = 'decoratorSVG.js',
    svgFolder = 'DecoratorSVG',
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
            file = path.join(dir, file);
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

function generateSvgList(callback) {
    var deferred = Q.defer(),
        svgDir = path.join(__dirname, svgFolder),
        outFilename = path.join(__dirname, _outFileName);
    walk(svgDir, function (err, list) {
        if (!err) {
            var fileList = list.map(function (svgFilePath) {
                return path.relative(svgDir, svgFilePath);
            });
            fileList = JSON.stringify(fileList).replace(/\\\\/g, '/');
            fs.writeFile(outFilename, FILECONTENT.replace('___FILELIST___', fileList), function (err) {
                if (err) {
                    deferred.reject(err);
                } else {
                    deferred.resolve(outFilename);
                }
            });
        } else {
            deferred.reject(err);
        }
    });

    return deferred.promise.nodeify(callback);
}

module.exports = generateSvgList;

if (require.main === module) {
    generateSvgList()
        .then(function (outFilename) {
            console.log(outFilename + ' has been generated\n');
        })
        .catch(function (err) {
            console.log('Failed with error: ', err);
        });
}
