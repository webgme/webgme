"use strict";

define(['logManager',
        'js/Controls/DropDownList'], function (logManager,
                                               DropDownList) {

    var BranchManagerView;

    BranchManagerView = function (containerId) {
        this._logger = logManager.create("BranchManagerView");

        //initialize UI
        this._initializeUI(containerId);

        this._logger.debug("Created");
    };

    BranchManagerView.prototype.onSelectBranch = function (branchName) {
        this._logger.warning("onSelectBranch is not overridden in Controller...params: '" + branchName + "'");
    };

    BranchManagerView.prototype.onDropDownMenuOpen = function () {
        this._logger.warning("onDropDownMenuOpen is not overridden in Controller...params");
    };

    BranchManagerView.prototype._DOMBase = $('<div class="btn-group dropup"><button class="btn btn-micro"></button><button class="btn btn-micro dropdown-toggle" data-toggle="dropdown"><span class="caret"></span></button><ul class="dropdown-menu pull-right"></ul></div>');

    BranchManagerView.prototype._initializeUI = function (containerId) {
        var self = this,
            err;

        //get container first
        this._el = $("#" + containerId);
        if (this._el.length === 0) {
            err = "BranchManagerView's container with id:'" + containerId + "' could not be found";
            this._logger.error(err);
            throw err;
        }

        this._el.empty();

        this._dropUpMenu = new DropDownList({"dropUp": true,
                                             "pullRight": true,
                                             "size": "micro",
                                             "sort": true,
                                             "icon": "icon-random"});
        this._dropUpMenu.setUndefinedValueText('NO BRANCH SELECTED');

        this._dropUpMenu.selectedValueChanged = function (val) {
            self.onSelectBranch(val);
        };

        this._dropUpMenu.dropDownMenuOpen = function () {
            self.onDropDownMenuOpen();
        };

        this._el.append(this._dropUpMenu.getEl());
    };

    BranchManagerView.prototype.addBranch = function (name) {
        this._dropUpMenu.addItem({"text": name,
                            "value": name});
    };

    BranchManagerView.prototype.clear = function () {
        this._dropUpMenu.clear();
    };

    BranchManagerView.prototype.setSelectedBranch = function (branchName) {
        this._dropUpMenu.setSelectedValue(branchName);
    };

    return BranchManagerView;
});