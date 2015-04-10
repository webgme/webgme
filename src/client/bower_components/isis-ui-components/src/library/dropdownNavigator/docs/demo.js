/*globals console, angular*/
'use strict';

var demoApp = angular.module('isis.ui.dropdownNavigator.demo', ['isis.ui.dropdownNavigator']);

demoApp.controller('DropdownDemoController', function ($scope) {
    var firstMenu,
        secondMenu;

    firstMenu = {
        id: 'root',
        label: 'GME',
        //            isSelected: true,
        itemClass: 'gme-root',
        menu: []
    };

    secondMenu = {
        id: 'secondItem',
        label: 'Projects',
        menu: []
    };

    firstMenu.menu = [{
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


    secondMenu = {
        id: 'secondItem',
        label: 'Projects',
        menu: []
    };

    secondMenu.menu = [{
        id: 'secondMenuMenu',
        items: [

            {
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
            }
        ]
    }];

    $scope.navigator = {
        items: [
            firstMenu,
            secondMenu
        ],
        separator: true
    };


});