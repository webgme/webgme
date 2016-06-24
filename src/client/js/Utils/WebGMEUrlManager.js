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

    var parseInitialThingsToDoFromUrl,
        serializeStateToUrl,
        loadStateFromParsedUrl;

    parseInitialThingsToDoFromUrl = function () {
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
    };


    serializeStateToUrl = function () {
        var searchQuery = ''; // default if project is not open

        if (WebGMEGlobal.State.getActiveProjectName()) {
            searchQuery = 'project=' + encodeURIComponent(WebGMEGlobal.State.getActiveProjectName());

            if (WebGMEGlobal.State.getActiveBranch()) {
                searchQuery += '&branch=' + WebGMEGlobal.State.getActiveBranch();
            } else if (WebGMEGlobal.State.getActiveCommit()) {
                searchQuery += '&commit=' + WebGMEGlobal.State.getActiveCommit();
            }

            if (WebGMEGlobal.State.getActiveObject()) {
                searchQuery += '&node=' + WebGMEGlobal.State.getActiveObject();
            } else if (WebGMEGlobal.State.getActiveObject() === CONSTANTS.PROJECT_ROOT_ID) {
                searchQuery += '&node=root';
            }

            if (WebGMEGlobal.State.getActiveVisualizer()) {
                searchQuery += '&visualizer=' + WebGMEGlobal.State.getActiveVisualizer();
            }

            if (WebGMEGlobal.State.getActiveTab() !== null && WebGMEGlobal.State.getActiveTab() !== undefined) {
                searchQuery += '&tab=' + WebGMEGlobal.State.getActiveTab();
            }

            if (WebGMEGlobal.State.getLayout() !== null && WebGMEGlobal.State.getLayout() !== undefined) {
                searchQuery += '&layout=' + WebGMEGlobal.State.getLayout();
            }

            // leave this last, url may exceeds the max url limit
            if (WebGMEGlobal.State.getActiveSelection()) {
                searchQuery += '&selection=' + WebGMEGlobal.State.getActiveSelection().join(',');
            }
        }

        return searchQuery;
    };

    return {
        parseInitialThingsToDoFromUrl: parseInitialThingsToDoFromUrl,
        serializeStateToUrl: serializeStateToUrl
    };

});
