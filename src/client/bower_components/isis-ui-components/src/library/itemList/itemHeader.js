/*globals angular*/
'use strict';

angular.module(
    'isis.ui.itemList.item.header', []
)
    .directive(

        'ilItemHeader',

        function () {

            return {
                restrict: 'E',
                replace: true,
                require: '^itemList',
                templateUrl: '/isis-ui-components/templates/itemHeader.html'
                // link: function(scope, element) {

                //     var onDragStart,
                //         onDragEnd,
                //         itemId = scope.item.id;

                //     onDragStart = function(e) {

                //         e.dataTransfer.effectAllowed = 'move';
                //         e.dataTransfer.setData('text', itemId);

                //         element.addClass('dragged');

                //         if (typeof scope.config.onItemDragStart === 'function') {
                //             scope.config.onItemDragStart(e, scope.item);
                //         } 

                //     };

                //     onDragEnd = function(e) {

                //         element.removeClass('dragged');                        

                //         if (typeof scope.config.onItemDragEnd === 'function') {
                //             scope.config.onItemDragEnd(e, scope.item);
                //         }                         

                //     };

                //     if (scope.config.itemDraggable) {

                //         console.log(element[0]);

                //         element[0].addEventListener('dragstart', onDragStart);
                //         element[0].addEventListener('dragend', onDragEnd);

                //     }

                //     scope.$on('$destroy', function() {

                //         if (scope.config.itemDraggable) {

                //             element[0].removeEventListener('dragstart', onDragStart);
                //             element[0].removeEventListener('dragend', onDragEnd);

                //         }

                //     });

                // }
            };


        });