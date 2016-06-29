/*jshint node:true*/
/**
 *
 * This script will combine all ejs files in the current directory (recursively)
 * into one Templates.js file. By requiring this file as TEMPLATE you can retrieve the
 * content of each original ejs file through TEMPLATES['plugin.js.ejs'].
 *
 * Usage: Run this script in the directory with the ejs-templates, e.g. '%YourPlugin%/Templates'.
 *
 * @author pmeijer / https://github.com/pmeijer
 * @author lattmann / https://github.com/lattmann
 * @ignore
 */

var main = function () {
    'use strict';
    var fs = require('fs'),
        isEjsFile = function (str) {
            var ending = '.ejs',
                lastIndex = str.lastIndexOf(ending);
            return (lastIndex !== -1) && (lastIndex + ending.length === str.length);
        },
        walk = function (dir, done) {
            var results = [];
            fs.readdir(dir, function (err, list) {
                if (err) {
                    return done(err);
                }
                var i = 0;
                (function next() {
                    var file = list[i];
                    if (!file) {
                        return done(null, results);
                    }
                    i += 1;
                    file = dir + '/' + file;
                    fs.stat(file, function (err, stat) {
                        if (stat && stat.isDirectory()) {
                            walk(file, function (err, res) {
                                results = results.concat(res);
                                next();
                            });
                        } else {
                            results.push(file);
                            next();
                        }
                    });
                })();
            });
        },
        content = {},
        fileName,
        i,
        templateContent;

    walk('.', function (err, results) {
        if (err) {
            throw err;
        }

        for (i = 0; i < results.length; i += 1) {
            fileName = results[i];
            console.info(fileName);
            if (isEjsFile(fileName)) {
                console.info('Was ejs -> added!');
                content[fileName.substring(2)] = fs.readFileSync(fileName, {'encoding': 'utf-8'});
            }
        }

        console.info(content);
        templateContent = '//jshint ignore: start\r\n';
        templateContent += '/* Generated file based on ejs templates */\r\n';
        templateContent += 'define([], function() {\r\n';
        templateContent += '    return ' + JSON.stringify(content, null, 4);
        templateContent += '});';

        fs.writeFileSync('Templates.js', templateContent);
        console.info('Created Templates.js');
    });
};

if (require.main === module) {
    main();
}