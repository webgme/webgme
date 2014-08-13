/*globals define, angular, alert*/

/**
 * @author lattmann / https://github.com/lattmann
 * @author nabana / https://github.com/nabana
 */

define([
    'angular',
    'text!./templates/dropdownNavigator.html',
    'css!./styles/dropdownNavigator.css',

    './../hierarchicalDropdown/hierarchicalDropdown'

], function(
    ng,
    template ){

    "use strict";

    angular.module(
        'isis.ui.dropdownNavigator',
        [ 'isis.ui.hierarchicalDropdown' ]
    ).directive(
        'dropdownNavigator',
         function () {

             return {
                 scope: { navigator: '=' },
                 restrict: 'E',
                 replace: true,
                 template: template

             };
    });


});
