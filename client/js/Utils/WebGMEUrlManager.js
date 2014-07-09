/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Laszlo Juracz
 */

define ([
        'clientUtil'
    ],
    function(util) {

    "use strict";

    var parseInitialThingsToDoFromUrl, serializeStateToUrl;


    parseInitialThingsToDoFromUrl = function () {
        return {

            layoutToLoad: util.getURLParameterByName('layout') || 'DefaultLayout',
            commitToLoad: util.getURLParameterByName('commit').toLowerCase(),
            projectToLoad:  util.getURLParameterByName('project'),
            objectToLoad: util.getURLParameterByName('activeObject').toLowerCase(),
            createNewProject: util.getURLParameterByName('create') === "true",
            branchToLoad: util.getURLParameterByName('branch')
        }
    };


    serializeStateToUrl = function () {

    };

    return {
        parseInitialThingsToDoFromUrl:parseInitialThingsToDoFromUrl,
        serializeStateToUrl: serializeStateToUrl
    };

});