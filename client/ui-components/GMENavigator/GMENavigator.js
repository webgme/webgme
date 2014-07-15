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
            createNewProject,
            exportProject;

        // Function handlers
        exportProject = function (id, branch) {
            console.log(JSON.stringify(self.$scope.items.root.items[id].items[branch || 'master']));
        };

        createNewProject = function () {
            self.$scope.items.root.items['new_project'] = {
                id: 'new_project',
                name: 'New project Name',
                items: {
                    'master': {
                        id: 'master',
                        properties: {
                            hashTag: '34535435',
                            lastCommiter: 'petike',
                            lastCommitTime: new Date()
                        },
                        directive: 'branch-selector'
                    }

                },
                actions: {
                    exportProject: {
                        label: 'Export',
                        iconClass: 'glyphicon glyphicon-export',
                        action: exportProject
                    }
                }
            };
        };


        // dummy object structure
        self.$scope.items = {

            root: {
                id: 'root',
                name: 'GME',
                iconClass: 'gme-navi-icon',
                actions: {
                    createProject: {
                        label: 'Create new project',
                        iconClass: 'fa fa-add',
                        action: createNewProject
                    },
                    importProject: {
                        label: 'Import project',
                        action: createNewProject
                    }
                },

                items: {}
            }
        };

        self.update();

    };

    GMENavigatorController.prototype.initWithClient = function () {
        var self = this,
            len;

        self.gmeClient.getFullProjectListAsync(function (err, fullList) {
            var i,
                id,
                name;

            if (err) {
                console.error(err);
                return;
            }

            for (i = 0; i < fullList.length; i += 1) {
                id = fullList[i];
                name = fullList[i];
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
        });

        // TODO: replace this to ids
        if (self.gmeClient.getActiveProjectName() || self.gmeClient.getActiveProjectName() === '') {
            self.$scope.items.root.items[self.gmeClient.getActiveProjectName()].items = {};

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
                        properties: {
                            hash: branchList[len].hash
                            //lastCommiter: 'petike',
                            //lastCommitTime: new Date()
                        }
                    };
                }
            });
        }

        // TODO: register function handlers
    };


    angular.module(
        'gme.ui.gmeNavigator', []
    ).controller(
        'GMENavigator', GMENavigatorController
        /*function($scope) {
            $scope.items = {

                root: {
                    id: 'root',
                    name: 'GME',
                    iconClass: 'gme-navi-icon',
                    actions: {
                        createProject: {
                            label: 'Create new project',
                            iconClass: 'fa fa-add',
                            action: function() { alert('Create new project'); }
                        },
                        importProject: {
                            label: 'Import project',
                            action: function() { alert('Import project'); }
                        }
                    },

                    items: {
                        'test': {
                            id: 'test_project',
                            name: 'Test project Name',
                            items: {
                                'master': {
                                    id: 'master',
                                    properties: {
                                        hashTag: '34535435',
                                        lastCommiter: 'petike',
                                        lastCommitTime: new Date()
                                    },
                                    directive: 'branch-selector'
                                }

                            },
                            actions: {
                                exportProject: {
                                    label: 'Export',
                                    iconClass: 'glyphicon glyphicon-export',
                                    action: function() { alert('Export project'); }
                                }
                            }
                        }
                    }

                }

            };
        }*/
    ).directive(
        'gmeNavigator',
         function($compile) {

             console.log('ehhhhhh');

             return {

                 //scope: { items: '=' },

                 restrict: 'E',
                 controller: 'GMENavigator',
                 replace: true,
                 template: template

             };
    });


});