"use strict";

define(['logManager'], function (logManager) {

    var RepositoryLogControl;

    RepositoryLogControl = function (myClient, myView) {
        var self = this;

        this._client = myClient;
        this._view = myView;

        //override view event handlers
        this._view.onCommitDblClick = function (params) {
            self._client.loadCommit(params.id);
        };

        this._logger = logManager.create("RepositoryLogControl");
        this._logger.debug("Created");
    };

    RepositoryLogControl.prototype.generateHistory = function () {
        this._updateHistory();
    };

    RepositoryLogControl.prototype._updateHistory = function () {
        var currentCommitId = this._client.getActualCommit(),
            commits = this._client.getCommits(),
            i = commits.length,
            com;

        while (i--) {
            com = commits[i];

            this._view.addCommit({"id": com._id,
                                  "name": com.name,
                                  "message": com.message,
                                  "parents": com.parents,
                                  "timestamp": com.time || com.end, //TODO: end is obsolete, time should be used
                                  "isEnd": false,
                                  "actual": com._id === currentCommitId });
        }

        this._view.render();
    };

    return RepositoryLogControl;
});