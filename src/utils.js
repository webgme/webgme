/*globals*/
/*jshint node:true*/

/**
 * @author lattmann / https://github.com/lattmann
 */

'use strict';

var fs = require('fs'),
    Q = require('q'),
    genDecoratorSvgList = require('./client/assets/generate_decorator_svg_list'),
    ncp = require('ncp'), // Module for copying entire directory
    path = require('path');

/**
 * @param name
 * @param filePath
 * @returns {boolean}
 */
function isGoodExtraAsset(name, filePath) {
    try {
        fs.readFileSync(path.join(filePath, name + '.js'), 'utf-8');
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * @param basePaths
 * @returns {Array.<T>}
 */
function getComponentNames(basePaths) {
    var names = [], //we add only the "*.js" files from the directories
        additional,
        i,
        j;

    basePaths = basePaths || [];
    for (i = 0; i < basePaths.length; i += 1) {
        additional = fs.readdirSync(basePaths[i]);
        for (j = 0; j < additional.length; j += 1) {
            if (names.indexOf(additional[j]) === -1) {
                if (isGoodExtraAsset(additional[j], path.join(basePaths[i], additional[j]))) {
                    names.push(additional[j]);
                }
            }
        }
    }
    return names.sort();
}

/**
 * @param gmeConfig
 * @param logger
 * @param callback
 * @returns {*}
 */
function copySvgDirsAndRegenerateSVGList(gmeConfig, logger, callback) {
    var deferred = Q.defer(),
        svgAssetDir = path.join(__dirname, 'client', 'assets', 'DecoratorSVG');

    ncp.stopOnErr = true;

    Q.all(gmeConfig.visualization.svgDirs.map(function (svgDir) {
        var dirName = path.parse(svgDir).name,
            destination = path.join(svgAssetDir, dirName);

        logger.info('Custom SVGs will be copied', svgDir, destination);

        return Q.nfcall(ncp, svgDir, destination);
    }))
        .then(function () {
            return genDecoratorSvgList();
        })
        .then(function (svgList) {
            logger.info('New SVG list generated at ', svgList);
            deferred.resolve();
        })
        .catch(function (err) {
            logger.error('Failed copying over custom svg directories', err);
            deferred.reject(err);
        });

    return deferred.promise.nodeify(callback);
}


function getPackageJson(callback) {
    var fname = path.join(__dirname, '..', 'package.json');

    return Q.nfcall(fs.readFile, fname, 'utf8')
        .then(function (content) {
            return JSON.parse(content);
        })
        .nodeify(callback);
}

function getPackageJsonSync() {
    var fname = path.join(__dirname, '..', 'package.json'),
        content = fs.readFileSync(fname, 'utf8');

    return JSON.parse(content);
}

module.exports = {
    isGoodExtraAsset: isGoodExtraAsset,
    getComponentNames: getComponentNames,
    copySvgDirsAndRegenerateSVGList: copySvgDirsAndRegenerateSVGList,
    getPackageJson: getPackageJson,
    getPackageJsonSync: getPackageJsonSync,
};
