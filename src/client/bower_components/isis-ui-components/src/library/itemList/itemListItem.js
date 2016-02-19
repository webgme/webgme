/*globals angular*/
'use strict';

require('./itemStats.js');
require('./itemMenu.js');
require('./itemDetails.js');
require('./itemHeader.js');

angular.module(
    'isis.ui.itemList.item', [
        'isis.ui.itemList.item.stats',
        'isis.ui.itemList.item.menu',
        'isis.ui.itemList.item.details',
        'isis.ui.itemList.item.header'
    ]
)
    .directive(
        'itemListItem',
        function () {

            return {
                restrict: 'E',
                replace: true,
                templateUrl: '/isis-ui-components/templates/itemListItem.html',
                link: function(scope, element) {

                    var onDragStart,
                        onDragEnd,
                        itemId = scope.item.id;

                    onDragStart = function(e) {

                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text', itemId);

                        element.addClass('dragged');

                        if (typeof scope.config.onItemDragStart === 'function') {
                            scope.config.onItemDragStart(e, scope.item);
                        } 

                    };

                    onDragEnd = function(e) {

                        element.removeClass('dragged');                        

                        if (typeof scope.config.onItemDragEnd === 'function') {
                            scope.config.onItemDragEnd(e, scope.item);
                        }                         

                    };

                    if (typeof scope.config.onItemDragEnd === 'function' && typeof scope.config.onItemDragStart === 'function') {

                        element[0].classList.add('draggable');
                        element[0].setAttribute('draggable', 'true');

                        element[0].addEventListener('dragstart', onDragStart);
                        element[0].addEventListener('dragend', onDragEnd);

                    }

                    scope.$on('$destroy', function() {

                        if (scope.config.itemDraggable) {

                            element[0].removeEventListener('dragstart', onDragStart);
                            element[0].removeEventListener('dragend', onDragEnd);

                        }

                    });

                }
            };
        }
);