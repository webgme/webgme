/*globals define, console*/
/**
 * @author nabana / https://github.com/nabana
 * @author lattmann / https://github.com/lattmann
 */

define([
    'js/Dialogs/Projects/ProjectsDialog',
    'js/Dialogs/Commit/CommitDialog',
    'js/Dialogs/ProjectRepository/ProjectRepositoryDialog'], function (
    ProjectsDialog,
    CommitDialog,
    ProjectRepositoryDialog
) {
    "use strict";

    var ProjectNavigatorController = function ($scope, gmeClient) {

        var self = this;

        self.$scope = $scope;
        self.gmeClient = gmeClient;

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

        self.initialize();
    };

    ProjectNavigatorController.prototype.update = function () {
        if (!this.$scope.$$phase) {
            this.$scope.$apply();
        }
    };

    ProjectNavigatorController.prototype.initialize = function () {
        var self = this,
            newProject;

        // initialize model structure for view
        self.$scope.navigator = {
            items: [],
            separator: true
        };

        if (self.gmeClient) {
            self.initWithClient();

            newProject = function (data) {
                var pd = new ProjectsDialog(self.gmeClient);
                pd.show();
            };

        } else {
            self.initTestData();

            newProject = function (data) {
                self.addProject('New project ' + Math.floor(Math.random() * 10000));
            };
        }

        // initialize root menu
        // projects section is mandatory
        self.root.menu = [
            {
                section: 'top',
                items: [
                    {
                        id: 'newProkect',
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
                section: 'projects',
                items: [],
                showAllItems: function () {
                    console.log('Show all items...');
                }
            },
            {
                section: 'preferences',
                items: [
                    {
                        id: 'showPreferences',
                        label: 'Show preferences',
                        action: function () {
                            console.log('Show preferences');
                        },
                        menu: [
                            {
                                items: [
                                    {
                                        id: 'preferences 1',
                                        label: 'Preferences 1'
                                    },
                                    {
                                        id: 'preferences 2',
                                        label: 'Preferences 2'
                                    },
                                    {
                                        id: 'preferences 3',
                                        label: 'Preferences 3',
                                        menu: [
                                            {
                                                items: [
                                                    {
                                                        id: 'sub_preferences 1',
                                                        label: 'Sub preferences 1'
                                                    },
                                                    {
                                                        id: 'sub_preferences 2',
                                                        label: 'Sub preferences 2'
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]

            }
        ];

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

        self.dummyProjectsGenerator('Project', 10);

        // debug
        console.log(self.$scope.items);

        self.update();
    };

    ProjectNavigatorController.prototype.initWithClient = function () {
        var self = this;

        // register all event listeners on gmeClient
        self.gmeClient.addEventListener("PROJECT_OPENED", function (client, projectId) {
            self.selectProject({projectId: projectId});
            self.updateBranchList(projectId);
        });

        self.gmeClient.addEventListener("PROJECT_CLOESED", function (client, projectId) {
            self.selectProject({});
        });

        self.gmeClient.addEventListener("BRANCH_CHANGED", function (client, branchId) {
            self.selectBranch({projectId: self.gmeClient.getActiveProjectName(), branchId: branchId});
        });

        // get project list
        self.updateProjectList();
    };

    ProjectNavigatorController.prototype.updateProjectList = function () {
        var self = this;

        // FIXME: get read=only/viewable/available project?!
        self.gmeClient.getFullProjectListAsync(function (err, projectList) {
            var projectId;

            if (err) {
                console.error(err);
                return;
            }

            // clear project list
            self.projects = {};

            for (projectId in projectList) {
                if (projectList.hasOwnProperty(projectId)) {
                    self.addProject(projectId);
                }
            }
        });
    };

    ProjectNavigatorController.prototype.updateBranchList = function (projectId) {
        var self = this,
            i;

        if (projectId === self.gmeClient.getActiveProjectName()) {
            // FIXME: can we get branches for the a given project???
            self.gmeClient.getBranchesAsync(function (err, branchList) {
                if (err) {
                    console.error(err);
                    return;
                }

                // clear branches list
                self.projects[projectId].branches = [];

                for (i = 0; i < branchList.length; i += 1) {
                    self.addBranch(projectId, branchList[i].name);
                }
            });
        }
    };

    ProjectNavigatorController.prototype.addProject = function (projectId) {
        var self = this,
            i,
            showHistory,
            showMETAEntries,
            generateMetaJSAPI,
            showAllBranches,
            selectProject;

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
                        };

                        var dialog = new ProjectRepositoryDialog(self.gmeClient);
                        dialog.show();
                    });
                }
            };

            showMETAEntries = function (data) {
                console.error('showMETAEntries: gmeClient version is not implemented yet.', data);
            };

            generateMetaJSAPI = function (data) {
                console.error('generateMetaJSAPI: gmeClient version is not implemented yet.', data);
            };

            showAllBranches = function (data) {
                console.error('showAllBranches: gmeClient version is not implemented yet.', data);
            };
        } else {
            // test version
            showHistory = function (data) {
                console.log('showHistory: ', data);
            };

            showMETAEntries = function (data) {
                console.log('showMETAEntries: ', data);
            };

            generateMetaJSAPI = function (data) {
                console.log('generateMetaJSAPI: ', data);
            };

            showAllBranches = function (data) {
                console.log('showAllBranches: ', data);
            };
        }

        selectProject = function (data) {
            self.selectProject(data);
        };

        // create a new project object
        self.projects[projectId] = {
            id: projectId,
            label: projectId,
            //isSelected: i === selectedItem,
            branches: {},
            action: selectProject,
            actionData: {
                projectId: projectId
            },
            menu: [
                {
                    section: 'top',
                    items: [
                        {
                            id: 'showHistory',
                            label: 'Show history',
                            iconClass: 'glyphicon glyphicon-time',
                            action: showHistory,
                            actionData: {
                                projectId: projectId
                            }
                        }

                    ]
                },
                {
                    section: 'middle',
                    items: [
                        {
                            id: 'displayMetaEntries',
                            label: 'Display META Entries',
                            action: showMETAEntries,
                            actionData: {
                                projectId: projectId
                            }
                        },
                        {
                            id: 'generateMetaJSAPI',
                            label: 'Generate META JS API',
                            action: generateMetaJSAPI,
                            actionData: {
                                projectId: projectId
                            }
                        }

                    ]
                },
                {
                    section: 'branches',
                    items: [],
                    showAllItems: showAllBranches
                }
            ]
        };

        if (self.gmeClient) {
            self.updateBranchList(projectId);
        } else {
            self.dummyBranchGenerator('Branch', 10, projectId);
        }

        for (i = 0; i < self.root.menu.length; i += 1) {

            // find the projects section in the menu items
            if (self.root.menu[i].section === 'projects') {

                // convert indexed projects to an array
                self.root.menu[i].items = self.mapToArray(self.projects);
                break;
            }
        }

        self.update();
    };

    ProjectNavigatorController.prototype.addBranch = function (projectId, branchId) {
        var self = this,
            i,
            selectBranch,
            exportBranch,
            createCommitMessage;

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
                    console.error('Failed to get project dump url for ', data);
                }
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
                console.log('exportBranch: ', data);
            };

            createCommitMessage = function (data) {
                console.log('createCommitMessage: ', data);
            };
        }

        selectBranch = function (data) {
            self.selectBranch(data);
        };

        // create the new branch structure
        self.projects[projectId].branches[branchId] = {
            id: branchId,
            label: branchId,
            properties: {
                hashTag: '34535435',
                lastCommiter: 'petike',
                lastCommitTime: new Date()
            },
            action: selectBranch,
            actionData: {
                projectId: projectId,
                branchId: branchId
            },
            //itemTemplate: 'branch-selector-template',
            menu: [
                {
                    items: [
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

        for (i = 0; i < self.projects[projectId].menu.length; i += 1) {

            // find the branches section in the menu items
            if (self.projects[projectId].menu[i].section === 'branches') {

                // convert indexed branches to an array
                self.projects[projectId].menu[i].items = self.mapToArray(self.projects[projectId].branches);
                break;
            }
        }

        self.update();
    };

    ProjectNavigatorController.prototype.selectProject = function (data, callback) {
        this.selectBranch(data, callback);
    };

    ProjectNavigatorController.prototype.selectBranch = function (data, callback) {
        var self = this,
            projectId = data.projectId,
            branchId = data.branchId;

        callback = callback || function () {};

        if (projectId || projectId === '') {
            // FIXME: what if projects do not contain projectId anymore?
            self.$scope.navigator.items[self.navIdProject] = self.projects[projectId];

            if (self.gmeClient) {
                if (projectId !== self.gmeClient.getActiveProjectName()) {
                    self.gmeClient.selectProjectAsync(projectId, function (err) {
                        if (err) {
                            console.log(err);
                            callback(err);
                            return;
                        }

                        if (branchId !== self.gmeClient.getActualBranch()) {
                            self.gmeClient.selectBranchAsync(branchId, function (err) {
                                if (err) {
                                    console.log(err);
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
                // set selected branch
                self.$scope.navigator.items[self.navIdBranch] = self.projects[projectId].branches[branchId];

                if (self.gmeClient) {
                    if (branchId !== self.gmeClient.getActualBranch()) {
                        self.gmeClient.selectBranchAsync(branchId, function (err) {
                            if (err) {
                                console.log(err);
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

    ProjectNavigatorController.prototype.dummyProjectsGenerator = function (name, maxCount) {
        var self = this,
            i,
            id,
            count;

        count = Math.max(Math.round(Math.random() * maxCount), 3);

        for (i = 0; i < count; i += 1) {
            id = name + '_' + i;
            self.addProject(id);
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

    ProjectNavigatorController.prototype.mapToArray = function (hashMap) {
        var keys = Object.keys(hashMap),
            values = keys.map(function (v) { return hashMap[v]; });

        return values;
    };

    return ProjectNavigatorController;
});
