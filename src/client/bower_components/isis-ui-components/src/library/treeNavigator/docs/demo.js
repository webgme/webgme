/*globals angular*/
'use strict';

require('ngDragDrop');

var demoApp = angular.module('isis.ui.treeNavigator.demo', [
    'isis.ui.treeNavigator',
    'ang-drag-drop'
]);

demoApp.controller('TreeNavigatorDemoController', function($scope, $log, $q, $timeout) {

    var config,
        treeNodes = {},

        addNode,
        removeNode,
        getNodeContextmenu,
        dummyTreeDataGenerator,
        sortChildren;

    getNodeContextmenu = function(node) {

        var defaultNodeContextmenu = [{
            items: [{
                id: 'create',
                label: 'Create new',
                disabled: true,
                iconClass: 'fa fa-plus',
                menu: []
            }, {
                id: 'dummy',
                label: 'Just for test ' + node.id,

                actionData: node,

                action: function(data) {
                    $log.log('testing ', data);
                }

            }, {
                id: 'rename',
                label: 'Rename'
            }, {
                id: 'delete',
                label: 'Delete',
                iconClass: 'fa fa-minus',
                actionData: {
                    id: node.id
                },
                action: function(data) {
                    removeNode(data.id);
                }
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
                        action: function(data) {
                            $log.log('testing2 ', data);
                        }
                    }]
                }]
            }]
        }];

        return defaultNodeContextmenu;

    };

    dummyTreeDataGenerator = function(treeNode, name, maxCount, levels, idOffset) {
        var i,
            id,
            count,
            childNode;

        levels = levels || 0;

        count = maxCount;

        for (i = 0; i < count; i += 1) {
            id = name + (i + (idOffset || 0));

            childNode = addNode(treeNode, id, i);

            if (levels > 0) {
                dummyTreeDataGenerator(childNode, id + '.', maxCount, levels - 1);
            }
        }

        return treeNode.children;

    };

    addNode = function(parentTreeNode, id, i) {
        var newTreeNode,
            children = [];


        // node structure
        newTreeNode = {
            label: id,
            extraInfo: 'Extra info',
            children: children,
            childrenCount: 0,
            nodeData: {},
            iconClass: 'fa fa-file-o',

            draggable: true,
            dragChannel: 'a',
            dropChannel: (Math.random() > 0.5) ? 'a' : 'b',
            order: i
        };

        newTreeNode.id = id;

        // add the new node to the map
        treeNodes[newTreeNode.id] = newTreeNode;


        if (parentTreeNode) {
            // if a parent was given add the new node as a child node
            parentTreeNode.iconClass = undefined;
            parentTreeNode.children.push(newTreeNode);


            parentTreeNode.childrenCount = parentTreeNode.children.length;

            if (newTreeNode.childrenCount === 0) {
                newTreeNode.childrenCount = 5000;
            }


            if (newTreeNode.childrenCount) {
                newTreeNode.iconClass = undefined;
            }

            sortChildren(parentTreeNode.children);

            newTreeNode.parentId = parentTreeNode.id;
        } else {

            // if no parent is given replace the current root node with this node
            $scope.treeData = newTreeNode;
            $scope.treeData.unCollapsible = true;
            newTreeNode.parentId = null;
        }

        return newTreeNode;
    };

    removeNode = function(id) {
        var
            parentNode,
            nodeToDelete = treeNodes[id];

        $log.debug('Removing a node ' + id);

        if (nodeToDelete) {
            if (nodeToDelete.parentId !== null && treeNodes[nodeToDelete.parentId] !==
                undefined) {
                // find parent node
                parentNode = treeNodes[nodeToDelete.parentId];

                // remove nodeToDelete from parent node's children
                parentNode.children = parentNode.children.filter(function(el) {
                    return el.id !== id;
                });

                parentNode.childrenCount = parentNode.children.length;

                if (parentNode.childrenCount === 0) {
                    parentNode.iconClass = 'fa fa-file-o';
                }
            }

            delete treeNodes[id];
        }

    };

    sortChildren = function(values) {
        var orderBy = ['label', 'id'];

        values.sort(function(a, b) {
            var i,
                key,
                result;

            for (i = 0; i < orderBy.length; i += 1) {
                key = orderBy[i];
                if (a.hasOwnProperty(key) && b.hasOwnProperty(key)) {
                    result = a[key].toLowerCase()
                        .localeCompare(b[key].toLowerCase());
                    if (result !== 0) {
                        return result;
                    }
                }
            }

            // a must be equal to b
            return 0;
        });

        return values;
    };

    config = {

        //folderIconClass: 'glyphicon glyphicon-folder-close',

        scopeMenu: [{
                items: [{
                    id: 'project',
                    label: 'Project Hierarchy',
                    action: function() {
                        $scope.config.state.activeScope = 'project';
                        $scope.config.selectedScope = $scope.config.scopeMenu[0].items[0];
                    }
                }, {
                    id: 'composition',
                    label: 'Composition',
                    action: function() {
                        $scope.config.state.activeScope = 'composition';
                        $scope.config.selectedScope = $scope.config.scopeMenu[0].items[1];
                    }
                }]
            }

        ],

        preferencesMenu: [{
            items: [{
                    id: 'preferences 1',
                    label: 'Preferences 1'
                },

                {
                    id: 'preferences 2',
                    label: 'Preferences 2'
                },

                {
                    id: 'preferences 3',
                    label: 'Preferences 3',
                    menu: [{
                        items: [{
                            id: 'sub_preferences 1',
                            label: 'Sub preferences 1'
                        }, {
                            id: 'sub_preferences 2',
                            label: 'Sub preferences 2',
                            action: function(data) {
                                $log.log(data);
                            }
                        }]
                    }]
                }
            ]
        }],

        showRootLabel: true,

        // Tree Event callbacks

        nodeClick: function(e, node) {
            console.log('Node was clicked:', node);
        },

        nodeDragStart: function(e, node) {
            console.log('Node is beibg dragged:', node);
        },

        nodeDragEnd: function(e, node) {
            console.log('Node is not dragged anymore:', node);
        },

        nodeDblclick: function(e, node) {
            console.log('Node was double-clicked:', node);
        },

        nodeContextmenuRenderer: function(e, node) {
            console.log('Contextmenu was triggered for node:', node);

            return getNodeContextmenu(node);

        },

        nodeExpanderClick: function(e, node, isExpand) {
            console.log('Expander was clicked for node:', node, isExpand);
        },

        pagination: {
            itemsPerPage: 10
        },

        loadChildren: function(e, node, count, isBackpaging) {
            var deferred = $q.defer();

            console.log('--loading children');

            $timeout(function() {

                    var dummyParent = {
                            children: []
                        },
                        newChildren,
                        offset;

                    if (!isBackpaging) {

                        if (!isNaN(node.lastLoadedChildPosition)) {
                            offset = node.lastLoadedChildPosition + 1;
                        } else {
                            offset = 0;
                        }

                    } else {

                        offset = node.firstLoadedChildPosition - count;

                    }

                    newChildren = dummyTreeDataGenerator(dummyParent, 'Async ' + node.id,
                        count || 20, 0, offset);
                    deferred.resolve(newChildren);
                },
                500
            );

            return deferred.promise;
        }

    };

    $scope.config = config;
    //$scope.config.disableManualSelection = true;
    $scope.config.selectedScope = $scope.config.scopeMenu[0].items[0];
    $scope.config.nodeClassGetter = function(node) {
        var nodeCssClass = '';

        if (node.order % 2 === 0) {
            nodeCssClass = 'even';
        }

        return nodeCssClass;
    };
    $scope.treeData = {};
    $scope.config.state = {
        // id of activeNode
        activeNode: 'Node item 0.0',

        // ids of selected nodes
        selectedNodes: ['Node item 0.0'],

        expandedNodes: ['Node item 0', 'Node item 0.0'],

        // id of active scope
        activeScope: 'project'
    };


    addNode(null, 'ROOT');
    dummyTreeDataGenerator($scope.treeData, 'Node item ', 1, 1);

});
