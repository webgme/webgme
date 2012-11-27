"use strict";

define(['logManager'], function (logManager) {

    var ProjectsView;

    ProjectsView = function (container) {
        this._el = container;

        this._items = {};
        this._orderedItemIds = [];

        this._initializeUI();

        this._logger = logManager.create("ProjectsView");
        this._logger.debug("Created");
    };

    ProjectsView.prototype.addItem = function (obj) {
        this._items[obj.id] = obj;
        this._insertIntoOrderedListByKey(obj.id, "name", this._orderedItemIds, this._items);
    };

    ProjectsView.prototype.clearItems = function () {
        this._items = {};
        this._orderedItemIds = [];
    };

    ProjectsView.prototype.onBtnProjectOpenClick = function (params) {
        this._logger.warning("onBtnProjectOpenClick is not overridden in Controller...params: '" + JSON.stringify(params) + "'");
    };

    ProjectsView.prototype.render = function () {
        var it,
            len = this._orderedItemIds.length,
            li,
            item;

        this._initializeUI();

        for (it = 0; it < len; it += 1) {
            item = this._items[this._orderedItemIds[it]];

            li = $('<li class="center pointer"><a class="btn-env" id="' + item.id + '">' + item.name + '</a>');
            this._ul.append(li);

            if (item.actual === true) {
                this._actualId = item.id;
                li.addClass('active');
            }
        }
    };

    ProjectsView.prototype._insertIntoOrderedListByKey = function (objId, key, orderedList, objList) {
        var i = orderedList.length,
            len = i,
            inserted = false;

        //array is empty, just simply store it
        if (i === 0) {
            orderedList.push(objId);
        } else {
            while (--i >= 0) {
                if (objList[objId][key].toLowerCase() > objList[orderedList[i]][key].toLowerCase()) {
                    if (i + 1 === len) {
                        orderedList.push(objId);
                    } else {
                        orderedList.splice(i + 1, 0, objId);
                    }
                    inserted = true;
                    break;
                }
            }
            if (inserted === false) {
                orderedList.splice(0, 0, objId);
            }
        }
    };



    ProjectsView.prototype._initializeUI = function () {
        var self = this,
            selectedId;

        this._el.empty();

        this._ul = $('<ul/>', {
            "class" : "nav nav-pills nav-stacked"
        });

        this._buttonsPanel = this._el.parent().find("#buttonsPanel");
        this._createProjectPanel = this._el.parent().find("#createProjectPanel");

        this._btnOpenProject = this._el.parent().find("#btnOpenProject");
        this._btnCreateNewProject = this._el.parent().find("#btnCreateNewProject");

        this._btnNewProjectCancel = this._el.parent().find("#btnNewProjectCancel");
        this._btnNewProjectCreate = this._el.parent().find("#btnNewProjectCreate");

        this._txtNewProjectName = this._el.parent().find("#txtNewProjectName");

        this._el.append(this._ul);

        this._ul.on("click", "a", function (event) {
            selectedId = $(this).attr("id");

            event.stopPropagation();
            event.preventDefault();

            self._ul.find('a[class="btn-env"]').parent().removeClass('active');
            self._ul.find('a[class="btn-env"][id="' + selectedId + '"]').parent().addClass('active');

            if (selectedId === self._actualId) {
                self._btnOpenProject.addClass("disabled");
            } else {
                self._btnOpenProject.removeClass("disabled");
            }
        });

        this._btnOpenProject.on('click', function (event) {
            self._actualId = selectedId;
            self._btnOpenProject.addClass("disabled");
            self.onBtnProjectOpenClick({"id": selectedId});

            event.stopPropagation();
            event.preventDefault();
        });

        this._btnCreateNewProject.on('click', function (event) {
            var i;

            self._namesAlreadyInUse = [];

            for (i in self._items) {
                if (self._items.hasOwnProperty(i)) {
                    self._namesAlreadyInUse.push(self._items[i].name.toLowerCase());
                }
            }

            self._txtNewProjectName.val("");

            self._buttonsPanel.hide();
            self._createProjectPanel.show();

            event.stopPropagation();
            event.preventDefault();
        });

        this._btnNewProjectCancel.on('click', function (event) {
            self._buttonsPanel.show();
            self._createProjectPanel.hide();

            event.stopPropagation();
            event.preventDefault();
        });

        //TODO: proper deregisration of event handlers are needed
        this._btnNewProjectCreate.off('click');
        this._btnNewProjectCreate.on('click', function (event) {
            var val = self._txtNewProjectName.val().toLowerCase();

            if (val !== "" && self._namesAlreadyInUse.indexOf(val) === -1) {
                self.onCreateNewProjectClick(val);
                self._buttonsPanel.show();
                self._createProjectPanel.hide();
            }

            event.stopPropagation();
            event.preventDefault();
        });

        this._txtNewProjectName.on('keyup', function (event) {
            var val = self._txtNewProjectName.val().toLowerCase();

            if (val === "" || self._namesAlreadyInUse.indexOf(val) !== -1) {
                self._createProjectPanel.addClass("error");
                self._btnNewProjectCreate.addClass("disabled");
            } else {
                self._createProjectPanel.removeClass("error");
                self._btnNewProjectCreate.removeClass("disabled");
            }
        });
    };

    ProjectsView.prototype.onCreateNewProjectClick = function (projectName) {
        this._logger.warning("onCreateNewProjectClick is not overridden in Controller...params: '" + projectName + "'");
    };

    return ProjectsView;
});