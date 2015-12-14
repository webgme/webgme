/*globals define, _ */
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['jquery',
    'js/Constants',
    'js/NodePropertyNames',
    'js/Utils/SaveToDisk',
    'js/logger'
], function (_jquery,
             CONSTANTS,
             nodePropertyNames,
             saveToDisk,
             Logger) {

    'use strict';

    var client,
        logger;

    function initialize(c) {
        //if already initialized, just return
        if (!client) {
            client = c;
            logger = Logger.create('gme:js:Utils:ExportManager', client.gmeConfig.client.log);
            logger.debug('initialize');
        } else {
            logger.debug('was initialized');
        }
    }

    function exportMultiple(objIDs) {
        var fileName = client.getActiveProjectId() + '_' + client.getActiveBranchName() + '_multiple';

        logger.debug('exportMultiple', objIDs);
        if (_.isArray(objIDs) &&
            objIDs.length > 0) {
            client.getExportItemsUrl(objIDs, fileName, function (err, url) {
                if (!err) {
                    saveToDisk.saveUrlToDisk(url);
                }
            });
        }
    }

    function exIntConf(objIDs) {
        var fileName = client.getActiveProjectId() + '_' + client.getActiveBranchName() + '_conf';

        logger.debug('exIntConf', objIDs);
        if (_.isArray(objIDs) &&
            objIDs.length > 0) {
            client.getExternalInterpreterConfigUrlAsync(objIDs, fileName, function (err, url) {
                if (!err) {
                    saveToDisk.saveUrlToDisk(url);
                }
            });
        }
    }

    function exportLib(objID) {
        var object,
            fileName;

        logger.debug('exportLib', objID);
        if (typeof objID === 'string') {
            object = client.getNode(objID);
            fileName = client.getActiveProjectId() + '_' + client.getActiveBranchName() + '_' +
                object.getAttribute('name') + '_lib';

            client.getExportLibraryUrl(objID, fileName, function (err, url) {
                if (!err) {
                    saveToDisk.saveUrlToDisk(url);
                }
            });
        }

    }

    //return utility functions
    return {
        initialize: initialize,
        exportMultiple: exportMultiple,
        exIntConf: exIntConf,
        expLib: exportLib
    };
});