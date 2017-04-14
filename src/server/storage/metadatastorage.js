/*globals requireJS*/
/*jshint node:true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var Q = require('q'),
    CONSTANTS = requireJS('common/Constants'),
    storageUtil = requireJS('common/storage/util');

function MetadataStorage(mainLogger, gmeConfig) {
    var self = this,
        logger = mainLogger.fork('MetadataStorage');

    self.projectCollection = null;

    function start(params, callback) {
        var deferred = Q.defer();
        self.projectCollection = params.projectCollection;
        deferred.resolve();
        return deferred.promise.nodeify(callback);
    }

    function stop(callback) {
        var deferred = Q.defer();
        deferred.resolve();
        return deferred.promise.nodeify(callback);
    }

    /**
     *
     * @param projectId
     * @param callback
     * @returns {*}
     */
    function getProjects(callback) {
        return self.projectCollection.find({})
            .then(function (projects) {
                return Q.ninvoke(projects, 'toArray');
            })
            .then(function (projects) {
                var i;

                for (i = 0; i < projects.length; i += 1) {
                    projects[i].hooks = projects[i].hooks || {};
                }

                return projects;
            })
            .nodeify(callback);
    }

    /**
     *
     * @param projectId
     * @param callback
     * @returns {*}
     */
    function getProject(projectId, callback) {
        return self.projectCollection.findOne({_id: projectId})
            .then(function (projectData) {
                if (!projectData) {
                    return Q.reject(new Error('no such project [' + projectId + ']'));
                }

                projectData.hooks = projectData.hooks || {};
                return projectData;
            })
            .nodeify(callback);
    }

    /**
     *
     * @param ownerId
     * @param projectName
     * @param info
     * @param callback
     * @returns {*}
     */
    function addProject(ownerId, projectName, info, callback) {
        var id = storageUtil.getProjectIdFromOwnerIdAndProjectName(ownerId, projectName),
            data = {
                _id: id,
                owner: ownerId,
                name: projectName,
                info: info || {}
            };

        return self.projectCollection.insertOne(data)
            .then(function () {
                return id;
            })
            .catch(function (err) {
                if (err.code === 11000) {
                    throw new Error('Project already exists ' + id + ' in _projects collection');
                } else {
                    throw err;
                }
            })
            .nodeify(callback);
    }

    /**
     *
     * @param projectId
     * @param callback
     * @returns {*}
     */
    function deleteProject(projectId, callback) {
        return self.projectCollection.deleteOne({_id: projectId}).nodeify(callback);
    }

    function transferProject(projectId, newOwnerId, callback) {
        var projectInfo,
            projectName,
            newProjectId;
        logger.debug('transferProject: projectId, newOrgOrUserId', projectId, newOwnerId);

        return getProject(projectId)
            .then(function (projectData) {
                projectInfo = projectData.info;
                projectName = projectData.name;
                return addProject(newOwnerId, projectName, projectInfo);
            })
            .then(function (newProjectId_) {
                newProjectId = newProjectId_;
                return deleteProject(projectId);
            })
            .then(function () {
                return newProjectId;
            })
            .nodeify(callback);
    }

    /**
     *
     * @param projectId
     * @param {object} info
     * @param callback
     * @returns {*}
     */
    function updateProjectInfo(projectId, info, callback) {
        return self.projectCollection.findOne({_id: projectId})
            .then(function (projectData) {
                if (!projectData) {
                    throw new Error('no such project [' + projectId + ']');
                }

                CONSTANTS.STORAGE.PROJECT_INFO_KEYS.forEach(function (infoKey) {
                    projectData.info[infoKey] = info[infoKey] || projectData.info[infoKey];
                });

                return self.projectCollection.updateOne({_id: projectId}, projectData, {upsert: true});
            })
            .then(function () {
                return getProject(projectId);
            })
            .nodeify(callback);
    }

    function _ensureValidEvents(events) {
        var i;

        if (events instanceof Array === false) {
            if (events !== 'all') {
                throw new Error('Event [' + events + '] is not an array and not "all"');
            }
        } else {
            for (i = 0; i < events.length; i += 1) {
                if (CONSTANTS.WEBHOOK_EVENTS.hasOwnProperty(events[i]) === false) {
                    throw new Error('Event [' + events[i] + '] not among valid events. Valid events: ' +
                        Object.keys(CONSTANTS.WEBHOOK_EVENTS));
                }
            }
        }
    }

    /**
     *
     * @param projectId
     * @param callback
     */
    function getProjectHooks(projectId, callback) {
        return getProject(projectId)
            .then(function (projectData) {
                return projectData.hooks;
            })
            .nodeify(callback);
    }

    /**
     * This method isn't safe and should only be used privately or for removing all hooks.
     * @param projectId
     * @param hooks
     * @param callback
     * @returns {*}
     */
    function updateProjectHooks(projectId, hooks, callback) {
        return self.projectCollection.findOne({_id: projectId})
            .then(function (projectData) {
                if (!projectData) {
                    throw new Error('no such project [' + projectId + ']');
                }

                // always update webhook information as a whole to allow remove and create and update as well
                projectData.hooks = hooks;

                return self.projectCollection.updateOne({_id: projectId}, projectData, {upsert: true});
            })
            .then(function () {
                return getProject(projectId);
            })
            .nodeify(callback);
    }

    /**
     *
     * @param projectId
     * @param hookId
     * @param callback
     */
    function getProjectHook(projectId, hookId, callback) {
        return getProjectHooks(projectId)
            .then(function (hooks) {
                if (typeof hookId !== 'string' || !hookId) {
                    throw new Error('hookId empty or not a string [' + hookId + ']');
                }

                if (hooks.hasOwnProperty(hookId) === false) {
                    throw new Error('no such hook [' + hookId + ']');
                }

                return hooks[hookId];
            })
            .nodeify(callback);
    }

    /**
     *
     * @param {string} projectId
     * @param {string} hookId
     * @param {object} data
     * @param [callback]
     * @returns {*}
     */
    function addProjectHook(projectId, hookId, data, callback) {
        return getProjectHooks(projectId)
            .then(function (hooks) {
                var now = (new Date()).toISOString(),
                    hookData = {
                        createdAt: now,
                        updatedAt: now,
                        active: true,
                        description: 'No description given',
                        events: []
                };

                if (typeof hookId !== 'string' || !hookId) {
                    throw new Error('hookId empty or not a string [' + hookId + ']');
                }

                if (typeof data.url !== 'string' || !data.url) {
                    throw new Error('data.url empty or not a string [' + data.url + ']');
                }

                if (data.events) {
                    _ensureValidEvents(data.events);
                }

                if (hooks.hasOwnProperty(hookId) === true) {
                    throw new Error('hook already exists [' + hookId + ']');
                }

                hookData.url = data.url;

                if (data.active === false) {
                    hookData.active = false;
                }

                hookData.description = data.description || hookData.description;
                hookData.events = data.events || hookData.events;

                hooks[hookId] = hookData;

                return updateProjectHooks(projectId, hooks);
            })
            .then(function (projectData) {
                return projectData.hooks[hookId];
            })
            .nodeify(callback);
    }

    /**
     *
     * @param {string} projectId
     * @param {string} hookId
     * @param {object} data
     * @param [callback]
     * @returns {*}
     */
    function updateProjectHook(projectId, hookId, data, callback) {
        return getProjectHooks(projectId)
            .then(function (hooks) {
                if (typeof hookId !== 'string' || !hookId) {
                    throw new Error('hookId empty or not a string [' + hookId + ']');
                }

                if (!hooks[hookId]) {
                    throw new Error('no such hook [' + hookId + ']');
                }

                if (data.url) {
                    if (typeof data.url !== 'string') {
                        throw new Error('data.url not a string [' + data.url + ']');
                    }

                    hooks[hookId].url = data.url;
                }

                if (data.events) {
                    _ensureValidEvents(data.events);

                    hooks[hookId].events = data.events;
                }

                if (data.active === false) {
                    hooks[hookId].active = false;
                }

                hooks[hookId].description = data.description || hooks[hookId].description;

                hooks[hookId].updatedAt = (new Date()).toISOString();

                return updateProjectHooks(projectId, hooks);
            })
            .then(function () {
                return getProjectHook(projectId, hookId);
            })
            .nodeify(callback);
    }

    /**
     *
     * @param {string} projectId
     * @param {string} hookId
     * @param [callback]
     * @returns {*}
     */
    function removeProjectHook(projectId, hookId, callback) {
        return getProjectHooks(projectId)
            .then(function (hooks) {
                if (typeof hookId !== 'string' || !hookId) {
                    throw new Error('hookId empty or not a string [' + hookId + ']');
                }

                if (hooks.hasOwnProperty(hookId) === false) {
                    throw new Error('no such hook [' + hookId + ']');
                }

                delete hooks[hookId];

                return updateProjectHooks(projectId, hooks);
            })
            .then(function (projectData) {
                return projectData.hooks;
            })
            .nodeify(callback);
    }

    return {
        start: start,
        stop: stop,

        getProjects: getProjects,
        getProject: getProject,
        addProject: addProject,
        deleteProject: deleteProject,
        transferProject: transferProject,
        updateProjectInfo: updateProjectInfo,

        getProjectHooks: getProjectHooks,
        getProjectHook: getProjectHook,
        addProjectHook: addProjectHook,
        updateProjectHooks: updateProjectHooks,
        updateProjectHook: updateProjectHook,
        removeProjectHook: removeProjectHook
    };
}

module.exports = MetadataStorage;
