/*jshint node:true*/
/**
 * @author kecso / https://github.com/kecso
 */
'use strict';

module.exports = {
    msgTypes: {
        request: 'request',
        result: 'result',
        info: 'info',
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
        getResult: 'getResult',
        dumpMoreNodes: 'dumpMoreNodes',
        executePlugin: 'executePlugin',
        exportLibrary: 'exportLibrary',
        connectedWorkerStart: 'connectedWorkerStart',
        connectedWorkerQuery: 'connectedWorkerQuery',
        connectedWorkerStop: 'connectedworkerStop',
        seedProject: 'seedProject',
        autoMerge: 'autoMerge',
        resolve: 'resolve'
    }
};
