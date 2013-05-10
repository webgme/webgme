"use strict";

define(['logManager',
        'js/PanelBase/PanelBaseWithHeader',
        'text!html/Panels/Project/ProjectPanel.html',
        'js/Dialogs/Projects/ProjectsDialog',
        'js/Dialogs/Commit/CommitDialog',
        'js/Dialogs/ProjectRepository/ProjectRepositoryDialog'], function (logManager,
                                       PanelBaseWithHeader,
                                       projectPanelTemplate,
                                       ProjectsDialog,
                                       CommitDialog,
                                       ProjectRepositoryDialog) {

    var ProjectPanel,
        __parent__ = PanelBaseWithHeader;

    ProjectPanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = "Project";
        options[PanelBaseWithHeader.OPTIONS.HEADER_TITLE] = true;

        //call parent's constructor
        __parent__.apply(this, [options]);

        this._client = params.client;

        //initialize UI
        this._initialize();

        this.logger.debug("ProjectPanel ctor finished");
    };

    //inherit from PanelBaseWithHeader
    _.extend(ProjectPanel.prototype, __parent__.prototype);

    ProjectPanel.prototype._initialize = function () {
        var self = this;

        this.setTitle('Project');

        this.$el.append($(projectPanelTemplate));

        this.$el.find('a.btn-projects').on("click", function (event) {
            event.stopPropagation();
            event.preventDefault();
            self._btnProjectsClick();
        });

        this.$el.find('a.btn-commit').on("click", function (event) {
            event.stopPropagation();
            event.preventDefault();
            self._btnCommitClick();
        });

        this.$el.find('a.btn-repository').on("click", function (event) {
            event.stopPropagation();
            event.preventDefault();
            self._btnRepoHistoryClick();
        });
    };

    ProjectPanel.prototype._btnCommitClick = function () {
        var cd = new CommitDialog(this._client);
        cd.show();
    };

    ProjectPanel.prototype._btnProjectsClick = function () {
        var pd = new ProjectsDialog(this._client);
        pd.show();
    };

    ProjectPanel.prototype._btnRepoHistoryClick = function () {
        var prd = new ProjectRepositoryDialog(this._client);
        prd.show();
    };

    return ProjectPanel;
});
