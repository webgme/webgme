/*globals define*/
/*jshint node:true, browser: true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

define([], function () {
    'use strict';
    return {

        getProjectFullNameFromProjectId: function (projectId) {
            if (projectId) {
                return projectId.replace('+', '/');
            }
        },
        getProjectDisplayedNameFromProjectId: function (projectId) {
            if (projectId) {
                return projectId.replace('+', ' / ');
            }
        },
        getProjectIdFromProjectFullName: function (projectFullName) {
            if (projectFullName) {
                return projectFullName.replace('/', '+');
            }
        }
    };
});
