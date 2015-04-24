/*globals define*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([], function () {

    'use strict';

    var DiagramDesignerWidgetClipboard;

    DiagramDesignerWidgetClipboard = function () {
    };

    DiagramDesignerWidgetClipboard.prototype.onCopy = function () {
        this.logger.warn('DiagramDesignerWidget.onCopy is not overridden in the controller!!!');
        return undefined;
    };

    DiagramDesignerWidgetClipboard.prototype.onPaste = function (data) {
        this.logger.warn('DiagramDesignerWidget.onPaste is not overridden in the controller!!! data: ' + data);
    };

    return DiagramDesignerWidgetClipboard;
});
