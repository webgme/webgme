/*globals define, angular, alert*/

/**
 * @author lattmann / https://github.com/lattmann
 * @author nabana / https://github.com/nabana
 */

define([
    'angular',
    'text!./templates/GMENavigator.html',
    'css!./styles/GMENavigator.css'
], function(
    ng,
    template ){

    "use strict";

    var GMENavigatorController = function ($scope, gmeClient) {

        var self = this;

        self.$scope = $scope;
        self.gmeClient = gmeClient;

        self.initialize();

    };

    GMENavigatorController.prototype.update = function () {
        if (!this.$scope.$$phase) {
            this.$scope.$apply();
        }
    };

    GMENavigatorController.prototype.initialize = function () {
        var self = this;

        // initialize model structure
        self.$scope.items = {};

        if (self.gmeClient) {
            self.initWithClient();
        } else {
            self.initTestData();
        }
    };

    GMENavigatorController.prototype.initTestData = function () {
        var self = this,

            exportBranch,
            showHistory,
            createTag,
            generateMetaJSAPI,

            dummyProjectsGenerator,
            dummyBranchGenerator,
            allItems,

            selectedProject,
            selectedBranch;

            // Function handlers
            exportBranch = function (data) {
                console.log('Export branch' + JSON.stringify(data));
            };

            showHistory = function(data) {
                console.log('Show history' + JSON.stringify(data));
            };

            createTag = function(data) {
                console.log('Create tag' + JSON.stringify(data));
            };

            generateMetaJSAPI = function(data) {
                console.log('Generate META JS API ' + JSON.stringify(data));
            };

            dummyBranchGenerator = function(name, maxCount, projectId, isSelectedProject) {
                var i,
                    id,
                    branches = [],
                    count,
                    selectedItem;

                count = Math.max( Math.round( Math.random() * maxCount ), 3 );
                selectedItem = Math.floor( Math.random() * count );

                for (i=0; i < count; i++) {

                    id = name + '_' + i;

                    branches.push({
                        id: id,
                        label: id,
                        isSelected: i === selectedItem,
                        properties: {
                            hashTag: '34535435',
                            lastCommiter: 'petike',
                            lastCommitTime: new Date()
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
                                            project: projectId,
                                            branchId: id
                                        }
                                    },
                                    {
                                        id: 'createTag',
                                        label: 'Create tag',
                                        iconClass: 'glyphicon glyphicon-tag',
                                        action: createTag,
                                        actionData: {
                                            project: projectId,
                                            branchId: id
                                        }
                                    }
                                ]

                            }
                        ]

                    });

                    if (i === selectedItem && isSelectedProject === true) {
                        selectedBranch = branches[ i ];
                    }
                }

                return branches;

            };

            dummyProjectsGenerator = function(name, maxCount) {
                var i,
                    id,
                    projects = [],
                    count,
                    exportProject,
                    selectedItem;

                count = Math.max( Math.round( Math.random() * maxCount ), 3 );
                selectedItem = Math.floor( Math.random() * count );

                for (i=0; i < count; i++) {

                    id = name + '_' + i;

                    projects.push({
                        id: id,
                        label: id,
                        isSelected: i === selectedItem,
                        menu: [
                            {
                                items: [
                                    {
                                        id: 'showHistory',
                                        label: 'Show history',
                                        iconClass: 'glyphicon glyphicon-time',
                                        action: showHistory,
                                        actionData: {
                                            project: id
                                        }
                                    }

                                ]
                            },
                            {
                                items: [
                                    {
                                        id: 'displayMetaEntries',
                                        label: 'Display META Entries',
                                        action: showHistory,
                                        actionData: {
                                            project: id
                                        }
                                    },
                                    {
                                        id: 'generateMetaJSAPI',
                                        label: 'Generate META JS API',
                                        action: generateMetaJSAPI,
                                        actionData: {
                                            project: id
                                        }
                                    }

                                ]
                            },
                            {
                                items: dummyBranchGenerator( 'Branch', 10, id, i === selectedItem),
                                showAllItems: function() { console.log('Show all items...'); }
                            }
                        ]
                    });

                    if (i === selectedItem) {
                        selectedProject = projects[ i ];
                    }
                }

                return projects;

            };


        allItems =  {

            root: {
                id: 'root',
                label: 'GME',
                isSelected: true,
                itemClass: 'gme-root',
                menu: [
                    {
                        items: dummyProjectsGenerator( 'Project', 10),
                        showAllItems: function() { console.log('Show all items...'); }
                    },
                    {
                        items: [
                            {
                            id: 'showPreferences',
                            label: 'Show preferences',
                            action: function() { console.log('Show preferences'); },
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
                        }]

                    }
                ]

            }

        };

        self.$scope.navigator = {
            items: [
                allItems.root,
                selectedProject,
                selectedBranch
            ],
            separator: true
        };

        console.log(self.$scope.items);

        self.update();

    };

    GMENavigatorController.prototype.initWithClient = function () {
        var self = this,
            len;

        self.$scope.items = {

            root: {
                id: 'root',
                name: 'GME',
                isSelected: true,
                iconClass: 'gme-navi-icon',
                topActions: [
                    {
                        id: 'createProject',
                        label: 'Create new project',
                        iconClass: 'fa fa-add',
                        action: function () {
                            alert('Create new project');
                        }
                    },
                    {

                        id: 'importProject',
                        label: 'Import project',
                        action: function () {
                            alert('Import project');
                        }
                }],
                items: {}
            }
        };

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

                    var branches =  self.$scope.items.root.items[self.gmeClient.getActiveProjectName()].items;
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
                            action: function () { alert('TODO: implement export project using client...'); }
                        }
                    }
                };
            }


            self.update();
        });



        // TODO: register function handlers
    };


    angular.module(
        'gme.ui.gmeNavigator', []
    ).controller(
        'GMENavigator', GMENavigatorController
    ).directive(
        'gmeNavigator',
         function($compile) {

             return {

                 //scope: { items: '=' },

                 restrict: 'E',
                 controller: 'GMENavigator',
                 replace: true,
                 template: template

             };
    });


});