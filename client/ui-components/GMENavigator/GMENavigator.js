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

    var GMENavigator = function() {

    };

    angular.module(
        'gme.ui.gmeNavigator', []
    ).controller(
        'GMENavigator',
        function($scope) {

            var dummyProjectsGenerator,
                dummyBranchGenerator;

            dummyBranchGenerator = function(name, maxCount) {
                var i,
                    id,
                    branches = {},
                    count;

                count = Math.round( Math.random() * maxCount );

                for (i=0; i < count; i++) {

                    id = name + '_' + i;

                    branches[ id ] =  {
                        id: id,
                        name: id,
                        properties: {
                            hashTag: '34535435',
                            lastCommiter: 'petike',
                            lastCommitTime: new Date()
                        },
                        directive: 'branch-selector'
                    };
                }

                return branches;

            };

            dummyProjectsGenerator = function(name, maxCount) {
                var i,
                    id,
                    projects = {},
                    count,
                    exportProject;

                count = Math.round( Math.random() * maxCount );

                exportProject = function( name ) {
                    return (
                        function() {
                            console.log( 'Export' + name );
                        }
                    );
                };

                for (i=0; i < count; i++) {

                    id = name + '_' + i;

                    projects[ id ] = {
                        id: id,
                        name: id,
                        items: dummyBranchGenerator( 'Branch', 10 ),
                        selectedItem: 'Branch_0',
                        actions: {
                            exportProject: {
                                label: 'Export',
                                iconClass: 'glyphicon glyphicon-export',
                                action: exportProject( id )
                            }
                        }
                    };
                }

                return projects;

            };

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

                    items: dummyProjectsGenerator( 'Project', 20),
                    selectedItem: 'Project_0'
                }

            };
        }
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