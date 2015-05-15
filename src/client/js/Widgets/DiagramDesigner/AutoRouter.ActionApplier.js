/*globals define, console*/
/*jshint browser: true*/

/**
 * @author brollb / https://github/brollb
 */

define(['./AutoRouter', 'common/util/assert'], function (AutoRouter, assert) {

    'use strict';

    var AutoRouterActionApplier = function () {
    };

    AutoRouterActionApplier.prototype.init = function () {
        this._portSeparator = this._portSeparator || '_x_';
        this.autorouter = new AutoRouter();
        this.debugActionSequence = '[';
        this._clearRecords();
        this.readyToDownload = false;

        // Thanks to stack overflow for this next function
        //
        // If we are recording actions, allow the user to download
        // the action sequence
        if (this._recordActions) {
            var self = this;
            (function (console) {

                console.save = function (data, filename) {

                    if (!self.readyToDownload) {
                        return;
                    }
                    if (!data) {
                        console.error('Console.save: No data');
                        return;
                    }

                    if (!filename) {
                        filename = 'console.json';
                    }

                    if (typeof data === 'object') {
                        data = JSON.stringify(data, undefined, 4);
                    }

                    var blob = new Blob([data], {type: 'text/json'}),
                        e = document.createEvent('MouseEvents'),
                        a = document.createElement('a');

                    a.download = filename;
                    a.href = window.URL.createObjectURL(blob);
                    a.dataset.downloadurl = ['text/json', a.download, a.href].join(':');
                    e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                    a.dispatchEvent(e);
                    self.readyToDownload = false;
                };
            })(console);
        }
    };

    AutoRouterActionApplier.prototype._clearRecords = function () {
        this._autorouterBoxes = {};  // Define container that will map obj+subID -> box
        this._autorouterPorts = {};  // Maps boxIds to an array of port ids that have been mapped
        this._autorouterPaths = {};
        this._arPathId2Original = {};
    };

    /**
     * Replace id stored at the given indices of the array with the item from the dictionary.
     *
     * @param {Dictionary} dictionary
     * @param {Array} array
     * @param {Array<Number>} indices
     * @return {undefined}
     */
    AutoRouterActionApplier.prototype._lookupItem = function (dictionary, array, indices) {//jshint ignore:line
        var index,
            id;

        for (var i = 2; i < arguments.length; i++) {
            index = arguments[i];
            id = array[index];
            array[index] = dictionary[id];
        }
    };

    AutoRouterActionApplier.prototype._fixArgs = function (command, args) {
        var id;
        // Fix args, if needed
        switch (command) {
            case 'move':  // args[0] is id should be the box
                this._lookupItem(this._autorouterBoxes, args, 0);
                args[0] = args[0].box;
                break;

            case 'getPathPoints':
                this._lookupItem(this._autorouterPaths, args, 0);
                break;

            case 'setPathCustomPoints':
                id = args[0].path;
                args[0].path = this._autorouterPaths[id];
                break;

            case 'setBoxRect':
                this._lookupItem(this._autorouterBoxes, args, 0);
                break;

            case 'getBoxRect':
                this._lookupItem(this._autorouterBoxes, args, 0);
                args[0] = args[0].box.id;
                break;

            case 'updatePort':
                this._lookupItem(this._autorouterBoxes, args, 0);
                break;

            case 'setComponent':
                this._lookupItem(this._autorouterBoxes, args, 0, 1);
                break;

            case 'addPath':
                this._fixPortArgs(args[0].src, args[0].dst);
                args.pop();  // Remove the connection id
                break;

            case 'remove':
                var item;

                id = args[0];
                if (this._autorouterBoxes[id]) {
                    item = this._autorouterBoxes[id];
                } else if (this._autorouterPaths[id]) {
                    item = this._autorouterPaths[id];  // If objId is a connection
                }

                args[0] = item;
                break;

            case 'addBox':
                args.pop();
                break;

            default:
                break;
        }

    };

    AutoRouterActionApplier.prototype._fixPortArgs = function (port1, port2) { // jshint ignore:line
        var portId,
            portIds,
            arPortId,
            boxId,
            ports;

        for (var i = arguments.length; i--;) {
            ports = arguments[i];
            portIds = Object.keys(ports);
            for (var j = portIds.length; j--;) {
                portId = portIds[j];
                boxId = ports[portId];

                arPortId = this.autorouter.getPortId(portId, this._autorouterBoxes[boxId]);
                ports[portId] = this._autorouterBoxes[boxId].ports[arPortId];
                assert(this._autorouterBoxes[boxId].ports[arPortId], 'AR Port not found!');
            }
        }
    };

    /**
     * Invoke an AutoRouter method. This allows the action to be logged and bugs replicated.
     *
     * @param {String} command
     * @param {Array} args
     * @return {undefined}
     */
    AutoRouterActionApplier.prototype._invokeAutoRouterMethod = function (command, args) {
        try {
            return this._invokeAutoRouterMethodUnsafe(command, args);

        } catch (e) {
            this.logger.error('AutoRouter.' + command + ' failed with error: ' + e);

            if (this._recordActions) {  // Can I just save and download this?
                var filename = 'AR_bug_report' + new Date().getTime() + '.js';
                console.save(this._getActionSequence(), filename);
            }
            return 'Error: '+e.message;
        }
    };

    AutoRouterActionApplier.prototype._invokeAutoRouterMethodUnsafe = function (command, args) {
        var result,
            oldArgs = args.slice();

        if (this._recordActions) {
            this._recordAction(command, args.slice());
        }

        // Some arguments are simply ids for easier recording
        this._fixArgs(command, args);

        result = this.autorouter[command].apply(this.autorouter, args);
        this._updateRecords(command, oldArgs, result);
        return result;
    };

    AutoRouterActionApplier.prototype._updateRecords = function (command, input, result) {
        assert (input instanceof Array);
        var id,
            args = input.slice(),
            i;

        switch (command) {
            case 'addPath':
                id = args.pop();
                this._autorouterPaths[id] = result;
                this._arPathId2Original[result] = id;
                break;

            case 'addBox':
                id = args.pop();
                this._autorouterBoxes[id] = result;

                // Add ports
                this._autorouterPorts[id] = [];
                var ids = Object.keys(result.ports);
                for (i = ids.length; i--;) {
                    this._autorouterPorts[id].push(result.ports[ids[i]]);
                }
                break;

            case 'remove':
                id = args[0];
                if (this._autorouterBoxes[id]) {
                    i = this._autorouterPorts[id] ? this._autorouterPorts[id].length : 0;
                    while (i--) {
                        var portId = id + this._portSeparator + this._autorouterPorts[id][i]; //ID of child port
                        delete this._autorouterBoxes[portId];
                    }

                    delete this._autorouterBoxes[id];
                    delete this._autorouterPorts[id];

                } else if (this._autorouterPaths[id]) {
                    var arId = this._autorouterPaths[id];
                    delete this._autorouterPaths[id];
                    delete this._arPathId2Original[arId];
                }
                break;

            case 'setComponent':
                var len,
                    subCompId;

                id = args[0];
                len = id.length + this._portSeparator.length;
                subCompId = args[1].substring(len);

                if (this._autorouterPorts[id].indexOf(subCompId) === -1) {
                    this._autorouterPorts[id].push(subCompId);
                }
                break;

            case 'updatePort':
                id = args[1].id;
                break;
        }
    };

    /**
     * Add the given action to the current sequence of autorouter commands.
     *
     * @param objId
     * @param subCompId
     * @return {undefined}
     */
    AutoRouterActionApplier.prototype._recordAction = function (command, args) {

        var action = {action: command, args: args},
            circularFixer = function (key, value) {
                if (value && value.owner) {
                    return value.id;
                }

                return value;
            };

        this.debugActionSequence += JSON.stringify(action, circularFixer) + ',';
    };

    AutoRouterActionApplier.prototype._getActionSequence = function () {
        var index = this.debugActionSequence.lastIndexOf(','),
            result = this.debugActionSequence.substring(0, index) + ']';

        return result;
    };

    return AutoRouterActionApplier;
});
