"use strict";

define(['logManager'], function (logManager) {

    var RepositoryLogControl;

    RepositoryLogControl = function (myClient, myView) {
        var self = this;

        this._client = myClient;
        this._view = myView;

        //override view event handlers
        this._view.onCommitDblClick = function (params) {
            if (params.id.indexOf("#") === 0) {
                self._client.loadCommit(params.id);
            } else {
                self._client.selectBranch(params.name);
            }
        };

        this._logger = logManager.create("RepositoryLogControl");
        this._logger.debug("Created");
    };

    RepositoryLogControl.prototype.generateHistory = function () {
        var self = this,
            __BID = "*";    //hm, interesting HACK

        this._client.getBranches(function (err, branches) {
            var i = branches.length;

            if (!err) {

                while (--i >= 0) {
                    branches[i] = __BID + branches[i];
                }

                self._client.getCommits(function (err, commits) {
                    if (!err || err === "no branches were found") {
                        self._loadObjects({ "branches": branches,
                                            "commits": commits},
                                            self._updateHistory);
                    }
                });
            }
        });
    };

    RepositoryLogControl.prototype._loadObjects = function (lists, callBack) {
        var result = {},
            rCounter = 0,
            dCounter = 0,
            i,
            len,
            objectLoaded,
            self = this;

        objectLoaded = function (err, node) {
            if (!err && node) {
                result[node['_id']] = node;
            }

            dCounter += 1;

            if (dCounter === rCounter) {
                //all the requested objects have been downloaded
                if (callBack) {
                    lists.__objects = result;
                    callBack.call(self, lists);
                }
            }
        };

        for (i in lists) {
            if (lists.hasOwnProperty(i)) {
                len = lists[i].length;

                while (--len >= 0) {
                    rCounter += 1;
                    this._client.load(lists[i][len], objectLoaded);
                }
            }
        }
    };

    RepositoryLogControl.prototype._updateHistory = function (params) {
        var i,
            j,
            k,
            currentRootKey = this._client.getRootKey();

        for (i in params.__objects) {
            if (params.__objects.hasOwnProperty(i)) {
                for (k = 0; k < params.__objects[i].parents.length; k += 1) {
                    if (params.__objects[i].parents[k].indexOf("##") !== -1) {
                        params.__objects[i].parents[k] = params.__objects[i].parents[k].substring(1);
                    }
                }
            }
        }

        //for the time being lets assume we have a list called 'branches' and 'commits'
        //and all the objects are in the list called '__objects'
        if (params.branches) {
            i = params.branches.length;

            while (--i >= 0) {
                this._view.addCommit({"id": params.branches[i],
                                      "name": params.__objects[params.branches[i]].name,
                                      "message": params.__objects[params.branches[i]].message,
                                      "parents": params.__objects[params.branches[i]].parents,
                                      "timestamp": params.__objects[params.branches[i]].end,
                                      "isEnd": true,
                                      "actual": currentRootKey === params.__objects[params.branches[i]].root });
            }
        }

        if (params.commits) {
            i = params.commits.length;

            while (--i >= 0) {
                this._view.addCommit({"id": params.commits[i],
                    "name": params.__objects[params.commits[i]].name,
                    "message": params.__objects[params.commits[i]].message,
                    "parents": params.__objects[params.commits[i]].parents,
                    "timestamp": params.__objects[params.commits[i]].end,
                    "isEnd": false,
                    "actual": currentRootKey === params.__objects[params.commits[i]].root });
            }
        }

        this._view.render();
    };

    return RepositoryLogControl;
});