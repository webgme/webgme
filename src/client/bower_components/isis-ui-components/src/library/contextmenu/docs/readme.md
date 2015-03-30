`isisContextmenu` is a directive for displaying contextual-menu-like call-outs. Attach it as an attribute on triggering object.

Use the following attributes along:

 * `contextmenuConfig` - {object} configuration options:
    - `triggerEvent` - {string} the DOM event triggering appearance
    - `contentTemplateUrl` - {string} url of template for content. Uses a `hierarchical-menu` as default.
    - `position` - {string} mouse coordinates by default but with this option you can override menu position to `'left bottom'` or `'right bottom'` of triggering element
    - `menuCssClass` - {string} applied to the contextmenu shell element
 * `contextmenuData` - {object} data passed to shell directive in template. By default, specify a menu structure for `hierarchical-menu`.
 * `contextmenu-disabled` - {function} if set, will be evaluated before showing menu
 * `contextmenu` - {function} callback function called before menu is instantiated
 * `menuParentScope` - {object} – the menu's scope is inherited from this. By default this is the triggering directive's scope.
 * `doNotAutocloseOnClick` - {boolean}, false by default

It also registers the `contextmenuService` for opening and closing menus manually. Exposed methods:

 * `open` with arguments:
    - triggerElement, contentTemplateUrl, aScope, position, doNotAutocloseOnClick
 * `close` - no arguments