/*globals angular*/
'use strict';

angular.module(
    'isis.ui.itemList.newItem', []
)
    .directive(
        'itemListNewItem',
        function () {

            return {
                restrict: 'E',
                replace: true,
                templateUrl: '/isis-ui-components/templates/itemListNewItem.html',
                require: '^itemList',
                compile: function () {

                    return {

                        pre: function (scope, el, attr, itemListCtl) {

                            if (angular.isObject(scope.config) && angular.isObject(scope.config
                                .newItemForm)) {

                                scope.config.newItemForm.controller = scope.config.newItemForm.controller ||
                                    function () {
                                        return itemListCtl;
                                };

                                scope.formConfig = scope.config.newItemForm;

                                scope.toggleNewItemFormCollapsed = function () {

                                    scope.formConfig.expanded = !scope.formConfig.expanded;

                                };

                            }
                        }

                    };
                }
            };
        });