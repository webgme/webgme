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
    'js/Dialogs/Projects/ProjectsDialog',
    'js/Dialogs/Commit/CommitDialog',
    'js/Dialogs/Merge/MergeDialog',
    'js/Dialogs/ProjectRepository/ProjectRepositoryDialog',
    'js/Dialogs/Branches/BranchesDialog',
    'common/storage/util',
    'isis-ui-components/simpleDialog/simpleDialog',
    'text!js/Dialogs/Projects/templates/DeleteDialogTemplate.html',
    'text!js/Dialogs/Projects/templates/TransferDialogTemplate.html',
    'js/Utils/SaveToDisk'
], function (Logger,
             CONSTANTS,
             ng,
             ProjectsDialog,
             CommitDialog,
             MergeDialog,
             ProjectRepositoryDialog,
             BranchesDialog,
             StorageUtil,
             ConfirmDialog,
             DeleteDialogTemplate,
             TransferDialogTemplate,
             saveToDisk) {
    'use strict';


    angular.module('gme.ui.ProjectNavigator', []).run(function ($templateCache) {
        $templateCache.put('DeleteDialogTemplate.html', DeleteDialogTemplate);
        $templateCache.put('TransferDialogTemplate.html', TransferDialogTemplate);
    });


    var ProjectNavigatorController;

    ProjectNavigatorController = function ($scope, gmeClient, $simpleDialog, $timeout, $window, $http) {
        var self = this;
        self.logger = Logger.create('gme:Panels:Header:ProjectNavigatorController', WebGMEGlobal.gmeConfig.client.log);
        self.$scope = $scope;
        self.$window = $window;
        self.gmeClient = gmeClient;
        self.$simpleDialog = $simpleDialog;
        self.$timeout = $timeout;
        self.$http = $http;

        // internal data representation for fast access to objects
        self.projects = {};
        self.root = {
            id: 'root',
            label: 'GME',
//            isSelected: true,
            itemClass: 'gme-root',
            menu: []
        };

        // navigation items in the navigator list
        self.navIdRoot = 0;
        self.navIdProject = 1;
        self.navIdBranch = 2;

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

        if (self.gmeClient) {
            manageProjects = function (/*data*/) {
                var pd = new ProjectsDialog(self.gmeClient);
                pd.show();
            };
            newProject = function (data) {
                var pd = new ProjectsDialog(self.gmeClient, true, data.newType);
                pd.show();
            };
            self.userId = self.gmeClient.getUserId();
        } else {
            newProject = function (/*data*/) {
                self.dummyProjectsGenerator('New Project ' + Math.floor(Math.random() * 10000), 4);
            };

            manageProjects = function (/*data*/) {
                self.dummyProjectsGenerator('Manage projects ' + Math.floor(Math.random() * 10000), 4);
            };
            self.userId = 'dummyUser';
        }

        // initialize root menu
        // projects id is mandatory
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
                        iconClass: 'glyphicon glyphicon-plus',
                        action: newProject,
                        actionData: {newType: 'seed'}
                    },
                    {
                        id: 'importProject',
                        label: 'Import project ...',
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
                showAllItems: newProject
            }
        ];

        if (self.gmeClient) {
            self.initWithClient();
            self.$scope.ownerList = [self.userId];
        } else {
            self.initTestData();
            self.$scope.ownerList = [self.userId];
        }

        // only root is selected by default
        self.$scope.navigator = {
            items: [
                self.root
            ],
            separator: true
        };
    };

    ProjectNavigatorController.prototype.initTestData = function () {
        var self = this;

        self.dummyProjectsGenerator('Project', 20);
    };

    ProjectNavigatorController.prototype.initWithClient = function () {
        var self = this;

        self.$http.get('/api/users/' + self.userId)
            .then(function (userData) {
                self.$scope.ownerList = userData.data.orgs;
                self.$scope.ownerList.push(self.userId);
            }, function (err) {
                self.logger.error(err);
                self.$scope.ownerList = [self.userId];
            });

        // register all event listeners on gmeClient

        self.gmeClient.addEventListener(CONSTANTS.CLIENT.NETWORK_STATUS_CHANGED, function (client, networkStatus) {
            var projectId;
            self.logger.debug('NETWORK_STATUS_CHANGED', networkStatus);
            if (networkStatus === CONSTANTS.CLIENT.STORAGE.CONNECTED) {
                // get project list
                self.updateProjectList();
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
                                        self.logger.debug('Got branches after joining room:', Object.keys(branches));
                                        Object.keys(branches).map(function (branchId) {
                                            self.addBranch(data.projectId, branchId);
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
            } else {
                self.logger.error('Unexpected network status', networkStatus);
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

    ProjectNavigatorController.prototype.updateProjectList = function () {
        var self = this,
            params = {
                asObject: true,
                rights: true,
                branches: true,
                info: true
            };
        self.logger.debug('updateProjectList');
        self.projects = {};
        self.gmeClient.getProjects(params, function (err, projectList) {
            var projectId,
                branchId;

            if (err) {
                self.logger.error(err);
                return;
            }

            self.logger.debug('getProjects', projectList);

            // clear project list
            self.projects = {};

            for (projectId in projectList) {
                if (projectList.hasOwnProperty(projectId)) {
                    self.addProject(projectId, projectList[projectId].rights, projectList[projectId].info, true);
                    for (branchId in projectList[projectId].branches) {
                        if (projectList[projectId].branches.hasOwnProperty(branchId)) {
                            self.addBranch(projectId, branchId, projectList[projectId].branches[branchId], true);
                        }
                    }
                }
            }

            if (self.requestedSelection) {
                self.selectBranch(self.requestedSelection);
                self.requestedSelection = null;
            } else {
                self.update();
            }
        });
    };

    ProjectNavigatorController.prototype.addProject = function (projectId, rights, info, noUpdate, callback) {
        var self = this,
            i,
            showHistory,
            showAllBranches,
            deleteProject,
            transferProject,
            selectProject,
            refreshPage,
            updateProjectList,
            projectDisplayedName;

        rights = rights || {
                delete: true,
                read: true,
                write: true
            };

        if (self.gmeClient) {
            showHistory = function (data) {
                var prd;
                if (self.gmeClient.getActiveProjectId() === data.projectId) {
                    prd = new ProjectRepositoryDialog(self.gmeClient);
                    prd.show();
                } else {
                    self.selectProject({projectId: projectId}, function (err) {
                        var dialog = new ProjectRepositoryDialog(self.gmeClient);

                        if (err) {
                            // TODO: handle errors
                            return;
                        }

                        dialog.show();
                    });
                }
            };

            refreshPage = function () {
                document.location.href = window.location.href.split('?')[0];
            };

            updateProjectList = function () {
                self.updateProjectList.call(self);
            };

            deleteProject = function (data) {
                var deleteProjectModal;

                self.$scope.thingName = 'project "' + data.projectId + '"';

                deleteProjectModal = self.$simpleDialog.open({
                    dialogTitle: 'Confirm delete',
                    dialogContentTemplate: 'DeleteDialogTemplate.html',
                    onOk: function () {
                        var activeProjectId = self.gmeClient.getActiveProjectId();

                        self.gmeClient.deleteProject(data.projectId, function (err) {
                            if (err) {
                                self.logger.error('Failed deleting project', err);
                            } else {
                                if (data.projectId === activeProjectId) {
                                    refreshPage();
                                } else {
                                    self.removeProject(data.projectId);
                                }

                            }
                        });
                    },
                    scope: self.$scope
                });

            };

            transferProject = function (data) {
                var transferProjectModal;

                self.$scope.thingName = data.projectId;
                self.$scope.newOwnerId = self.userId;

                transferProjectModal = self.$simpleDialog.open({
                    dialogTitle: 'Transfer',
                    dialogContentTemplate: 'TransferDialogTemplate.html',
                    controller: function ($scope, $modalInstance, dialogTitle, dialogContentTemplate) {

                        $scope.dialogTitle = dialogTitle;
                        $scope.dialogContentTemplate = dialogContentTemplate;

                        $scope.ok = function () {
                            var activeProjectId = self.gmeClient.getActiveProjectId();
                            $modalInstance.close();
                            self.gmeClient.transferProject(data.projectId, $scope.newOwnerId, function (err) {
                                if (err) {
                                    self.logger.error('Failed transferProject', err);
                                } else {
                                    if (data.projectId === activeProjectId) {
                                        refreshPage();
                                    } else {
                                        self.removeProject(data.projectId);
                                    }
                                }
                            });
                        };

                        $scope.cancel = function () {
                            $modalInstance.dismiss('cancel');
                        };

                        $scope.setNewOwnerId = function (ownerId) {
                            self.$scope.newOwnerId = ownerId;
                        };
                    },
                    scope: self.$scope
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
        } else {
            // test version
            showHistory = function (data) {
                self.logger.debug('showHistory: ', data);
            };

            deleteProject = function (data) {
                self.removeProject(data.projectId);
            };

            showAllBranches = function (data) {
                self.logger.debug('showAllBranches: ', data);
            };
        }

        selectProject = function (data) {
            self.selectProject(data);
        };

        projectDisplayedName = StorageUtil.getProjectDisplayedNameFromProjectId(projectId);

        // create a new project object
        self.projects[projectId] = {
            id: projectId,
            label: projectDisplayedName,
            iconClass: rights.write ? '' : 'glyphicon glyphicon-lock',
            iconPullRight: !rights.write,
            disabled: !rights.read,
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
                            id: 'deleteProject',
                            label: 'Delete project',
                            iconClass: 'glyphicon glyphicon-remove',
                            disabled: !rights.delete,
                            action: deleteProject,
                            actionData: {
                                projectId: projectId
                            }
                        },
                        {
                            id: 'transferProject',
                            label: 'Transfer project',
                            iconClass: 'glyphicon glyphicon-transfer',
                            disabled: !rights.delete,
                            action: transferProject,
                            actionData: {
                                projectId: projectId
                            }
                        },
                        {
                            id: 'showHistory',
                            label: 'Show history',
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
                    self.addBranch(projectId, data.branchName, data.newHash);
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

        if (self.gmeClient) {
            self.gmeClient.watchProject(projectId, self.projects[projectId]._watcher, callback);
        } else {
            self.dummyBranchGenerator('Branch', 10, projectId);
            callback(null);
        }

        for (i = 0; i < self.root.menu.length; i += 1) {

            // find the projects id in the menu items
            if (self.root.menu[i].id === 'projects') {

                // convert indexed projects to an array
                self.root.menu[i].items = self.mapToArray(self.projects, [
                    {key: 'modifiedAt', reverse: true}, {key: 'name'}, {key: 'id'}]);
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
            selectBranch,
            exportBranch,
            createBranch,
            deleteBranch,
            mergeBranch,
            createCommitMessage,

            deleteBranchItem,
            mergeBranchItem,
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

        if (self.gmeClient) {
            exportBranch = function (data) {
                //var url = self.gmeClient.getDumpURL({
                //    project: data.projectId,
                //    branch: data.branchId,
                //    output: data.projectId + '_' + data.branchId
                //});
                //
                //if (url) {
                //    window.location = url;
                //} else {
                //    self.logger.error('Failed to get project dump url for ', data);
                //}
                self.gmeClient.getExportProjectBranchUrl(data.projectId,
                    data.branchId, data.projectId + '_' + data.branchId, function (err, url) {
                        if (!err && url) {
                            saveToDisk.saveUrlToDisk(url);
                        } else {
                            self.logger.error('Failed to get project export url for', data);
                        }
                    }
                );
            };

            createBranch = function (/*data*/) {
                var prd = new ProjectRepositoryDialog(self.gmeClient);
                prd.show();
            };

            deleteBranch = function (data) {
                var deleteBranchModal;

                self.$scope.thingName = 'branch "' + data.branchId + '"';

                deleteBranchModal = self.$simpleDialog.open({
                    dialogTitle: 'Confirm delete',
                    dialogContentTemplate: 'DeleteDialogTemplate.html',
                    onOk: function () {
                        self.gmeClient.deleteBranch(data.projectId,
                            data.branchId,
                            data.branchInfo,
                            function (err) {
                                if (err) {
                                    self.logger.error('Failed deleting branch of project.',
                                        data.projectId, data.branchId, err);
                                } else {
                                    self.removeBranch(data.projectId, data.branchId);
                                }
                            });
                    },
                    scope: self.$scope
                });

            };

            mergeBranch = function (data) {
                self.gmeClient.autoMerge(data.projectId,
                    data.branchId, self.$scope.navigator.items[self.navIdBranch].id,
                    function (err, result) {
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
            };

            createCommitMessage = function (data) {
                self.selectBranch(data, function (err) {
                    var cd;

                    if (err) {
                        // TODO: log error
                        return;
                    }

                    cd = new CommitDialog(self.gmeClient);
                    cd.show();
                });
            };
        } else {
            // test version
            exportBranch = function (data) {
                self.logger.debug('exportBranch: ', data);
            };

            createBranch = function (data) {
                self.addBranch(data.projectId, data.branchId + ' _copy');
                self.selectProject({projectId: data.projectId, branchId: data.branchId + '_copy'});
            };

            deleteBranch = function (data) {
                var deleteBranchModal;

                self.logger.debug('delete branch');

                self.$scope.thingName = data.branchId;

                deleteBranchModal = self.$simpleDialog.open({
                    dialogTitle: 'Confirm delete',
                    dialogContentTemplate: 'DeleteDialogTemplate.html',
                    onOk: function () {
                        self.removeBranch(data.projectId, data.branchId);
                        //self.selectProject( data );
                        // you cannot delete the actual branch so there is no need for re-selection
                    },
                    scope: self.$scope
                });

            };

            createCommitMessage = function (data) {
                self.logger.debug('createCommitMessage: ', data);
            };
        }

        selectBranch = function (data) {
            self.selectBranch(data);
        };


        deleteBranchItem = {
            id: 'deleteBranch',
            label: 'Delete branch',
            iconClass: 'glyphicon glyphicon-remove',
            disabled: false,
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
            disabled: false,
            action: mergeBranch,
            actionData: {
                projectId: projectId,
                branchId: branchId
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
                hashTag: branchInfo || '#1234567890',
                lastCommiter: 'petike',
                lastCommitTime: new Date()
            },
            isSelected: false,
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
                            id: 'createBranch',
                            label: 'Create branch',
                            iconClass: 'glyphicon glyphicon-plus',
//                            disabled: true,
                            action: createBranch,
                            actionData: {
                                projectId: projectId,
                                branchId: branchId,
                                branchInfo: branchInfo
                            }
                        },
                        deleteBranchItem,
                        mergeBranchItem,
                        {
                            id: 'exportBranch',
                            label: 'Export branch',
                            iconClass: 'glyphicon glyphicon-export',
                            action: exportBranch,
                            actionData: {
                                projectId: projectId,
                                branchId: branchId
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

        for (i = 0; i < self.projects[projectId].menu.length; i += 1) {

            // find the branches id in the menu items
            if (self.projects[projectId].menu[i].id === 'branches') {

                // convert indexed branches to an array
                self.projects[projectId].menu[i].items = self.mapToArray(self.projects[projectId].branches,
                    [{key: 'name'}]);
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
                        {key: 'modifiedAt', reverse: true}, {key: 'name'}, {key: 'id'}]);
                    break;
                }
            }

            if (projectId === self.gmeClient.getActiveProjectId()) {
                self.selectProject({}); // redundant, we reload the entire page in postDelete
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
                    self.projects[projectId].menu[i].items = self.mapToArray(self.projects[projectId].branches);
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

            if (self.gmeClient) {
                if (projectId !== self.gmeClient.getActiveProjectId()) {
                    self.gmeClient.selectProject(projectId, null, function (err) {
                        if (err) {
                            self.logger.error(err);
                            callback(err);
                            return;
                        }
                        WebGMEGlobal.State.registerActiveObject(CONSTANTS.PROJECT_ROOT_ID);
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

                if (self.gmeClient) {
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
                hashTag: branchInfo || '#1234567890',
                lastCommiter: 'petike',
                lastCommitTime: new Date()
            };

            this.update();
        } else {
            this.logger.warn('project or branch is not in the list yet: ', projectId, branchId, branchInfo);
        }
    };

    ProjectNavigatorController.prototype.dummyProjectsGenerator = function (name, maxCount) {
        var self = this,
            i,
            id,
            count,
            rights;

        count = Math.max(Math.round(Math.random() * maxCount), 3);

        for (i = 0; i < count; i += 1) {
            id = name + '_' + i;
            rights = {
                read: Math.random() > 0.2,
                write: false,
                delete: false
            };

            if (rights.read) {
                rights.write = Math.random() > 0.3;
                if (rights.write) {
                    rights.delete = Math.random() > 0.3;
                }
            }

            self.addProject(id, rights, {});
        }
    };


    ProjectNavigatorController.prototype.dummyBranchGenerator = function (name, maxCount, projectId) {
        var self = this,
            i,
            id,
            count;

        count = Math.max(Math.round(Math.random() * maxCount), 3);

        for (i = 0; i < count; i += 1) {
            id = name + '_' + i;
            self.addBranch(projectId, id);
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
                key;

            for (i = 0; i < orderBy.length; i += 1) {
                key = orderBy[i].key;
                reverse = orderBy[i].reverse === true ? -1 : 1;
                if (a.hasOwnProperty(key) && b.hasOwnProperty(key)) {
                    if (a[key] > b[key]) {
                        return 1 * reverse;
                    }
                    if (a[key] < b[key]) {
                        return -1 * reverse;
                    }
                }
            }

            // a must be equal to b
            return 0;
        });

        return values;
    };

    return ProjectNavigatorController;
});
