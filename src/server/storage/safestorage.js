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

/**
 * Authorization: filter results based on read access for each projectName.
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.getProjectNames = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.');

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

/**
 * Authorization: result contains this information
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.getProjects = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.');

    if (rejected === false) {
        Storage.prototype.getProjectNames.call(this, data)
            .then(function (result) {
                var i,
                    projects = [];
                for (i = 0; i < result.length; i += 1) {
                    projects.push({
                        name: result[i],
                        read: true, //TODO: get the access level via gmeAuth.
                                    //FIXME: Currently we need to respond with all projects (although read=false).
                        write: true,
                        delete: true
                    });
                }
                deferred.resolve(projects);
            })
            .catch(function (err) {
                deferred.reject(new Error(err));
            });
    }

    return deferred.promise.nodeify(callback);
};

/**
 * Authorization: delete access for data.projectName
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.deleteProject = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||
    check(typeof data.projectName === 'string', deferred, 'data.projectName is not a string.') ||
    check(REGEXP.PROJECT.test(data.projectName), deferred, 'data.projectName failed regexp: ' + data.projectName);

    if (rejected === false) {
        //TODO: Check if authorization here - if user not authorized reject.
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

/**
 * Authorization: canCreate
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.createProject = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||
    check(typeof data.projectName === 'string', deferred, 'data.projectName is not a string.') ||
    check(REGEXP.PROJECT.test(data.projectName), deferred, 'data.projectName failed regexp: ' + data.projectName);

    if (rejected === false) {
        Storage.prototype.createProject.call(this, data)
            .then(function (project) {
                deferred.resolve(project);
            })
            .catch(function (err) {
                deferred.reject(new Error(err));
            });
    }

    return deferred.promise.nodeify(callback);
};

/**
 * Authorization: read access for data.projectName
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.getBranches = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||
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

/**
 * Authorization: read access for data.projectName
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.getCommits = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||
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

/**
 * Authorization: read access for data.projectName
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.getLatestCommitData = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||
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

/**
 * Authorization: write access for data.projectName
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.makeCommit = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||

    check(typeof data.projectName === 'string', deferred, 'data.projectName is not a string.') ||
    check(REGEXP.PROJECT.test(data.projectName), deferred, 'data.projectName failed regexp: ' + data.projectName) ||

    check(data.commitObject !== null && typeof data.commitObject === 'object', deferred,
        'data.commitObject not an object.') ||
    check(data.coreObjects !== null && typeof data.coreObjects === 'object', deferred,
        'data.coreObjects not an object.');

    // Checks when branchName is given and the branch will be updated
    if (rejected === false || typeof data.branchName !== 'undefined') {
        rejected = check(typeof data.branchName === 'string', deferred, 'data.branchName is not a string.') ||
        check(REGEXP.BRANCH.test(data.branchName), deferred, 'data.branchName failed regexp: ' + data.branchName) ||
        check(typeof data.commitObject._id === 'string', deferred, 'data.commitObject._id is not a string.') ||
        check(typeof data.commitObject.root === 'string', deferred, 'data.commitObject.root is not a string.') ||
        check(REGEXP.HASH.test(data.commitObject._id), deferred,
            'data.commitObject._id is not a valid hash: ' + data.commitObject._id) ||
        check(data.commitObject.parents instanceof Array, deferred,
            'data.commitObject.parents is not an array.') ||
        check(typeof data.commitObject.parents[0] === 'string', deferred,
            'data.commitObject.parents[0] is not a string.') ||
        check(data.commitObject.parents[0] === '' || REGEXP.HASH.test(data.commitObject.parents[0]), deferred,
            'data.commitObject.parents[0] is not a valid hash: ' + data.commitObject.parents[0]) ||
        check(REGEXP.HASH.test(data.commitObject.root), deferred,
            'data.commitObject.root is not a valid hash: ' + data.commitObject.root) ||
        check(typeof data.coreObjects[data.commitObject.root] === 'object', deferred,
            'data.coreObjects[data.commitObject.root] is not an object');
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

/**
 * Authorization: read access for data.projectName
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.getBranchHash = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||

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

/**
 * Authorization: write access for data.projectName
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.setBranchHash = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||

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

/**
 * Authorization: read access for data.projectName
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.getCommonAncestorCommit = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||

    check(typeof data.projectName === 'string', deferred, 'data.projectName is not a string.') ||
    check(REGEXP.PROJECT.test(data.projectName), deferred, 'data.projectName failed regexp: ' + data.projectName) ||

    check(typeof data.commitA === 'string', deferred, 'data.commitA is not a string.') ||
    check(data.commitA === '' || REGEXP.HASH.test(data.commitA), deferred,
        'data.commitA is not a valid hash: ' + data.commitA) ||
    check(typeof data.commitB === 'string', deferred, 'data.commitA is not a string.') ||
    check(data.commitA === '' || REGEXP.HASH.test(data.commitA), deferred,
        'data.commitA is not a valid hash: ' + data.commitA);

    if (rejected === false) {
        //TODO: Check authorization here - if user not authorized reject.
        Storage.prototype.getCommonAncestorCommit.call(this, data)
            .then(function () {
                deferred.resolve();
            })
            .catch(function (err) {
                deferred.reject(new Error(err));
            });
    }

    return deferred.promise.nodeify(callback);
};

/**
 * Authorization: write access for data.projectName
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.createBranch = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||

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

/**
 * Authorization: write access for data.projectName
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.deleteBranch = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false,
        self = this;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||

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

/**
 * Authorization: read access for data.projectName
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.openProject = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||
    check(typeof data.projectName === 'string', deferred, 'data.projectName is not a string.') ||
    check(REGEXP.PROJECT.test(data.projectName), deferred, 'data.projectName failed regexp: ' + data.projectName);

    if (rejected === false) {
        Storage.prototype.openProject.call(this, data)
            .then(function (project) {
                deferred.resolve(project);
            })
            .catch(function (err) {
                deferred.reject(new Error(err));
            });
    }

    return deferred.promise.nodeify(callback);
};

module.exports = SafeStorage;