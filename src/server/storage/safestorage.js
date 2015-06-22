/*globals requireJS*/
/*jshint node:true, newcap:false*/
/**
 * This class calls forwards function calls to the storage with additions:
 *  - check that the data object contains all necessary values.
 *  - checks that the user is authorized to access/change the data.
 *  - updates the users and projects databases on delete/create project.
 *
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var Q = require('q'),

    CONSTANTS = requireJS('common/storage/constants'),
    REGEXP = requireJS('common/regexp'),
    ASSERT = requireJS('common/util/assert'),
    Storage = require('./storage');

function check(cond, deferred, msg) {
    var rejected = false;
    if (!cond) {
        deferred.reject(new Error('Invalid argument, ' + msg));
        rejected = true;
    }

    return rejected;
}

function SafeStorage(mongo, logger, gmeConfig, gmeAuth) {
    ASSERT(gmeAuth !== null && typeof gmeAuth === 'object', 'gmeAuth is a mandatory parameter');
    Storage.call(this, mongo, logger, gmeConfig);
    this.gmeAuth = gmeAuth;
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
        rejected = false,
        userAuthInfo,
        self = this;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.');

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (rejected === false) {
        this.gmeAuth.getUser(data.username)
            .then(function (user) {
                userAuthInfo = user.projects;
                return Storage.prototype.getProjectNames.call(self, data);
            })
            .then(function (result) {
                var filteredResult = [],
                    i,
                    projectName;

                for (i = 0; i < result.length; i += 1) {
                    //For each projectName in result check if user has read access.
                    projectName = result[i];
                    if (userAuthInfo.hasOwnProperty(projectName) && userAuthInfo[projectName].read === true) {
                        filteredResult.push(result[i]);
                    }
                }
                deferred.resolve(filteredResult);
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
        rejected = false,
        userAuthInfo,
        self = this;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.');

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (rejected === false) {
        this.gmeAuth.getUser(data.username)
            .then(function (user) {
                userAuthInfo = user.projects;
                return Storage.prototype.getProjectNames.call(self, data);
            })
            .then(function (result) {
                var i,
                    projects = [],
                    projectName,
                    projectAuthInfo;

                for (i = 0; i < result.length; i += 1) {
                    projectName = result[i];
                    //FIXME: Currently we need to respond with all projects (although read=false).
                    projectAuthInfo = {
                        name: projectName,
                        read: false,
                        write: false,
                        delete: false
                    };

                    if (userAuthInfo.hasOwnProperty(projectName)) {
                        projectAuthInfo.read = userAuthInfo[projectName].read;
                        projectAuthInfo.write = userAuthInfo[projectName].write;
                        projectAuthInfo.delete = userAuthInfo[projectName].delete;
                    }
                    projects.push(projectAuthInfo);
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
 * Calls getProjects and if it had read access appends the data with the branches.
 * @param data
 * @param callback
 */
SafeStorage.prototype.getProjectsAndBranches = function (data, callback) {
    var self = this,
        deferred = Q.defer();
    self.logger.debug('getProjectsAndBranches invoked');
    this.getProjects(data)
        .then(function (projects) {
            self.logger.debug('getProjectsAndBranches: getProjects returned');
            function getBranches(project) {
                if (project.read === true) {
                    // (project.name is coming from safe storage.)
                    return Storage.prototype.getBranches.call(self, {projectName: project.name})
                        .then(function (branches) {
                            project.branches = branches;
                            return Q(project);
                        });
                }
            }
            Q.all(projects.map(getBranches))
                .then(function (branchResult) {
                    var i,
                        result = [];
                    self.logger.debug('getProjectsAndBranches: branches were obtained');
                    for (i = 0; i < branchResult.length; i += 1) {
                        if (branchResult[i]) {
                            result.push(branchResult[i]);
                        }
                    }

                    deferred.resolve(result);
                })
                .catch(function (err) {
                    deferred.reject(err);
                });
        })
        .catch(function (err) {
            deferred.reject(err);
        });

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
        rejected = false,
        userAuthInfo,
        didExist,
        self = this;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||
    check(typeof data.projectId === 'string', deferred, 'data.projectId is not a string.');// ||
    // TODO: Add back appropriate check
    //check(REGEXP.PROJECT.test(data.projectId), deferred, 'data.projectName failed regexp: ' + data.projectId);

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (rejected === false) {
        this.gmeAuth.getUser(data.username)
            .then(function (user) {
                userAuthInfo = user.projects;
                if (userAuthInfo.hasOwnProperty(data.projectName) && userAuthInfo[data.projectName].delete) {
                    return Storage.prototype.deleteProject.call(self, data);
                } else {
                    throw new Error('Not authorized: cannot delete project. ' + data.projectName);
                }
            })
            .then(function (didExist_) {
                didExist = didExist_;
                return self.gmeAuth.deleteProject(data.projectId);
            })
            .then(function () {
                deferred.resolve(didExist);
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
        rejected = false,
        userAuthInfo,
        self = this,
        project;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||
    check(typeof data.projectName === 'string', deferred, 'data.projectName is not a string.') ||
    check(REGEXP.PROJECT.test(data.projectName), deferred, 'data.projectName failed regexp: ' + data.projectName);

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (rejected === false) {
        data.projectId = data.username + CONSTANTS.PROJECT_ID_SEP + data.projectName;
        this.gmeAuth.getUser(data.username)
            .then(function (user) {
                userAuthInfo = user.projects;
                if (user.canCreate) {
                    return Storage.prototype.createProject.call(self, data);
                } else {
                    throw new Error('Not authorized to create a new project.');
                }
            })
            .then(function (project_) {
                project = project_;
                return self.gmeAuth.authorizeByUserId(data.username, project.name, 'create', {
                    read: true,
                    write: true,
                    delete: true
                });
            })
            .then(function () {
                var info = {
                    createdAt: (new Date()).toISOString()
                    //TODO: populate with more data here, e.g. description
                };

                return self.gmeAuth.addProject(data.username, data.projectName, info);
            })
            .then(function () {
                deferred.resolve(project);
            })
            .catch(function (err) {
                // TODO: Clean up appropriately when failure to add to model, user or projects database.
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
        rejected = false,
        userAuthInfo,
        self = this;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||
    check(typeof data.projectName === 'string', deferred, 'data.projectName is not a string.') ||
    check(REGEXP.PROJECT.test(data.projectName), deferred, 'data.projectName failed regexp: ' + data.projectName);

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (rejected === false) {
        this.gmeAuth.getUser(data.username)
            .then(function (user) {
                userAuthInfo = user.projects;
                if (userAuthInfo.hasOwnProperty(data.projectName) && userAuthInfo[data.projectName].read) {
                    return Storage.prototype.getBranches.call(self, data);
                } else {
                    throw new Error('Not authorized to read project. ' + data.projectName);
                }
            })
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
 * @param {object} - data
 * @param {string} - data.projectName
 * @param {number} - data.number - Number of commits to load.
 * @param {string|number} - data.before - Timestamp or commitHash to load history from. When number given it will load
 *  data.number of commits strictly before data.before, when commitHash given it will return that commit too.
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.getCommits = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false,
        userAuthInfo,
        self = this;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||
    check(typeof data.projectName === 'string', deferred, 'data.projectName is not a string.') ||
    check(REGEXP.PROJECT.test(data.projectName), deferred, 'data.projectName failed regexp: ' + data.projectName) ||
    check(typeof data.before === 'number' || typeof data.before === 'string', deferred,
        'data.before is not a number nor string') ||
    check(typeof data.number === 'number', deferred, 'data.number is not a number');

    if (typeof data.before === 'string') {
        rejected = rejected || check(REGEXP.HASH.test(data.before), deferred,
            'data.before is not a number nor a valid hash.');
    }

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (rejected === false) {
        this.gmeAuth.getUser(data.username)
            .then(function (user) {
                userAuthInfo = user.projects;
                if (userAuthInfo.hasOwnProperty(data.projectName) && userAuthInfo[data.projectName].read) {
                    return Storage.prototype.getCommits.call(self, data);
                } else {
                    throw new Error('Not authorized to read project. ' + data.projectName);
                }
            })
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
        rejected = false,
        userAuthInfo,
        self = this;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||
    check(typeof data.projectName === 'string', deferred, 'data.projectName is not a string.') ||
    check(REGEXP.PROJECT.test(data.projectName), deferred, 'data.projectName failed regexp: ' + data.projectName) ||
    check(typeof data.branchName === 'string', deferred, 'data.branchName is not a string.') ||
    check(REGEXP.BRANCH.test(data.branchName), deferred, 'data.branchName failed regexp: ' + data.branchName);

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (rejected === false) {
        this.gmeAuth.getUser(data.username)
            .then(function (user) {
                userAuthInfo = user.projects;
                if (userAuthInfo.hasOwnProperty(data.projectName) && userAuthInfo[data.projectName].read) {
                    return Storage.prototype.getLatestCommitData.call(self, data);
                } else {
                    throw new Error('Not authorized to read project. ' + data.projectName);
                }
            })
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
        rejected = false,
        userAuthInfo,
        self = this;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||

    check(typeof data.projectName === 'string', deferred, 'data.projectName is not a string.') ||
    check(REGEXP.PROJECT.test(data.projectName), deferred, 'data.projectName failed regexp: ' + data.projectName) ||

    check(data.commitObject !== null && typeof data.commitObject === 'object', deferred,
        'data.commitObject not an object.') ||
    check(data.coreObjects !== null && typeof data.coreObjects === 'object', deferred,
        'data.coreObjects not an object.');

    // Checks when branchName is given and the branch will be updated
    if (rejected === false && typeof data.branchName !== 'undefined') {
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

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (rejected === false) {
        this.gmeAuth.getUser(data.username)
            .then(function (user) {
                userAuthInfo = user.projects;
                if (userAuthInfo.hasOwnProperty(data.projectName) && userAuthInfo[data.projectName].write) {
                    return Storage.prototype.makeCommit.call(self, data);
                } else {
                    throw new Error('Not authorized to write project. ' + data.projectName);
                }
            })
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
        rejected = false,
        userAuthInfo,
        self = this;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||

    check(typeof data.projectName === 'string', deferred, 'data.projectName is not a string.') ||
    check(REGEXP.PROJECT.test(data.projectName), deferred, 'data.projectName failed regexp: ' + data.projectName) ||

    check(typeof data.branchName === 'string', deferred, 'data.branchName is not a string.') ||
    check(REGEXP.BRANCH.test(data.branchName), deferred, 'data.branchName failed regexp: ' + data.branchName);

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (rejected === false) {
        this.gmeAuth.getUser(data.username)
            .then(function (user) {
                userAuthInfo = user.projects;
                if (userAuthInfo.hasOwnProperty(data.projectName) && userAuthInfo[data.projectName].read) {
                    return Storage.prototype.getBranchHash.call(self, data);
                } else {
                    throw new Error('Not authorized to read project. ' + data.projectName);
                }
            })
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
        rejected = false,
        userAuthInfo,
        self = this;

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

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (rejected === false) {
        this.gmeAuth.getUser(data.username)
            .then(function (user) {
                userAuthInfo = user.projects;
                if (userAuthInfo.hasOwnProperty(data.projectName) && userAuthInfo[data.projectName].write) {
                    return Storage.prototype.setBranchHash.call(self, data);
                } else {
                    throw new Error('Not authorized to write project. ' + data.projectName);
                }
            })
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
SafeStorage.prototype.getCommonAncestorCommit = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false,
        userAuthInfo,
        self = this;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||

    check(typeof data.projectName === 'string', deferred, 'data.projectName is not a string.') ||
    check(REGEXP.PROJECT.test(data.projectName), deferred, 'data.projectName failed regexp: ' + data.projectName) ||

    check(typeof data.commitA === 'string', deferred, 'data.commitA is not a string.') ||
    check(data.commitA === '' || REGEXP.HASH.test(data.commitA), deferred,
        'data.commitA is not a valid hash: ' + data.commitA) ||
    check(typeof data.commitB === 'string', deferred, 'data.commitB is not a string.') ||
    check(data.commitB === '' || REGEXP.HASH.test(data.commitB), deferred,
        'data.commitB is not a valid hash: ' + data.commitB);

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (rejected === false) {
        this.gmeAuth.getUser(data.username)
            .then(function (user) {
                userAuthInfo = user.projects;
                if (userAuthInfo.hasOwnProperty(data.projectName) && userAuthInfo[data.projectName].read) {
                    return Storage.prototype.getCommonAncestorCommit.call(self, data);
                } else {
                    throw new Error('Not authorized to read project. ' + data.projectName);
                }
            })
            .then(function (commonHash) {
                deferred.resolve(commonHash);
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
        rejected = false,
        userAuthInfo,
        self = this;

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

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (rejected === false) {
        this.gmeAuth.getUser(data.username)
            .then(function (user) {
                userAuthInfo = user.projects;
                if (userAuthInfo.hasOwnProperty(data.projectName) && userAuthInfo[data.projectName].write) {
                    return Storage.prototype.setBranchHash.call(self, data);
                } else {
                    throw new Error('Not authorized to write project. ' + data.projectName);
                }
            })
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
SafeStorage.prototype.deleteBranch = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false,
        userAuthInfo,
        self = this;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||

    check(typeof data.projectName === 'string', deferred, 'data.projectName is not a string.') ||
    check(REGEXP.PROJECT.test(data.projectName), deferred, 'data.projectName failed regexp: ' + data.projectName) ||

    check(typeof data.branchName === 'string', deferred, 'data.branchName is not a string.') ||
    check(REGEXP.BRANCH.test(data.branchName), deferred, 'data.branchName failed regexp: ' + data.branchName);


    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (rejected === false) {
        this.gmeAuth.getUser(data.username)
            .then(function (user) {
                userAuthInfo = user.projects;
                data.newHash = '';
                if (userAuthInfo.hasOwnProperty(data.projectName) && userAuthInfo[data.projectName].read) {
                    return Storage.prototype.getBranchHash.call(self, data);
                } else {
                    throw new Error('Not authorized to read project. ' + data.projectName);
                }
            })
            .then(function (branchHash) {
                data.oldHash = branchHash;
                if (userAuthInfo.hasOwnProperty(data.projectName) && userAuthInfo[data.projectName].write) {
                    return Storage.prototype.setBranchHash.call(self, data);
                } else {
                    throw new Error('Not authorized to write project. ' + data.projectName);
                }
            })
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
 * Authorization: TODO: read or write access for data.projectName
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.openProject = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false,
        userAuthInfo,
        self = this;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||
    check(typeof data.projectName === 'string', deferred, 'data.projectName is not a string.') ||
    check(REGEXP.PROJECT.test(data.projectName), deferred, 'data.projectName failed regexp: ' + data.projectName);

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (rejected === false) {
        this.gmeAuth.getUser(data.username)
            .then(function (user) {
                userAuthInfo = user.projects;
                if (userAuthInfo.hasOwnProperty(data.projectName) &&
                    (userAuthInfo[data.projectName].read || userAuthInfo[data.projectName].write)) {

                    return Storage.prototype.openProject.call(self, data);
                } else {
                    throw new Error('Not authorized to read or write project. ' + data.projectName);
                }
            })
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
 * Authorization: TODO: read access for data.projectName
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.loadObjects = function (data, callback) {
    var deferred = Q.defer(),
        rejected = false,
        userAuthInfo,
        self = this;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||
    check(typeof data.projectName === 'string', deferred, 'data.projectName is not a string.') ||
    check(REGEXP.PROJECT.test(data.projectName), deferred, 'data.projectName failed regexp: ' + data.projectName) ||
    check(data.hashes instanceof Array, deferred, 'data.hashes is not an array: ' + JSON.stringify(data.hashes));

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    self.logger.debug('loadObjects', {metadata: data});
    if (rejected === false) {
        this.gmeAuth.getUser(data.username)
            .then(function (user) {
                userAuthInfo = user.projects;
                if (userAuthInfo.hasOwnProperty(data.projectName) && userAuthInfo[data.projectName].read) {

                    return Storage.prototype.loadObjects.call(self, data);
                } else {
                    throw new Error('Not authorized to read project. ' + data.projectName);
                }
            })
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