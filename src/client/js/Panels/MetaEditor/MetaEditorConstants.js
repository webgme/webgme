/*globals define */
/*jshint browser: true */
/**
 * STRING CONSTANT DEFINITIONS USED IN METAEDITOR CONTROLLER
 *
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/Constants'], function (CONSTANTS) {
    'use strict';

    //return string constants
    return {
        META_ASPECT_SET_NAME: 'MetaAspectSet',
        RESERVED_POINTER_NAMES: [CONSTANTS.POINTER_BASE],
        META_ASPECT_CONTAINER_ID: CONSTANTS.PROJECT_ROOT_ID,
        META_ASPECT_SHEET_NAME_PREFIX: 'MetaAspectSet_',
        META_DOC_REGISTRY_PREFIX: 'meta_doc_',
        CREATE_META_DOC: 'CREATE_META_DOC'
    };
});