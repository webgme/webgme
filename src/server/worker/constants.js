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
        exportLibrary: 'exportLibrary',
        seedProject: 'seedProject',
        autoMerge: 'autoMerge',
        resolve: 'resolve',
        checkConstraints: 'checkConstraints',

        // AddOn related
        connectedWorkerStart: 'connectedWorkerStart',
        connectedWorkerQuery: 'connectedWorkerQuery',
        connectedWorkerStop: 'connectedworkerStop'
    }
};
