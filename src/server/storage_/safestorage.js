/*globals requireJS*/
/*jshint node:true, newcap:false*/
/**
 * This class calls the functions on the storage with additional checks:
 *  - the data object contains all necessary values.
 *  - TODO: Checks that the user is authorized to access/change the data.
 *  - TODO: Filters out the raw result based on authorization.
 *
 * TODO: The incoming data should contain the userId. Meaning the users (WebSocket or REST) should
 * TODO: get this information from the session-store and via the tokens when applicable.
 * TODO: Alternatively the sessionId can be passed.
 *
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var Q = require('Q'),

//ASSERT = requireJS('common/util/assert'),
    REGEXP = requireJS('common/regexp'),
    Storage = require('./storage');

function check(cond, deferred, msg) {
    var rejected = false;
    if (!cond) {
        deferred.reject(new Error('Invalid argument, ' + msg));
        rejected = true;
    }

    return rejected;
}

function SafeStorage(mongo, logger, gmeConfig) {
    Storage.call(this, mongo, logger, gmeConfig);
}

// Inherit from Storage
SafeStorage.prototype = Object.create(Storage.prototype);
SafeStorage.prototype.constructor = SafeStorage;

SafeStorage.prototype.getProjectNames = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false;

    rejected = check(typeof data === 'object', deferred, 'data is not an object.');

    if (rejected === false) {
        Storage.prototype.getProjectNames.call(this, data)
            .then(function (result) {
                //TODO: For each projectName in result check if user has read access.
                deferred.resolve(result);
            })
            .catch(function (err) {
                deferred.reject(new Error(err));
            });
    }

    return deferred.promise.nodeify(callback);
};

SafeStorage.prototype.deleteProject = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false;

    rejected = check(typeof data === 'object', deferred, 'data is not an object.') ||
    check(typeof data.projectName === 'string', deferred, 'data.projectName is not a string.') ||
    check(REGEXP.PROJECT.test(data.projectName), deferred, 'data.projectName failed regexp: ' + data.projectName);

    if (rejected === false) {
        //TODO: Check authorization here - if user not authorized reject.
        Storage.prototype.deleteProject.call(this, data)
            .then(function () {
                deferred.resolve();
            })
            .catch(function (err) {
                deferred.reject(new Error(err));
            });
    }

    return deferred.promise.nodeify(callback);
};

SafeStorage.prototype.getBranches = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false;

    rejected = check(typeof data === 'object', deferred, 'data is not an object.') ||
    check(typeof data.projectName === 'string', deferred, 'data.projectName is not a string.') ||
    check(REGEXP.PROJECT.test(data.projectName), deferred, 'data.projectName failed regexp: ' + data.projectName);

    if (rejected === false) {
        //TODO: Check authorization here - if user not authorized reject.
        Storage.prototype.getBranches.call(this, data)
            .then(function (result) {
                deferred.resolve(result);
            })
            .catch(function (err) {
                deferred.reject(new Error(err));
            });
    }

    return deferred.promise.nodeify(callback);
};

SafeStorage.prototype.getCommits = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false;

    rejected = check(typeof data === 'object', deferred, 'data is not an object.') ||
    check(typeof data.projectName === 'string', deferred, 'data.projectName is not a string.') ||
    check(REGEXP.PROJECT.test(data.projectName), deferred, 'data.projectName failed regexp: ' + data.projectName) ||
    check(typeof data.before === 'number', deferred, 'data.before is not a number') ||
    check(typeof data.number === 'number', deferred, 'data.number is not a number');

    if (rejected === false) {
        //TODO: Check authorization here - if user not authorized reject.
        Storage.prototype.getCommits.call(this, data)
            .then(function (result) {
                deferred.resolve(result);
            })
            .catch(function (err) {
                deferred.reject(new Error(err));
            });
    }

    return deferred.promise.nodeify(callback);
};

SafeStorage.prototype.getLatestCommitData = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false;

    rejected = check(typeof data === 'object', deferred, 'data is not an object.') ||
    check(typeof data.projectName === 'string', deferred, 'data.projectName is not a string.') ||
    check(REGEXP.PROJECT.test(data.projectName), deferred, 'data.projectName failed regexp: ' + data.projectName) ||
    check(typeof data.branchName === 'string', deferred, 'data.branchName is not a string.') ||
    check(REGEXP.BRANCH.test(data.branchName), deferred, 'data.branchName failed regexp: ' + data.branchName);

    if (rejected === false) {
        //TODO: Check authorization here - if user not authorized reject.
        Storage.prototype.getLatestCommitData.call(this, data)
            .then(function (result) {
                deferred.resolve(result);
            })
            .catch(function (err) {
                deferred.reject(new Error(err));
            });
    }

    return deferred.promise.nodeify(callback);
};

SafeStorage.prototype.makeCommit = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false;

    rejected = check(typeof data === 'object', deferred, 'data is not an object.') ||

    check(typeof data.projectName === 'string', deferred, 'data.projectName is not a string.') ||
    check(REGEXP.PROJECT.test(data.projectName), deferred, 'data.projectName failed regexp: ' + data.projectName) ||

    check(typeof data.commitObject === 'object', deferred, 'data.commitObject not an object.') ||
    check(typeof data.coreObjects === 'object', deferred, 'data.coreObjects not an object.');

    // Checks when branchName is given and the branch will be updated
    if (rejected === false || typeof data.branchName !== 'undefined') {
        rejected = check(typeof data.branchName === 'string', deferred, 'data.branchName is not a string.') ||
        check(REGEXP.BRANCH.test(data.branchName), deferred, 'data.branchName failed regexp: ' + data.branchName) ||
        check(typeof data.commitObject._id === 'string', deferred, 'data.commitObject._id is not a string.') ||
        check(data.commitObject._id === '' || REGEXP.HASH.test(data.commitObject._id), deferred,
            'data.commitObject._id is not a valid hash: ' + data.commitObject._id) ||
        check(data.commitObject.parents instanceof Array, deferred,
            'data.commitObject.parents is not an array.') ||
        check(typeof data.commitObject.parents[0] === 'string', deferred,
            'data.commitObject.parents[0] is not a string.') ||
        check(data.commitObject.parents[0] === '' || REGEXP.HASH.test(data.commitObject.parents[0]), deferred,
            'data.commitObject.parents[0] is not a valid hash: ' + data.commitObject.parents[0]);
    }

    if (rejected === false) {
        //TODO: Check authorization here - if user not authorized reject.
        Storage.prototype.makeCommit.call(this, data)
            .then(function (result) {
                deferred.resolve(result);
            })
            .catch(function (err) {
                deferred.reject(new Error(err));
            });
    }

    return deferred.promise.nodeify(callback);
};

SafeStorage.prototype.getBranchHash = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false;

    rejected = check(typeof data === 'object', deferred, 'data is not an object.') ||

    check(typeof data.projectName === 'string', deferred, 'data.projectName is not a string.') ||
    check(REGEXP.PROJECT.test(data.projectName), deferred, 'data.projectName failed regexp: ' + data.projectName) ||

    check(typeof data.branchName === 'string', deferred, 'data.branchName is not a string.') ||
    check(REGEXP.BRANCH.test(data.branchName), deferred, 'data.branchName failed regexp: ' + data.branchName);

    if (rejected === false) {
        //TODO: Check authorization here - if user not authorized reject.
        Storage.prototype.getBranchHash.call(this, data)
            .then(function (result) {
                deferred.resolve(result);
            })
            .catch(function (err) {
                deferred.reject(new Error(err));
            });
    }

    return deferred.promise.nodeify(callback);
};

SafeStorage.prototype.setBranchHash = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false;

    rejected = check(typeof data === 'object', deferred, 'data is not an object.') ||

    check(typeof data.projectName === 'string', deferred, 'data.projectName is not a string.') ||
    check(REGEXP.PROJECT.test(data.projectName), deferred, 'data.projectName failed regexp: ' + data.projectName) ||

    check(typeof data.branchName === 'string', deferred, 'data.branchName is not a string.') ||
    check(REGEXP.BRANCH.test(data.branchName), deferred, 'data.branchName failed regexp: ' + data.branchName) ||

    check(typeof data.oldHash === 'string', deferred, 'data.oldHash is not a string.') ||
    check(data.oldHash === '' || REGEXP.HASH.test(data.oldHash), deferred,
        'data.oldHash is not a valid hash: ' + data.oldHash) ||
    check(typeof data.newHash === 'string', deferred, 'data.newHash is not a string.') ||
    check(data.newHash === '' || REGEXP.HASH.test(data.newHash), deferred,
        'data.newHash is not a valid hash: ' + data.newHash);

    if (rejected === false) {
        //TODO: Check authorization here - if user not authorized reject.
        Storage.prototype.setBranchHash.call(this, data)
            .then(function () {
                deferred.resolve();
            })
            .catch(function (err) {
                deferred.reject(new Error(err));
            });
    }

    return deferred.promise.nodeify(callback);
};

SafeStorage.prototype.createBranch = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false;

    rejected = check(typeof data === 'object', deferred, 'data is not an object.') ||

    check(typeof data.projectName === 'string', deferred, 'data.projectName is not a string.') ||
    check(REGEXP.PROJECT.test(data.projectName), deferred, 'data.projectName failed regexp: ' + data.projectName) ||

    check(typeof data.branchName === 'string', deferred, 'data.branchName is not a string.') ||
    check(REGEXP.BRANCH.test(data.branchName), deferred, 'data.branchName failed regexp: ' + data.branchName) ||

    check(typeof data.hash === 'string', deferred, 'data.hash is not a string.') ||
    check(data.hash === '' || REGEXP.HASH.test(data.hash), deferred,
        'data.hash is not a valid hash: ' + data.hash);

    data.oldHash = '';
    data.newHash = data.hash;

    if (rejected === false) {
        //TODO: Check authorization here - if user not authorized reject.
        Storage.prototype.setBranchHash.call(this, data)
            .then(function () {
                deferred.resolve();
            })
            .catch(function (err) {
                deferred.reject(new Error(err));
            });
    }

    return deferred.promise.nodeify(callback);
};

SafeStorage.prototype.deleteBranch = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false,
        self = this;

    rejected = check(typeof data === 'object', deferred, 'data is not an object.') ||

    check(typeof data.projectName === 'string', deferred, 'data.projectName is not a string.') ||
    check(REGEXP.PROJECT.test(data.projectName), deferred, 'data.projectName failed regexp: ' + data.projectName) ||

    check(typeof data.branchName === 'string', deferred, 'data.branchName is not a string.') ||
    check(REGEXP.BRANCH.test(data.branchName), deferred, 'data.branchName failed regexp: ' + data.branchName);


    if (rejected === false) {
        //TODO: Check authorization here - if user not authorized reject.
        data.newHash = '';
        Storage.prototype.getBranchHash.call(this, data)
            .then(function (branchHash) {
                data.oldHash = branchHash;
                return Storage.prototype.setBranchHash.call(self, data);
            })
            .then (function () {
                deferred.resolve();
            })
            .catch(function (err) {
                deferred.reject(new Error(err));
            });
    }

    return deferred.promise.nodeify(callback);
};

module.exports = SafeStorage;