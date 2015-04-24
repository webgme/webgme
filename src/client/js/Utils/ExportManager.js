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

    function exportSingle(objID) {
        var fileName = client.getActiveProjectName() + '_' + client.getActualBranch(),
            objName,
            url,
            obj;

        if (objID !== CONSTANTS.PROJECT_ROOT_ID) {
            obj = client.getNode(objID);

            if (obj) {
                objName = obj.getAttribute(nodePropertyNames.Attributes.name);
            }

            if (!objName || objName === '') {
                objName = objID;
            }

            fileName += '_' + objName;
        }

        url = client.getDumpURL({path: objID, output: fileName});
        if (url) {
            window.location = url;
        }
    }

    function exportMultiple(objIDs) {
        var fileName = client.getActiveProjectName() + '_' + client.getActualBranch() + '_multiple';

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
        var fileName = client.getActiveProjectName() + '_' + client.getActualBranch() + '_conf';

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
            fileName = client.getActiveProjectName() + '_' + client.getActualBranch() + '_' +
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
        export: exportSingle,
        exportMultiple: exportMultiple,
        exIntConf: exIntConf,
        expLib: exportLib
    };
});