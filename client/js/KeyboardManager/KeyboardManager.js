/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */
/*
 * Keyboard Manager for easy keyboard handling all over the application
 */
define(['logManager'], function (logManager) {
    "use strict";

    var KeyboardManager,
        specialKeys = {
            8: "backspace", 9: "tab", 13: "return", 16: "shift", 17: "ctrl", 18: "alt", 19: "pause",
                20: "capslock", 27: "esc", 32: "space", 33: "pageup", 34: "pagedown", 35: "end", 36: "home",
                37: "left", 38: "up", 39: "right", 40: "down", 45: "insert", 46: "del",
                96: "0", 97: "1", 98: "2", 99: "3", 100: "4", 101: "5", 102: "6", 103: "7",
                104: "8", 105: "9", 106: "*", 107: "+", 109: "-", 110: ".", 111 : "/",
                112: "f1", 113: "f2", 114: "f3", 115: "f4", 116: "f5", 117: "f6", 118: "f7", 119: "f8",
                120: "f9", 121: "f10", 122: "f11", 123: "f12", 144: "numlock", 145: "scroll", 191: "/", 224: "meta"
        },
        NO_FIRE = ['ctrl+c', 'ctrl+x', 'ctrl+v'];

    KeyboardManager = function (el) {
        this._logger = logManager.create('KeyboardManager');

        this._listener = null;
        this._el = el || $(document);

        this.setEnabled(true);
    };

    KeyboardManager.prototype.setEnabled = function (enabled) {
        var self = this;

        if (enabled === true) {
            this._el.on("keydown.KeyboardManager keyup.KeyboardManager", function (event) {
                self._keyHandler(event);
            });
        } else {
            this._el.off("keydown.KeyboardManager");
            this._el.off("keyup.KeyboardManager");
        }
    };

    KeyboardManager.prototype._keyHandler = function (event) {
        // Don't fire in text/key-accepting inputs
        if (( /textarea|select/i.test( event.target.nodeName ) || event.target.type === "text") ) {
            if (event.target !== this._el[0]) {
                return;
            }
        }

        if (this._listener) {
            var eventArgs = {'type': event.type,
                'character': undefined,
                'altKey': event.altKey,
                'ctrlKey': event.ctrlKey,
                'metaKey': event.metaKey,
                'shiftKey': event.shiftKey,
                'combo': "",
                'oEvent': undefined};

            // Keypress represents characters, not special keys
            eventArgs.character = specialKeys[ event.which ] || String.fromCharCode( event.which ).toLowerCase();

            // check combinations (alt|ctrl|shift+anything)
            if ( event.altKey) {
                eventArgs.combo += "alt+";
            }

            if ( event.ctrlKey) {
                eventArgs.combo += "ctrl+";
            }

            if (event.metaKey) {
                eventArgs.combo += "meta+";
            }

            if (event.shiftKey) {
                eventArgs.combo += "shift+";
            }

            eventArgs.combo += eventArgs.character;

            this._logger.debug(JSON.stringify(eventArgs));

            var ret;

            if (NO_FIRE.indexOf(eventArgs.combo) === -1){
                if (event.type === 'keydown') {
                    ret = this._listener.onKeyDown && this._listener.onKeyDown(eventArgs);
                } else if (event.type === 'keyup'){
                    ret = this._listener.onKeyUp && this._listener.onKeyUp(eventArgs);
                }
            }

            if ( ret !== undefined ) {
                if ( (event.result = ret) === false ) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }

            WebGMEGlobal.ClipboardHelper.captureFocus();
        }
    };

    KeyboardManager.prototype.setListener = function (l) {
        if (this._listener !== l) {
            this._listener = l;

            if (this._listener) {
                if (!_.isFunction(this._listener.onKeyDown)) {
                    this._logger.warning('Listener is missing "onKeyDown"...');
                }
                if (!_.isFunction(this._listener.onKeyUp)) {
                    this._logger.warning('Listener is missing "onKeyUp"...');
                }
            }
        }

        WebGMEGlobal.ClipboardHelper.captureFocus();
    };

    return KeyboardManager;
});