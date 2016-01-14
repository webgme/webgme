/*globals define*/
/*jshint browser: true, node:true*/

/**
 * Client module for accessing the blob.
 *
 * @author lattmann / https://github.com/lattmann
 */

define(['blob/BlobConfig'], function (BlobConfig) {
    'use strict';

    /**
     * Initializes a new instance of BlobMetadata
     * @param {object} metadata - A serialized metadata object.
     * @param {string} metadata.name
     * @param {string|Object} metadata.content
     * @param {number} [metadata.size=0]
     * @param {BlobMetadata.CONTENT_TYPES} [metadata.contentType=BlobMetadata.CONTENT_TYPES.OBJECT]
     * @param {string} [metadata.mime='']
     * @param {boolean} [metadata.isPublic=false]
     * @param {string[]} [metadata.tags=[]]
     * @constructor
     * @alias BlobMetadata
     */
    var BlobMetadata = function (metadata) {
        var key;
        if (metadata) {
            this.name = metadata.name;
            this.size = metadata.size || 0;
            this.mime = metadata.mime || '';
            this.isPublic = metadata.isPublic || false;
            this.tags = metadata.tags || [];
            this.content = metadata.content;
            this.contentType = metadata.contentType || BlobMetadata.CONTENT_TYPES.OBJECT;
            if (this.contentType === BlobMetadata.CONTENT_TYPES.COMPLEX) {
                for (key in this.content) {
                    if (this.content.hasOwnProperty(key)) {
                        if (BlobConfig.hashRegex.test(this.content[key].content) === false) {
                            throw new Error('BlobMetadata is malformed: hash \'' + this.content[key].content + '\'is invalid');
                        }
                    }
                }
            }
        } else {
            throw new Error('metadata parameter is not defined');
        }
    };

    /**
     * Type of the metadata
     * @type {{OBJECT: string, COMPLEX: string, SOFT_LINK: string}}
     */
    BlobMetadata.CONTENT_TYPES = {
        OBJECT: 'object',
        COMPLEX: 'complex',
        SOFT_LINK: 'softLink'
    };

    /**
     * Serializes the metadata to a JSON object.
     * @returns {{
     *  name: string,
     *  size: number,
     *  mime: string,
     *  tags: Array.<string>,
     *  content: (string|Object),
     *  contentType: string}}
     */
    BlobMetadata.prototype.serialize = function () {
        var metadata = {
            name: this.name,
            size: this.size,
            mime: this.mime,
            isPublic: this.isPublic,
            tags: this.tags,
            content: this.content,
            contentType: this.contentType
        };

        metadata.tags.sort();

        if (this.contentType === BlobMetadata.CONTENT_TYPES.COMPLEX) {
            // override on  purpose to normalize content
            metadata.content = {};
            var fnames = Object.keys(this.content);
            fnames.sort();

            for (var j = 0; j < fnames.length; j += 1) {
                metadata.content[fnames[j]] = this.content[fnames[j]];
            }
        }

        return metadata;
    };

    return BlobMetadata;
});
