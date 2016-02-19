/*globals angular*/
'use strict';

var demoApp = angular.module('isis.ui.itemList.demo', ['isis.ui.itemList']);

demoApp.controller('ListItemDetailsDemoController', function ($scope) {
    $scope.parameter = {};

    $scope.isValid = function (num) {
        console.log('Who knows if is valid?', num);

        if (parseInt(num, 10) === 4) {
            $scope.parameter.invalid = false;
        } else {
            $scope.parameter.invalid = true;
        }
    };


});

demoApp.controller('ListItemDetailsDemoController2', function ($scope) {
    var i,
        items2 = [],
        itemGenerator2,
        config;

    itemGenerator2 = function (id) {

        return {
            id: id,
            title: 'List sub-item ' + id,
            toolTip: 'Open item',
            description: 'This is description here',
            lastUpdated: {
                time: Date.now(),
                user: 'N/A'

            },
            stats: [{
                value: id,
                tooltip: 'Orders',
                iconClass: 'fa fa-cubes'
            }],
            details: 'Some detailed text. Lorem ipsum ama fea rin the poc ketofmyja cket.'
        };
    };


    for (i = 0; i < 20; i++) {
        items2.push(itemGenerator2(i));
    }

    config = {

        sortable: true,
        secondaryItemMenu: true,
        detailsCollapsible: false,
        showDetailsLabel: 'Show details',
        hideDetailsLabel: 'Hide details',

        // Event handlers

        itemSort: function (jQEvent, ui) {
            console.log('Sort happened', jQEvent, ui);
        },

        itemClick: function (event, item) {
            console.log('Clicked: ' + item);
        },

        itemContextmenuRenderer: function (e, item) {
            console.log('Contextmenu was triggered for node:', item);

            return [{
                items: [

                    {
                        id: 'create',
                        label: 'Create new',
                        disabled: true,
                        iconClass: 'fa fa-plus'
                    }
                ]
            }];
        },

        detailsRenderer: function (item) {
            item.details = 'My details are here now!';
        },

        newItemForm: {
            title: 'Create new item',
            itemTemplateUrl: '/library/itemList/docs/newItemTemplate.html',
            expanded: false,
            controller: function ($scope) {
                $scope.createItem = function (newItem) {

                    newItem.url = 'something';
                    newItem.toolTip = newItem.title;

                    items2.push(newItem);

                    $scope.newItem = {};

                    config.newItemForm.expanded = false; // this is how you close the form itself

                };
            }
        }

    };

    $scope.listData2 = {
        items: items2
    };

    $scope.config2 = config;

});

demoApp.directive('demoSubList', function () {
    return {
        restrict: 'E',
        replace: false,
        scope: {
            listData: '=',
            config: '='
        },
        template: '<item-list list-data="listData" config="config" class="col-md-12"></item-list>'
    };
});

demoApp.controller('ItemListDemoController', function ($scope) {


    var
    i,

        items = [],

        itemGenerator,
        getItemContextmenu,
        config;

    itemGenerator = function (id) {

        var lastUpdated;

        if (Math.random() > 0.5) {
            lastUpdated = {
                time: Date.now(),
                user: 'N/A'

            };
        }

        return {
            id: id,
            title: 'List item ' + id,
            cssClass: 'my-item',
            toolTip: 'Open item',
            description: 'This is description here',
            headerTemplateUrl: Math.random() > 0.5 ?
                '/library/itemList/docs/headerTemplate.html' : undefined,
            taxonomyTerms: [{
                id: 'tag1',
                name: 'Tag A',
                url: 'http://vanderbilt.edu'
            }, {
                id: 'tag2',
                name: 'Tag B',
                url: 'http://vanderbilt.edu'
            }],
            lastUpdated: lastUpdated,
            stats: [{
                value: id,
                toolTip: 'Orders',
                iconClass: 'fa fa-cubes'
            }],
            details: 'Some detailed text. Lorem ipsum ama fea rin the poc ketofmyja cket.',
            detailsTemplateUrl: Math.random() < 0.5 ? 'list-item-details.html' : 'list-item-details2.html'
        };
    };


    for (i = 0; i < 20; i++) {
        items.push(itemGenerator(i));
    }

    getItemContextmenu = function (item) {

        var defaultItemContextmenu = [{
            items: [{
                id: 'create',
                label: 'Create new',
                disabled: true,
                iconClass: 'fa fa-plus'
            }, {
                id: 'dummy',
                label: 'Just for test ' + item.id,

                actionData: item,

                action: function (data) {
                    console.log('testing ', data);
                }

            }, {
                id: 'rename',
                label: 'Rename'
            }, {
                id: 'preferences 3',
                label: 'Preferences 3',
                menu: [{
                    items: [{
                        id: 'sub_preferences 1',
                        label: 'Sub preferences 1'
                    }, {
                        id: 'sub_preferences 2',
                        label: 'Sub preferences 2',
                        action: function (data) {
                            console.log('testing2 ', data);
                        }
                    }]
                }]
            }]
        }];

        return defaultItemContextmenu;

    };

    config = {

        //sortable: true,
        onItemDragStart: function(e, item) {
            console.log('Start dragging', item);
        },

        onItemDragEnd: function(e, item) {
            console.log('Finish dragging', item);
        },

        secondaryItemMenu: true,
        detailsCollapsible: true,
        showDetailsLabel: 'Show details',
        hideDetailsLabel: 'Hide details',

        noItemsMessage: 'List is empty.',

        // Event handlers

        itemSort: function (jQEvent, ui) {
            console.log('Sort happened', jQEvent, ui);
        },

        itemClick: function (event, item) {
            console.log('Clicked: ' + item);
        },

        itemContextmenuRenderer: function (e, item) {
            console.log('Contextmenu was triggered for node:', item);

            return getItemContextmenu(item);
        },

        detailsRenderer: function (item) {
            item.details = 'My details are here now!';
        },

        newItemForm: {
            title: 'Create new item',
            itemTemplateUrl: '/library/itemList/docs/newItemTemplate.html',
            expanded: false,
            controller: function ($scope) {
                $scope.createItem = function (newItem) {

                    newItem.url = 'something';
                    newItem.toolTip = newItem.title;

                    items.push(newItem);

                    $scope.newItem = {};

                    config.newItemForm.expanded = false; // this is how you close the form itself

                };
            }
        },

        filter: {}

    };

    $scope.listData = {
        items: items
    };

    $scope.config = config;

});