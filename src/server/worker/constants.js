/*jshint node:true*/
/**
 * @module Server:WorkerConstants
 * @author kecso / https://github.com/kecso
 */
'use strict';

module.exports = {
    msgTypes: {
        request: 'request',
        result: 'result',
        initialize: 'initialize',
        initialized: 'initialized',
        query: 'query'
    },
    workerStates: {
        initializing: 'initializing',
        free: 'free',
        working: 'working',
        waiting: 'waiting'
    },
    workerTypes: {
        connected: 'connected',
        simple: 'simple'
    },
    workerCommands: {
        initialize: 'initialize',

        // Requests
        executePlugin: 'executePlugin',
        seedProject: 'seedProject',
        autoMerge: 'autoMerge',
        resolve: 'resolve',
        checkConstraints: 'checkConstraints',

        importProjectFromFile: 'importProjectFromFile',
        exportProjectToFile: 'exportProjectToFile',
        addLibrary: 'addLibrary',
        updateLibrary: 'updateLibrary',
        exportSelectionToFile: 'exportSelectionToFile',
        importSelectionFromFile: 'importSelectionFromFile',

        // AddOn related
        connectedWorkerStart: 'connectedWorkerStart',
        connectedWorkerQuery: 'connectedWorkerQuery',
        connectedWorkerStop: 'connectedworkerStop'
    }
};
