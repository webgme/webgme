/*globals define*/
/*jshint node:true, browser:true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define(['q', './BlobMetadata'], function (Q, BlobMetadata) {
    'use strict';

    function _addMetadataAsMetadata(logger, blobClient, mainMetadata, baseName, callback) {
        var orgMetadata,
            metadataName = baseName + '.metadata';

        return Q.ninvoke(blobClient, 'getObject', mainMetadata.content[metadataName].content)
            .then(function (orgMetadataAsContent) {
                // Original metadata loaded as content-file.
                var contentName = baseName + '.content',
                    softLinkNames,
                    innerContentHash,
                    i,
                    contentMetadataHash;

                if ((typeof Buffer !== 'undefined' && orgMetadataAsContent instanceof Buffer) ||
                    orgMetadataAsContent instanceof ArrayBuffer) {

                    orgMetadataAsContent = String.fromCharCode.apply(null,
                        new Uint8Array(orgMetadataAsContent));
                }

                logger.debug('orgMetadataAsContent', orgMetadataAsContent);
                orgMetadata = JSON.parse(orgMetadataAsContent);

                if (orgMetadata.contentType === BlobMetadata.CONTENT_TYPES.OBJECT) {
                    contentMetadataHash = mainMetadata.content[contentName].content;
                    logger.debug('contentMetadataHash', contentMetadataHash);
                    return Q.ninvoke(blobClient, 'getMetadata', contentMetadataHash)
                        .then(function (contentMetadata) {
                            // The uploaded contents metadata loaded - ensure original meta data matches...
                            if (contentMetadata.size !== orgMetadata.size ||
                                contentMetadata.content !== orgMetadata.content) {
                                throw new Error('Matching content was not uploaded for metadata',
                                    contentMetadata, orgMetadata);
                            }
                            // it did so upload the original metadata as an actual metadata.
                        });
                } else if (orgMetadata.contentType === BlobMetadata.CONTENT_TYPES.COMPLEX) {
                    // Just make sure that the metadata exists among the uploaded files
                    // (their consistencies will be check).
                    softLinkNames = Object.keys(orgMetadata.content);
                    for (i = 0; i < softLinkNames.length; i += 1) {
                        innerContentHash = orgMetadata.content[softLinkNames[i]].content;
                        if (mainMetadata.content.hasOwnProperty(innerContentHash + '.metadata') === false) {
                            throw new Error('Complex object softLink does not have attached .metadata!');
                        }
                    }
                } else {
                    throw new Error('Unsupported content type', orgMetadata.contentType);
                }
            })
            .then(function () {
                return Q.ninvoke(blobClient, 'putMetadata', orgMetadata);
            })
            .nodeify(callback);
    }

    /**
     *
     * @param {GmeLogger} logger
     * @param {BlobClient} blobClient
     * @param {object} mainMetadata
     * @param callback
     * @returns {*}
     */
    function addAssetsFromExportedProject(logger, blobClient, mainMetadata, callback) {
        var projectFileHash = null,
            softLinkNames = Object.keys(mainMetadata.content),
            deferred = Q.defer();

        Q.allSettled(softLinkNames.map(function (softLinkName) {
            var softLinkPieces = softLinkName.split('.'),
                type = softLinkPieces.pop();

            if (type === 'json') {
                projectFileHash = mainMetadata.content[softLinkName].content;
            } else if (type === 'metadata') {
                return _addMetadataAsMetadata(logger, blobClient, mainMetadata, softLinkPieces.pop());
            }
        }))
            .then(function (result) {
                var i,
                    error;
                for (i = 0; i < result.length; i += 1) {
                    if (result[i].state === 'rejected') {
                        logger.error('Adding asset failed with error', softLinkNames[i], result[i].reason);
                        error = 'Failed adding some of the assets, see error logs';
                    }
                }
                if (error) {
                    throw new Error(error);
                }
                return deferred.resolve(projectFileHash);
            })
            .catch(deferred.reject);

        return deferred.promise.nodeify(callback);
    }

    function _gatherFilesFromMetadataHashRec(logger, blobClient, metadata, assetHash, artifact) {
        var deferred = Q.defer(),
            filenameMetadata = assetHash + '.metadata',
            softLinkNames,
            filenameContent;

        logger.debug('_gatherFilesFromMetadataHashRec, metadata:', metadata);

        if (metadata.contentType === BlobMetadata.CONTENT_TYPES.OBJECT) {
            filenameContent = assetHash + '.content';

            Q.ninvoke(artifact, 'addMetadataHash', filenameContent, assetHash, metadata.size)
                .then(function () {
                    return Q.ninvoke(artifact, 'addFile', filenameMetadata, JSON.stringify(metadata));
                })
                .then(function () {
                    deferred.resolve();
                })
                .catch(function (err) {
                    if (err.message.indexOf('Another content with the same name was already added.') > -1) {
                        deferred.resolve();
                    } else {
                        deferred.reject(err);
                    }
                });

        } else if (metadata.contentType === BlobMetadata.CONTENT_TYPES.COMPLEX) {
            // Add .metadata and .content for all linked soft-links (recursively).
            softLinkNames = Object.keys(metadata.content);
            Q.all(softLinkNames.map(function (softLinkName) {
                var softLinkMetadataHash = metadata.content[softLinkName].content;
                logger.debug('Complex object, softLinkMetadataHash:', softLinkMetadataHash);
                return Q.ninvoke(blobClient, 'getMetadata', softLinkMetadataHash)
                    .then(function (softLinkMetadata) {
                        return _gatherFilesFromMetadataHashRec(logger, blobClient,
                            softLinkMetadata, softLinkMetadataHash, artifact);
                    });
            }))
                .then(function () {
                    // Finally add the .metadata for the complex object.
                    return Q.ninvoke(artifact, 'addFile', filenameMetadata, JSON.stringify(metadata));
                })
                .then(function () {
                    deferred.resolve();
                })
                .catch(deferred.reject);
        } else {
            deferred.reject(new Error('Unsupported content type: ' + metadata.contentType));
        }

        return deferred.promise;
    }

    /**
     *
     * @param {GmeLogger} logger
     * @param {BlobClient} blobClient
     * @param {object} jsonExport
     * @param {boolean} addAssets
     * @param callback
     * @returns {*}
     */
    function buildProjectPackage(logger, blobClient, jsonExport, addAssets, filename, callback) {
        var artie = blobClient.createArtifact(jsonExport.projectId +
                '_' + (jsonExport.branchName || jsonExport.commitHash)),
            assets = jsonExport.hashes.assets || [],
            deferred = Q.defer();

        artie.descriptor.name = filename || (jsonExport.projectId +
            '_' + (jsonExport.commitHash || '').substr(1, 6) + '.webgmex');

        if (!addAssets) {
            assets = [];
        }

        function getMetadataSafely(assetHash) {
            return blobClient.getMetadata(assetHash)
                .catch(function(err) {
                    logger.warn('When building project package could not retrieve metadata for attribute with value',
                    assetHash, '. Will continue assuming it is not an asset attribute...');
                    logger.debug('Returned error when getMetadata', err);
                    return null;
                });
        }

        Q.allSettled(assets.map(function (assetHash) {
            return getMetadataSafely(assetHash)
                .then(function (metadata) {
                    if (metadata) {
                        return _gatherFilesFromMetadataHashRec(logger, blobClient, metadata, assetHash, artie);
                    } else {
                        return Q();
                    }
                });
        }))
            .then(function (result) {
                var error,
                    i;

                for (i = 0; i < result.length; i += 1) {
                    if (result[i].state === 'rejected') {
                        error = result[i].reason;
                        logger.debug('Gathering returned with error', assets[i], error);
                        if (error.message.indexOf('Another content with the same name was already added.') === -1) {
                            //some real error
                            throw new Error('gathering assets [' + assets[i] + '] failed:' + error.message);
                        }
                    }
                }
            })
            .then(function () {
                return artie.addFile('project.json', JSON.stringify(jsonExport));
            })
            .then(function () {
                return artie.save();
            })
            .then(deferred.resolve)
            .catch(deferred.reject);

        return deferred.promise.nodeify(callback);
    }

    return {
        addAssetsFromExportedProject: addAssetsFromExportedProject,
        buildProjectPackage: buildProjectPackage
    };
});