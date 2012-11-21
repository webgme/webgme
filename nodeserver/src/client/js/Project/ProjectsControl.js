"use strict";

define(['logManager'], function (logManager) {

    var ProjectsControl;

    ProjectsControl = function (myClient, myView) {
        var self = this;

        this._client = myClient;
        this._view = myView;

        //override view event handlers
        this._view.onBtnProjectOpenClick = function (params) {
            if (params.id) {
                self._client.selectProject(params.id);
            }
        };

        this._view.onCreateNewProjectClick = function (projectName) {
            self._logger.debug("onCreateNewProjectClick: " + projectName);
            self._client.createProject(projectName, function () {
                self.displayProjects();
            });
        };

        this._logger = logManager.create("ProjectsControl");
        this._logger.debug("Created");
    };

    ProjectsControl.prototype.displayProjects = function () {
        var availableProjects = this._client.getAvailableProjects().sort(),
            len = availableProjects.length,
            i = len,
            activeProjectId = this._client.getActiveProject();

        this._view.clearItems();

        while (i--) {
            this._view.addItem({"id": availableProjects[len - i - 1],
                "name":  availableProjects[len - i - 1],
                "actual": activeProjectId === availableProjects[len - i - 1]});
        }

        //add some fake
        /*for (i = 0; i < 5; i += 1) {
            this._view.addItem({"id": i.toString(),
                "name":  "Fake #" + i,
                "actual": false });
        }*/

        this._view.render();
    };

    return ProjectsControl;
});