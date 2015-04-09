/*globals define, $*/

/**
 * @author lattmann / https://github.com/lattmann
 */

define(['js/Loader/LoaderCircles', 'text!./templates/CreateFromSeed.html'], function (LoaderCircles, createFromSeedDialogTemplate) {

    'use strict';

    var CreateFromSeed;

    CreateFromSeed = function (client, logger) {
        this._client = client;
        this._logger = logger;

        this.seedProjectName = WebGMEGlobal.gmeConfig.seedProjects.defaultProject;
        this.seedProjectType = 'file';
        this.seedProjectBranch = 'master';
        this.seedCommitHash = null;

        this._logger.debug('Create form seed ctor');
    };

    CreateFromSeed.prototype.show = function (fnCallback) {
        var self = this;

        this._fnCallback = fnCallback;

        this._initDialog();

        this._dialog.on('hide.bs.modal', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });

        this._dialog.modal('show');
    };

    CreateFromSeed.prototype._initDialog = function () {
        var self = this;

        this._dialog = $(createFromSeedDialogTemplate);

        this._btnCreate = this._dialog.find('.btn-create');
        this._btnCancel = this._dialog.find('.btn-cancel');

        this._option = this._dialog.find('select.seed-project');
        this._optGroupFile = this._dialog.find('optgroup.file');
        this._optGroupDb = this._dialog.find('optgroup.db');

        this._option.children().remove();

        this._optGroupFile.children().remove();
        this._option.append(this._optGroupFile);
        this._optGroupDb.children().remove();
        this._option.append(this._optGroupDb);

        this._loader = new LoaderCircles({containerElement: this._dialog});

        // attach handlers
        this._btnCreate.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();

            self._dialog.modal('hide');

            if (self._fnCallback) {
                self._logger.debug(self._option.val());
                self.seedProjectType = self._option.val().slice(0, self._option.val().indexOf(':'));
                self.seedProjectName = self._option.val().slice(self._option.val().indexOf(':') + 1);

                if (self.seedProjectType === 'db') {
                    self.seedProjectName = self._option.val().slice(self._option.val().indexOf(':') + 1, self._option.val().indexOf('#'));
                    self.seedCommitHash = self._option.val().slice(self._option.val().indexOf('#'));
                }

                self._fnCallback(self.seedProjectType, self.seedProjectName, self.seedProjectBranch, self.seedCommitHash);
            }
        });

        // get seed project list
        self._loader.start();
        self._client.getSeedInfoAsync(function (err, data) {
            var i,
                defaultOption;

            if (err) {
                self._logger.error(err);
            } else {
                self._logger.debug(data);

                // sort alphabetically
                data.file.sort();
                data.db.sort();

                for (i = 0; i < data.file.length; i += 1) {
                    self._optGroupFile.append($('<option>', {text: data.file[i], value: 'file:' + data.file[i]}));
                    if (self.seedProjectName === data.file[i]) {
                        defaultOption =  'file:' + data.file[i];
                    }
                }

                self._client.getFullProjectsInfoAsync(function (err, projectList) {
                    var projectId,
                        branchId,
                        proojectGroup;

                    if (err) {
                        self.logger.error(err);
                        return;
                    }

                    for (i = 0; i < data.db.length; i += 1) {
                        projectId = data.db[i];
                        if (projectList.hasOwnProperty(projectId)) {
                            if (Object.keys(projectList[projectId].branches).length === 0) {

                            } else if (Object.keys(projectList[projectId].branches).length === 1) {
                                branchId = Object.keys(projectList[projectId].branches)[0];
                                self._optGroupDb.append($('<option>', {
                                        text: data.db[i] + ' (' + branchId + ' ' + projectList[projectId].branches[branchId].slice(0, 8) + ')',
                                        value: 'db:' + data.db[i] + projectList[projectId].branches[branchId]
                                    }
                                ));
                                if (self.seedProjectName === data.db[i]) {
                                    defaultOption = 'db:' + data.db[i] + projectList[projectId].branches[branchId];
                                }
                            } else {
                                // more than one branches
                                proojectGroup = $('<optgroup>', {
                                        label: data.db[i]
                                    }
                                );
                                self._option.append(proojectGroup);

                                for (branchId in projectList[projectId].branches) {
                                    if ( projectList[projectId].branches.hasOwnProperty(branchId)) {
                                        proojectGroup.append($('<option>', {
                                                text: data.db[i] + ' (' + branchId + ' ' +
                                                       projectList[projectId].branches[branchId].slice(0, 8) + ')',
                                                value: 'db:' + data.db[i] + projectList[projectId].branches[branchId]
                                            }
                                        ));
                                    }
                                }

                                if (projectList[projectId].branches.hasOwnProperty('master')) {
                                    branchId = 'master';
                                } else {
                                    branchId = Object.keys(projectList[projectId].branches)[0];
                                }

                                if (self.seedProjectName === data.db[i]) {
                                    defaultOption = 'db:' + data.db[i] + branchId;
                                }
                            }
                        } else {
                            self._logger.error('Project does not exist: ' + projectId);
                        }
                    }

                    if (defaultOption) {
                        self._option.val(defaultOption);
                    }
                });
            }
            self._loader.stop();
        });
    };

    CreateFromSeed.prototype._displayMessage = function (msg, isError) {
        this._importErrorLabel.removeClass('alert-success').removeClass('alert-danger');

        if (isError === true) {
            this._importErrorLabel.addClass('alert-danger');
        } else {
            this._importErrorLabel.addClass('alert-success');
        }

        this._importErrorLabel.html(msg);
        this._importErrorLabel.hide();
        this._importErrorLabel.fadeIn();
    };

    return CreateFromSeed;
});