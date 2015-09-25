/*globals define*/
/*jshint browser: true*/
/**
 * THIS FILE IS CURRENTLY DEPRECATED, IN THE FUTURE IT WILL CONTAIN METHODS TO QUERY ADDONS
 * AND HANDLED NOTIFICATIONS FROM THEM.
 * @author kecso / https://github.com/kecso
 */
define(['q'], function (Q) {
    'use strict';

    function AddOn(state, storage, logger__, gmeConfig) {
        var _addOns = {},
            logger = logger__.fork('addOn');

        function startAddOn(name, callback) {
            var deferred = Q.defer();

            if (_addOns.hasOwnProperty(name)) {
                deferred.resolve(_addOns[name]);
            } else {
                //TODO: Each addOn should have more data, initializing, stopping, id, name etc.
                _addOns[name] = 'loading';
                logger.debug('loading addOn ' + name);
                storage.simpleRequest({
                        command: 'connectedWorkerStart',
                        addOnName: name,
                        projectId: state.project.projectId,
                        branch: state.branchName
                    },
                    function (err, id) {
                        if (err) {
                            logger.error('starting addon failed ', err);
                            delete _addOns[name];
                            deferred.reject(err);
                            return;
                        }

                        logger.debug('started addon ' + name + ' ' + id);
                        _addOns[name] = id;
                        deferred.resolve(id);
                    });
            }

            return deferred.promise.nodeify(callback);
        }

        function queryAddOn(name, query, callback) {
            var deferred = Q.defer();

            if (!_addOns[name] || _addOns[name] === 'loading') {
                deferred.reject(new Error('no such addOn is ready for queries'));
            } else {
                query.addOnName = name;
                storage.simpleQuery(_addOns[name], query, function (err, message) {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve(message);
                    }
                });
            }

            return deferred.promise.nodeify(callback);
        }

        function stopAddOn(name, callback) {
            var deferred = Q.defer();
            if (_addOns[name] && _addOns[name] !== 'loading') {
                // FIXME: addOn state should be stopping
                // TODO: connectedworkerStop should come from constants
                storage.simpleQuery(_addOns[name], {command: 'connectedworkerStop'}, function (err) {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve();
                    }
                });
                delete _addOns[name];
            } else {
                if (_addOns[name]) {
                    logger.error('Worker was loading when being stopped', name);
                    deferred.reject(new Error('addon was loading'));
                } else {
                    deferred.resolve();
                }
            }

            return deferred.promise.nodeify(callback);
        }

        //generic project related addOn handling
        function updateRunningAddOns(root, callback) {
            var i,
                pendingRequests = [],
                neededAddOns,
                runningAddOns;

            if (gmeConfig.addOn.enable === true) {
                neededAddOns = state.core.getRegistry(root, 'usedAddOns');
                runningAddOns = getRunningAddOnNames();
                neededAddOns = neededAddOns ? neededAddOns.split(' ') : [];
                for (i = 0; i < neededAddOns.length; i += 1) {
                    if (!_addOns[neededAddOns[i]]) {
                        pendingRequests.push(startAddOn(neededAddOns[i]));
                    }
                }
                for (i = 0; i < runningAddOns.length; i += 1) {
                    if (neededAddOns.indexOf(runningAddOns[i]) === -1) {
                        pendingRequests.push(stopAddOn(runningAddOns[i]));
                    }
                }
            }

            return Q.all(pendingRequests).nodeify(callback);
        }

        function stopRunningAddOns(callback) {
            var i,
                pendingRequests = [],
                keys;

            if (gmeConfig.addOn.enable === true) {
                keys = Object.keys(_addOns);

                for (i = 0; i < keys.length; i++) {
                    pendingRequests.push(stopAddOn(keys[i]));
                }
            }

            return Q.all(pendingRequests).nodeify(callback);
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

        return {
            updateRunningAddOns: updateRunningAddOns,
            stopRunningAddOns: stopRunningAddOns,
            getRunningAddOnNames: getRunningAddOnNames,
            queryAddOn: queryAddOn
        };
    }

    return AddOn;
});