`itemList` renders content as a list-group with extra options. Depends on jQuery UI (not bundled) if sortable option used.
It requires `list-data` and `config` attributes.

`list-data` should be an object with an `items` array member representing the content items to render. Items can have
the following properties:

* `id`: {string},
* `title`: {string},
* `cssClass`: {string},
* `toolTip`: {string},
* `description`: {string},
* `lastUpdated`: {Object}:
    - time:{Date},
    - user: {string}.
* `stats`: {Array of Objects with following properties}:
    - value:{string},
    - toolTip: {string},
    - iconClass: {string}.
* `details`: {string},
* `headerTemplateUrl`: {string},
* `detailsTemplateUrl`: {string},
* `taxonomyTerms`: {Array of objects with the following properties}:
    - id: {string}
    - name: {string}
    - url: {string}

The following options are allowed in `config`:

* `sortable`: {boolean}, defaults to true,
* `onItemDragStart` and `onItemDragEnd`: {function}, if both these callbacks are set, items are draggable. Will not work if sortable is turned on.
* `secondaryItemMenu`:  {boolean}, defaults to true, controls if context menu should be offered as drop-down in top right corner,
* `detailsCollapsible`: {true},
* `showDetailsLabel`: {string}, default: "Show details",
* `hideDetailsLabel`: {string}, default: "Hide details",
* `newItemForm`: {Object} with the following properties (if not set not add new item control is not displayed):
    - title: {string},
    - itemTemplateUrl: {string},
    - expanded: {boolean},
    - controller: {function},
* `filter`: {Object}, if set a filter input is displayed.
* `noItemsMessage`: {string} message to show when list is empty, default message says: "No items to show."

Events exposed to callbacks in `config`:

* `itemSort`: {function ( jQEvent, ui )},
* `itemClick`: {function(event, node)},
* `itemContextmenuRenderer`: {function(event, node)},
* `detailsRenderer`: {function ( item )}.