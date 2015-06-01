/*globals define, _ */
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['jquery',
    'js/Constants',
    'js/NodePropertyNames'
], function (_jquery,
             CONSTANTS,
             nodePropertyNames) {

    'use strict';

    var client;

    function initialize(c) {
        //if already initialized, just return
        if (!client) {
            client = c;
        }
    }

    function exportMultiple(objIDs) {
        var fileName = client.getActiveProjectName() + '_' + client.getActiveBranchName() + '_multiple';

        if (_.isArray(objIDs) &&
            objIDs.length > 0) {
            client.getExportItemsUrlAsync(objIDs, fileName, function (err, url) {
                if (!err) {
                    window.location = url;
                }
            });
        }
    }

    function exIntConf(objIDs) {
        var fileName = client.getActiveProjectName() + '_' + client.getActiveBranchName() + '_conf';

        if (_.isArray(objIDs) &&
            objIDs.length > 0) {
            client.getExternalInterpreterConfigUrlAsync(objIDs, fileName, function (err, url) {
                if (!err) {
                    window.location = url;
                }
            });
        }
    }

    function exportLib(objID) {
        var object,
            fileName;

        if (typeof objID === 'string') {
            object = client.getNode(objID);
            fileName = client.getActiveProjectName() + '_' + client.getActiveBranchName() + '_' +
                           object.getAttribute('name') + '_lib';

            client.getExportLibraryUrlAsync(objID, fileName, function (err, url) {
                if (!err) {
                    window.location = url;
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