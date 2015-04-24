/*globals define, $, alert*/
/*jshint browser: true*/

/**
 * @author kecso / https://github.com/kecso
 */

define([
    'js/Dialogs/Import/ImportDialog',
    'js/Loader/LoaderCircles'
], function (ImportDialog, LoaderCircles) {

    'use strict';

    var _client,
        _loader = new LoaderCircles({containerElement: $('body')});

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

    var _importLibrary = function (objID) {
        var d = new ImportDialog();
        d.show(function (fileContent) {
            _loader.start();
            _client.updateLibraryAsync(objID, fileContent, function (err) {
                if (err) {
                    _displayMessage('Library update failed: ' + err, true);
                }
                _loader.stop();
            });
        });
    };

    var _addLibrary = function (parentID) {
        var d = new ImportDialog();
        d.show(function (fileContent) {
            _loader.start();
            _client.addLibraryAsync(parentID, fileContent, function (err) {
                if (err) {
                    _displayMessage('Library update failed: ' + err, true);
                }
                _loader.stop();
            });
        });
    };

    //return utility functions
    return {
        initialize: _initialize,
        import: _import,
        importLibrary: _importLibrary,
        addLibrary: _addLibrary
    };
});