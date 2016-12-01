/*globals define, angular, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * @author nabana / https://github.com/nabana
 * @author lattmann / https://github.com/lattmann
 */

define([
    'js/logger',
    'js/Constants',
    'angular',
    'js/Loader/ProgressNotification',
    'js/Dialogs/Projects/ProjectsDialog',
    'js/Dialogs/Commit/CommitDialog',
    'js/Dialogs/Merge/MergeDialog',
    'js/Dialogs/ProjectRepository/ProjectRepositoryDialog',
    'js/Dialogs/Branches/BranchesDialog',
    'js/Dialogs/Confirm/ConfirmDialog',
    'js/Dialogs/AddCommits/AddCommitsDialog',
    'common/storage/util',
    'js/Utils/Exporters',
    'q',
    'js/Utils/ComponentSettings'
], function (Logger,
             CONSTANTS,
             ng,
             ProgressNotification,
             ProjectsDialog,
             CommitDialog,
             MergeDialog,
             ProjectRepositoryDialog,
             BranchesDialog,
             ConfirmDialog,
             AddCommitsDialog,
             StorageUtil,
             exporters,
             Q,
             ComponentSettings) {
    'use strict';

    angular.module('gme.ui.ProjectNavigator', []).run(function () {
    });

    var ProjectNavigatorController;

    ProjectNavigatorController = function ($scope, gmeClient, $timeout, $window, $http) {
        var self = this;
        self.logger = Logger.create('gme:Panels:Header:ProjectNavigatorController', WebGMEGlobal.gmeConfig.client.log);
        self.$scope = $scope;
        self.$window = $window;
        self.gmeClient = gmeClient;
        //self.$simpleDialog = $simpleDialog;
        self.$timeout = $timeout;
        self.$http = $http;

        self.config = ProjectNavigatorController.getDefaultConfig();
        ComponentSettings.resolveWithWebGMEGlobal(self.config, ProjectNavigatorController.getComponentId());
        self.logger.debug('Resolved component-settings', self.config);

        // internal data representation for fast access to objects
        self.projects = {};

        // navigation items in the navigator list
        if (self.config.disableProjectActions === true) {
            self.navIdProject = 0;
            self.navIdBranch = 1;
        } else {
            self.navIdRoot = 0;
            self.navIdProject = 1;
            self.navIdBranch = 2;
        }

        self.root = {
            id: 'root',
            label: self.config.rootDisplayName,
            itemClass: self.config.rootMenuClass,
            menu: []
        };

        self.requestedSelection = null;

        self.userId = null;
        self.initialize();
    };

    ProjectNavigatorController.prototype.update = function () {
        this.logger.debug('update');
        // force ui update
        this.$timeout(function () {

        });
    };

    ProjectNavigatorController.prototype.initialize = function () {
        var self = this,
            newProject,
            manageProjects;

        // initialize model structure for view
        self.$scope.navigator = {
            items: [],
            separator: true
        };

        manageProjects = function (/*data*/) {
            var pd = new ProjectsDialog(self.gmeClient);
            pd.show();
        };
        newProject = function (data) {
            var pd = new ProjectsDialog(self.gmeClient, true, data.newType);
            pd.show();
        };
        self.userId = WebGMEGlobal.userInfo._id;

        // initialize root menu
        // projects id is mandatory
        if (self.config.disableProjectActions === false) {
            self.root.menu = [
                {
                    id: 'top',
                    items: [
                        {
                            id: 'manageProject',
                            label: 'Manage projects ...',
                            iconClass: 'glyphicon glyphicon-folder-open',
                            action: manageProjects,
                            actionData: {}
                        },
                        {
                            id: 'newProject',
                            label: 'New project ...',
                            disabled: WebGMEGlobal.userInfo.canCreate !== true,
                            iconClass: 'glyphicon glyphicon-plus',
                            action: newProject,
                            actionData: {newType: 'seed'}
                        },
                        {
                            id: 'importProject',
                            label: 'Import project ...',
                            disabled: WebGMEGlobal.userInfo.canCreate !== true,
                            iconClass: 'glyphicon glyphicon-import',
                            action: newProject,
                            actionData: {newType: 'import'}
                        }
                    ]
                },
                {
                    id: 'projects',
                    label: 'Recent projects',
                    totalItems: 20,
                    items: [],
                    showAllItems: manageProjects
                }
            ];
        }

        self.initWithClient();

        // only root is selected by default
        self.$scope.navigator = {
            items: self.config.disableProjectActions ? [] : [self.root],
            separator: true
        };
    };

    ProjectNavigatorController.prototype.initWithClient = function () {
        var self = this;

        // register all event listeners on gmeClient
        self.gmeClient.addEventListener(CONSTANTS.CLIENT.NETWORK_STATUS_CHANGED, function (client, networkStatus) {
            var projectId;
            self.logger.debug('NETWORK_STATUS_CHANGED', networkStatus);
            if (networkStatus === CONSTANTS.CLIENT.STORAGE.CONNECTED) {
                // get project list
                self.updateProjectList(function (err) {
                    if (err) {
                        self.logger.error('Failed to populate ProjectNavigator', err);
                        return;
                    }
                    self.gmeClient.watchDatabase(function (emitter, data) {
                        self.logger.debug('watchDatabase event', data);
                        if (data.etype === CONSTANTS.CLIENT.STORAGE.PROJECT_CREATED) {
                            //TODO: This call should get the rights..
                            self.gmeClient.getBranches(data.projectId, function (err, branches) {
                                if (err) {
                                    if (err.message.indexOf('Not authorized to read project') > -1) {
                                        // This is anticipated when someone else created the project.
                                        self.logger.debug(err.message);
                                    } else {
                                        self.logger.error('Could not get branches for newly created project ' +
                                            data.projectId);
                                        self.logger.error(err);
                                    }
                                    return;
                                }
                                self.logger.debug('Got branches before joining room:', Object.keys(branches));
                                //TODO: Should include rights, for now complete rights are assumed.
                                self.addProject(data.projectId, null, {modifiedAt: (new Date()).toISOString()}, true,
                                    function (err) {
                                        if (err) {
                                            self.logger.error(err);
                                            return;
                                        }
                                        self.gmeClient.getBranches(data.projectId, function (err, branches) {
                                            if (err) {
                                                self.logger.error(err);
                                                return;
                                            }
                                            self.logger.debug('Got branches after joining room:',
                                                Object.keys(branches));
                                            Object.keys(branches).forEach(function (branchId) {
                                                self.addBranch(data.projectId, branchId,
                                                    {branchHash: branches[branchId]});
                                            });
                                        });
                                    }
                                );
                            });
                        } else if (data.etype === CONSTANTS.CLIENT.STORAGE.PROJECT_DELETED) {
                            self.removeProject(data.projectId);
                        } else {
                            self.logger.error('Unexpected event type', data.etype);
                        }
                    });
                });
            } else if (networkStatus === CONSTANTS.CLIENT.STORAGE.RECONNECTED) {
                self.updateProjectList();
            } else if (networkStatus === CONSTANTS.CLIENT.STORAGE.DISCONNECTED) {
                if (self.projects) {
                    for (projectId in self.projects) {
                        if (self.projects.hasOwnProperty(projectId)) {
                            self.gmeClient.unwatchProject(projectId, self.projects[projectId]._watcher);
                        }
                    }
                }
            } else if (networkStatus === CONSTANTS.CLIENT.UNCAUGHT_EXCEPTION) {
                // This is handled elsewhere
            } else {
                self.logger.error('Error network status, no actions done', networkStatus);
            }

        });

        self.gmeClient.addEventListener(CONSTANTS.CLIENT.PROJECT_OPENED, function (client, projectId) {
            self.logger.debug(CONSTANTS.CLIENT.PROJECT_OPENED, projectId);
            self.selectProject({projectId: projectId});
        });

        self.gmeClient.addEventListener(CONSTANTS.CLIENT.PROJECT_CLOSED, function (client, projectId) {
            self.logger.debug(CONSTANTS.CLIENT.PROJECT_CLOSED, projectId);
            self.selectProject({});
        });

        self.gmeClient.addEventListener(CONSTANTS.CLIENT.BRANCH_CHANGED, function (client, branchId) {
            self.logger.debug(CONSTANTS.CLIENT.BRANCH_CHANGED, branchId);
            self.selectBranch({projectId: self.gmeClient.getActiveProjectId(), branchId: branchId});
        });

        angular.element(self.$window).on('keydown', function (e) {

            if ((e.metaKey || e.ctrlKey)) {

                if (e.keyCode === 90) {

                    //TODO we should block UI until undo/redo is done
                    if (e.shiftKey) {
                        self.$timeout(function () {
                            self.gmeClient.redo(self.gmeClient.getActiveBranchName(), function (/*err*/) {
                            });
                        });
                    } else {
                        self.$timeout(function () {
                            self.gmeClient.undo(self.gmeClient.getActiveBranchName(), function (/*err*/) {
                            });

                        });
                    }

                }
            }
        });

        self.gmeClient.addEventListener(CONSTANTS.CLIENT.UNDO_AVAILABLE, function (client, parameters) {
            self.logger.debug(CONSTANTS.CLIENT.UNDO_AVAILABLE, parameters);
            self.$timeout(function () {

                if (self.$scope.navigator &&
                    self.$scope.navigator.items &&
                    self.$scope.navigator.items[self.navIdBranch]) {
                    if (parameters) {
                        self.$scope.navigator.items[self.navIdBranch].undoLastCommitItem.disabled = false;
                    } else {
                        self.$scope.navigator.items[self.navIdBranch].undoLastCommitItem.disabled = true;
                    }

                }

            });
        });
        self.gmeClient.addEventListener(CONSTANTS.CLIENT.REDO_AVAILABLE, function (client, parameters) {
            self.logger.debug(CONSTANTS.CLIENT.REDO_AVAILABLE, parameters);
            self.$timeout(function () {

                if (self.$scope.navigator &&
                    self.$scope.navigator.items &&
                    self.$scope.navigator.items[self.navIdBranch]) {
                    if (parameters) {
                        self.$scope.navigator.items[self.navIdBranch].redoLastUndoItem.disabled = false;
                    } else {
                        self.$scope.navigator.items[self.navIdBranch].redoLastUndoItem.disabled = true;
                    }

                }

            });
        });
    };

    ProjectNavigatorController.prototype.updateProjectList = function (callback) {
        var self = this,
            params = {
                asObject: true,
                rights: true,
                branches: true,
                info: true
            };

        self.logger.debug('updateProjectList');
        self.projects = {};

        callback = callback || function (err) {
                if (err) {
                    self.logger.error(err);
                }
            };

        self.gmeClient.getProjects(params, function (err, projectsData) {
            var projectId,
                branchId,
                branchPromises = [];

            if (err) {
                callback(err);
                return;
            }

            function getBranchPromise(projectId, branchId, branchHash) {
                var deferred = Q.defer();

                self.gmeClient.getCommits(projectId, branchHash, 1, function (err, commits) {
                    if (err) {
                        self.logger.error(err);
                        deferred.resolve({
                            projectId: projectId,
                            branchId: branchId,
                            branchHash: branchHash,
                            commitObject: null
                        });
                    } else if (commits.length !== 1) {
                        self.logger.error(new Error('Could not get commit object', projectId, branchId, branchHash));
                        deferred.resolve({
                            projectId: projectId,
                            branchId: branchId,
                            branchHash: branchHash,
                            commitObject: null
                        });
                    } else {
                        deferred.resolve({
                            projectId: projectId,
                            branchId: branchId,
                            branchHash: branchHash,
                            commitObject: commits[0]
                        });
                    }
                });

                return deferred.promise;
            }

            self.logger.debug('getProjects', projectsData);

            // clear project list
            self.projects = {};

            for (projectId in projectsData) {
                if (projectsData.hasOwnProperty(projectId)) {

                    self.addProject(projectId, projectsData[projectId].rights, projectsData[projectId].info, true);

                    for (branchId in projectsData[projectId].branches) {
                        if (projectsData[projectId].branches.hasOwnProperty(branchId)) {
                            branchPromises.push(getBranchPromise(projectId, branchId,
                                projectsData[projectId].branches[branchId]));
                        }
                    }
                }
            }

            Q.all(branchPromises)
                .then(function (results) {

                    results.forEach(function (result) {
                        self.addBranch(result.projectId, result.branchId, result, true);
                    });

                    if (self.requestedSelection) {
                        self.selectBranch(self.requestedSelection);
                        self.requestedSelection = null;
                    } else {
                        self.update();
                    }

                    callback(null);
                })
                .catch(function (err) {
                    callback(err);
                });
        });
    };

    ProjectNavigatorController.prototype.addProject = function (projectId, rights, info, noUpdate, callback) {
        var self = this,
            i,
            showHistory,
            showAllBranches,
            deleteProject,
            selectProject,
            updateProjectList,
            projectDisplayedName;

        rights = rights || {
                delete: true,
                read: true,
                write: true
            };

        projectDisplayedName = WebGMEGlobal.gmeConfig.authentication.enable ?
            StorageUtil.getProjectDisplayedNameFromProjectId(projectId) :
            StorageUtil.getProjectNameFromProjectId(projectId);

        updateProjectList = function () {
            self.updateProjectList.call(self);
        };

        showHistory = function (data) {
            self.showHistory(data);
        };

        deleteProject = function (data) {
            var deleteProjectModal = new ConfirmDialog();
            deleteProjectModal.show({deleteItem: projectDisplayedName}, function () {
                self.gmeClient.deleteProject(data.projectId, function (err) {
                    if (err) {
                        self.logger.error('Failed deleting project', err);
                    } else {
                        if (data.projectId === self.gmeClient.getActiveProjectId()) {
                            self.refreshPage();
                        } else {
                            self.removeProject(data.projectId);
                        }
                    }
                });
            });
        };

        showAllBranches = function (data) {
            var prd;
            if (self.gmeClient.getActiveProjectId() === data.projectId) {
                prd = new BranchesDialog(self.gmeClient);
                prd.show();
            } else {
                self.selectProject({projectId: projectId}, function (err) {
                    var dialog = new BranchesDialog(self.gmeClient);

                    if (err) {
                        // TODO: handle errors
                        return;
                    }

                    dialog.show();
                });
            }
        };

        selectProject = function (data) {
            self.selectProject(data);
        };

        // create a new project object
        self.projects[projectId] = {
            id: projectId,
            label: projectDisplayedName,
            iconClass: rights.write ? '' : 'glyphicon glyphicon-lock',
            iconPullRight: !rights.write,
            projectIsReadOnly: !rights.write,
            disabled: !rights.read,
            itemClass: self.config.projectMenuClass,
            modifiedAt: info.modifiedAt,
            isSelected: false,
            branches: {},
            action: selectProject,
            actionData: {
                projectId: projectId
            },
            menu: [
                {
                    id: 'top',
                    items: [
                        {
                            id: 'showHistory',
                            label: 'Project history ...',
                            iconClass: 'glyphicon glyphicon-time',
                            disabled: !rights.read,
                            action: showHistory,
                            actionData: {
                                projectId: projectId
                            }
                        }
                    ]
                },
                {
                    id: 'branches',
                    label: 'Recent branches',
                    totalItems: 20,
                    items: [],
                    showAllItems: function () {
                        showAllBranches({projectId: projectId});
                    }
                }
            ],
            _watcher: function (emitter, data) {
                var currentProject,
                    currentBranch;
                self.logger.debug('watchProject event', projectId, data);
                if (data.etype === CONSTANTS.CLIENT.STORAGE.BRANCH_CREATED) {
                    self.addBranch(projectId, data.branchName, {branchHash: data.newHash});
                } else if (data.etype === CONSTANTS.CLIENT.STORAGE.BRANCH_DELETED) {
                    self.removeBranch(projectId, data.branchName);

                    currentProject = self.$scope.navigator.items[self.navIdProject];
                    currentBranch = self.$scope.navigator.items[self.navIdBranch];
                    if (currentBranch && currentBranch.id === data.branchName && currentProject.id === projectId) {
                        self.gmeClient.selectCommit(self.gmeClient.getActiveCommitHash(), function (err) {
                            if (err) {
                                self.logger.error('cannot select latest commit', {metadata: {error: err}});
                            }
                            self.logger.debug('active branch deleted, switched to last viewed commit',
                                {metadata: {commitHash: self.gmeClient.getActiveCommitHash()}});
                        });
                    }
                } else if (data.etype === CONSTANTS.CLIENT.STORAGE.BRANCH_HASH_UPDATED) {
                    self.updateBranch(projectId, data.branchName, data.newHash);
                } else {
                    self.logger.error('Unexpected event type', data.etype);
                }
            }
        };

        if (self.config.disableProjectActions === false) {
            self.projects[projectId].menu[0].items.unshift({
                id: 'deleteProject',
                label: 'Delete project',
                iconClass: 'glyphicon glyphicon-remove',
                disabled: !rights.delete,
                action: deleteProject,
                actionData: {
                    projectId: projectId
                }
            });
        }

        self.gmeClient.watchProject(projectId, self.projects[projectId]._watcher, callback);

        for (i = 0; i < self.root.menu.length; i += 1) {

            // find the projects id in the menu items
            if (self.root.menu[i].id === 'projects') {

                // convert indexed projects to an array
                self.root.menu[i].items = self.mapToArray(self.projects, [
                    {key: 'modifiedAt', reverse: true}, {key: 'id'}]);
                break;
            }
        }

        if (noUpdate === true) {

        } else {
            self.update();
        }
    };

    ProjectNavigatorController.prototype.addBranch = function (projectId, branchId, branchInfo, noUpdate) {
        var self = this,
            i,
            deleteBranchItem,
            mergeBranchItem,
            addCommits,
            undoLastCommitItem,
            redoLastUndoItem;

        if (self.projects.hasOwnProperty(projectId) === false) {
            self.logger.warn('project is not in the list yet: ', projectId);
            return;
        }

        if (self.projects[projectId].disabled) {
            // do not show any branches if the project is disabled
            return;
        }

        function exportBranch(data) {
            exporters.exportProject(self.gmeClient, self.logger, {
                projectId: data.projectId,
                branchId: data.branchId,
                commitHash: data.projectId === self.gmeClient.getActiveProjectId() &&
                data.branchId === self.gmeClient.getActiveBranchName() ?
                    self.gmeClient.getActiveCommitHash() : data.commitHash
            }, true);
        }

        function showBranchHistory(data) {
            self.showHistory(data);
        }

        function deleteBranch(data) {
            var deleteBranchModal = new ConfirmDialog(),
                deleteItem = StorageUtil.getProjectDisplayedNameFromProjectId(data.projectId) +
                    '  ::  ' + data.branchId;
            deleteBranchModal.show({deleteItem: deleteItem}, function () {
                self.gmeClient.deleteBranch(data.projectId,
                    data.branchId,
                    data.branchInfo.branchHash,
                    function (err) {
                        if (err) {
                            self.logger.error('Failed deleting branch of project.',
                                data.projectId, data.branchId, err);
                        } else {
                            self.removeBranch(data.projectId, data.branchId);
                        }
                    }
                );
            });

        }

        function mergeBranch(data) {
            var progress = ProgressNotification.start('<strong>Merging </strong> branch ' +
                data.branchId + ' into ' + self.$scope.navigator.items[self.navIdBranch].id + '...');

            if (data.projectId !== self.gmeClient.getActiveProjectId()) {
                self.logger.error(new Error('Cannot merge branch from a different project..'));
                clearInterval(progress.intervalId);
                progress.note.update({
                    message: '<strong>Failed to merge: </strong> cannot merge branch from a different project.',
                    type: 'danger',
                    progress: 100
                });
            } else {
                self.gmeClient.autoMerge(data.projectId,
                    data.branchId, self.$scope.navigator.items[self.navIdBranch].id,
                    function (err, result) {
                        clearInterval(progress.intervalId);
                        progress.note.update('progress', 100);
                        progress.note.close();
                        var mergeDialog = new MergeDialog(self.gmeClient);
                        if (err) {
                            self.logger.error('merge of branch failed', err);
                            mergeDialog.show(err);
                            return;
                        }

                        if (result && result.conflict && result.conflict.items.length > 0) {
                            //TODO create some user-friendly way to show this type of result
                            self.logger.error('merge ended in conflicts', result);
                            mergeDialog.show('merge ended in conflicts', result);
                        } else {
                            self.logger.debug('successful merge');
                            mergeDialog.show(null, result);
                        }
                    }
                );
            }
        }

        function selectBranch(data) {
            self.selectBranch(data);
        }

        deleteBranchItem = {
            id: 'deleteBranch',
            label: 'Delete branch',
            iconClass: 'glyphicon glyphicon-remove',
            disabled: self.projects[projectId].projectIsReadOnly,
            action: deleteBranch,
            actionData: {
                projectId: projectId,
                branchId: branchId,
                branchInfo: branchInfo
            }
        };

        mergeBranchItem = {
            id: 'mergeBranch',
            label: 'Merge into current branch',
            iconClass: 'fa fa-share-alt fa-rotate-90',
            disabled: self.projects[projectId].projectIsReadOnly,
            action: mergeBranch,
            actionData: {
                projectId: projectId,
                branchId: branchId
            }
        };

        addCommits = {
            id: 'addCommits',
            label: 'Add external commits ...',
            iconClass: 'glyphicon glyphicon-fast-forward',
            disabled: true,
            action: function (data) {
                self.gmeClient.getBranches(data.projectId, function (err, branches) {
                    if (err) {
                        self.logger.error(new Error('Failed getting branches before adding commits'));
                        return;
                    }

                    var dialog = new AddCommitsDialog(self.gmeClient, WebGMEGlobal.gmeConfig, branches);
                    dialog.show(data);
                });
            },
            actionData: {
                projectId: projectId,
                branchName: branchId
            }
        };

        undoLastCommitItem = {
            id: 'undoLastCommit',
            label: 'Undo last commit',
            iconClass: 'fa fa-reply',
            disabled: true, // TODO: set this from handler to enable/disable
            action: function (actionData) {
                self.gmeClient.undo(actionData.branchId, function (/*err*/) {
                });
            },
            // Put whatever you need to get passed back above
            actionData: {
                projectId: projectId,
                branchId: branchId,
                branchInfo: branchInfo
            }
        };

        redoLastUndoItem = {
            id: 'redoLastUndo',
            label: 'Redo last undo',
            iconClass: 'fa fa-mail-forward',
            disabled: true, // TODO: set this from handler to enable/disable
            action: function (actionData) {
                self.gmeClient.redo(actionData.branchId, function (/*err*/) {
                });
            },
            // Put whatever you need to get passed back above
            actionData: {
                projectId: projectId,
                branchId: branchId,
                branchInfo: branchInfo
            }
        };

        // create the new branch structure
        self.projects[projectId].branches[branchId] = {
            id: branchId,
            label: branchId,
            properties: {
                commitHash: branchInfo.branchHash,
                commitObject: branchInfo.commitObject || {time: Date.now()}
            },
            isSelected: false,
            itemClass: self.config.branchMenuClass,
            action: selectBranch,
            actionData: {
                projectId: projectId,
                branchId: branchId
            },
            //itemTemplate: 'branch-selector-template',
            menu: [
                {
                    items: [
                        undoLastCommitItem,
                        redoLastUndoItem,
                        {
                            id: 'branchHistory',
                            label: 'Branch history ...',
                            iconClass: 'glyphicon glyphicon-time',
                            action: showBranchHistory,
                            actionData: {
                                projectId: projectId,
                                branchId: branchId,
                                branchInfo: branchInfo
                            }
                        },
                        {
                            id: 'createBranch',
                            label: 'Create branch ...',
                            iconClass: 'glyphicon glyphicon-plus',
                            action: showBranchHistory,
                            actionData: {
                                projectId: projectId,
                                branchId: branchId,
                                branchInfo: branchInfo
                            }
                        },
                        deleteBranchItem,
                        mergeBranchItem,
                        addCommits,
                        {
                            id: 'exportBranch',
                            label: 'Export branch',
                            iconClass: 'glyphicon glyphicon-export',
                            action: exportBranch,
                            actionData: {
                                projectId: projectId,
                                branchId: branchId,
                                commitHash: branchInfo.branchHash
                            }
                        }
                    ]

                }
            ]
        };

        self.projects[projectId].branches[branchId].deleteBranchItem = deleteBranchItem;
        self.projects[projectId].branches[branchId].mergeBranchItem = mergeBranchItem;
        self.projects[projectId].branches[branchId].undoLastCommitItem = undoLastCommitItem;
        self.projects[projectId].branches[branchId].redoLastUndoItem = redoLastUndoItem;
        self.projects[projectId].branches[branchId].applyCommitQueueItem = addCommits;

        for (i = 0; i < self.projects[projectId].menu.length; i += 1) {

            // find the branches id in the menu items
            if (self.projects[projectId].menu[i].id === 'branches') {

                // convert indexed branches to an array
                self.projects[projectId].menu[i].items = self.mapToArray(self.projects[projectId].branches,
                    [{key: 'properties.commitObject.time', reverse: true}, {key: 'id'}]);
                break;
            }
        }

        if (noUpdate === true) {

        } else {
            self.update();
        }
    };

    ProjectNavigatorController.prototype.removeProject = function (projectId/*, callback*/) {
        var self = this,
            i;

        if (self.projects.hasOwnProperty(projectId)) {
            self.gmeClient.unwatchProject(projectId, self.projects[projectId]._watcher);
            delete self.projects[projectId];

            for (i = 0; i < self.root.menu.length; i += 1) {

                // find the projects id in the menu items
                if (self.root.menu[i].id === 'projects') {

                    // convert indexed projects to an array
                    self.root.menu[i].items = self.mapToArray(self.projects, [
                        {key: 'modifiedAt', reverse: true}, {key: 'id'}]);
                    break;
                }
            }

            if (projectId === self.gmeClient.getActiveProjectId()) {
                self.refreshPage();
            }

            self.update();
        }
    };

    ProjectNavigatorController.prototype.removeBranch = function (projectId, branchId) {
        var self = this,
            i;

        if (self.projects.hasOwnProperty(projectId) && self.projects[projectId].branches.hasOwnProperty(branchId)) {
            delete self.projects[projectId].branches[branchId];

            for (i = 0; i < self.projects[projectId].menu.length; i += 1) {

                // find the branches id in the menu items
                if (self.projects[projectId].menu[i].id === 'branches') {

                    // convert indexed branches to an array
                    self.projects[projectId].menu[i].items = self.mapToArray(self.projects[projectId].branches,
                        [{key: 'properties.commitObject.time', reverse: true}, {key: 'id'}]);
                    break;
                }
            }

            self.update();
        }
    };

    ProjectNavigatorController.prototype.selectProject = function (data, callback) {
        this.selectBranch(data, callback);
    };

    ProjectNavigatorController.prototype.selectBranch = function (data, callback) {
        var self = this,
            projectId = data.projectId,
            branchId = data.branchId,
            currentProject = self.$scope.navigator.items[self.navIdProject],
            currentBranch = self.$scope.navigator.items[self.navIdBranch];

        callback = callback || function () {
            };

        //check if there is need for a change at all
        if (currentProject && currentProject.id === projectId && currentBranch &&
            (currentBranch.id === branchId || branchId === undefined || branchId === '')) {
            callback(null);
            return;
        }
        // clear current selection
        if (currentProject) {
            currentProject.isSelected = false;
        }

        if (currentBranch) {
            currentBranch.isSelected = false;
            currentBranch.deleteBranchItem.disabled = false;
            currentBranch.mergeBranchItem.disabled = false;

            currentBranch.undoLastCommitItem.disabled = true;
            currentBranch.redoLastUndoItem.disabled = true;
            currentBranch.applyCommitQueueItem.disabled = true;

            if (currentProject && currentProject.projectIsReadOnly) {
                currentBranch.deleteBranchItem.disabled = true;
                currentBranch.mergeBranchItem.disabled = true;
            }
        }

        if (projectId || projectId === '') {
            if (self.projects.hasOwnProperty(projectId) === false) {
                self.logger.warn(projectId +
                    ' does not exist yet in the navigation bar, requesting selection to be loaded.');
                self.requestedSelection = data;
                // let's update the project list, in case the server did not notify us.
                this.updateProjectList();
                return;
            }

            if (self.projects[projectId].disabled) {
                // prevent to select disabled projects

                if (currentProject) {
                    currentProject.isSelected = true;
                }

                if (currentBranch) {
                    currentBranch.isSelected = true;
                    currentBranch.deleteBranchItem.disabled = true;
                    currentBranch.mergeBranchItem.disabled = true;
                }

                return;
            }

            // FIXME: what if projects do not contain projectId anymore?
            self.$scope.navigator.items[self.navIdProject] = self.projects[projectId];

            // mark project as selected
            self.projects[projectId].isSelected = true;

            if (projectId !== self.gmeClient.getActiveProjectId()) {
                self.gmeClient.selectProject(projectId, null, function (err) {
                    if (err) {
                        self.logger.error(err);
                        callback(err);
                        return;
                    }
                    //WebGMEGlobal.State.registerActiveObject(CONSTANTS.PROJECT_ROOT_ID);

                    if (branchId && branchId !== self.gmeClient.getActiveBranchName()) {
                        self.gmeClient.selectBranch(branchId, null, function (err) {
                            if (err) {
                                self.logger.error(err);
                                callback(err);
                                return;
                            }

                            callback(null);
                        });
                    } else {
                        callback(null);
                    }
                });

                // we cannot select branch if the project is not open
                // we will get a project open event
                return;
            }

            if (branchId || branchId === '') {

                if (self.projects[projectId].branches.hasOwnProperty(branchId) === false) {
                    self.logger.error(projectId + ' - ' + branchId + ' branch does not exist in the navigation bar');
                    self.requestedSelection = data;
                    return;
                }

                // set selected branch
                self.$scope.navigator.items[self.navIdBranch] = self.projects[projectId].branches[branchId];

                // mark branch as selected
                self.projects[projectId].branches[branchId].isSelected = true;

                self.projects[projectId].branches[branchId].deleteBranchItem.disabled = true;
                self.projects[projectId].branches[branchId].mergeBranchItem.disabled = true;

                if (self.projects[projectId].projectIsReadOnly === false) {
                    self.projects[projectId].branches[branchId].applyCommitQueueItem.disabled = false;
                }

                if (branchId !== self.gmeClient.getActiveBranchName()) {
                    self.gmeClient.selectBranch(branchId, null, function (err) {
                        if (err) {
                            self.logger.error(err);
                            callback(err);
                            return;
                        }

                        callback(null);
                    });

                    // we will get a branch status changed event
                    return;
                }

            } else {
                // remove branch element
                self.$scope.navigator.items.splice(self.navIdBranch, 1);
            }
        } else {
            // remove project and branch elements
            self.$scope.navigator.items.splice(self.navIdProject, 2);
        }

        callback(null);
        self.update();
    };

    ProjectNavigatorController.prototype.updateBranch = function (projectId, branchId, branchInfo) {
        if (this.projects.hasOwnProperty(projectId) &&
            this.projects[projectId].branches.hasOwnProperty(branchId)) {

            this.projects[projectId].branches[branchId].properties = {
                commitHash: branchInfo,
                commitObject: null
            };

            this.update();
        } else {
            this.logger.warn('project or branch is not in the list yet: ', projectId, branchId, branchInfo);
        }
    };

    ProjectNavigatorController.prototype.mapToArray = function (hashMap, orderBy) {
        var keys = Object.keys(hashMap),
            values = keys.map(function (v) {
                return hashMap[v];
            });

        // keys precedence to order
        orderBy = orderBy || [];

        values.sort(function (a, b) {
            var i,
                reverse,
                keys,
                subA,
                subB,
                res = 0,
                key;

            for (i = 0; i < orderBy.length; i += 1) {
                keys = orderBy[i].key.split('.');
                reverse = orderBy[i].reverse === true ? -1 : 1;
                key = keys.shift();
                subA = a;
                subB = b;

                while (key) {
                    if (subA === null || subB === null || typeof subA !== 'object' || typeof subB !== 'object') {
                        break;
                    }

                    if (subA.hasOwnProperty(key) && subB.hasOwnProperty(key)) {
                        if (keys.length === 0) {
                            if (subA[key] > subB[key]) {
                                res = 1 * reverse;
                            }
                            if (subA[key] < subB[key]) {
                                res = -1 * reverse;
                            }
                            break;
                        } else {
                            subA = subA[key];
                            subB = subB[key];
                            key = keys.shift();
                        }
                    } else {
                        // Move over to the i;
                        break;
                    }
                }
                if (res !== 0) {
                    break;
                }
            }

            // a must be equal to b
            return res;
        });

        return values;
    };

    ProjectNavigatorController.prototype.showHistory = function (data) {
        var self = this,
            prd,
            options = {
                start: null,
                branches: null
            };

        if (self.gmeClient.getActiveProjectId() === data.projectId) {
            prd = new ProjectRepositoryDialog(self.gmeClient);
            options.branches = Object.keys(self.projects[data.projectId].branches);
            options.start = data.branchId || options.branches;
            prd.show(options);
        } else {
            self.selectProject({projectId: data.projectId}, function (err) {
                if (err) {
                    self.logger.error('Could not show history', err);
                    return;
                }
                prd = new ProjectRepositoryDialog(self.gmeClient);
                options.branches = Object.keys(self.projects[data.projectId].branches);
                options.start = data.branchId || options.branches;

                prd.show(options);
            });
        }
    };

    ProjectNavigatorController.prototype.refreshPage = function () {
        document.location.href = window.location.href.split('?')[0];
    };

    ProjectNavigatorController.getComponentId = function () {
        return 'GenericUIProjectNavigatorController';
    };

    ProjectNavigatorController.getDefaultConfig = function () {
        return {
            disableProjectActions: false,
            rootMenuClass: 'gme-root',
            rootDisplayName: 'GME',
            projectMenuClass: '',
            branchMenuClass: ''
        };
    };

    return ProjectNavigatorController;
});
