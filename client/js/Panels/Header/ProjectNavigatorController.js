/*globals define*/
/**
 * @author nabana / https://github.com/nabana
 * @author lattmann / https://github.com/lattmann
 */

define([], function () {
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
            isSelected: true,
            itemClass: 'gme-root',
            menu: []
        };

        // navigation items in the nagivator list
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
        var self = this;

        // initialize model structure
        self.$scope.navigator = {
            items: [],
            separator: true
        };

        if (self.gmeClient) {
            self.initWithClient();
        } else {
            self.initTestData();
        }
    };

    ProjectNavigatorController.prototype.initTestData = function () {
        var self = this;

        // TODO: factor out to a createRoot function
        self.root.menu = [
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

        self.dummyProjectsGenerator('Project', 10);

        // only root is selected
        self.$scope.navigator = {
            items: [
                self.root
            ],
            separator: true
        };

        console.log(self.$scope.items);

        self.update();

    };

    ProjectNavigatorController.prototype.initWithClient = function () {
        var self = this,
            len;

        self.gmeClient.addEventListener("PROJECT_OPENED", function (c, projectId) {
            var id;

            // TODO: update project list first
            for (id in self.$scope.items.root.items) {
                if (id === projectId) {
                    self.$scope.items.root.items[id].isSelected = true;
                } else {
                    self.$scope.items.root.items[id].isSelected = false;
                }
            }

            self.update();
        });

        self.gmeClient.addEventListener("PROJECT_CLOESED", function (c, projectId) {

            // TODO: update project list first
            self.$scope.items.root.items[projectId].isSelected = false;

            self.update();
        });

        self.gmeClient.addEventListener("BRANCH_CHANGED", function (c, branchId) {
            var id,
                project;

            // TODO: replace this to ids
            if (self.gmeClient.getActiveProjectName() || self.gmeClient.getActiveProjectName() === '') {
                self.$scope.items.root.items[self.gmeClient.getActiveProjectName()].items = {};
                self.$scope.items.root.items[self.gmeClient.getActiveProjectName()].isSelected = true;

                self.gmeClient.getBranchesAsync(function (err, branchList) {
                    if (err) {
                        console.error(err);
                        return;
                    }

                    var branches = self.$scope.items.root.items[self.gmeClient.getActiveProjectName()].items;
                    len = branchList.length;

                    while (len--) {
                        branches[branchList[len].name] = {
                            id: branchList[len].name,
                            name: branchList[len].name,
                            isSelected: self.gmeClient.getActualBranch() === branchList[len].name,
                            properties: {
                                hash: branchList[len].hash
                                //lastCommiter: 'petike',
                                //lastCommitTime: new Date()
                            }
                        };
                    }


                    project = self.$scope.items.root.items[self.gmeClient.getActiveProjectName()];

                    // TODO: update project list first and branch list
                    for (id in project.items) {
                        if (id === branchId) {
                            project.items[id].isSelected = true;
                        } else {
                            project.items[id].isSelected = false;
                        }
                    }

                    self.update();

                });
            }
        });


        self.gmeClient.getFullProjectListAsync(function (err, fullList) {
            var i,
                id,
                name;

            if (err) {
                console.error(err);
                return;
            }

            self.$scope.items.root.items = {};

            for (id in fullList) {
//                id = id;
                name = id;
                // TODO: factor this function out to addProject
                self.$scope.items.root.items[id] = {
                    id: id,
                    name: name,
                    items: {},
                    actions: {
                        exportProject: {
                            label: 'Export',
                            iconClass: 'glyphicon glyphicon-export',
                            action: function () {
                                alert('TODO: implement export project using client...');
                            }
                        }
                    }
                };
            }


            self.update();
        });


        // TODO: register function handlers
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
                console.error('showHistory: gmeClient version is not implemented yet.', data);
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
            console.error('TODO: get all branches for: ' + projectId);
        } else {
            self.dummyBranchGenerator('Branch', 10, projectId)
        }

        for (i = 0; i < self.root.menu.length; i += 1) {
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
            createTag;

        if (self.gmeClient) {
            exportBranch = function (data) {
                console.error('exportBranch: gmeClient version is not implemented yet.', data);
            };

            createTag = function (data) {
                console.error('createTag: gmeClient version is not implemented yet.', data);
            };
        } else {
            // test version
            exportBranch = function (data) {
                console.log('exportBranch: ', data);
            };

            exportBranch = function (data) {
                console.log('createTag: ', data);
            };
        }

        selectBranch = function (data) {
            self.selectBranch(data);
        };

        self.projects[projectId].branches[branchId] = {
            id: branchId,
            label: branchId,
            //isSelected: i === selectedItem,
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
                            id: 'createTag',
                            label: 'Create tag',
                            iconClass: 'glyphicon glyphicon-tag',
                            action: createTag,
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
            if (self.projects[projectId].menu[i].section === 'branches') {
                // convert indexed branches to an array
                self.projects[projectId].menu[i].items = self.mapToArray(self.projects[projectId].branches);
                break;
            }
        }

        self.update();
    };

    ProjectNavigatorController.prototype.selectProject = function (data) {
        this.selectBranch(data);
    };

    ProjectNavigatorController.prototype.selectBranch = function (data) {
        var self = this,
            projectId = data.projectId,
            branchId = data.branchId;

        if (projectId || projectId === '') {
            // FIXME: what if projects do not contain projectId anymore?
            self.$scope.navigator.items[self.navIdProject] = self.projects[projectId];
            if (branchId || branchId === '') {
                self.$scope.navigator.items[self.navIdBranch] = self.projects[projectId].branches[branchId];
            } else {
                // remove branch element
                self.$scope.navigator.items.splice(self.navIdBranch, 1);
            }
        } else {
            // remove project and branch elements
            self.$scope.navigator.items.splice(self.navIdProject, 2);
        }

        self.update();
    };

    ProjectNavigatorController.prototype.dummyProjectsGenerator = function (name, maxCount) {
        var self = this,
            i,
            id,
            count,
            selectedItem;

        count = Math.max(Math.round(Math.random() * maxCount), 3);

        for (i = 0; i < count; i++) {

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
