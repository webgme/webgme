/*globals requireJS*/
/*jshint node:true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var Q = require('q'),
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

        return self.projectCollection.insert(data)
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
        return self.projectCollection.remove({_id: projectId}).nodeify(callback);
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
                    return Q.reject(new Error('no such project [' + projectId + ']'));
                }

                projectData.info.viewedAt = info.viewedAt || projectData.info.viewedAt;
                projectData.info.viewer = info.viewer || projectData.info.viewer;

                projectData.info.modifiedAt = info.modifiedAt || projectData.info.modifiedAt;
                projectData.info.modifier = info.modifier || projectData.info.modifier;

                projectData.info.createdAt = info.createdAt || projectData.info.createdAt;
                projectData.info.creator = info.creator || projectData.info.creator;

                return self.projectCollection.update({_id: projectId}, projectData, {upsert: true});
            })
            .then(function () {
                return getProject(projectId);
            })
            .nodeify(callback);
    }

    function updateProjectHooks(projectId, hooks, callback) {
        return self.projectCollection.findOne({_id: projectId})
            .then(function (projectData) {
                if (!projectData) {
                    return Q.reject(new Error('no such project [' + projectId + ']'));
                }

                // always update webhook information as a whole to allow remove and create and update as well
                projectData.hooks = hooks;

                return self.projectCollection.update({_id: projectId}, projectData, {upsert: true});
            })
            .then(function () {
                return getProject(projectId);
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
        updateProjectHooks: updateProjectHooks
    };
}

module.exports = MetadataStorage;
