/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

/*
 * Utility helper functions implementing GME concepts...
 */

define(['js/Constants'], function (CONSTANTS) {

    var _initialize,
        _client,
        _isConnection;

    _initialize = function (client) {
        if (!_client) {
            _client = client;
        }
    };

    _isConnection = function (objID) {
        var validConnection = false,
            obj = _client.getNode(objID);

        if (obj) {
            var ptrNames = obj.getPointerNames();
            if (ptrNames.indexOf(CONSTANTS.POINTER_SOURCE) !== -1 &&
                ptrNames.indexOf(CONSTANTS.POINTER_TARGET) !== -1 &&
                obj.getPointer(CONSTANTS.POINTER_SOURCE).to &&
                obj.getPointer(CONSTANTS.POINTER_TARGET).to) {
                validConnection = true;
            }
        }

        return validConnection;
    };

    //return utility functions
    return {
        initialize: _initialize,
        isConnection: _isConnection
    }
});