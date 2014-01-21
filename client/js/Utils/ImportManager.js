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

    var _doImport = function (objID, jsonContent) {
        _loader.start();

        setTimeout(function () {
            _client.importNodeAsync(objID, jsonContent, function (err) {
                if (err) {
                    _displayMessage('Import failed: ' + err, true);
                } else {
                    _displayMessage('Imported successfully...', false);
                }
                _loader.stop();
            });
        }, 10);
    };

    var _import = function (objID, jsonContent) {
        if (jsonContent) {
            _doImport(objID, jsonContent);
        } else {
            //JSON content to import is not defined, show FileOpenDialog
            var d = new ImportDialog();
            d.show(function (fileContent) {
                _doImport(objID, fileContent);
            });
        }
    };

    //return utility functions
    return { initialize: _initialize,
        import: _import
    };
});