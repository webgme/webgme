/*globals console, angular*/
'use strict';

var demoApp = angular.module('isis.ui.hierarchicalMenu.demo', [
    'isis.ui.hierarchicalMenu'
]);

demoApp.controller('HierarchicalMenuDemoController', function ($scope, $interval) {

    var menu,
        menuItemDisabledAndEnabled;

    menuItemDisabledAndEnabled = {
        id: 'menuItemDisabledAndEnabled',
        disabled: true,
        label: 'Disabled by default',
        iconClass: 'glyphicon glyphicon-remove',
        action: function () {
            console.log('menuItemDisabledAndEnabled clicked');
        },
        actionData: {}
    };

    menu = [{
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
        }, {
            id: 'importProject_disabled',
            disabled: true,
            label: 'Import project (disabled)...',
            iconClass: 'glyphicon glyphicon-import',
            action: function () {
                console.log('Import project disabled clicked');
            },
            actionData: {}
        },
        menuItemDisabledAndEnabled]
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
                            label: 'Sub preferences 1',
                            action: function () {
                                console.log('This should work');
                            }
                        }, {
                            id: 'sub_preferences 2',
                            label: 'Sub preferences 2',
                            action: function () {
                                console.log('This should work');
                            }
                        }]
                    }]
                }, {
                    id: 'preferences 3 (disabled)',
                    label: 'Preferences 3 (disabled)',
                    disabled: true,
                    menu: [{
                        items: [{
                            id: 'sub_preferences 1 (disabled)',
                            label: 'Sub preferences 1 (disabled)',
                            action: function () {
                                console.log('This should not work');
                            }
                        }, {
                            id: 'sub_preferences 2 (disabled)',
                            label: 'Sub preferences 2 (disabled)',
                            action: function () {
                                console.log('This should not work');
                            }
                        }]
                    }]
                }]
            }]
        }]
    }];

    $scope.menu = menu;


    $interval(function () {
        // emulate that this menu item will be changed from the code through async functions.
        menuItemDisabledAndEnabled.disabled = !menuItemDisabledAndEnabled.disabled;
        if (menuItemDisabledAndEnabled.disabled) {
            menuItemDisabledAndEnabled.iconClass = 'glyphicon glyphicon-remove';
        } else {
            menuItemDisabledAndEnabled.iconClass = 'glyphicon glyphicon-ok';
        }
    }, 2000);
});