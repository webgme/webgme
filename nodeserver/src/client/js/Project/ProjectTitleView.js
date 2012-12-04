"use strict";

define(['logManager',
        'text!./ProjectTitleTmpl.html'], function (logManager,
                                                   projectTitleTmpl) {

    var ProjectTitleView;

    ProjectTitleView = function (container) {
        this._initializeUI(container);

        if (this._el.length === 0) {
            this._logger.error("ProjectTitleView can not be created");
            return undefined;
        }

        this._logger = logManager.create("ProjectTitleView");
        this._logger.debug("Created");
    };

    ProjectTitleView.prototype._initializeUI = function (containerElement) {

        //get container first
        this._el = $("#" + containerElement);
        if (this._el.length === 0) {
            this._logger.warning("ProjectTitleView's container control with id:'" + containerElement + "' could not be found");
            return undefined;
        }

        this._el.html(projectTitleTmpl);

        this._projectTitle = this._el.find(".title");
    };

    ProjectTitleView.prototype.refresh = function (client) {
        var actualProject = client.getActiveProject(),
            actualBranch = client.getActualBranch(),
            readOnly = client.isReadOnly(),
            titleText = actualProject + " @ " + actualBranch;

        this._projectTitle.text(titleText);

        if (readOnly) {
            this._el.addClass("read-only");
        } else {
            this._el.removeClass("read-only");
        }
    };

    return ProjectTitleView;
});