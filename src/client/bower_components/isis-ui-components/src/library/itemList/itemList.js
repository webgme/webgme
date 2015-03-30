/*globals angular*/
'use strict';

require('./listItemGroup.js');
require('./itemListFilter.js');
require('./itemListNewItem.js');
require('../contextmenu/contextmenu.js');

angular.module(
    'isis.ui.itemList', [
        'isis.ui.itemList.newItem',
        'isis.ui.itemList.filter',
        'isis.ui.itemList.itemGroup',
        'isis.ui.contextmenu',
        'isis.ui.taxonomyTerms'
    ]
)
    .controller(
        'ItemListController', function ($scope) {

            // Event handlers

            $scope.sortableOptions = {
                update: function (e, ui) {

                    if (angular.isFunction($scope.config.itemSort)) {
                        $scope.config.itemSort(event, ui);
                    }

                },
                axis: 'y'
            };

            $scope.itemClick = function ($event, item) {

                if (angular.isFunction($scope.config.itemClick)) {
                    $scope.config.itemClick($event, item);
                }
            };

            $scope.itemContextmenu = function ($event, node) {

                if (angular.isFunction($scope.config.itemContextmenuRenderer)) {
                    $scope.itemContextMenuData = $scope.config.itemContextmenuRenderer($event,
                        node);
                }

            };

            $scope.itemMenuConfig = {
                triggerEvent: 'click',
                position: 'left bottom'
            };

            $scope.config = $scope.config || {};
            $scope.config.noItemsMessage = $scope.config.noItemsMessage || 'No items to show.';

        })

.directive(
    'itemList',
    function () {

        return {
            scope: {
                listData: '=',
                config: '='
            },
            restrict: 'E',
            replace: true,
            templateUrl: '/isis-ui-components/templates/itemList.html',
            controller: 'ItemListController'
        };
    }
);