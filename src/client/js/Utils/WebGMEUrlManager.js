/*jshint browser:true*/
/*globals define, _, requirejs, WebGMEGlobal*/

define ([
        'clientUtil'
    ],
    function(util) {

    'use strict';

    var parseInitialThingsToDoFromUrl, serializeStateToUrl;

    parseInitialThingsToDoFromUrl = function () {
        return {
            layoutToLoad: util.getURLParameterByName('layout') || 'DefaultLayout',
            commitToLoad: util.getURLParameterByName('commit').toLowerCase(),
            projectToLoad:  util.getURLParameterByName('project'),
            objectToLoad: util.getURLParameterByName('node').toLowerCase(),
            createNewProject: util.getURLParameterByName('create') === "true",
            branchToLoad: util.getURLParameterByName('branch')
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

    };

    return {
        parseInitialThingsToDoFromUrl:parseInitialThingsToDoFromUrl,
        serializeStateToUrl: serializeStateToUrl
    };

});