/*globals console, angular*/

'use strict';

var demoApp = angular.module('isis.ui.contextmenu.demo', ['isis.ui.contextmenu']);

demoApp.controller('ContextmenuCustomTemplateController', function ($scope, contextmenuService) {
    $scope.parameter = {};

    $scope.closeClick = function () {
        console.log('closing this manually');
        contextmenuService.close();
    };

    $scope.isValid = function (num) {
        console.log('Who knows if is valid?', num);

        if (parseInt(num, 10) === 4) {
            $scope.parameter.invalid = false;
        } else {
            $scope.parameter.invalid = true;
        }
    };

});

demoApp.controller('ContextmenuDemoController', function ($scope) {

    var menuData = [{
        id: 'top',
        items: [{
            id: 'newProject',
            label: 'New project ...',
            iconClass: 'glyphicon glyphicon-plus',
            action: function () {
                console.log('New project clicked');
            },
            actionData: {}
        }, {
            id: 'importProject',
            label: 'Import project ...',
            iconClass: 'glyphicon glyphicon-import',
            action: function () {
                console.log('Import project clicked');
            },
            actionData: {}
        }]
    }, {
        id: 'projects',
        label: 'Recent projects',
        totalItems: 20,
        items: [],
        showAllItems: function () {
            console.log('Recent projects clicked');
        }
    }, {
        id: 'preferences',
        label: 'preferences',
        items: [{
            id: 'showPreferences',
            label: 'Show preferences',
            action: function () {
                console.log('Show preferences');
            },
            menu: [{
                items: [{
                    id: 'preferences 1',
                    label: 'Preferences 1'
                }, {
                    id: 'preferences 2',
                    label: 'Preferences 2'
                }, {
                    id: 'preferences 3',
                    label: 'Preferences 3',
                    menu: [{
                        items: [{
                            id: 'sub_preferences 1',
                            label: 'Sub preferences 1'
                        }, {
                            id: 'sub_preferences 2',
                            label: 'Sub preferences 2'
                        }]
                    }]
                }]
            }]
        }]
    }];

    $scope.menuConfig1 = {
        triggerEvent: 'click',
        position: 'right bottom'
    };

    $scope.menuConfig2 = {
        triggerEvent: 'mouseover',
        position: 'left bottom',
        contentTemplateUrl: 'contextmenu-custom-content.html',
        doNotAutoClose: true,
        menuCssClass: 'green-shadow'
    };

    $scope.menuData = menuData;

    $scope.preContextMenu = function (e) {
        console.log('In preContextMenu ', e);
    };


});