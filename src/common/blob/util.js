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
            softLinkNames = Object.keys(mainMetadata.content);

        return Q.allSettled(softLinkNames.map(function (softLinkName) {
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
                return projectFileHash;
            })
            .nodeify(callback);
    }

    return {
        addAssetsFromExportedProject: addAssetsFromExportedProject
    };
});