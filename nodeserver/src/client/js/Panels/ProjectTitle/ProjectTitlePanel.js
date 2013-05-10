"use strict";

define(['js/PanelBase/PanelBase',
        'text!html/Panels/ProjectTitle/ProjectTitlePanel.html',
        'css!/css/Panels/ProjectTitle/ProjectTitlePanel'], function (PanelBase,
                                                   projectTitleTemplate) {

    var ProjectTitlePanel,
        __parent__ = PanelBase;

    ProjectTitlePanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBase.OPTIONS.LOGGER_INSTANCE_NAME] = "ProjectTitlePanel";

        //call parent's constructor
        __parent__.apply(this, [options]);

        this._client = params.client;

        //initialize UI
        this._initialize();

        this.logger.debug("ProjectTitlePanel ctor finished");
    };

    //inherit from PanelBaseWithHeader
    _.extend(ProjectTitlePanel.prototype, __parent__.prototype);

    ProjectTitlePanel.prototype._initialize = function () {
        var self = this;

        this.$el.addClass('inline');

        this.$el.html(projectTitleTemplate);

        this._projectTitle = this.$el.find(".title");

        this._client.addEventListener(this._client.events.PROJECT_OPENED, function () {
            self._refresh();
        });
        this._client.addEventListener(this._client.events.PROJECT_CLOSED, function () {
            self._refresh();
        });
        this._client.addEventListener(this._client.events.BRANCH_CHANGED, function () {
            self._refresh();
        });
    };

    ProjectTitlePanel.prototype._refresh = function () {
        var client = this._client,
            actualProject = client.getActiveProject(),
            actualBranch = client.getActualBranch(),
            readOnly = client.isReadOnly(),
            titleText = actualProject + " @ " + actualBranch,
            documentTitle = titleText + (readOnly ? " [READ-ONLY]": "");

        //change header title
        this._projectTitle.text(titleText);

        //change document title (browser tab)
        document.title = '-= ' + documentTitle + ' =- WebGME';
    };

    return ProjectTitlePanel;
});
