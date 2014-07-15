/*globals define, angular, alert*/

/**
 * @author lattmann / https://github.com/lattmann
 * @author nabana / https://github.com/nabana
 */

define([
    'angular',
    'text!./templates/ProjectBreadcrumb.html',
    'css!./styles/ProjectBreadcrumb.css'
], function(
    ng,
    template ){

    "use strict";

    var ProjectBreadcrumb = function() {

    };

    angular.module(
        'gme.ui.projectBreadcrumb', []
    ).controller(
        'ProjectBreadcrumbController',
        function($scope) {
            $scope.navigatorItems = {

                items: {
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
        }
    ).directive(
        'projectBreadcrumb',
         function() {

             console.log('ehhhhhh');

             return {
                 restrict: 'EA',
                 controller: 'ProjectBreadcrumbController',
                 replace: true,
                 template: template
             };
    });


});