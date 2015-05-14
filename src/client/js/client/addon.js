/*globals define*/
/*jshint browser: true*/
/**
 * @author kecso / https://github.com/kecso
 */
define([], function () {
    'use strict';

    function AddOn(_clientGlobal) {
        var _addOns = {},
            _constraintCallback = function () {
            };
        //addOn functions
        function startAddOn(name) {
            if (_addOns[name] === undefined) {
                _addOns[name] = 'loading';
                _clientGlobal.db.simpleRequest({
                        command: 'connectedWorkerStart',
                        workerName: name,
                        project: _clientGlobal.projectName,
                        branch: _clientGlobal.branch
                    },
                    function (err, id) {
                        if (err) {
                            _clientGlobal.logger.error('starting addon failed ' + err);
                            delete _addOns[name];
                            return _clientGlobal.logger.error(err);
                        }

                        _clientGlobal.logger.debug('started addon ' + name + ' ' + id);
                        _addOns[name] = id;
                    });
            }

        }

        function queryAddOn(name, query, callback) {
            if (!_addOns[name] || _addOns[name] === 'loading') {
                return callback(new Error('no such addOn is ready for queries'));
            }
            _clientGlobal.db.simpleQuery(_addOns[name], query, callback);
        }

        function stopAddOn(name, callback) {
            if (_addOns[name] && _addOns[name] !== 'loading') {
                _clientGlobal.db.simpleResult(_addOns[name], callback);
                delete _addOns[name];
            } else {
                callback(_addOns[name] ? new Error('addon loading') : null);
            }
        }

        //generic project related addOn handling
        function updateRunningAddOns(root) {
            var i,
                neededAddOns,
                runningAddOns,
                callback = function (err) {
                    _clientGlobal.logger.error(err);
                };

            if (_clientGlobal.gmeConfig.addOn.enable === true) {
                neededAddOns = _clientGlobal.core.getRegistry(root, 'usedAddOns');
                runningAddOns = getRunningAddOnNames();
                neededAddOns = neededAddOns ? neededAddOns.split(' ') : [];
                for (i = 0; i < neededAddOns.length; i += 1) {
                    if (!_addOns[neededAddOns[i]]) {
                        startAddOn(neededAddOns[i]);
                    }
                }
                for (i = 0; i < runningAddOns.length; i += 1) {
                    if (neededAddOns.indexOf(runningAddOns[i]) === -1) {
                        stopAddOn(runningAddOns[i], callback);
                    }
                }
            }
        }

        function stopRunningAddOns() {
            var i,
                keys,
                callback;

            if (_clientGlobal.gmeConfig.addOn.enable === true) {
                keys = Object.keys(_addOns);
                callback = function (err) {
                    if (err) {
                        _clientGlobal.logger.error('stopAddOn' + err);
                    }
                };

                for (i = 0; i < keys.length; i++) {
                    stopAddOn(keys[i], callback);
                }
            }
        }

        function getRunningAddOnNames() {
            var i,
                names = [],
                keys = Object.keys(_addOns);
            for (i = 0; i < keys.length; i++) {
                if (_addOns[keys[i]] !== 'loading') {
                    names.push(keys[i]);
                }
            }
            return names;
        }

        //core addOns
        //history
        function getDetailedHistoryAsync(callback) {
            if (_addOns.hasOwnProperty('HistoryAddOn') && _addOns.HistoryAddOn !== 'loading') {
                queryAddOn('HistoryAddOn', {}, callback);
            } else {
                callback(new Error('history information is not available'));
            }
        }

        //constraint
        function validateProjectAsync(callback) {
            callback = callback || _constraintCallback || function (/*err, result*/) {
                };
            if (_addOns.hasOwnProperty('ConstraintAddOn') && _addOns.ConstraintAddOn !== 'loading') {
                queryAddOn('ConstraintAddOn', {querytype: 'checkProject'}, callback);
            } else {
                callback(new Error('constraint checking is not available'));
            }
        }

        function validateModelAsync(path, callback) {
            callback = callback || _constraintCallback || function (/* err, result */) {
                };
            if (_addOns.hasOwnProperty('ConstraintAddOn') && _addOns.ConstraintAddOn !== 'loading') {
                queryAddOn('ConstraintAddOn', {querytype: 'checkModel', path: path}, callback);
            } else {
                callback(new Error('constraint checking is not available'));
            }
        }

        function validateNodeAsync(path, callback) {
            callback = callback || _constraintCallback || function (/* err, result */) {
                };
            if (_addOns.hasOwnProperty('ConstraintAddOn') && _addOns.ConstraintAddOn !== 'loading') {
                queryAddOn('ConstraintAddOn', {querytype: 'checkNode', path: path}, callback);
            } else {
                callback(new Error('constraint checking is not available'));
            }
        }

        function setValidationCallback(cFunction) {
            if (typeof cFunction === 'function' || cFunction === null) {
                _constraintCallback = cFunction;
            }
        }

        //core addOns end

        _clientGlobal.addOn = {
            startAddOn: startAddOn,
            queryAddOn: queryAddOn,
            stopAddOn: stopAddOn,
            updateRunningAddOns: updateRunningAddOns,
            stopRunningAddOns: stopRunningAddOns,
            getDetailedHistoryAsync: getDetailedHistoryAsync,
            validateProjectAsync: validateProjectAsync,
            validateModelAsync: validateModelAsync,
            validateNodeAsync: validateNodeAsync,
            setValidationCallback: setValidationCallback
        };
    }

    return AddOn;
});