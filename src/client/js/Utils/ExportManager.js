/*globals define, _, requirejs, WebGMEGlobal*/

define(['jquery',
        'js/Constants',
        'js/NodePropertyNames'], function (_jquery,
                                           CONSTANTS,
                                           nodePropertyNames) {
    "use strict";

    var _client;

    var _initialize = function (c) {
        //if already initialized, just return
        if (!_client) {
            _client = c;
        }
    };

    var _export = function (objID) {
        var fileName =  _client.getActiveProjectName() + "_" + _client.getActualBranch(),
            objName,url;

        if (objID !== CONSTANTS.PROJECT_ROOT_ID) {
            var obj = _client.getNode(objID);

            if (obj) {
                objName = obj.getAttribute(nodePropertyNames.Attributes.name);
            }

            if (!objName || objName === '') {
                objName = objID;
            }

            fileName += '_' + objName;
        }

        url = _client.getDumpURL({path:objID, output:fileName});
        if(url){
            window.location = url;
        }
    };

    var _exportMultiple = function (objIDs) {
        var fileName =  _client.getActiveProjectName() + "_" + _client.getActualBranch() + "_multiple";

        if (_.isArray(objIDs) &&
            objIDs.length > 0) {
            _client.getExportItemsUrlAsync(objIDs, fileName, function (err, url) {
                if (!err) {
                    window.location = url;
                }
            });
        }
    };

    var _exIntConf = function(objIDs) {
        var fileName = _client.getActiveProjectName() + "_" + _client.getActualBranch() + "_conf";

        if(_.isArray(objIDs) &&
           objIDs.length > 0) {
            _client.getExternalInterpreterConfigUrlAsync(objIDs,fileName,function(err,url){
                if(!err){
                    window.location = url;
                }
            });
        }
    };
    var _expLib = function(objID) {
        if(typeof objID === 'string'){
            var object = _client.getNode(objID),
                fileName = _client.getActiveProjectName() + "_" + _client.getActualBranch() + "_" + object.getAttribute('name') + "_lib";

            _client.getExportLibraryUrlAsync(objID,fileName,function(err,url){
                if(!err){
                    window.location = url;
                }
            });
        }

    };

    //return utility functions
    return { initialize: _initialize,
        export: _export,
        exportMultiple: _exportMultiple,
        exIntConf : _exIntConf,
        expLib : _expLib
    };
});