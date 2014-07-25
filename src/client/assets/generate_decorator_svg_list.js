/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Authors: Robert Kereskenyi
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
        fileList = fs.readdirSync(SVG_DIR),
        _outFileName = 'decoratorSVG.js',
        FILECONTENT = "/*\n\
* GENERATED DECORATOR SVG ICON FILES *      \n\
* DO NOT EDIT MANUALLY *    \n\
* TO GENERATE PLEASE RUN node generate_decorator_svg_list.js    \n\
*/  \n\
\n\
define([], function () {    \n\
    'use strict';           \n\
                            \n\
    return {               \n\
        'DecoratorSVGIconList': ___FILELIST___  \n\
    };                      \n\
});";


    fs.writeFileSync(_outFileName, FILECONTENT.replace('___FILELIST___', JSON.stringify(fileList)));

    console.log(_outFileName + ' has been generated\n');
});

