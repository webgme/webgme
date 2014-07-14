/*globals define, angular*/

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
            $scope.name = 'My Name!';
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



    console.log('ejjj');

//        var gmeApp = angular.module(
//            'gmeApp', [
//                'ngRoute',
//                'routeStyles',
//                'ui.bootstrap',
//                'gme.ui.projectBreadcrumb'
//            ]);
//
//        angular.bootstrap(document, [ 'gmeApp']);


});