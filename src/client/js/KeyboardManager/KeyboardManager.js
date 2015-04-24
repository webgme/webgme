/*globals define, _, WebGMEGlobal, alert, $ */
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/logger'], function (Logger) {
    'use strict';

    var specialKeys = {
            8: 'backspace', 9: 'tab', 13: 'return', 16: 'shift', 17: 'ctrl', 18: 'alt', 19: 'pause',
            20: 'capslock', 27: 'esc', 32: 'space', 33: 'pageup', 34: 'pagedown', 35: 'end', 36: 'home',
            37: 'left', 38: 'up', 39: 'right', 40: 'down', 45: 'insert', 46: 'del',
            96: '0', 97: '1', 98: '2', 99: '3', 100: '4', 101: '5', 102: '6', 103: '7',
            104: '8', 105: '9', 106: '*', 107: '+', 109: '-', 110: '.', 111: '/',
            112: 'f1', 113: 'f2', 114: 'f3', 115: 'f4', 116: 'f5', 117: 'f6', 118: 'f7', 119: 'f8',
            120: 'f9', 121: 'f10', 122: 'f11', 123: 'f12', 144: 'numlock', 145: 'scroll', 191: '/', 224: 'meta'
        },
        NO_FIRE = ['ctrl+c', 'ctrl+x', 'ctrl+v'],
        CLIPBOARD_HELPER_CLASS = 'webgme-clipboard-helper',
        TEXT_AREA_CONTENT = 'webgme-clipboard',
        UPDATE_BROWSER_MESSAGE = 'Your browser seems to be out of date :(.' +
                                 'Please update your browser to the latest and greatest version!',
        _txtArea,
        _enabled = false,
        _logger,
        _listener = null;

    function _captureFocus() {
        _logger = _logger || Logger.create('gme:KeyboardManager:KeyboardManager', WebGMEGlobal.gmeConfig.client.log);
        if (WebGMEGlobal.SUPPORTS_TOUCH === true) {
            return;
        }

        if (!_txtArea) {
            _initializeClipboardHelper();
        }

        _txtArea.val(TEXT_AREA_CONTENT).select().focus();
    }

    function _setListener(l) {
        _logger = _logger || Logger.create('gme:KeyboardManager:KeyboardManager', WebGMEGlobal.gmeConfig.client.log);
        if (_listener !== l) {
            _listener = l;

            if (_listener) {
                if (!_.isFunction(_listener.onKeyDown)) {
                    _logger.warn('Listener is missing "onKeyDown"...');
                }
                if (!_.isFunction(_listener.onKeyUp)) {
                    _logger.warn('Listener is missing "onKeyUp"...');
                }
            }
        }

        _captureFocus();
    }

    function _initializeClipboardHelper() {
        if (_txtArea) {
            return;
        }

        _txtArea = $('<textarea/>', {class: CLIPBOARD_HELPER_CLASS});

        _txtArea.css({
            position: 'absolute',
            top: '-10000px',
            left: '-10000px'
        });

        $('body').append(_txtArea);
    }

    function _setEnabled(enabled) {
        _logger = _logger || Logger.create('gme:KeyboardManager:KeyboardManager', WebGMEGlobal.gmeConfig.client.log);
        if (WebGMEGlobal.SUPPORTS_TOUCH === true) {
            return;
        }

        if (_enabled !== enabled) {

            _enabled = enabled;

            if (_enabled === true) {
                _initializeClipboardHelper();

                _txtArea.on('keydown.KeyboardManager keyup.KeyboardManager', _keyHandler);

                $('body').on('mousedown.KeyboardManager', _captureFocusOnBody);

                _txtArea.on('copy.KeyboardManager', _onCopy);
                _txtArea.on('paste.KeyboardManager', _onPaste);
            } else {
                _txtArea.off('keydown.KeyboardManager');
                _txtArea.off('keyup.KeyboardManager');

                $('body').off('mousedown.KeyboardManager');

                _txtArea.off('copy.KeyboardManager');
                _txtArea.off('paste.KeyboardManager');
            }
        }
    }

    function _captureFocusOnBody(event) {
        var tagName = event && event.target && event.target.tagName,
            activeElementName = document.activeElement && document.activeElement.nodeName,
            noCapture = ['INPUT', 'TEXTAREA', 'SELECT'];

        if (noCapture.indexOf(tagName) === -1 &&
            noCapture.indexOf(activeElementName) === -1) {
            _captureFocus();
        }
    }

    function _keyHandler(event) {
        var eventArgs = {
            type: event.type,
            character: undefined,
            altKey: event.altKey,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
            combo: '',
            oEvent: undefined
        },
            ret;

        // Don't fire in text/key-accepting inputs
        if (( /textarea|select/i.test(event.target.nodeName) || event.target.type === 'text')) {
            if (event.target !== _txtArea[0]) {
                return;
            }
        }

        if (_listener) {
            // Keypress represents characters, not special keys
            eventArgs.character = specialKeys[event.which] || String.fromCharCode(event.which).toLowerCase();

            // check combinations (alt|ctrl|shift+anything)
            if (event.altKey) {
                eventArgs.combo += 'alt+';
            }

            if (event.ctrlKey) {
                eventArgs.combo += 'ctrl+';
            }

            if (event.metaKey) {
                eventArgs.combo += 'meta+';
            }

            if (event.shiftKey) {
                eventArgs.combo += 'shift+';
            }

            eventArgs.combo += eventArgs.character;

            _logger.debug(JSON.stringify(eventArgs));

            if (NO_FIRE.indexOf(eventArgs.combo) === -1) {
                if (event.type === 'keydown') {
                    ret = _listener.onKeyDown && _listener.onKeyDown(eventArgs);
                } else if (event.type === 'keyup') {
                    ret = _listener.onKeyUp && _listener.onKeyUp(eventArgs);
                }
            }

            if (ret !== undefined) {
                if ((event.result = ret) === false) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }

            _captureFocus();
        }
    }


    function _onCopy(event) {
        var clipboardData = _getClipboardData(event),
            data;

        if (clipboardData) {
            if (_listener && _.isFunction(_listener.onCopy)) {
                data = _listener.onCopy();
                if (typeof data !== 'string') {
                    data = JSON.stringify(data);
                }
                clipboardData.setData('text', data);
            }
            event.preventDefault();
            event.stopPropagation();
        } else {
            alert(UPDATE_BROWSER_MESSAGE);
        }
    }

    function _onPaste(event) {
        var clipboardData = _getClipboardData(event),
            data;

        if (clipboardData) {
            if (_listener && _.isFunction(_listener.onPaste)) {
                data = clipboardData.getData('text');
                _listener.onPaste(data);
            }
            event.preventDefault();
            event.stopPropagation();
        } else {
            alert(UPDATE_BROWSER_MESSAGE);
        }
    }

    function _getClipboardData(event) {
        return event.originalEvent.clipboardData || window.clipboardData;
    }
    
    return {
        captureFocus: _captureFocus,
        setListener: _setListener,
        setEnabled: _setEnabled
    };
});
