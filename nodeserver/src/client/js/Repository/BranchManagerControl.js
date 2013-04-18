"use strict";

define(['logManager'], function (logManager) {

    var BranchManagerControl;

    BranchManagerControl = function (myClient, myView) {
        var self = this;

        this._client = myClient;
        this._view = myView;

        this._client.addEventListener(this._client.events.PROJECT_OPENED, function (/*name*/) {
            self._updateBranchList();
            self._updateCurrentBranchInfo();
        });
        this._client.addEventListener(this._client.events.PROJECT_CLOSED, function () {
            self._view.clear();
            self._view.setSelectedBranch('NO OPEN PROJECT');
        });

        this._view.onSelectBranch = function (branchName) {
            self._selectBranch(branchName);
        };

        this._view.onDropDownMenuOpen = function () {
            self._updateBranchList();
            self._updateCurrentBranchInfo();
        };

        this._logger = logManager.create("BranchManagerControl");
        this._logger.debug("Created");
    };

    BranchManagerControl.prototype._updateBranchList = function () {
        var branchesLoaded,
            self = this;

        branchesLoaded = function (err, data) {
            var i;

            self._logger.debug("branchesLoaded, err: '" + err + "', data: " + data ? data.length : "null");

            self._view.clear();

            if (err) {
                self._logger.error(err);
            } else {
                //set view's branch info
                i = data.length;

                while (i--) {
                    self._view.addBranch(data[i].name);
                }

                self._updateCurrentBranchInfo();
            }
        };

        this._client.getBranchesAsync(branchesLoaded);
    };

    BranchManagerControl.prototype._updateCurrentBranchInfo = function () {
        var branch = this._client.getActualBranch();

        this._view.setSelectedBranch(branch);
    };

    BranchManagerControl.prototype._selectBranch = function (branchName) {
        var self = this,
            branch = this._client.getActualBranch();

        if (branch !== branchName) {
            this._client.selectBranchAsync(branchName, function (err) {
                if (err) {
                    self._logger.error(err);
                } else {
                    self._updateCurrentBranchInfo();
                }
            });
        }
    };



    return BranchManagerControl;
});