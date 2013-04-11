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
                self._client.selectProjectAsync(params.id,function(){
                    self.displayProjects();
                });
            }
        };

        this._view.onBtnProjectDeleteClick = function (params) {
            if (params.id) {
                self._client.deleteProjectAsync(params.id, function () {
                    self.displayProjects();
                });
            }
        };

        this._view.onCreateNewProjectClick = function (projectName) {
            self._logger.debug("onCreateNewProjectClick: " + projectName);
            self._client.createProjectAsync(projectName, function () {
                self.displayProjects();
            });
        };

        this._logger = logManager.create("ProjectsControl");
        this._logger.debug("Created");

        ProjectsControl.prototype.displayProjects = function () {
            self._client.getAvailableProjectsAsync(function(err,projectNames){
                var availableProjects = projectNames || [];
                availableProjects = availableProjects.sort();
                var len = availableProjects.length,
                    i = len,
                    activeProjectId = self._client.getActiveProject();
                self._view.clearItems();
                while (i--) {
                    self._view.addItem({"id": availableProjects[len - i - 1],
                        "name":  availableProjects[len - i - 1],
                        "actual": activeProjectId === availableProjects[len - i - 1]});
                }
                self._view.render();
            });

        };
    };



    return ProjectsControl;
});