/*jshint node: true*/

/**
 * @author kecso / https://github.com/kecso
 */
'use strict';

var webgme = require('../../webgme'),
    path = require('path'),
    CONTENT_TYPES = requireJS('blob/BlobMetadata').CONTENT_TYPES,
    REGEXP = requireJS('common/regexp'),
    FS = require('fs'),
    Q = require('q'),
    gmeConfig;

function getDataHashes(metaData) {
    var dataHashes = [],
        complexEntry;

    switch (metaData.contentType) {
        case CONTENT_TYPES.OBJECT:
            return [metaData.content];
        case CONTENT_TYPES.COMPLEX:
            for (complexEntry in metaData.content) {
                if (metaData.content[complexEntry].contentType === CONTENT_TYPES.OBJECT) {
                    dataHashes.push(metaData.content[complexEntry].content);
                }
            }
            return dataHashes;
        default:
            return [];
    }
}

function getUsedDataHashes(blobClient) {
    var deferred = Q.defer(),
        usedHashes = {},
        metaKeys,
        dataKeys,
        i, j;
    blobClient.listObjects('wg-metadata')
        .then(function (metaKeys_) {
            var promises = [];

            metaKeys = metaKeys_;
            for (i = 0; i < metaKeys.length; i += 1) {
                promises.push(blobClient.getMetadata(metaKeys[i]));
            }
            return Q.allSettled(promises);
        })
        .then(function (metaResults) {
            for (i = 0; i < metaResults.length; i += 1) {
                if (metaResults[i].state !== 'fulfilled') {
                    throw new Error('unable to get metadata information [' + metaKeys[i] + ']');
                }
                dataKeys = getDataHashes(metaResults[i].value);
                for (j = 0; j < dataKeys.length; j += 1) {
                    usedHashes[dataKeys[j]] = true;
                }
            }
            deferred.resolve(usedHashes);
        })
        .catch(deferred.reject);

    return deferred.promise;
}

function getUnusedDataHashes(blobClient) {
    var deferred = Q.defer(),
        allHashesArray,
        usedHashesObject,
        i;

    blobClient.listObjects('wg-content')
        .then(function (all) {
            allHashesArray = all;
            return getUsedDataHashes(blobClient);
        })
        .then(function (used) {
            usedHashesObject = used;
            i = allHashesArray.length;
            while (i--) {
                if (usedHashesObject[allHashesArray[i]] === true) {
                    allHashesArray.splice(i, 1);
                }
            }
            deferred.resolve(allHashesArray);
        })
        .catch(deferred.reject);

    return deferred.promise;
}

function gatherSoftLinks(blobClient, metaHash) {
    var deferred = Q.defer(),
        softLinks = [],
        complexEntry;

    blobClient.getMetadata(metaHash)
        .then(function (metaData) {
            var promises = [];
            if (metaData.contentType === CONTENT_TYPES.SOFT_LINK) {
                softLinks.push(metaData.content);
                promises.push(gatherSoftLinks(blobClient, metaData.content));
            } else if (metaData.contentType === CONTENT_TYPES.COMPLEX) {
                for (complexEntry in metaData.content) {
                    if (metaData.content[complexEntry].contentType === CONTENT_TYPES.SOFT_LINK) {
                        softLinks.push(metaData.content[complexEntry].content);
                        promises.push(gatherSoftLinks(blobClient, metaData.content[complexEntry].content));
                    }
                }
            }
            return Q.all(promises);
        })
        .then(function (results) {
            var i, j;
            for (i = 0; i < results.length; i += 1) {
                for (j = 0; j < results[i].length; j += 1) {
                    softLinks.push(results[i][j]);
                }
            }
            deferred.resolve(softLinks);
        })
        .catch(deferred.reject);

    return deferred.promise;
}

function getUsedMetaHashes(metadatastorage, storage, blobClient) {
    var metaHashes = {},
        deferred = Q.defer(),
        checkIndividualRecord = function (object, next) {
            var key;
            //looking for assets
            if (object.atr) {
                for (key in object.atr) {
                    //TODO why can't we inlcude BlobConfig???
                    if (typeof object.atr[key] === 'string' &&
                        REGEXP.BLOB_HASH.test(object.atr[key])) {
                        metaHashes[object.atr[key]] = true;
                    }
                }
            }
            next();
        },
        i, j,
        allProjects;

    metadatastorage.getProjects()
        .then(function (all) {
            var promises = [];

            allProjects = all;
            for (i = 0; i < allProjects.length; i += 1) {
                promises.push(storage.traverse({
                    projectId: allProjects[i]._id,
                    visitFn: checkIndividualRecord
                }));
            }
            return Q.all(promises);
        })
        .then(function () {
            var promises = [];

            for (i in metaHashes) {
                promises.push(gatherSoftLinks(blobClient, i));
            }
            return Q.all(promises);
        })
        .then(function (results) {
            results = results || [];
            for (i = 0; i < results.length; i += 1) {
                for (j = 0; j < results[i].length; j += 1) {
                    metaHashes[results[i][j]] = true;
                }
            }
            deferred.resolve(metaHashes);
        })
        .catch(deferred.reject);

    return deferred.promise;
}

function getUnusedMetaHashes(blobClient, metadatastorage, storage) {
    var deferred = Q.defer(),
        allHashesArray,
        i;

    blobClient.listObjects('wg-metadata')
        .then(function (all) {
            allHashesArray = all;
            return getUsedMetaHashes(metadatastorage, storage, blobClient);
        })
        .then(function (used) {
            i = allHashesArray.length;
            while (i--) {
                if (used[allHashesArray[i]] === true) {
                    allHashesArray.splice(i, 1);
                }
            }
            deferred.resolve(allHashesArray);
        })
        .catch(deferred.reject);

    return deferred.promise;
}

function removeBasedOnMetaHashes(blobClient, metaHashes) {
    var deferred = Q.defer(),
        i,
        promises = [],
        removals = {
            meta: metaHashes,
            data: []
        };

    for (i = 0; i < metaHashes.length; i += 1) {
        promises.push(blobClient.deleteObject('wg-metadata', metaHashes[i]));
    }

    Q.all(promises)
        .then(function (results) {
            return getUnusedDataHashes(blobClient);
        })
        .then(function (unusedDataHashes) {
            removals.data = unusedDataHashes;
            promises = [];
            for (i = 0; i < unusedDataHashes.length; i += 1) {
                promises.push(blobClient.deleteObject('wg-content', unusedDataHashes[i]));
            }
            return Q.allSettled(promises);
        })
        .then(function (results) {
            for (i = 0; i < results.length; i += 1) {
                if (results[i].state !== 'fulfilled') {
                    throw new Error('not all removal was successful:', results[i]);
                }
            }
            deferred.resolve(removals);
        })
        .catch(deferred.reject);

    return deferred.promise;
}

function getInputHashes(inputFilePath) {
    var deferred = Q.defer();

    Q.nfcall(FS.readFile, inputFilePath, 'utf8')
        .then(function (inputString) {
            var hashArray = JSON.parse(inputString);

            if (hashArray instanceof Array) {
                deferred.resolve(hashArray);
            } else {
                deferred.reject(new Error('the input file should contain an array of hashes!'));
            }
        })
        .catch(deferred.reject);

    return deferred.promise;
}
/**
 * Lists and optionally deletes the unused data from file-system based Blob-storage.
 *
 * @param {object} [options]
 * @param {bool} [options.del=false] - If true will do the deletion.
 * @param {string} [options.env] - If given it will set the NODE_ENV environment variable.
 * @param {string} [options.input] - Input JSON array file, that contains MetaDataHashes that needs to be removed.
 */

function cleanUp(options) {
    var BlobClient = require('../server/middleware/blob/BlobClientWithFSBackend'),
        blobClient,
        logger,
        gmeAuth,
        error,
        storage;

    if (options && options.env) {
        process.env.NODE_ENV = options.env;
    }
    gmeConfig = require(path.join(process.cwd(), 'config'));
    webgme.addToRequireJsPaths(gmeConfig);
    logger = new webgme.Logger.create('clean_up', gmeConfig.bin.log, false);
    blobClient = new BlobClient(gmeConfig, logger);

    options = options || {};

    return webgme.getGmeAuth(gmeConfig)
        .then(function (gmeAuth_) {
            gmeAuth = gmeAuth_;
            storage = webgme.getStorage(logger, gmeConfig, gmeAuth);

            return storage.openDatabase();
        })
        .then(function () {
            if (options.input) {
                return getInputHashes(options.input);
            } else {
                return getUnusedMetaHashes(blobClient, gmeAuth.metadataStorage, storage);
            }
        })
        .then(function (unusedMetaHashes) {
            if (options.del !== true && !options.input) {
                console.log('The following metaDataHashes are unused:');
                console.log(unusedMetaHashes);
                return null;
            } else {
                return removeBasedOnMetaHashes(blobClient, unusedMetaHashes);
            }
        })
        .then(function (removals) {
            if (removals) {
                console.log('The following items were removed:');
                console.log(JSON.stringify(removals, null, 2));
            }
        })
        .catch(function (err_) {
            error = err_;
        })
        .finally(function () {
            logger.debug('Closing database connections...');
            return Q.allSettled([storage.closeDatabase(), gmeAuth.unload()])
                .finally(function () {
                    logger.debug('Closed.');
                    if (error) {
                        throw error;
                    }
                });
        });
}

module.exports = cleanUp;

if (require.main === module) {
    var Command = require('commander').Command,
        program = new Command();

    program
        .version('2.7.0')
        .option('-d, --del [boolean]', 'If true will do the deletion [false].', false)
        .option('-i, --input [file]', 'A file - containing a JSON array of meta-hashes - can be' +
            'passed for clean-up (no project usage check will be done!).')
        .option('-e, --env [string]', 'To override the NODE_ENV environment variable ' +
            'that allows you to change the used configuration.')
        .on('--help', function () {
            console.log('');
            console.log();
            console.log('  Examples:');
            console.log();
            console.log('    $ node blob_fs_clean_up.js');
            console.log('    $ node blob_fs_clean_up.js -d');
            console.log('    $ node blob_fs_clean_up.js -e test');
            console.log('    $ node blob_fs_clean_up.js -i hashes.json');
        })
        .parse(process.argv);

    cleanUp(program)
        .catch(function (err) {
            console.error(err.stack);
        });
}