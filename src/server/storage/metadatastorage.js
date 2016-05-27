/*globals*/
/*jshint node:true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

var PROJECTS_COLLECTION = '_projects';

function MetadataStorage() {
    var self = this;

    /**
     *
     * @param orgOrUserId
     * @param projectName
     * @param info
     * @param callback
     * @returns {*}
     */
    function addProject(orgOrUserId, projectName, info, callback) {
        var id = storageUtil.getProjectIdFromOwnerIdAndProjectName(orgOrUserId, projectName),
            data = {
                _id: id,
                owner: orgOrUserId,
                name: projectName,
                info: info || {}
            };

        return projectCollection.insert(data)
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
    function getProjects(callback) {
        return projectCollection.findOne({_id: projectId})
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
     * @param projectId
     * @param callback
     * @returns {*}
     */
    function getProject(projectId, callback) {
        return projectCollection.findOne({_id: projectId})
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
     * @param projectId
     * @param {object} info
     * @param callback
     * @returns {*}
     */
    function updateProjectInfo(projectId, info, callback) {
        return projectCollection.findOne({_id: projectId})
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

                return projectCollection.update({_id: projectId}, projectData, {upsert: true});
            })
            .then(function () {
                return getProject(projectId);
            })
            .nodeify(callback);
    }
}

