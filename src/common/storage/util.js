/*globals define*/
/*jshint node:true, browser: true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

define(['common/storage/constants', 'common/util/jsonPatcher'], function (CONSTANTS, jsonPatcher) {
    'use strict';
    return {
        CONSTANTS: CONSTANTS,
        getProjectFullNameFromProjectId: function (projectId) {
            if (projectId) {
                return projectId.replace(CONSTANTS.PROJECT_ID_SEP, CONSTANTS.PROJECT_DISPLAYED_NAME_SEP);
            }
        },
        getProjectDisplayedNameFromProjectId: function (projectId) {
            if (projectId) {
                return projectId.replace(CONSTANTS.PROJECT_ID_SEP, ' ' + CONSTANTS.PROJECT_DISPLAYED_NAME_SEP + ' ');
            }
        },
        getProjectIdFromProjectFullName: function (projectFullName) {
            if (projectFullName) {
                return projectFullName.replace(CONSTANTS.PROJECT_DISPLAYED_NAME_SEP, CONSTANTS.PROJECT_ID_SEP);
            }
        },
        getProjectIdFromOwnerIdAndProjectName: function (userId, projectName) {
            return userId + CONSTANTS.PROJECT_ID_SEP + projectName;
        },
        getProjectNameFromProjectId: function (projectId) {
            if (projectId) {
                return projectId.substring(projectId.indexOf(CONSTANTS.PROJECT_ID_SEP) + 1);
            }
        },
        getOwnerFromProjectId: function (projectId) {
            if (projectId) {
                return projectId.substring(0, projectId.indexOf(CONSTANTS.PROJECT_ID_SEP));
            }
        },
        getHashTaggedHash: function (hash) {
            if (typeof hash === 'string') {
                return hash[0] === '#' ? hash : '#' + hash;
            }
            return hash;
        },
        getPatchObject: function (oldData, newData) {
            var patchObject = {
                type: 'patch',
                base: oldData[CONSTANTS.MONGO_ID],
                patch: jsonPatcher.create(oldData, newData)
            };
            patchObject[CONSTANTS.MONGO_ID] = newData[CONSTANTS.MONGO_ID];

            return patchObject;
        },
        applyPatch: jsonPatcher.apply
    };
});
