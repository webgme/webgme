/*jshint browser:true*/
/*globals define, _, requirejs, WebGMEGlobal*/

define ([
        'js/util',
        'js/Constants'
    ],
    function (util, CONSTANTS) {

    'use strict';

    var parseInitialThingsToDoFromUrl,
        serializeStateToUrl,
        loadStateFromParsedUrl;

    parseInitialThingsToDoFromUrl = function () {
        return {
            layoutToLoad: util.getURLParameterByName('layout') || 'DefaultLayout',
            commitToLoad: util.getURLParameterByName('commit').toLowerCase(),
            projectToLoad:  util.getURLParameterByName('project'),
            objectToLoad: util.getURLParameterByName('node').toLowerCase() || CONSTANTS.PROJECT_ROOT_ID,
            createNewProject: util.getURLParameterByName('create') === 'true',
            branchToLoad: util.getURLParameterByName('branch'),
            visualizerToLoad: util.getURLParameterByName('visualizer') || 'ModelEditor',
            aspectToLoad: util.getURLParameterByName('aspect') || 'All',
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
            searchQuery = 'project=' + WebGMEGlobal.State.getActiveProjectName();

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

            if (WebGMEGlobal.State.getActiveAspect()) {
                searchQuery += '&aspect=' + WebGMEGlobal.State.getActiveAspect();
            }

            // leave this last, url may exceeds the max url limit
            if (WebGMEGlobal.State.getActiveSelection()) {
                searchQuery += '&selection=' + WebGMEGlobal.State.getActiveSelection().join(',');
            }
        }

        return searchQuery;
    };

    loadStateFromParsedUrl = function (parsedUrl) {
        var state = {};

        state[CONSTANTS.STATE_ACTIVE_ASPECT] = parsedUrl.aspectToLoad;

        if (parsedUrl.branchToLoad) {
            state[CONSTANTS.STATE_ACTIVE_BRANCH_NAME] = parsedUrl.branchToLoad;
        } else if (parsedUrl.commitToLoad) {
            state[CONSTANTS.STATE_ACTIVE_COMMIT] = parsedUrl.commitToLoad;
        }

        //state[CONSTANTS.STATE_ACTIVE_CROSSCUT] = parsedUrl.crosscutToLoad;

        state[CONSTANTS.STATE_ACTIVE_OBJECT] = parsedUrl.objectToLoad === 'root' ?
            CONSTANTS.PROJECT_ROOT_ID : parsedUrl.objectToLoad;

        state[CONSTANTS.STATE_ACTIVE_PROJECT_NAME] = parsedUrl.projectToLoad;
        state[CONSTANTS.STATE_ACTIVE_SELECTION] = parsedUrl.activeSelectionToLoad;
        state[CONSTANTS.STATE_ACTIVE_VISUALIZER] = parsedUrl.visualizerToLoad;

        state[CONSTANTS.STATE_IS_INIT_PHASE] = false;

        //setTimeout(function () {
        WebGMEGlobal.State.set(state);
        //}, 1000);
    };

    return {
        parseInitialThingsToDoFromUrl: parseInitialThingsToDoFromUrl,
        serializeStateToUrl: serializeStateToUrl,
        loadStateFromParsedUrl: loadStateFromParsedUrl
    };

});