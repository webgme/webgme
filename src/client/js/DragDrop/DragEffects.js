/*globals define, _, requirejs, WebGMEGlobal*/

define([], function () {

    "use strict";

    //define client-only string constants
    var dragEffects = {'DRAG_COPY': 'DRAG_COPY',
                       'DRAG_MOVE': 'DRAG_MOVE',
                       'DRAG_CREATE_INSTANCE': 'DRAG_CREATE_INSTANCE',
                       'DRAG_CREATE_POINTER': 'DRAG_CREATE_POINTER'};

    return dragEffects;
});