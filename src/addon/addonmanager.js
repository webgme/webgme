/*globals requireJS*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var Q = require('q'),
    Core = requireJS('common/core/core'),
    STORAGE_CONSTANTS = requireJS('common/storage/constants'),
    Storage = requireJS('common/storage/nodestorage');

function AddOnManager(webGMESessionId, mainLogger, gmeConfig) {
    var host = '127.0.0.1',
        self = this,
        logger = mainLogger.fork('AddOnManager'),
        storage = Storage.createStorage(host, webGMESessionId, logger, gmeConfig),
        runningAddOns = {}; //:projectId/:branchName/:addOnId

    function getAddOn(name) {
        var addOnPath = 'addon/' + name + '/' + name + '/' + name;
        if (runningAddOns.hasOwnProperty(name)) {
            throw new Error('AddOn has already started ' + name);
        }
        logger.debug('requireJS addOn from path: ' + addOnPath);
        return requireJS(addOnPath);
    }

    this.initialize = function (callback) {
        storage.open(function (networkStatus) {
            if (networkStatus === STORAGE_CONSTANTS.CONNECTED) {
                callback(null);
            } else {
                //FIXME: How to handle disconnect/reconnect for addOns???
                callback(new Error('Problems connecting to the webgme server, network state: ' + networkState));
            }
        });
    };

    this.startAddOn = function (addOnName, projectId, branchName, callback) {
        var deferred = Q.defer(),
            AddOn,
            addOn,
            project,
            branch,
            startParams;


        AddOn = getAddOn(addOnName);

        addOn = new AddOn(project, branch, logger.fork('addOn_' + addOnName), gmeConfig);

        startParams = {
            projectId: projectId,
            branchName: branchName,
            logger: logger.fork(addOnName)
        };

        addOn.start(startParams, function (err) {
            if (err) {
                deferred.reject(err instanceof Error ? err : new Error(err));
            } else {
                runningAddOns[addOnName] = addOn;
                deferred.resolve();
            }
        });

        return deferred.promise.nodeify(callback);
    };

    this.queryAddOn = function (addOnName, projectId, branchName, parameters, callback) {
        var deferred = Q.defer(),
            addOn;

        if (!addOnName) {
            //TODO: This assumes a single running addOn.
            addOnName = Object.keys(runningAddOns)[0];
            logger.debug('No addOnName given for query picked one randomly', addOnName);
        }

        addOn = runningAddOns[addOnName];

        if (!addOn) {
            deferred.reject(new Error('The addOn is not running'));
        } else {
            addOn.query(parameters, function (err, message) {
                if (err) {
                    deferred.reject(err instanceof Error ? err : new Error(err));
                } else {
                    deferred.resolve(message);
                }
            });
        }

        return deferred.promise.nodeify(callback);
    };

    this.stopAddOn = function (addOnName, projectId, branchName, callback) {
        var deferred = Q.defer(),
            addOn;

        if (!addOnName) {
            //TODO: This assumes a single running addOn.
            addOnName = Object.keys(runningAddOns)[0];
            logger.debug('No addOnName given for query picked one randomly', addOnName);
        }

        addOn = runningAddOns[addOnName];

        if (addOn) {
            logger.debug('stopping addOn', {metadata: addOn.getName()});
            addOn.stop(function (err) {
                if (err) {
                    deferred.reject(err instanceof Error ? err : new Error(err));
                } else {
                    delete runningAddOns[addOnName];
                    deferred.resolve();
                }
            });
        } else {
            deferred.resolve();
        }

        return deferred.promise.nodeify(callback);
    };

    this.close = function (callback) {
        var addOnNames = Object.keys(runningAddOns);

        logger.debug('closing all running addOns', addOnNames);

        return Q.all(addOnNames.map(function (name) {
            return self.stopAddOn(name);
        }))
            .then(function () {
                return Q.ninvoke(storage, 'close');
            })
            .nodeify(callback);
    };
}

module.exports = AddOnManager;