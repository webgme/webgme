/*globals angular*/
/*jshint -W018 */

'use strict';

require('./treeNavigator.node.js');
require('../helpers/angular-recursion.js');

angular.module(
    'isis.ui.treeNavigator.nodeList', [
        'isis.ui.treeNavigator.node',
        'isis.ui.RecursionHelper'
    ]
)
    .directive(
        'treeNavigatorNodeList', function (ISISRecursionHelper) {

            function NodeListController() {

                var self = this;

                self.isPageable = function () {

                    var result;

                    result = !! (Array.isArray(self.nodes) &&
                        (self.parentNode.childrenCount > self.nodes.length) &&
                        (self.treeCtrl.config.pagination && !isNaN(self.treeCtrl.config.pagination
                            .itemsPerPage)));


                    //console.log('Pageable ' + self.parentNode.label, result);

                    return result;
                };


                self.showPageUp = function () {
                    //console.log('First loaded child ' + self.parentNode.label, self.parentNode.firstLoadedChildPosition);
                    //console.log('showPageUp', !(self.parentNode.firstLoadedChildPosition > 0));
                    return ( !! self.parentNode.firstLoadedChildPosition > 0);
                };


                self.showPageDown = function () {

                    var result = !! (self.parentNode.childrenCount > self.parentNode.lastLoadedChildPosition + 1);

                    //console.log('Last loaded child ' + self.parentNode.label, self.parentNode.lastLoadedChildPosition);
                    //console.log('showPageDown', result);

                    return result;
                };

                self.pageUp = function ($event) {
                    self.treeCtrl.loadSomeChildrenForNode($event, self.parentNode, true);
                };

                self.pageDown = function ($event) {
                    self.treeCtrl.loadSomeChildrenForNode($event, self.parentNode);
                };

                self.getLoadMoreText = function () {
                    return (this.config && this.config.loadMoreText) || '';
                };


                self.init = function() {

                    if (self.nodes && self.nodes.length === 0) {
                        self.treeCtrl.loadSomeChildrenForNode(null, self.parentNode);
                    }
                    
                };
                
            }

            function link(scope, element, attr, controllers) {

                var nodeListCtrl = controllers[1];

                nodeListCtrl.treeCtrl = controllers[0];

                nodeListCtrl.init();

            }

            return {
                scope: {
                    nodes: '=',
                    parentNode: '='
                },
                controller: NodeListController,
                controllerAs: 'ctrl',
                bindToController: true,
                require: ['^treeNavigator', '^treeNavigatorNodeList'],
                restrict: 'E',
                replace: true,
                templateUrl: '/isis-ui-components/templates/treeNavigator.nodeList.html',
                compile: function (element) {
                    return ISISRecursionHelper.compile(element, link);
                }

            };
        }
);