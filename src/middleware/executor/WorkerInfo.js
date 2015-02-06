define([], function () {
    var ClientRequest = function(parameters) {
        this.clientId = parameters.clientId || undefined;
        this.availableProcesses = parameters.availableProcesses || 0;
        this.labels = parameters.labels || [];
    }

    var ServerResponse = function(parameters) {
        this.jobsToStart = parameters.jobsToStart || [];
        this.refreshPeriod = parameters.refreshPeriod || 30 * 1000;
        this.labelJobs = parameters.labelJobs;
    };

    return { ClientRequest: ClientRequest, ServerResponse: ServerResponse };
});

