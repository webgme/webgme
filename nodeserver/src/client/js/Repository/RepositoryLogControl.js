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
        this._updateHistory(false);
    };

    RepositoryLogControl.prototype._updateHistory = function (useFake) {
        var currentCommitId = this._client.getActualCommit(),
            commits = useFake ? this._getFakeCommits() : this._client.getCommits(),
            i = commits.length,
            com;

        while (i--) {
            com = commits[i];

            this._view.addCommit({"id": com._id,
                                  "branch": com.name,
                                  "message": com.message,
                                  "parents": com.parents,
                                  "timestamp": com.time || com.end, //TODO: end is obsolete, time should be used
                                  "isEnd": false,
                                  "actual": com._id === currentCommitId });
        }

        this._view.render();
    };

    RepositoryLogControl.prototype._getFakeCommits = function () {
        var result = [],
            num = 16,
            c = num,
            commit,
            branches = ["master", "b1", "b2"];

        while (c--) {
            commit = {};
            commit._id = num - c - 1 + "";
            //branch name
            commit.name = branches[0];
            commit.message = "Message " + commit._id;
            commit.timestamp = new Date();
            commit.parents = [];

            //regular parents in line
            if (commit._id > 0) {
                commit.parents.push(commit._id - 1);
            }

            result.push(commit);
        }

        //create
        result[3].parents = ["1"];
        result[5].parents = ["2", "4"];

        result[8].parents = ["1"];


        result[9].parents = ["6"];


        result[10].parents = ["8"];
        result[11].parents = ["9", "7"];

        result[12].parents = ["10", "11"];



        return result;
    };

    return RepositoryLogControl;
});