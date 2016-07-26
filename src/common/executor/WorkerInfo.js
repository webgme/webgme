/*globals define*/
/*jshint node:true*/

/**
 * @author ksmyth / https://github.com/ksmyth
 */

define([], function () {
    'use strict';

    var ClientRequest = function (parameters) {
        this.clientId = parameters.clientId || undefined;
        this.availableProcesses = parameters.availableProcesses || 0;
        this.labels = parameters.labels || [];
        this.runningJobs = parameters.runningJobs || [];
    };

    var ServerResponse = function (parameters) {
        this.jobsToStart = parameters.jobsToStart || [];
        this.refreshPeriod = parameters.refreshPeriod || 30 * 1000;
        this.labelJobs = parameters.labelJobs;
        this.jobsToCancel = parameters.jobsToCancel || [];
    };

    return {
        ClientRequest: ClientRequest,
        ServerResponse: ServerResponse
    };
});

