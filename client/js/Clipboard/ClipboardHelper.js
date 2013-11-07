/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */
"use strict";

define([], function () {

    var CLIPBOARD_HELPER_CLASS = 'webgme-clipboard-helper',
        _txtArea;

    var _initializeClipboardHelper = function () {
        if (_txtArea) {
            return;
        }

        _txtArea = $('<textarea/>', {'class': CLIPBOARD_HELPER_CLASS});

        _txtArea.css({'position': 'absolute',
                     'top': '-10000px',
                     'left': '-10000px'});

        $('body').append(_txtArea);

        $('body').on('mousedown.ClipboardHelper', _captureFocusOnBody);
        $('body').on('mouseup.ClipboardHelper', _captureFocusOnBody);
        $('body').on('keydown.ClipboardHelper', _captureFocusOnBody);
        $('body').on('keyup.ClipboardHelper', _captureFocusOnBody);

        _txtArea.on('copy', _onCopy);
        _txtArea.on('paste', _onPaste);
    };

    var _captureFocusOnBody = function (event) {
        var tagName = event && event.target && event.target.tagName;
        var noCapture = ['INPUT', 'TEXTAREA', 'SELECT'];
        if (noCapture.indexOf(tagName) === -1) {
            _captureFocus();
        }
    };


    var _captureFocus = function () {
        if (!_txtArea) {
            _initializeClipboardHelper();
        }

        _txtArea.val('webgme-hack').select().focus();
    };


    var _onCopy = function (event) {
        var activePanel = WebGMEGlobal.PanelManager.getActivePanel();
        if (activePanel && _.isFunction(activePanel.onCopy)) {
            var clipboardData = _getClipboardData(event);

            var data = activePanel.onCopy();
            if (typeof data !== "string") {
                data = JSON.stringify(data);
            }
            clipboardData.setData('text', data);
        }
        event.preventDefault();
        event.stopPropagation();
    };

    var _onPaste = function (event) {
        var activePanel = WebGMEGlobal.PanelManager.getActivePanel();
        if (activePanel && _.isFunction(activePanel.onPaste)) {
            var clipboardData = _getClipboardData(event);

            var data = clipboardData.getData('text');
            activePanel.onPaste(data);
        }
        event.preventDefault();
        event.stopPropagation();
    };

    var _getClipboardData = function (event) {
        return event.originalEvent.clipboardData || window.clipboardData;
    };

    //return utility functions
    return { captureFocus: _captureFocus };
});