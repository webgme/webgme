/*globals define, angular, $, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */


define([
    'angular',
    'js/logger',
    'js/Constants',
    'js/Loader/LoaderCircles',
    'text!./templates/BranchesDialog.html',

    'css!./styles/BranchesDialog.css'

], function (ng, Logger, CONSTANTS, LoaderCircles, branchesDialogTemplate) {

    'use strict';

    var BranchesDialog,
        DATA_BRANCH_ID = 'BRANCH_ID',
        LI_BASE = $('<li class="center pointer"><a class="btn-env"></a>'),
        ngConfirmDialog,
        rootScope;


    angular.module('gme.ui.branchesDialog', ['isis.ui.simpleDialog']).run(function ($simpleDialog, $templateCache,
        $rootScope) {
        ngConfirmDialog = $simpleDialog;

        rootScope = $rootScope;

    });

    BranchesDialog = function (client, showTags) {
        this._logger = Logger.create('gme:Dialogs:Branches:BranchesDialog', WebGMEGlobal.gmeConfig.client.log);

        this._client = client;
        this._showTags = showTags;
        this._projectId = client.getActiveProjectId();
        this._selectedBranch = showTags ? null : client.getActiveBranchName();
        this._branchNames = [];
        this._branches = {};
        this._tagNames = [];
        this._tags = [];
        this._filter = undefined;
        this._ownerId = null; // TODO get this from dropdown list

        this._logger.debug('Created');
    };

    BranchesDialog.prototype.show = function () {
        var self = this;

        self._initDialog();

        self._dialog.modal('show');

        self._dialog.on('hidden.bs.model', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
            self._client.unwatchProject(self._projectId, self._projectEventHandling);
        });

        self._branchEventHandling = function (emitter, data) {
            if (data.etype === CONSTANTS.CLIENT.STORAGE.BRANCH_CREATED ||
                data.etype === CONSTANTS.CLIENT.STORAGE.BRANCH_DELETED ||
                data.etype === CONSTANTS.CLIENT.STORAGE.BRANCH_HASH_UPDATED) {
                self._logger.debug('branchlist changed event', data);
                self._refreshBranchList();
            }
        };


        self._client.watchProject(self._projectId, self._branchEventHandling);

        this._refreshBranchList();
    };

    BranchesDialog.prototype._initDialog = function () {
        var self = this,
            selectedId = this._selectedBranch;

        function openBranch(branchOrTagName) {
            if (self._showTags) {
                self._client.selectCommit(self._tags[branchOrTagName], (err) => {
                    if (err) {
                        self.logger.error(err);
                    }

                    self._dialog.modal('hide');
                });
            } else {
                self._client.selectBranch(branchOrTagName, null, function (err) {
                    if (err) {
                        this._logger.error('unable to open branch', { metadata: { error: err } });
                    }
                    self._selectedBranch = branchOrTagName;
                    self._dialog.modal('hide');
                });
            }
        }

        this._dialog = $(branchesDialogTemplate);

        //set dialog title
        this._dialog.find('h3').first()
            .text(`${this._showTags? 'Tags' : 'Branches'} of project ${WebGMEGlobal.getProjectDisplayedNameFromProjectId(this._projectId)}`);
        //get controls
        this._el = this._dialog.find('.modal-body').first();
        this._ul = this._el.find('ul').first();

        this._panelButtons = this._dialog.find('.panel-buttons');
        this._panelCreateNew = this._dialog.find('.panel-create-new').hide();

        this._btnOpen = this._dialog.find('.btn-open');
        this._btnRefresh = this._dialog.find('.btn-refresh');

        //this._dialog.find('.username').text(this._client.getUserId());
        this._ownerId = WebGMEGlobal.userInfo._id; //TODO: Get this from drop-down

        this._loader = new LoaderCircles({ containerElement: this._btnRefresh });
        this._loader.setSize(14);

        this._dialog.find('.tabContainer').first().groupedAlphabetTabs({
            onClick: function (filter) {
                self._filter = filter;
                self._refreshBranchList();
            },
            noMatchText: 'Nothing matched your filter, please click another letter.'
        });

        //hook up event handlers - SELECT project in the list
        this._ul.on('click', 'li:not(.disabled)', function (event) {
            selectedId = $(this).data(DATA_BRANCH_ID);

            event.stopPropagation();
            event.preventDefault();

            self._ul.find('.active').removeClass('active');
            $(this).addClass('active');
        });

        //open on double click
        this._ul.on('dblclick', 'li:not(.disabled)', function (event) {
            selectedId = $(this).data(DATA_BRANCH_ID);

            event.stopPropagation();
            event.preventDefault();

            openBranch(selectedId);
        });

        this._btnOpen.on('click', function (event) {
            event.stopPropagation();
            event.preventDefault();

            openBranch(selectedId);
        });

        this._btnRefresh.on('click', function (event) {
            self._refreshBranchList();

            event.stopPropagation();
            event.preventDefault();
        });
    };

    BranchesDialog.prototype._refreshBranchList = function () {
        var self = this;

        if (this._showTags) {
            self._client.getTags(self._projectId, function (err, tags) {
                if (err) {
                    self._logger.error('cannot get tags:', { metadata: { error: err } });
                    self._tagNames = [];
                }

                self._tags = tags;
                self._tagNames = Object.keys(tags);

                self._updateBranchList();
            });
        } else {
            self._client.getBranches(self._projectId, function (err, branches) {
                if (err) {
                    self._logger.error('cannot get branch list:', { metadata: { error: err } });
                    self._branchNames = [];
                }

                self._branches = branches;
                self._branchNames = Object.keys(branches);

                self._updateBranchList();
            });
        }
    };

    BranchesDialog.prototype._updateBranchList = function () {
        const nameList = this._showTags ? this._tagNames : this._branchNames;
        var len = nameList.length,
            i,
            li,
            count = 0,
            displayBranch,
            emptyLi = $('<li class="center"><i>No projects in this group...</i></li>');

        this._ul.empty();

        if (len > 0) {
            for (i = 0; i < len; i += 1) {
                displayBranch = false;
                if (this._filter === undefined) {
                    displayBranch = true;
                } else {
                    displayBranch = (nameList[i].toUpperCase()[0] >= this._filter[0] &&
                        nameList[i].toUpperCase()[0] <= this._filter[1]);
                }

                if (displayBranch) {
                    li = LI_BASE.clone();
                    li.find('a').text(nameList[i]);
                    li.data(DATA_BRANCH_ID, nameList[i]);

                    if (nameList[i] === this._selectedBranch) {
                        li.addClass('active');
                    }

                    this._ul.append(li);
                    count += 1;
                }
            }
        }

        if (count === 0) {
            this._ul.append(emptyLi.clone());
        }
    };

    return BranchesDialog;
});