/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */
"use strict";

define([], function () {

    var CLIPBOARD_HELPER_CLASS = 'webgme-clipboard-helper',
        _txtArea,
        TEXT_AREA_CONTENT = 'webgme-clipboard',
        UPDATE_BROWSER_MESSAGE = 'Your browser seems to be out of date :(. Please update your browser to the latest and greatest version!';

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

        _txtArea.val(TEXT_AREA_CONTENT).select().focus();
    };


    var _onCopy = function (event) {
        var activePanel = WebGMEGlobal.PanelManager.getActivePanel(),
            clipboardData = _getClipboardData(event);

        if (clipboardData) {
            if (activePanel && _.isFunction(activePanel.onCopy)) {
                var data = activePanel.onCopy();
                if (typeof data !== "string") {
                    data = JSON.stringify(data);
                }
                clipboardData.setData('text', data);
            }
            event.preventDefault();
            event.stopPropagation();
        } else {
            alert(UPDATE_BROWSER_MESSAGE);
        }
    };

    var _onPaste = function (event) {
        var activePanel = WebGMEGlobal.PanelManager.getActivePanel(),
            clipboardData = _getClipboardData(event);

        if (clipboardData) {
            if (activePanel && _.isFunction(activePanel.onPaste)) {


                var data = clipboardData.getData('text');
                activePanel.onPaste(data);
            }
            event.preventDefault();
            event.stopPropagation();
        } else {
            alert(UPDATE_BROWSER_MESSAGE);
        }
    };

    var _getClipboardData = function (event) {
        return event.originalEvent.clipboardData || window.clipboardData;
    };

    //return utility functions
    return { captureFocus: _captureFocus };
});