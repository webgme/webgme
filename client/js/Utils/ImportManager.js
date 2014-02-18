/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */

"use strict";

define(['js/Dialogs/Import/ImportDialog',
        'loaderCircles'], function (ImportDialog,
                                    LoaderCircles) {

    var _client,
        _loader = new LoaderCircles({"containerElement": $('body')});

    var _initialize = function (c) {
        //if already initialized, just return
        if (!_client) {
            _client = c;
        }
    };

    var _displayMessage = function (msg, isError) {
        //TODO: needs better handling
        if (isError) {
            alert(msg);
        }
    };

    var _doImport = function (objID, jsonContent, isMerge) {
        var fn = isMerge === true ? 'mergeNodeAsync' : 'importNodeAsync',
            msgPrefix = isMerge === true ? 'Merge' : 'Import';
        _loader.start();

        setTimeout(function () {
            _client[fn](objID, jsonContent, function (err) {
                if (err) {
                    _displayMessage(msgPrefix + ' failed: ' + err, true);
                } else {
                    _displayMessage(msgPrefix + 'ed successfully...', false);
                }
                _loader.stop();
            });
        }, 10);
    };

    var _import = function (objID, jsonContent, isMerge) {
        if (jsonContent) {
            _doImport(objID, jsonContent, isMerge);
        } else {
            //JSON content to import is not defined, show FileOpenDialog
            var d = new ImportDialog();
            d.show(function (fileContent) {
                _doImport(objID, fileContent, isMerge);
            });
        }
    };

    //return utility functions
    return { initialize: _initialize,
        import: _import
    };
});