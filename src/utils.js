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

function expressFileSending(httpResult, path, logger) {
    httpResult.sendFile(path, function (err) {
        //TODO we should check for all kind of error that should be handled differently
        if (err) {
            if (err.code === 'EISDIR') {
                // NOTE: on Linux status is 404 on Windows status is not set
                err.status = err.status || 404;
            }
            logger.warn('expressFileSending failed for: ' + path + ': ' + (err.stack ? err.stack : err));
            if (httpResult.headersSent === false) {
                httpResult.sendStatus(err.status || 500);
            }
        }
    });
}

function getRelPathFromUrlArray(urlArray) {
    urlArray.shift();
    urlArray.shift();
    urlArray.shift();
    var relPath = urlArray.join('/');
    if (!path.extname(relPath)) {  // js file by default
        relPath += '.js';
    }
    return relPath;
}

function getBasePathByName(pluginName, basePaths) {
    for (var i = 0; i < basePaths.length; i++) {
        var additional = fs.readdirSync(basePaths[i]);
        for (var j = 0; j < additional.length; j++) {
            if (additional[j] === pluginName) {
                return basePaths[i];
            }
        }
    }
}

function getGoodExtraAssetRouteFor(component, basePaths, logger, __baseDir) {
    // Check for good extra asset
    return function (req, res) {
        res.sendFile(path.join(__baseDir, req.path), function (err) {
            if (err && err.code !== 'ECONNRESET') {
                //this means that it is probably plugin/pluginName or plugin/pluginName/relativePath format
                // so we try to look for those in our config
                //first we check if we have the plugin registered in our config
                var urlArray = req.url.split('/'),
                    pluginName = urlArray[2] || null,
                    basePath,
                    baseAndPathExist,
                    relPath;

                relPath = getRelPathFromUrlArray(urlArray);
                basePath = getBasePathByName(pluginName, basePaths);
                baseAndPathExist = typeof basePath === 'string' && typeof relPath === 'string';
                if (baseAndPathExist &&
                    isGoodExtraAsset(pluginName, path.join(basePath, pluginName), logger)) {
                    expressFileSending(res, path.resolve(path.join(basePath, relPath)), logger);
                } else {
                    res.sendStatus(404);
                }
            }
        });
    };
}

/**
 * Unlike `getGoodExtraAssetRouteFor`, `getRouteFor` does not assume that the
 * resource hosts a main file which has the same structure as the parent directory.
 * That is, there are examples of panels (such as SplitPanel) in which the
 * main file does not adhere to the format "NAME/NAME+'Panel'"
 */
function getRouteFor(component, basePaths, __baseDir, logger) {
    //first we try to give back the common plugin/modules
    return function (req, res) {
        res.sendFile(path.join(__baseDir, req.path), function (err) {
            if (err && err.code !== 'ECONNRESET') {
                //this means that it is probably plugin/pluginName or plugin/pluginName/relativePath format
                // so we try to look for those in our config
                //first we check if we have the plugin registered in our config
                var urlArray = req.url.split('/'),
                    pluginName = urlArray[2] || null,
                    basePath,
                    relPath;

                urlArray.shift();
                urlArray.shift();
                relPath = urlArray.join('/');
                if (!path.extname(relPath)) {  // js file by default
                    relPath += '.js';
                }
                basePath = getBasePathByName(pluginName, basePaths);

                if (typeof basePath === 'string' && typeof relPath === 'string') {
                    expressFileSending(res, path.resolve(path.join(basePath, relPath)), logger);
                } else {
                    res.sendStatus(404);
                }
            }
        });
    };
}

function getRedirectUrlParameter(req) {
    //return '?redirect=' + URL.addSpecialChars(req.url);
    return '?redirect=' + encodeURIComponent(req.originalUrl);
}

function getSeedDictionary(config) {
    var names = [],
        result = {},
        seedName,
        extension,
        i,
        j;
    if (config.seedProjects.enable === true) {
        for (i = 0; i < config.seedProjects.basePaths.length; i++) {
            names = fs.readdirSync(config.seedProjects.basePaths[i]);
            for (j = 0; j < names.length; j++) {
                extension = path.extname(names[j]);

                if (extension.toLowerCase() === '.webgmex') {
                    seedName = path.basename(names[j], extension);
                    if (!result[seedName]) {
                        result[seedName] = config.seedProjects.basePaths[i] + '/' + seedName + extension;
                    }
                }
            }
        }
    }
    return result;
}

module.exports = {
    isGoodExtraAsset: isGoodExtraAsset,
    getComponentNames: getComponentNames,
    copySvgDirsAndRegenerateSVGList: copySvgDirsAndRegenerateSVGList,
    getPackageJson: getPackageJson,
    getPackageJsonSync: getPackageJsonSync,
    expressFileSending: expressFileSending,
    getGoodExtraAssetRouteFor: getGoodExtraAssetRouteFor,
    getRelPathFromUrlArray: getRelPathFromUrlArray,
    getRouteFor: getRouteFor,
    getBasePathByName: getBasePathByName,
    getRedirectUrlParameter: getRedirectUrlParameter,
    getSeedDictionary: getSeedDictionary,
};
