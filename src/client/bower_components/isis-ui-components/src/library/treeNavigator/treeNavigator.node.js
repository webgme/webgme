/*globals angular*/

'use strict';

require('./treeNavigator.node.label.js');

angular.module(
        'isis.ui.treeNavigator.node', [
            'isis.ui.treeNavigator.node.label'
        ]
    )
    .directive(
        'treeNavigatorNode',
        function() {

            function NodeController() {

                var self;

                self = this;


                self.isExpanded = function() {
                    return (self.treeCtrl.config.state.expandedNodes.indexOf(self.node.id) > -1);
                };

                self.isSelected = function() {
                    return (self.treeCtrl.config.state.selectedNodes.indexOf(self.node.id) > -1);
                };


                this.getClass = function() {
                    var cssClassStr = '';

                    if (self.isExpanded()) {
                        cssClassStr += 'expanded';
                    }

                    if (self.treeCtrl.config.state.activeNode === self.node.id) {
                        cssClassStr += ' active-node';
                    }

                    if (self.isSelected()) {
                        cssClassStr += ' selected-node';
                    }

                    if (self.node.loading) {
                        cssClassStr += ' loading';
                    }

                    if (angular.isFunction(self.treeCtrl.config.nodeClassGetter)) {
                        cssClassStr += ' ' + self.treeCtrl.config.nodeClassGetter(self.node);
                    }

                    return cssClassStr;
                };

            }

            return {
                scope: {
                    node: '='
                },
                controller: NodeController,
                controllerAs: 'ctrl',
                bindToController: true,
                require: ['^treeNavigatorNodeList', '^treeNavigator', 'treeNavigatorNode'],
                restrict: 'E',
                replace: true,
                templateUrl: '/isis-ui-components/templates/treeNavigator.node.html',
                link: function(scope, element, attributes, controllers) {

                    var nodeCtrl,
                        nodeListCtrl,
                        treeCtrl;


                    treeCtrl = controllers[1];
                    nodeListCtrl = controllers[0];
                    nodeCtrl = controllers[2];

                    nodeCtrl.parentListCtrl = nodeListCtrl;
                    nodeCtrl.treeCtrl = treeCtrl;

                }
            };
        }
    );
