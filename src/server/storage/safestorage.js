/*globals requireJS*/
/*jshint node:true*/
/**
 * This class forwards function calls to the storage and in addition:
 *  - checks that input data is of correct format.
 *  - checks that users are authorized to access/change projects.
 *  - updates _users and _projects collections on delete/createProject.
 *
 * @module Server:SafeStorage
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var Q = require('q'),
    REGEXP = requireJS('common/regexp'),
    Storage = require('./storage'),
    filterArray = require('./storagehelpers').filterArray,
    UserProject = require('./userproject');

function check(cond, deferred, msg) {
    var rejected = false;
    if (!cond) {
        deferred.reject(new Error('Invalid argument, ' + msg));
        rejected = true;
    }

    return rejected;
}

/**
 *
 * @param database
 * @param logger
 * @param gmeConfig
 * @param gmeAuth
 * @constructor
 */
function SafeStorage(database, logger, gmeConfig, gmeAuth) {
    Storage.call(this, database, logger, gmeConfig);
    this.metadataStorage = gmeAuth.metadataStorage;
    this.authorizer = gmeAuth.authorizer;
}

// Inherit from Storage
SafeStorage.prototype = Object.create(Storage.prototype);
SafeStorage.prototype.constructor = SafeStorage;

/**
 * Returns and array of dictionaries for each project the user has at least read access to.
 * If branches is set, the returned array will be filtered based on if the projects really do exist as
 * collections on their own. If branches is not set, there is no guarantee that the returned projects
 * really exist.
 *
 * Authorization level: read access for each returned project.
 *
 * @param {object} data - input parameters
 * @param {boolean} [data.info] - include the info field from the _projects collection.
 * @param {boolean} [data.rights] - include users' authorization information for each project.
 * @param {boolean} [data.branches] - include a dictionary with all branches and their hash.
 * @param {string} [data.username=gmeConfig.authentication.guestAccount]
 * @param {function} [callback]
 * @returns {Promise} //TODO: jsdocify this
 */
SafeStorage.prototype.getProjects = function (data, callback) {
    var deferred = Q.defer(),
        self = this,
        projectAuthParams = {
            entityType: self.authorizer.ENTITY_TYPES.PROJECT,
        },
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||
        check(typeof data.info === 'undefined' || typeof data.info === 'boolean', deferred,
            'data.info is not a boolean.') ||
        check(typeof data.rights === 'undefined' || typeof data.rights === 'boolean', deferred,
            'data.rights is not a boolean.') ||
        check(typeof data.branches === 'undefined' || typeof data.branches === 'boolean', deferred,
            'data.branches is not a boolean.');

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (rejected === false) {
        this.metadataStorage.getProjects()
            .then(function (allProjects) {
                function getAuthorizedProjects(projectData) {
                    var projectDeferred = Q.defer();

                    self.authorizer.getAccessRights(data.username, projectData._id, projectAuthParams)
                        .then(function (accessRights) {
                            if (accessRights && accessRights.read === true) {
                                if (data.rights === true) {
                                    projectData.rights = accessRights;
                                }
                                if (!data.info) {
                                    delete projectData.info;
                                }
                                projectDeferred.resolve(projectData);
                            } else {
                                projectDeferred.resolve();
                            }
                        })
                        .catch(projectDeferred.reject);

                    return projectDeferred.promise;
                }

                return Q.all(allProjects.map(getAuthorizedProjects));
            })
            .then(function (projects) {
                function getBranches(project) {
                    var branchesDeferred = Q.defer();
                    Storage.prototype.getBranches.call(self, {projectId: project._id})
                        .then(function (branches) {
                            project.branches = branches;
                            branchesDeferred.resolve(project);
                        })
                        .catch(function (err) {
                            if (err.message.indexOf('Project does not exist') > -1) {
                                self.logger.error('Inconsistency: project exists in user "' + data.username +
                                    '" and in _projects, but not as a collection on its own: ', project._id);
                                branchesDeferred.resolve();
                            } else {
                                branchesDeferred.reject(err);
                            }
                        });

                    return branchesDeferred.promise;
                }

                if (data.branches === true) {
                    return Q.all(filterArray(projects).map(getBranches));
                } else {
                    deferred.resolve(filterArray(projects));
                }
            })
            .then(function (projectsAndBranches) {
                deferred.resolve(filterArray(projectsAndBranches));
            })
            .catch(function (err) {
                deferred.reject(new Error(err));
            });
    }

    return deferred.promise.nodeify(callback);
};

/**
 * Deletes a project from the _projects collection, deletes the collection for the the project and removes
 * the rights from all users.
 *
 * Authorization level: delete access for project
 *
 * @param {object} data - input parameters
 * @param {string} data.projectId - identifier for project.
 * @param {string} [data.username=gmeConfig.authentication.guestAccount]
 * @param {function} [callback]
 * @returns {Promise} //TODO: jsdocify this
 */
SafeStorage.prototype.deleteProject = function (data, callback) {
    var deferred = Q.defer(),
        self = this,
        projectAuthParams = {
            entityType: self.authorizer.ENTITY_TYPES.PROJECT,
        },
        rejected = false,
        didExist;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||
        check(typeof data.projectId === 'string', deferred, 'data.projectId is not a string.') ||
        check(REGEXP.PROJECT.test(data.projectId), deferred, 'data.projectId failed regexp: ' + data.projectId);

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (rejected === false) {
        this.authorizer.getAccessRights(data.username, data.projectId, projectAuthParams)
            .then(function (projectAccess) {
                if (projectAccess && projectAccess.delete) {
                    return Storage.prototype.deleteProject.call(self, data);
                } else {
                    throw new Error('Not authorized to delete project [' + data.projectId + ']');
                }
            })
            .then(function (didExist_) {
                didExist = didExist_;
                return self.authorizer.setAccessRights(true, data.projectId,
                    {read: false, write: false, delete: false}, projectAuthParams);
            })
            .then(function () {
                return self.metadataStorage.deleteProject(data.projectId);
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
 * Creates a project and assigns a projectId by concatenating the username and the provided project name.
 * The user with the given username becomes the owner of the project.
 *
 * Authorization level: canCreate
 *
 * @param {object} data - input parameters
 * @param {string} data.projectName - name of new project.
 * @param {string} [data.username=gmeConfig.authentication.guestAccount]
 * @param {string} [data.ownerId=data.username]
 * @param {function} [callback]
 * @returns {promise} //TODO: jsdocify this
 */
SafeStorage.prototype.createProject = function (data, callback) {
    var deferred = Q.defer(),
        self = this,
        userAuthParams = {
            entityType: self.authorizer.ENTITY_TYPES.USER
        },
        projectAuthParams = {
            entityType: self.authorizer.ENTITY_TYPES.PROJECT
        },
        rejected = false;


    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||
        check(typeof data.projectName === 'string', deferred, 'data.projectName is not a string.') ||
        check(REGEXP.PROJECT_NAME.test(data.projectName), deferred,
            'data.projectName failed regexp: ' + data.projectName);

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (data.ownerId) {
        rejected = rejected || check(typeof data.ownerId === 'string', deferred, 'data.ownerId is not a string.');
    } else {
        data.ownerId = data.username;
    }

    if (rejected === false) {
        this.authorizer.getAccessRights(data.username, data.ownerId, userAuthParams)
            .then(function (ownerRights) {
                var now = (new Date()).toISOString(),
                    info = {
                        createdAt: now,
                        viewedAt: now,
                        modifiedAt: now,
                        creator: data.username,
                        viewer: data.username,
                        modifier: data.username
                    };

                if (ownerRights.write !== true) {
                    throw new Error('Not authorized to create new project for [' + data.ownerId + ']');
                }

                return self.metadataStorage.addProject(data.ownerId, data.projectName, info);
            })
            .then(function (projectId) {
                data.projectId = projectId;
                return self.authorizer.setAccessRights(data.ownerId, projectId, {
                    read: true,
                    write: true,
                    delete: true
                }, projectAuthParams);
            })
            .then(function () {
                return Storage.prototype.createProject.call(self, data);
            })
            .then(function (dbProject) {
                var project = new UserProject(dbProject, self, self.logger, self.gmeConfig);
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
 *
 * Authorization level: canCreate and delete access for project
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.transferProject = function (data, callback) {
    var deferred = Q.defer(),
        self = this,
        userAuthParams = {
            entityType: self.authorizer.ENTITY_TYPES.USER
        },
        projectAuthParams = {
            entityType: self.authorizer.ENTITY_TYPES.PROJECT
        },
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||
        check(typeof data.projectId === 'string', deferred, 'data.projectId is not a string.') ||
        check(REGEXP.PROJECT.test(data.projectId), deferred, 'data.projectId failed regexp: ' + data.projectId) ||
        check(typeof data.newOwnerId === 'string', deferred, 'data.newOwnerId is not a string.');

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (rejected === false) {
        self.authorizer.getAccessRights(data.username, data.projectId, projectAuthParams)
            .then(function (projectAccess) {
                if (projectAccess && projectAccess.delete) {
                    return self.authorizer.getAccessRights(data.username, data.newOwnerId, userAuthParams);
                } else {
                    throw new Error('Not authorized to delete project [' + data.projectId + ']');
                }
            })
            .then(function (ownerRights) {
                if (ownerRights && ownerRights.write !== true) {
                     throw new Error('Not authorized to transfer project to [' + data.newOwnerId + ']');
                }

                // Remove old and add new metadata for the project.
                return self.metadataStorage.transferProject(data.projectId, data.newOwnerId);
            })
            .then(function (newProjectId) {
                // Rename the project collection.
                data.newProjectId = newProjectId;
                return Storage.prototype.renameProject.call(self, data);
            })
            .then(function () {
                // Remove all previous project access rights.
                self.authorizer.setAccessRights(true, data.projectId, {
                    read: false,
                    write: false,
                    delete: false
                }, projectAuthParams);
            })
            .then(function () {
                // Add full project access rights to the new owner.
                return self.authorizer.setAccessRights(data.newOwnerId, data.newProjectId, {
                    read: true,
                    write: true,
                    delete: true
                }, projectAuthParams);
            })
            .then(function () {
                deferred.resolve(data.newProjectId);
            })
            .catch(function (err) {
                deferred.reject(new Error(err));
            });
    }

    return deferred.promise.nodeify(callback);
};

/**
 * Duplicates a project including all data-objects, commits, branches etc.
 *
 * Authorization level: canCreate and read access for project
 *
 * @param {object} data - input parameters
 * @param {string} data.projectId - id of existing project that will be duplicated.
 * @param {string} data.projectName - name of new project.
 * @param {string} [data.username=gmeConfig.authentication.guestAccount]
 * @param {string} [data.ownerId=data.username]
 * @param {function} [callback]
 * @returns {promise} //TODO: jsdocify this
 */
SafeStorage.prototype.duplicateProject = function (data, callback) {
    var deferred = Q.defer(),
        self = this,
        userAuthParams = {
            entityType: self.authorizer.ENTITY_TYPES.USER
        },
        projectAuthParams = {
            entityType: self.authorizer.ENTITY_TYPES.PROJECT
        },
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||
        check(typeof data.projectId === 'string', deferred, 'data.projectId is not a string.') ||
        check(REGEXP.PROJECT.test(data.projectId), deferred, 'data.projectId failed regexp: ' + data.projectId) ||
        check(typeof data.projectName === 'string', deferred, 'data.projectName is not a string.') ||
        check(REGEXP.PROJECT_NAME.test(data.projectName), deferred,
            'data.projectName failed regexp: ' + data.projectName);

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (data.ownerId) {
        rejected = rejected || check(typeof data.ownerId === 'string', deferred, 'data.ownerId is not a string.');
    } else {
        data.ownerId = data.username;
    }

    if (self.gmeConfig.seedProjects.allowDuplication === false) {
        deferred.reject(new Error('gmeConfig.seedProjects.allowDuplication is set to false'));
        rejected = true;
    }

    if (rejected === false) {
        self.authorizer.getAccessRights(data.username, data.projectId, projectAuthParams)
            .then(function (projectAccess) {
                if (projectAccess && projectAccess.read) {
                    return self.authorizer.getAccessRights(data.username, data.ownerId, userAuthParams);
                } else {
                    throw new Error('Not authorized to read project [' + data.projectId + ']');
                }
            })
            .then(function (ownerRights) {
                var now = (new Date()).toISOString(),
                    info = {
                        createdAt: now,
                        viewedAt: now,
                        modifiedAt: now,
                        creator: data.username,
                        viewer: data.username,
                        modifier: data.username
                    };

                if (ownerRights && ownerRights.write !== true) {
                    throw new Error('Not authorized to create project for [' + data.newOwnerId + ']');
                }

                return self.metadataStorage.addProject(data.ownerId, data.projectName, info);
            })
            .then(function (projectId) {
                data.projectId = projectId;
                return self.authorizer.setAccessRights(data.ownerId, projectId, {
                    read: true,
                    write: true,
                    delete: true
                }, projectAuthParams);
            })
            .then(function () {
                return Storage.prototype.duplicateProject.call(self, data);
            })
            .then(function (dbProject) {
                var project = new UserProject(dbProject, self, self.logger, self.gmeConfig);
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
 * Returns a dictionary with all the branches and their hashes within a project.
 * Example: {
 *   master: '#someHash',
 *   b1: '#someOtherHash'
 * }
 *
 * Authorization level: read access for project
 *
 * @param {object} data - input parameters
 * @param {string} data.projectId - identifier for project.
 * @param {string} [data.username=gmeConfig.authentication.guestAccount]
 * @param {function} [callback]
 * @returns {promise} //TODO: jsdocify this
 */
SafeStorage.prototype.getBranches = function (data, callback) {
    var deferred = Q.defer(),
        self = this,
        projectAuthParams = {
            entityType: self.authorizer.ENTITY_TYPES.PROJECT
        },
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||
        check(typeof data.projectId === 'string', deferred, 'data.projectId is not a string.') ||
        check(REGEXP.PROJECT.test(data.projectId), deferred, 'data.projectId failed regexp: ' + data.projectId);

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (rejected === false) {
        self.authorizer.getAccessRights(data.username, data.projectId, projectAuthParams)
            .then(function (projectAccess) {
                if (projectAccess && projectAccess.read) {
                    return Storage.prototype.getBranches.call(self, data);
                } else {
                    throw new Error('Not authorized to read project [' + data.projectId + ']');
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
 * Returns an array of commits for a project ordered by their timestamp.
 *
 * Authorization level: read access for project
 *
 * @param {object} data - input parameters
 * @param {string} data.projectId - identifier for project.
 * @param {number} data.number - maximum number of commits to load.
 * @param {string|number} data.before - timestamp or commitHash to load history from. When number given it will load
 *  data.number of commits strictly before data.before, when commitHash is given it will return that commit too.
 * @param {string} [data.username=gmeConfig.authentication.guestAccount]
 * @param {function} [callback]
 * @returns {promise} //TODO: jsdocify this
 */
SafeStorage.prototype.getCommits = function (data, callback) {
    var deferred = Q.defer(),
        self = this,
        projectAuthParams = {
            entityType: self.authorizer.ENTITY_TYPES.PROJECT
        },
        rejected = false;

        rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||
        check(typeof data.projectId === 'string', deferred, 'data.projectId is not a string.') ||
        check(REGEXP.PROJECT.test(data.projectId), deferred, 'data.projectId failed regexp: ' + data.projectId) ||
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
        self.authorizer.getAccessRights(data.username, data.projectId, projectAuthParams)
            .then(function (projectAccess) {
                if (projectAccess && projectAccess.read) {
                    return Storage.prototype.getCommits.call(self, data);
                } else {
                    throw new Error('Not authorized to read project [' + data.projectId + ']');
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
 * Returns an array of commits starting from either a branch(es) or commitHash(es).
 * They are ordered by the rules (applied in order)
 *  1. Descendants are always before their ancestors
 *  2. By their timestamp
 *
 * Authorization level: read access for project
 *
 * @param {object} data - input parameters
 * @param {string} data.projectId - identifier for project.
 * @param {number} data.number - maximum number of commits to load.
 * @param {string|string[]} data.start - BranchName or commitHash or array of such.
 * @param {string} [data.username=gmeConfig.authentication.guestAccount]
 * @param {function} [callback]
 * @returns {promise} //TODO: jsdocify this
 */
SafeStorage.prototype.getHistory = function (data, callback) {
    var deferred = Q.defer(),
        self = this,
        projectAuthParams = {
            entityType: self.authorizer.ENTITY_TYPES.PROJECT
        },
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||
        check(typeof data.projectId === 'string', deferred, 'data.projectId is not a string.') ||
        check(REGEXP.PROJECT.test(data.projectId), deferred, 'data.projectId failed regexp: ' + data.projectId) ||
        check(typeof data.start === 'string' ||
            (typeof data.start === 'object' && data.start instanceof Array),
            deferred, 'data.start is not a string or array') ||
        check(typeof data.number === 'number', deferred, 'data.number is not a number');

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (rejected === false) {
        self.authorizer.getAccessRights(data.username, data.projectId, projectAuthParams)
            .then(function (projectAccess) {
                if (projectAccess && projectAccess.read) {
                    return Storage.prototype.getHistory.call(self, data);
                } else {
                    throw new Error('Not authorized to read project [' + data.projectId + ']');
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
 * Returns the latest commit data for a branch within the project. (This is the same data that is provided during
 * a BRANCH_UPDATE event.)
 *
 * Example: {
 *   projectId: 'guest+TestProject',
 *   branchName: 'master',
 *   commitObject: {
 *     _id: '#someCommitHash',
 *     root: '#someNodeHash',
 *     parents: ['#someOtherCommitHash'],
 *     update: ['guest'],
 *     time: 1430169614741,
 *     message: 'createChild(/1/2)',
 *     type: 'commit'
 *   },
 *   coreObject: [{coreObj}, ..., {coreObj}],
 * }
 *
 * Authorization level: read access for project
 *
 * @param {object} data - input parameters
 * @param {string} data.projectId - identifier for project.
 * @param {string} data.branchName - name of the branch.
 * @param {string} [data.username=gmeConfig.authentication.guestAccount]
 * @param {function} [callback]
 * @returns {promise} //TODO: jsdocify this
 */
SafeStorage.prototype.getLatestCommitData = function (data, callback) {
    var deferred = Q.defer(),
        self = this,
        projectAuthParams = {
            entityType: self.authorizer.ENTITY_TYPES.PROJECT
        },
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||
        check(typeof data.projectId === 'string', deferred, 'data.projectId is not a string.') ||
        check(REGEXP.PROJECT.test(data.projectId), deferred, 'data.projectId failed regexp: ' + data.projectId) ||
        check(typeof data.branchName === 'string', deferred, 'data.branchName is not a string.') ||
        check(REGEXP.BRANCH.test(data.branchName), deferred, 'data.branchName failed regexp: ' + data.branchName);

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (rejected === false) {
        self.authorizer.getAccessRights(data.username, data.projectId, projectAuthParams)
            .then(function (projectAccess) {
                if (projectAccess && projectAccess.read) {
                    return Storage.prototype.getLatestCommitData.call(self, data);
                } else {
                    throw new Error('Not authorized to read project [' + data.projectId + ']');
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
 * Authorization: write access for data.projectId
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.makeCommit = function (data, callback) {
    var deferred = Q.defer(),
        self = this,
        projectAuthParams = {
            entityType: self.authorizer.ENTITY_TYPES.PROJECT
        },
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||

        check(typeof data.projectId === 'string', deferred, 'data.projectId is not a string.') ||
        check(REGEXP.PROJECT.test(data.projectId), deferred, 'data.projectId failed regexp: ' + data.projectId) ||

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
                'data.commitObject.root is not a valid hash: ' + data.commitObject.root);
        // Commits without coreObjects is valid now (the assumption is that the rootObject does exist.
        //check(typeof data.coreObjects[data.commitObject.root] === 'object', deferred,
        //    'data.coreObjects[data.commitObject.root] is not an object');

        if (typeof data.oldHash === 'string') {
            // Provide the possibility to refer to an oldHash explicitly rather than from the commitObj,
            // the is needed when e.g. undoing/redoing.
            check(data.oldHash === '' || REGEXP.HASH.test(data.oldHash), deferred,
                'data.oldHash is not a valid hash: ' + data.oldHash);
        }
    }

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (rejected === false) {
        self.authorizer.getAccessRights(data.username, data.projectId, projectAuthParams)
            .then(function (projectAccess) {
                if (projectAccess && projectAccess.write) {
                    return Storage.prototype.makeCommit.call(self, data);
                } else {
                    throw new Error('Not authorized to write project [' + data.projectId + ']');
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
 * Authorization: read access for data.projectId
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.getBranchHash = function (data, callback) {
    var deferred = Q.defer(),
        self = this,
        projectAuthParams = {
            entityType: self.authorizer.ENTITY_TYPES.PROJECT
        },
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||

        check(typeof data.projectId === 'string', deferred, 'data.projectId is not a string.') ||
        check(REGEXP.PROJECT.test(data.projectId), deferred, 'data.projectId failed regexp: ' + data.projectId) ||

        check(typeof data.branchName === 'string', deferred, 'data.branchName is not a string.') ||
        check(REGEXP.BRANCH.test(data.branchName), deferred, 'data.branchName failed regexp: ' + data.branchName);

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (rejected === false) {
        self.authorizer.getAccessRights(data.username, data.projectId, projectAuthParams)
            .then(function (projectAccess) {
                if (projectAccess && projectAccess.read) {
                    return Storage.prototype.getBranchHash.call(self, data);
                } else {
                    throw new Error('Not authorized to read project [' + data.projectId + ']');
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
 * Authorization: write access for data.projectId
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.setBranchHash = function (data, callback) {
    var deferred = Q.defer(),
        self = this,
        projectAuthParams = {
            entityType: self.authorizer.ENTITY_TYPES.PROJECT
        },
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||

        check(typeof data.projectId === 'string', deferred, 'data.projectId is not a string.') ||
        check(REGEXP.PROJECT.test(data.projectId), deferred, 'data.projectId failed regexp: ' + data.projectId) ||

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
        self.authorizer.getAccessRights(data.username, data.projectId, projectAuthParams)
            .then(function (projectAccess) {
                if (projectAccess && projectAccess.write) {
                    return Storage.prototype.setBranchHash.call(self, data);
                } else {
                    throw new Error('Not authorized to write project [' + data.projectId + ']');
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
 * Authorization: read access for data.projectId
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.getCommonAncestorCommit = function (data, callback) {
    var deferred = Q.defer(),
        self = this,
        projectAuthParams = {
            entityType: self.authorizer.ENTITY_TYPES.PROJECT
        },
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||

        check(typeof data.projectId === 'string', deferred, 'data.projectId is not a string.') ||
        check(REGEXP.PROJECT.test(data.projectId), deferred, 'data.projectId failed regexp: ' + data.projectId) ||

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
        self.authorizer.getAccessRights(data.username, data.projectId, projectAuthParams)
            .then(function (projectAccess) {
                if (projectAccess && projectAccess.read) {
                    return Storage.prototype.getCommonAncestorCommit.call(self, data);
                } else {
                    throw new Error('Not authorized to read project [' + data.projectId + ']');
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
 * Authorization: write access for data.projectId
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.createBranch = function (data, callback) {
    var deferred = Q.defer(),
        self = this,
        projectAuthParams = {
            entityType: self.authorizer.ENTITY_TYPES.PROJECT
        },
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||

        check(typeof data.projectId === 'string', deferred, 'data.projectId is not a string.') ||
        check(REGEXP.PROJECT.test(data.projectId), deferred, 'data.projectId failed regexp: ' + data.projectId) ||

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
        self.authorizer.getAccessRights(data.username, data.projectId, projectAuthParams)
            .then(function (projectAccess) {
                if (projectAccess && projectAccess.write) {
                    return Storage.prototype.setBranchHash.call(self, data);
                } else {
                    throw new Error('Not authorized to write project [' + data.projectId + ']');
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
 * Authorization: write access for data.projectId
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.deleteBranch = function (data, callback) {
    var deferred = Q.defer(),
        self = this,
        projectAuthParams = {
            entityType: self.authorizer.ENTITY_TYPES.PROJECT
        },
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||

        check(typeof data.projectId === 'string', deferred, 'data.projectId is not a string.') ||
        check(REGEXP.PROJECT.test(data.projectId), deferred, 'data.projectId failed regexp: ' + data.projectId) ||

        check(typeof data.branchName === 'string', deferred, 'data.branchName is not a string.') ||
        check(REGEXP.BRANCH.test(data.branchName), deferred, 'data.branchName failed regexp: ' + data.branchName);


    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (rejected === false) {
        self.authorizer.getAccessRights(data.username, data.projectId, projectAuthParams)
            .then(function (projectAccess) {
                if (projectAccess && projectAccess.write) {
                    return Storage.prototype.getBranchHash.call(self, data);
                } else {
                    throw new Error('Not authorized to write project [' + data.projectId + ']');
                }
            })
            .then(function (branchHash) {
                data.oldHash = branchHash;
                data.newHash = '';
                return Storage.prototype.setBranchHash.call(self, data);
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
 * Authorization: write access for data.projectId
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.createTag = function (data, callback) {
    var deferred = Q.defer(),
        self = this,
        projectAuthParams = {
            entityType: self.authorizer.ENTITY_TYPES.PROJECT
        },
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||

        check(typeof data.projectId === 'string', deferred, 'data.projectId is not a string.') ||
        check(REGEXP.PROJECT.test(data.projectId), deferred, 'data.projectId failed regexp: ' + data.projectId) ||

        check(typeof data.tagName === 'string', deferred, 'data.tagName is not a string.') ||
        check(REGEXP.TAG.test(data.tagName), deferred, 'data.tagName failed regexp: ' + data.tagName) ||

        check(typeof data.commitHash === 'string', deferred, 'data.hash is not a string.') ||
        check(data.commitHash === '' || REGEXP.HASH.test(data.commitHash), deferred,
            'data.hash is not a valid hash: ' + data.commitHash);


    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (rejected === false) {
        self.authorizer.getAccessRights(data.username, data.projectId, projectAuthParams)
            .then(function (projectAccess) {
                if (projectAccess && projectAccess.write) {
                    return Storage.prototype.createTag.call(self, data);
                } else {
                    throw new Error('Not authorized to write project [' + data.projectId + ']');
                }
            })
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
 * Authorization: delete access for data.projectId
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.deleteTag = function (data, callback) {
    var deferred = Q.defer(),
        self = this,
        projectAuthParams = {
            entityType: self.authorizer.ENTITY_TYPES.PROJECT
        },
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||

        check(typeof data.projectId === 'string', deferred, 'data.projectId is not a string.') ||
        check(REGEXP.PROJECT.test(data.projectId), deferred, 'data.projectId failed regexp: ' + data.projectId) ||

        check(typeof data.tagName === 'string', deferred, 'data.tagName is not a string.') ||
        check(REGEXP.TAG.test(data.tagName), deferred, 'data.tagName failed regexp: ' + data.tagName);


    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (rejected === false) {
        self.authorizer.getAccessRights(data.username, data.projectId, projectAuthParams)
            .then(function (projectAccess) {
                if (projectAccess && projectAccess.delete) {
                    return Storage.prototype.deleteTag.call(self, data);
                } else {
                    throw new Error('Not authorized to delete from project [' + data.projectId + ']');
                }
            })
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
 * Returns a dictionary with all the tags and their commitHashes within a project.
 * Example: {
 *   tag1: '#someHash',
 *   taggen: '#someOtherHash'
 * }
 *
 * Authorization level: read access for project
 *
 * @param {object} data - input parameters
 * @param {string} data.projectId - identifier for project.
 * @param {string} [data.username=gmeConfig.authentication.guestAccount]
 * @param {function} [callback]
 * @returns {*}
 */
SafeStorage.prototype.getTags = function (data, callback) {
    var deferred = Q.defer(),
        self = this,
        projectAuthParams = {
            entityType: self.authorizer.ENTITY_TYPES.PROJECT
        },
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||
        check(typeof data.projectId === 'string', deferred, 'data.projectId is not a string.') ||
        check(REGEXP.PROJECT.test(data.projectId), deferred, 'data.projectId failed regexp: ' + data.projectId);

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (rejected === false) {
        self.authorizer.getAccessRights(data.username, data.projectId, projectAuthParams)
            .then(function (projectAccess) {
                if (projectAccess && projectAccess.read) {
                    return Storage.prototype.getTags.call(self, data);
                } else {
                    throw new Error('Not authorized to read project [' + data.projectId + ']');
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
 * Authorization: read access
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.openProject = function (data, callback) {
    var deferred = Q.defer(),
        userProject,
        self = this;

    self._getProject(data)
        .then(function (dbProject) {
            userProject = new UserProject(dbProject, self, self.logger, self.gmeConfig);
            deferred.resolve(userProject);
        })
        .catch(function (err) {
            deferred.reject(new Error(err));
        });

    return deferred.promise.nodeify(callback);
};

/**
 * Authorization: read access
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype._getProject = function (data, callback) {
    var deferred = Q.defer(),
        self = this,
        projectAuthParams = {
            entityType: self.authorizer.ENTITY_TYPES.PROJECT
        },
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||
        check(typeof data.projectId === 'string', deferred, 'data.projectId is not a string.') ||
        check(REGEXP.PROJECT.test(data.projectId), deferred, 'data.projectId failed regexp: ' + data.projectId);

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    if (rejected === false) {
        self.authorizer.getAccessRights(data.username, data.projectId, projectAuthParams)
            .then(function (projectAccess) {
                if (projectAccess && projectAccess.read) {
                    return Storage.prototype.openProject.call(self, data);
                } else {
                    throw new Error('Not authorized to read project [' + data.projectId + ']');
                }
            })
            .then(function (dbProject) {
                deferred.resolve(dbProject);
            })
            .catch(function (err) {
                deferred.reject(new Error(err));
            });
    }

    return deferred.promise.nodeify(callback);
};

/**
 * Authorization: TODO: read access for data.projectId
 * @param data
 * @param callback
 * @returns {*}
 */
SafeStorage.prototype.loadObjects = function (data, callback) {
    var deferred = Q.defer(),
        self = this,
        projectAuthParams = {
            entityType: self.authorizer.ENTITY_TYPES.PROJECT
        },
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||
        check(typeof data.projectId === 'string', deferred, 'data.projectId is not a string.') ||
        check(REGEXP.PROJECT.test(data.projectId), deferred, 'data.projectId failed regexp: ' + data.projectId) ||
        check(data.hashes instanceof Array, deferred, 'data.hashes is not an array: ' + JSON.stringify(data.hashes));

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    self.logger.debug('loadObjects', {metadata: data});
    if (rejected === false) {
        self.authorizer.getAccessRights(data.username, data.projectId, projectAuthParams)
            .then(function (projectAccess) {
                if (projectAccess && projectAccess.read) {
                    return Storage.prototype.loadObjects.call(self, data);
                } else {
                    throw new Error('Not authorized to read project [' + data.projectId + ']');
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
 * Returns a dictionary with all the hashes needed to load the containment of the input paths.
 *
 * Authorization level: read access for data.projectId
 *
 * @param {object} data - input parameters.
 * @param {string} data.projectId - identifier for project.
 * @param {string} [data.username=gmeConfig.authentication.guestAccount]
 * @param {object[]} data.pathsInfo - list of objects with parentHash and path.
 * @param {string[]} [data.excludes] - list of known object hashes that should not be returned.
 * @param {boolean} [data.excludeParents] - if true will only return the data for the node at the path.
 * @param {function} [callback]
 * @returns {promise} //TODO: jsdocify this
 */
SafeStorage.prototype.loadPaths = function (data, callback) {
    var deferred = Q.defer(),
        self = this,
        projectAuthParams = {
            entityType: self.authorizer.ENTITY_TYPES.PROJECT
        },
        rejected = false;

    rejected = check(data !== null && typeof data === 'object', deferred, 'data is not an object.') ||
        check(typeof data.projectId === 'string', deferred, 'data.projectId is not a string.') ||
        check(REGEXP.PROJECT.test(data.projectId), deferred, 'data.projectId failed regexp: ' + data.projectId) ||
        check(data.pathsInfo instanceof Array, deferred,
            'data.pathsInfo is not an array: ' + JSON.stringify(data.hashes));

    if (data.hasOwnProperty('username')) {
        rejected = rejected || check(typeof data.username === 'string', deferred, 'data.username is not a string.');
    } else {
        data.username = this.gmeConfig.authentication.guestAccount;
    }

    self.logger.debug('loadPaths', {metadata: data});
    if (rejected === false) {
        self.authorizer.getAccessRights(data.username, data.projectId, projectAuthParams)
            .then(function (projectAccess) {
                if (projectAccess && projectAccess.read) {
                    return Storage.prototype.loadPaths.call(self, data);
                } else {
                    throw new Error('Not authorized to read project [' + data.projectId + ']');
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