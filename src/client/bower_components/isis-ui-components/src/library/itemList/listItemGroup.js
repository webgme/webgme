/*globals angular*/
'use strict';

require('./itemListItem.js');
require('angular-ui-sortable');

angular.module(
    'isis.ui.itemList.itemGroup', [
        'isis.ui.itemList.item',
        'ui.sortable'
    ]
)
    .directive(
        'listItemGroup',
        function ($compile) {

            return {
                require: '^itemList',
                restrict: 'E',
                replace: true,
                templateUrl: '/isis-ui-components/templates/listItemGroup.html',
                link: function (scope, element) {

                    var listElement = element.find('>ul');

                    if (scope.listData && scope.config && scope.config.sortable === true) {
                        listElement.attr('ui-sortable', 'sortableOptions');
                        element.attr('ng-model', 'listData.items');
                        $compile(element)(scope);
                    }
                }
            };
        });