/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'js/util',
    'js/Constants'
], function (util, CONSTANTS) {

    'use strict';

    function getSearchQuery(stateInfo) {
        var searchQuery = 'project=' + encodeURIComponent(stateInfo.projectId);

        if (stateInfo.branchName) {
            searchQuery += '&branch=' + stateInfo.branchName;
        } else if (stateInfo.commitId) {
            searchQuery += '&commit=' + stateInfo.commitId;
        }

        if (stateInfo.nodeId) {
            searchQuery += '&node=' + stateInfo.nodeId;
        } else if (stateInfo.nodeId === CONSTANTS.PROJECT_ROOT_ID) {
            searchQuery += '&node=root';
        }

        if (stateInfo.visualizer) {
            searchQuery += '&visualizer=' + stateInfo.visualizer;
        }

        if (typeof stateInfo.tab === 'number') {
            searchQuery += '&tab=' + stateInfo.tab;
        }

        if (stateInfo.layout) {
            searchQuery += '&layout=' + stateInfo.layout;
        }

        // leave this last, url may exceeds the max url limit
        if (stateInfo.selection) {
            searchQuery += '&selection=' + stateInfo.selection.join(',');
        }

        return searchQuery;
    }

    function serializeStateToUrl() {
        var stateInfo = {},
            searchQuery = ''; // default if project is not open

        if (WebGMEGlobal.State.getActiveProjectName()) {
            stateInfo.projectId = WebGMEGlobal.State.getActiveProjectName();

            if (WebGMEGlobal.State.getActiveBranch()) {
                stateInfo.branchName = WebGMEGlobal.State.getActiveBranch();
            } else if (WebGMEGlobal.State.getActiveCommit()) {
                stateInfo.commitId = WebGMEGlobal.State.getActiveCommit();
            }

            if (typeof WebGMEGlobal.State.getActiveObject() === 'string') {
                stateInfo.nodeId = WebGMEGlobal.State.getActiveObject();
            }

            if (WebGMEGlobal.State.getActiveVisualizer()) {
                stateInfo.visualizer = WebGMEGlobal.State.getActiveVisualizer();
            }

            if (typeof WebGMEGlobal.State.getActiveTab() === 'number') {
                stateInfo.tab = WebGMEGlobal.State.getActiveTab();
            }

            if (WebGMEGlobal.State.getLayout() !== null && WebGMEGlobal.State.getLayout() !== undefined) {
                stateInfo.layout = WebGMEGlobal.State.getLayout();
            }

            // leave this last, url may exceeds the max url limit
            if (WebGMEGlobal.State.getActiveSelection()) {
                stateInfo.selection = WebGMEGlobal.State.getActiveSelection();
            }

            searchQuery = getSearchQuery(stateInfo);
        }

        return searchQuery;
    }

    function parseInitialThingsToDoFromUrl() {
        return {
            layoutToLoad: util.getURLParameterByName('layout') || WebGMEGlobal.gmeConfig.visualization.layout.default,
            commitToLoad: util.getURLParameterByName('commit').toLowerCase(),
            projectToLoad: util.getURLParameterByName('project'),
            objectToLoad: util.getURLParameterByName('node') || CONSTANTS.PROJECT_ROOT_ID,
            createNewProject: util.getURLParameterByName('create') === 'true',
            branchToLoad: util.getURLParameterByName('branch'),
            tabToSelect: util.getURLParameterByName('tab') || 0,
            visualizerToLoad: util.getURLParameterByName('visualizer') || 'ModelEditor',
            //aspectToLoad: util.getURLParameterByName('aspect') || 'All',
            activeSelectionToLoad: util.getURLParameterByName('selection') ?
                util.getURLParameterByName('selection').split(',') : []
        };
        //var queryObj = util.getObjectFromUrlQuery(location.search);
        // TODO: use this instead and add tests (only parses the string once).
        //return {
        //    layoutToLoad: queryObj.layout || 'DefaultLayout',
        //    commitToLoad: queryObj.commit ? queryObj.commit.toLowerCase() : '',
        //    projectToLoad:  queryObj.project || '',
        //    objectToLoad: queryObj.activeObject ? queryObj.activeObject.toLowerCase() : '',
        //    createNewProject: queryObj.create === 'true',
        //    branchToLoad: queryObj.branch || ''
        //};
    }

    return {
        parseInitialThingsToDoFromUrl: parseInitialThingsToDoFromUrl,
        serializeStateToUrl: serializeStateToUrl,
        getSearchQuery: getSearchQuery
    };
});
