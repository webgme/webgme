/*globals define, angular, alert*/

/**
 * @author lattmann / https://github.com/lattmann
 * @author nabana / https://github.com/nabana
 */

define([
    'angular',
    'text!./templates/HierarchicalDropdown.html',
    'css!./styles/hierarchicalDropdown.css'
], function(
    ng,
    template ){

    "use strict";

    angular.module(
        'isis.ui.hierarchicalDropdown', []
    ).directive(
        'hierarchicalDropdown',
         function () {

             return {
                 scope: { menu: '=' },
                 restrict: 'E',
                 replace: true,
                 template: template

             };
    });


});