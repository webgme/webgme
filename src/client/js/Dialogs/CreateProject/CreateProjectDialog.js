/*globals define, $, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * @author lattmann / https://github.com/lattmann
 */

define(['js/Loader/LoaderCircles',
    'common/storage/util',
    'common/core/constants',
    'js/Controls/PropertyGrid/Widgets/AssetWidget',
    'blob/BlobClient',
    'text!./templates/CreateProjectDialog.html',

    'css!./styles/CreateProjectDialog.css'
], function (LoaderCircles, StorageUtil, CORE_CONSTANTS, AssetWidget, BlobClient, createProjectDialog) {

    'use strict';

    var CreateFromSeed;

    /**
     *
     * @param client
     * @param newProjectId
     * @param {string} initialTab - 'seed', 'import'
     * @param logger
     * @constructor
     */
    CreateFromSeed = function (client, newProjectId, initialTab, logger) {
        this._client = client;
        this._logger = logger.fork('CreateProjectDialog');
        this.blobClient = new BlobClient({logger: this._logger.fork('BlobClient')});

        this.newProjectId = newProjectId;
        this.seedProjectName = WebGMEGlobal.gmeConfig.seedProjects.defaultProject;
        this.seedProjectType = 'file';
        this.seedProjectBranch = 'master';
        this.seedCommitHash = null;
        this.assetWidget = new AssetWidget({
            propertyName: 'ImportFile',
            propertyValue: ''
        });
        this.assetWidget.el.addClass('form-control selector pull-left');
        this.initialTab = initialTab || 'seed';

        this._blobIsPackage = false;

        this._logger.debug('Create form seed ctor');
    };

    CreateFromSeed.prototype.show = function (fnCallback) {
        var self = this;

        this._fnCallback = fnCallback;

        this._initDialog();

        this._dialog.on('hide.bs.modal', function () {
            self._dialog.find('li.tab').off('click');
            self._dialog.find('.toggle-info-btn').off('click');
            self._btnCreateSnapShot.off('click');
            self._btnCreateBlob.off('click');
            self._btnDuplicate.off('click');
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });

        this._dialog.modal('show');
    };

    CreateFromSeed.prototype._initDialog = function () {
        var self = this;

        function toggleActive(tabEl) {
            self._formSnapShot.removeClass('activated');
            self._formDuplicate.removeClass('activated');
            self._formBlob.removeClass('activated');
            self._btnCreateSnapShot.removeClass('activated');
            self._btnDuplicate.removeClass('activated');
            self._btnCreateBlob.removeClass('activated');

            if (tabEl.hasClass('snap-shot')) {
                self._formSnapShot.addClass('activated');
                self._btnCreateSnapShot.addClass('activated');
            } else if (tabEl.hasClass('duplicate')) {
                self._formDuplicate.addClass('activated');
                self._btnDuplicate.addClass('activated');
            } else if (tabEl.hasClass('blob')) {
                self._formBlob.addClass('activated');
                self._btnCreateBlob.addClass('activated');
            } else {
                return;
            }
        }

        this._dialog = $(createProjectDialog);
        this._dialog.find('.selection-blob').append(this.assetWidget.el);

        // Forms
        this._formSnapShot = this._dialog.find('form.snap-shot');
        this._formDuplicate = this._dialog.find('form.duplicate');
        this._formBlob = this._dialog.find('form.blob');

        // Assign buttons
        this._btnCreateSnapShot = this._dialog.find('.btn-create-snap-shot');
        this._btnDuplicate = this._dialog.find('.btn-duplicate');
        this._btnCreateBlob = this._dialog.find('.btn-create-blob');

        // Snap-shot selector
        this._selectSnapShot = this._formSnapShot.find('select.snap-shot');
        this._optGroupFile = this._selectSnapShot.find('optgroup.file');
        this._optGroupDb = this._selectSnapShot.find('optgroup.db');
        this._selectSnapShot.children().remove();
        this._optGroupFile.children().remove();
        this._selectSnapShot.append(this._optGroupFile);
        this._optGroupDb.children().remove();
        this._selectSnapShot.append(this._optGroupDb);
        // Duplicate selector
        this._selectDuplicate = this._formDuplicate.find('select.duplicate-project');
        this._optGroupDuplicate = this._selectDuplicate.find('optgroup.project-id');
        this._optGroupDuplicate.children().remove();
        this._selectDuplicate.append(this._optGroupDuplicate);

        this._loader = new LoaderCircles({containerElement: this._dialog});

        this._btnCancel = this._dialog.find('.btn-cancel');

        // Tab toggling
        if (WebGMEGlobal.gmeConfig.seedProjects.allowDuplication === false) {
            this._dialog.find('li.duplicate').addClass('disabled-from-config');
        }

        if (self.initialTab === 'import') {
            toggleActive(this._dialog.find('li.blob').addClass('active'));
        } else {
            toggleActive(this._dialog.find('li.snap-shot').addClass('active'));
        }

        // attach handlers
        this._dialog.find('li.tab').on('click', function () {
            toggleActive($(this));
        });

        this._dialog.find('.toggle-info-btn').on('click', function (event) {
            var el = $(this),
                infoEl;
            event.preventDefault();
            event.stopPropagation();

            if (el.hasClass('snap-shot-info')) {
                infoEl = self._dialog.find('span.snap-shot-info');
            } else if (el.hasClass('duplicate-info')) {
                infoEl = self._dialog.find('span.duplicate-info');
            } else if (el.hasClass('blob-info')) {
                infoEl = self._dialog.find('span.blob-info');
            } else {
                return;
            }

            if (infoEl.hasClass('hidden')) {
                infoEl.removeClass('hidden');
            } else {
                infoEl.addClass('hidden');
            }
        });

        this._btnCreateSnapShot.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();

            self._dialog.modal('hide');

            if (self._fnCallback) {
                self._logger.debug(self._selectSnapShot.val());
                self.seedProjectType = self._selectSnapShot.val().slice(0, self._selectSnapShot.val().indexOf(':'));
                self.seedProjectName = self._selectSnapShot.val().slice(self._selectSnapShot.val().indexOf(':') + 1);

                if (self.seedProjectType === 'db') {
                    self.seedProjectName = self._selectSnapShot.val().slice(self._selectSnapShot.val().indexOf(':') + 1,
                        self._selectSnapShot.val().indexOf('#'));
                    self.seedCommitHash = self._selectSnapShot.val().slice(self._selectSnapShot.val().indexOf('#'));
                }

                self._fnCallback(self.seedProjectType,
                    self.seedProjectName,
                    self.seedProjectBranch,
                    self.seedCommitHash);
            }
        });

        this._btnCreateBlob.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            self._dialog.modal('hide');
            if (self._fnCallback && self.assetWidget.propertyValue) {
                self._fnCallback(self._blobIsPackage ? 'package' : 'blob', self.assetWidget.propertyValue, null, null);
            }
        });

        this._btnCreateBlob.disable(true);

        this.assetWidget.onFinishChange(function (data) {
            self._btnCreateBlob.disable(true);

            if (!data.newValue) {
                self._logger.error(new Error('New data does not have a value, ' + data));
                return;
            }

            self.blobClient.getMetadata(data.newValue)
                .then(function (metadata) {
                    if (metadata.name.toLowerCase().lastIndexOf('.webgmex') ===
                        metadata.name.length - '.webgmex'.length) {
                        self._blobIsPackage = true;
                        self._btnCreateBlob.disable(false);
                    } else {
                        throw new Error('Not .webgmex extension');
                    }
                })
                .catch(function (err) {
                    //TODO: Better feedback here.
                    self._logger.error('Error in uploaded file', err);
                });
        });

        this._btnDuplicate.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            self._logger.debug('Duplicating with value', self._selectDuplicate.val());
            self._dialog.modal('hide');
            if (self._fnCallback) {
                self._fnCallback('duplicate', self._selectDuplicate.val(), null, null);
            }
        });

        // get seed project list
        self._loader.start();
        self._client.getProjects({branches: true}, function (err, projectList) {
            var projectId,
                displayedProjectName,
                branchId,
                projectGroup,
                i,
                defaultOption,
                fileSeeds = WebGMEGlobal.allSeeds || [];

            for (i = 0; i < fileSeeds.length; i += 1) {
                self._optGroupFile.append($('<option>', {text: fileSeeds[i], value: 'file:' + fileSeeds[i]}));
                if (self.seedProjectName === fileSeeds[i]) {
                    defaultOption = 'file:' + fileSeeds[i];
                }
            }

            if (err) {
                self.logger.error(err);
                self._loader.stop();
                return;
            }

            for (i = 0; i < projectList.length; i += 1) {
                projectId = projectList[i]._id;
                displayedProjectName = StorageUtil.getProjectDisplayedNameFromProjectId(projectId);
                self._optGroupDuplicate.append($('<option>', {
                        text: displayedProjectName,
                        value: projectId
                    }
                ));

                if (Object.keys(projectList[i].branches).length === 1) {
                    branchId = Object.keys(projectList[i].branches)[0];
                    self._optGroupDb.append($('<option>', {
                            text: displayedProjectName + ' (' + branchId + ' ' +
                            projectList[i].branches[branchId].slice(0, 8) + ')',
                            value: 'db:' + projectId + projectList[i].branches[branchId]
                        }
                    ));
                    if (!defaultOption && self.seedProjectName === projectId) { //File seed has precedence.
                        defaultOption = 'db:' + projectId + projectList[i].branches[branchId];
                    }
                } else {
                    // more than one branches
                    projectGroup = $('<optgroup>', {
                            label: displayedProjectName
                        }
                    );
                    self._selectSnapShot.append(projectGroup);

                    for (branchId in projectList[i].branches) {
                        if (projectList[i].branches.hasOwnProperty(branchId)) {
                            projectGroup.append($('<option>', {
                                    text: displayedProjectName + ' (' + branchId + ' ' +
                                    projectList[i].branches[branchId].slice(0, 8) + ')',
                                    value: 'db:' + projectId +
                                    projectList[i].branches[branchId]
                                }
                            ));
                        }
                    }

                    if (projectList[i].branches.hasOwnProperty('master')) {
                        branchId = 'master';
                    } else {
                        branchId = Object.keys(projectList[i].branches)[0];
                    }

                    if (!defaultOption && self.seedProjectName === projectId) { //File seed has precedence.
                        defaultOption = 'db:' + projectId + branchId;
                    }
                }

            }

            if (defaultOption) {
                self._selectSnapShot.val(defaultOption);
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