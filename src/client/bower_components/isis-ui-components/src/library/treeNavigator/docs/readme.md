`treeNavigator` is a tree component directive. It needs the following attributes:

__`treeData`__ - Data to render in a recursive structure with the following node-schema:

  * `label`: {string} label,
  * `extraInfo`: {string} any extra info to display after label (custom template can be set here for whatever content),
  * `children`: {array} array of children after __children got loaded__,
  * `childrenCount`: {int} indicates the number of children (0 if none),
  * `nodeData`: {object} arbitrary data object,
  * `iconClass`: {string} css classes for setting the node icon,
  * `draggable`: {boolean} if node is draggable,
  * `collapsedIconClass`: {string} to overwrite global setting,
  * `expandedIconClass`: {string} to overwrite global setting,
  * `unCollapsible`: {boolean} if true, node can not collapse.

__`config`__ - Object with options and tree state.

Header options:

   * `scopeMenu`: {array} a `hierarchical-menu`-structure to render as scope menu. User has to take care of
   handling actions and any kind of reconfigurations when an item is clicked,
   * `preferencesMenu`: {array} another `hierarchical-menu`-structure for the preferences menu (gear icon).

If `scopeMenu` or `preferencesMenu` is not set, header is not displayed.

Rendering options:

   * `collapsedIconClass`: {string} default: 'icon-arrow-right',
   * `expandedIconClass`: {string} default: 'icon-arrow-down', compile
   * `folderIconClass`: {string} if set, this icon will decorate nodes with children,
   * `showRootLabel`: {boolean} if root node should get displayed. False by default.
   * `nodeClassGetter`: {function(node)}. If specified, it should return a string of CSS class for the given node.
   Make it work fast.
   * `disableManualSelection`: {boolean} set if node is manually selectable (eg. by clicking) or not
   * `extraInfoTemplateUrl`: {string} Url of custom template for extra info.

Event callbacks:

   * `nodeClick`: {function(event, node)},
   * `nodeDblclick`: {function(event, node)},
   * `nodeContextmenuRenderer`: {function(event, node)},
   * `nodeExpanderClick`: {function(event, node, isExpand)},
   * `loadChildren`: {function(event, node)}.

Tree state:

   * `activeNode`: {string} id of active node,
   * `selectedNodes`: {array} of node ids,
   * `expandedNodes`: {array} of node ids
   * `activeScope`: {string} id of active scope