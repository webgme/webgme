"use strict";

define(['logManager'], function (logManager) {

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

    BranchManagerView.prototype._DOMBase = $('<div class="btn-group dropup"><button class="btn btn-micro"></button><button class="btn btn-micro dropdown-toggle" data-toggle="dropdown"><span class="caret"></span></button><ul class="dropdown-menu pull-right"></ul></div>');

    BranchManagerView.prototype._initializeUI = function (containerId) {
        var self = this,
            err,
            dropUpMenu = this._DOMBase.clone();

        //get container first
        this._el = $("#" + containerId);
        if (this._el.length === 0) {
            err = "BranchManagerView's container with id:'" + containerId + "' could not be found";
            this._logger.error(err);
            throw err;
        }

        this._el.empty().append(dropUpMenu);

        this._btnBranch = dropUpMenu.find('.btn').first();
        this._dropDownUL = dropUpMenu.find('ul.dropdown-menu').first();

        this._dropDownUL.on('click', 'li', function (/*event*/) {
            var val = $(this).data("val");
            self.onSelectBranch(val);
        });
    };

    BranchManagerView.prototype.addBranch = function (name) {
        var li = $('<li data-val="' + name +'"><a tabindex="-1" href="#">' + name + '</a></li>');

        this._dropDownUL.append(li);

        return li;
    };

    BranchManagerView.prototype.clear = function () {
        this._dropDownUL.empty();
    };

    BranchManagerView.prototype.setSelectedBRanchName = function (branchName) {
        this._btnBranch.text('BRANCH: ' + branchName);
    };

    return BranchManagerView;
});