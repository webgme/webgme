/*globals define, angular, WebGMEGlobal*/
/**
 * @author nabana / https://github.com/nabana
 * @author lattmann / https://github.com/lattmann
 */

define([
    'js/logger',
    'angular',
    'js/Dialogs/Projects/ProjectsDialog',
    'js/Dialogs/Commit/CommitDialog',
    'js/Dialogs/ProjectRepository/ProjectRepositoryDialog',

    'isis-ui-components/simpleDialog/simpleDialog',

    'text!js/Dialogs/Projects/templates/DeleteDialogTemplate.html'


], function (Logger, ng, ProjectsDialog, CommitDialog, ProjectRepositoryDialog, ConfirmDialog, DeleteDialogTemplate) {
    "use strict";


    angular.module('gme.ui.ProjectNavigator', []).run(function ($templateCache) {
        $templateCache.put('DeleteDialogTemplate.html', DeleteDialogTemplate);
    });


    var ProjectNavigatorController = function ($scope, gmeClient, $simpleDialog, $timeout, $window) {

        var self = this;
        self.logger = Logger.create('gme:Panels:Header:ProjectNavigatorController', WebGMEGlobal.gmeConfig.client.log);
        self.$scope = $scope;
        self.$window = $window;
        self.gmeClient = gmeClient;
        self.$simpleDialog = $simpleDialog;
        self.$timeout = $timeout;

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

        self.initialize();
    };

    ProjectNavigatorController.prototype.update = function () {
        if (!this.$scope.$$phase) {
            this.$scope.$apply();
        }
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
            manageProjects = newProject = function (data) {
                var pd = new ProjectsDialog(self.gmeClient);
                pd.show();
            };

        } else {
            newProject = function (data) {
                self.dummyProjectsGenerator('New Project ' + Math.floor(Math.random() * 10000), 4);
            };

            manageProjects = function (data) {
                self.dummyProjectsGenerator('Manage projects ' + Math.floor(Math.random() * 10000), 4);
            };
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
                        actionData: {}
                    },
                    {
                        id: 'importProject',
                        label: 'Import project ...',
                        iconClass: 'glyphicon glyphicon-import',
                        action: newProject,
                        actionData: {}
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
        } else {
            self.initTestData();
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

        // register all event listeners on gmeClient

        self.gmeClient.addEventListener(self.gmeClient.events.NETWORKSTATUS_CHANGED, function (client) {
            if (self.gmeClient.getActualNetworkStatus() === self.gmeClient.networkStates.CONNECTED) {
                // get project list
                self.updateProjectList();
            } else {
                // get project list
                self.logger.warn(self.gmeClient.getActualNetworkStatus() + " network status is not handled yet.");
            }

        });

        self.gmeClient.addEventListener(self.gmeClient.events.PROJECT_OPENED, function (client, projectId) {
            self.logger.debug(self.gmeClient.events.PROJECT_OPENED, projectId);
            self.selectProject({projectId: projectId});
        });

        self.gmeClient.addEventListener(self.gmeClient.events.PROJECT_CLOSED, function (client, projectId) {
            self.logger.debug(self.gmeClient.events.PROJECT_CLOSED, projectId);
            self.selectProject({});
        });

        self.gmeClient.addEventListener(self.gmeClient.events.SERVER_PROJECT_CREATED, function (client, projectId) {
            self.logger.debug(self.gmeClient.events.SERVER_PROJECT_CREATED, projectId);
            self.addProject(projectId);
        });

        self.gmeClient.addEventListener(self.gmeClient.events.SERVER_PROJECT_DELETED, function (client, projectId) {
            self.logger.debug(self.gmeClient.events.SERVER_PROJECT_DELETED, projectId);
            self.removeProject(projectId);
        });

        self.gmeClient.addEventListener(self.gmeClient.events.BRANCH_CHANGED, function (client, branchId) {
            self.logger.debug(self.gmeClient.events.BRANCH_CHANGED, branchId);
            self.selectBranch({projectId: self.gmeClient.getActiveProjectName(), branchId: branchId});
        });

        self.gmeClient.addEventListener(self.gmeClient.events.SERVER_BRANCH_CREATED, function (client, parameters) {
            self.logger.debug(self.gmeClient.events.SERVER_BRANCH_CREATED, parameters);
            self.addBranch(parameters.project, parameters.branch, parameters.commit);
        });

        self.gmeClient.addEventListener(self.gmeClient.events.SERVER_BRANCH_UPDATED, function (client, parameters) {
            self.logger.debug(self.gmeClient.events.SERVER_BRANCH_UPDATED, parameters);
            self.updateBranch(parameters.project, parameters.branch, parameters.commit);
        });

        self.gmeClient.addEventListener(self.gmeClient.events.SERVER_BRANCH_DELETED, function (client, parameters) {
            var currentProject = self.$scope.navigator.items[self.navIdProject],
                currentBranch = self.$scope.navigator.items[self.navIdBranch];
            self.logger.debug(self.gmeClient.events.SERVER_BRANCH_DELETED, parameters);

            self.removeBranch(parameters.project, parameters.branch);

            if (currentBranch === parameters.branch && currentProject === parameters.project) {
                self.selectProject(parameters.project);
            }

        });

        angular.element(self.$window).on('keydown', function (e) {

            if ((e.metaKey || e.ctrlKey)) {

                if (e.keyCode === 90) {

                    //TODO we should block UI until undo/redo is done
                    if (e.shiftKey) {
                        self.$timeout(function () {
                            self.gmeClient.redo(self.gmeClient.getActualBranch(), function (err) {
                            });
                        });
                    } else {
                        self.$timeout(function () {
                            self.gmeClient.undo(self.gmeClient.getActualBranch(), function (err) {
                            });

                        });
                    }

                }
            }
        });

        self.gmeClient.addEventListener(self.gmeClient.events.UNDO_AVAILABLE, function (client, parameters) {
            self.logger.debug(self.gmeClient.events.UNDO_AVAILABLE, parameters);
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
        self.gmeClient.addEventListener(self.gmeClient.events.REDO_AVAILABLE, function (client, parameters) {
            self.logger.debug(self.gmeClient.events.REDO_AVAILABLE, parameters);
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
        var self = this;
        self.logger.debug('updateProjectList');
        // FIXME: get read=only/viewable/available project?!
        self.gmeClient.getFullProjectsInfoAsync(function (err, projectList) {
            var projectId,
                branchId;

            if (err) {
                self.logger.error(err);
                return;
            }

            self.logger.debug('getFullProjectsInfoAsync', projectList);

            // clear project list
            self.projects = {};

            for (projectId in projectList) {
                if (projectList.hasOwnProperty(projectId)) {
                    self.addProject(projectId, projectList[projectId].rights);
                    for (branchId in projectList[projectId].branches) {
                        if (projectList[projectId].branches.hasOwnProperty(branchId)) {
                            self.addBranch(projectId, branchId, projectList[projectId].branches[branchId]);
                        }
                    }
                }
            }

            if (self.requestedSelection) {
                self.selectBranch(self.requestedSelection);
                self.requestedSelection = null;
            }
        });
    };

    ProjectNavigatorController.prototype.addProject = function (projectId, rights) {
        var self = this,
            i,
            showHistory,
            showAllBranches,
            deleteProject,
            selectProject,
            refreshPage,
            updateProjectList;

        rights = rights || {
            'delete': true,
            'read': true,
            'write': true
        };

        if (self.gmeClient) {
            showHistory = function (data) {
                var prd;
                if (self.gmeClient.getActiveProjectName() === data.projectId) {
                    prd = new ProjectRepositoryDialog(self.gmeClient);
                    prd.show();
                } else {
                    self.selectProject({projectId: projectId}, function (err) {
                        if (err) {
                            // TODO: handle errors
                            return;
                        }

                        var dialog = new ProjectRepositoryDialog(self.gmeClient);
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

                        var activeProjectId = self.gmeClient.getActiveProjectName();

                        self.gmeClient.deleteProjectAsync(data.projectId, function (err) {
                            if (err) {
                                self.logger.error(err);
                                return;
                            } else {

                                if (data.projectId === activeProjectId) {
                                    refreshPage();
                                }

                            }
                        });
                    },
                    scope: self.$scope
                });

            };

            showAllBranches = function (data) {
                self.logger.error('showAllBranches: gmeClient version is not implemented yet.', data);
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

        // create a new project object
        self.projects[projectId] = {
            id: projectId,
            label: projectId,
            iconClass: rights.write ? '' : 'glyphicon glyphicon-lock',
            iconPullRight: !rights.write,
            disabled: !rights.read,
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
                    items: []
//                    showAllItems: showAllBranches
                }
            ]
        };

        if (!self.gmeClient) {
            self.dummyBranchGenerator('Branch', 10, projectId);
        }

        for (i = 0; i < self.root.menu.length; i += 1) {

            // find the projects id in the menu items
            if (self.root.menu[i].id === 'projects') {

                // convert indexed projects to an array
                self.root.menu[i].items = self.mapToArray(self.projects, ['name', 'id']);
                break;
            }
        }

        self.update();
    };

    ProjectNavigatorController.prototype.addBranch = function (projectId, branchId, branchInfo) {
        var self = this,
            i,
            selectBranch,
            exportBranch,
            createBranch,
            deleteBranch,
            createCommitMessage,

            deleteBranchItem,
            undoLastCommitItem,
            redoLastUndoItem,
            mergeBranchItem;

        if (self.projects[projectId].disabled) {
            // do not show any branches if the project is disabled
            return;
        }

        if (self.gmeClient) {
            exportBranch = function (data) {
                var url = self.gmeClient.getDumpURL({
                    project: data.projectId,
                    branch: data.branchId,
                    output: data.projectId + '_' + data.branchId
                });

                if (url) {
                    window.location = url;
                } else {
                    self.logger.error('Failed to get project dump url for ', data);
                }
            };

            createBranch = function (data) {
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
                        self.gmeClient.deleteGenericBranchAsync(data.projectId,
                            data.branchId,
                            data.branchInfo,
                            function (err) {
                                if (err) {
                                    self.logger.error(err);
                                    return;
                                }
                            });
                    },
                    scope: self.$scope
                });

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
                        //self.selectProject( data ); you cannot delete the actual branch so there is no need for re-selection
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

        undoLastCommitItem = {
            id: 'undoLastCommit',
            label: 'Undo last commit',
            iconClass: 'fa fa-reply',
            disabled: true, // TODO: set this from handler to enable/disable
            action: function (actionData) {
                self.gmeClient.undo(actionData.branchId, function (err) {
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
                self.gmeClient.redo(actionData.branchId, function (err) {
                });
            },
            // Put whatever you need to get passed back above
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
            disabled: false, // TODO: set this from handler to enable/disable
            action: function (actionData) {
                self.mergeBranch(actionData.projectId,
                    actionData.branchId,
                    self.$scope.navigator.items[self.navIdBranch].id);
            },
            // Put whatever you need to get passed back above
            actionData: {
                projectId: projectId,
                branchId: branchId,
                branchInfo: branchInfo
            }
        }
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
                        {
                            id: 'exportBranch',
                            label: 'Export branch',
                            iconClass: 'glyphicon glyphicon-export',
                            action: exportBranch,
                            actionData: {
                                projectId: projectId,
                                branchId: branchId
                            }
                        },
                        mergeBranchItem,
                        {
                            id: 'createCommitMessage',
                            label: 'Create commit message',
                            iconClass: 'glyphicon glyphicon-tag',
                            action: createCommitMessage,
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
        self.projects[projectId].branches[branchId].undoLastCommitItem = undoLastCommitItem;
        self.projects[projectId].branches[branchId].redoLastUndoItem = redoLastUndoItem;
        self.projects[projectId].branches[branchId].mergeBranchItem = mergeBranchItem;

        for (i = 0; i < self.projects[projectId].menu.length; i += 1) {

            // find the branches id in the menu items
            if (self.projects[projectId].menu[i].id === 'branches') {

                // convert indexed branches to an array
                self.projects[projectId].menu[i].items = self.mapToArray(self.projects[projectId].branches,
                    ['name', 'id']);
                break;
            }
        }

        self.update();
    };

    ProjectNavigatorController.prototype.removeProject = function (projectId, callback) {
        var self = this,
            i;

        if (self.projects.hasOwnProperty(projectId)) {
            delete self.projects[projectId];

            for (i = 0; i < self.root.menu.length; i += 1) {

                // find the projects id in the menu items
                if (self.root.menu[i].id === 'projects') {

                    // convert indexed projects to an array
                    self.root.menu[i].items = self.mapToArray(self.projects);
                    break;
                }
            }

            if (projectId === self.gmeClient.getActiveProjectName()) {
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
                if (projectId !== self.gmeClient.getActiveProjectName()) {
                    self.gmeClient.selectProjectAsync(projectId, function (err) {
                        if (err) {
                            self.logger.error(err);
                            callback(err);
                            return;
                        }

                        if (branchId && branchId !== self.gmeClient.getActualBranch()) {
                            self.gmeClient.selectBranchAsync(branchId, function (err) {
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
                    if (branchId !== self.gmeClient.getActualBranch()) {
                        self.gmeClient.selectBranchAsync(branchId, function (err) {
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
        this.projects[projectId].branches[branchId].properties = {
            hashTag: branchInfo || '#1234567890',
            lastCommiter: 'petike',
            lastCommitTime: new Date()
        };
    };

    ProjectNavigatorController.prototype.mergeBranch = function (projectId, whatBranchId, whereBranchId) {
        var url = window.location.origin + "/merge.html?project=" + projectId + "&mine=" +
                  this.projects[projectId].branches[whatBranchId].properties.hashTag + "&theirs=" +
                  this.projects[projectId].branches[whereBranchId].properties.hashTag;
        //TODO probably window.location setting type redirection should be used as that way we could keep the authentication credentials...
        window.open(url);
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
                'read': Math.random() > 0.2,
                'write': false,
                'delete': false
            };

            if (rights.read) {
                rights.write = Math.random() > 0.3;
                if (rights.write) {
                    rights.delete = Math.random() > 0.3;
                }
            }

            self.addProject(id, rights);
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
                key;

            for (i = 0; i < orderBy.length; i += 1) {
                key = orderBy[i];
                if (a.hasOwnProperty(key) && b.hasOwnProperty(key)) {
                    if (a[key] > b[key]) {
                        return 1;
                    }
                    if (a[key] < b[key]) {
                        return -1;
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
