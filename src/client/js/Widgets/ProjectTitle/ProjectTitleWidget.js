/*globals define, Raphael, window, WebGMEGlobal*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['common/LogManager',
        'css!./styles/ProjectTitleWidget.css'], function (logManager) {

    "use strict";

    var ProjectTitleWidget,
        PROJECT_TITLE_WIDGET_TEMPLATE = '<div class="project-title navbar-text"><span class="title">WebGME</span><span class="readOnlyInfo">[READ ONLY]</span></div>';

    ProjectTitleWidget = function (containerEl, client) {
        this._logger = logManager.create("ProjectTitleWidget");

        this._client = client;
        this._el = containerEl;

        this._initializeUI();

        this._logger.debug("Created");
    };

    ProjectTitleWidget.prototype._initializeUI = function () {
        var self = this;

        this._el.html(PROJECT_TITLE_WIDGET_TEMPLATE);

        this._projectTitle = this._el.find(".title");

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

    ProjectTitleWidget.prototype._refresh = function () {
        var client = this._client,
            actualProject = client.getActiveProjectName(),
            actualBranch = client.getActualBranch(),
            readOnly = client.isProjectReadOnly() || client.isCommitReadOnly(),
            titleText = actualProject + " @ " + actualBranch,
            documentTitle = titleText + (readOnly ? " [READ-ONLY]": "");

        //change header title
        this._projectTitle.text(titleText);

        //change document title (browser tab)
        document.title = '-= ' + documentTitle + ' =- WebGME';
    };

    return ProjectTitleWidget;
});