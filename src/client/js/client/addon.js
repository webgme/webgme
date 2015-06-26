/*globals define*/
/*jshint browser: true*/
/**
 * @author kecso / https://github.com/kecso
 */
define([], function () {
    'use strict';

    function AddOn(state, storage, logger__, gmeConfig) {
        var _addOns = {},
            logger = logger__.fork('addOn'),
            _constraintCallback = function () {
            };
        //addOn functions
        function startAddOn(name) {
            if (_addOns[name] === undefined) {
                _addOns[name] = 'loading';
                logger.debug('loading addOn ' + name);
                storage.simpleRequest({
                        command: 'connectedWorkerStart',
                        workerName: name,
                        projectId: state.project.projectId,
                        branch: state.branchName
                    },
                    function (err, id) {
                        if (err) {
                            logger.error('starting addon failed ' + err);
                            delete _addOns[name];
                            return logger.error(err);
                        }

                        logger.debug('started addon ' + name + ' ' + id);
                        _addOns[name] = id;
                    });
            }

        }

        function queryAddOn(name, query, callback) {
            if (!_addOns[name] || _addOns[name] === 'loading') {
                return callback(new Error('no such addOn is ready for queries'));
            }
            storage.simpleQuery(_addOns[name], query, callback);
        }

        function stopAddOn(name, callback) {
            if (_addOns[name] && _addOns[name] !== 'loading') {
                storage.simpleResult(_addOns[name], callback);
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
                    logger.error(err);
                };

            if (gmeConfig.addOn.enable === true) {
                neededAddOns = state.core.getRegistry(root, 'usedAddOns');
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

            if (gmeConfig.addOn.enable === true) {
                keys = Object.keys(_addOns);
                callback = function (err) {
                    if (err) {
                        logger.error('stopAddOn' + err);
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

        return {
            startAddOn: startAddOn,
            queryAddOn: queryAddOn,
            stopAddOn: stopAddOn,
            updateRunningAddOns: updateRunningAddOns,
            stopRunningAddOns: stopRunningAddOns,
            getDetailedHistoryAsync: getDetailedHistoryAsync,
            validateProjectAsync: validateProjectAsync,
            validateModelAsync: validateModelAsync,
            validateNodeAsync: validateNodeAsync,
            setValidationCallback: setValidationCallback,
            getRunningAddOnNames: getRunningAddOnNames
        };
    }

    return AddOn;
});