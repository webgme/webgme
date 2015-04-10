`simpleDialog` is a service for quick creation of confirm dialogs. It is a wrapper around [Bootstrap modals](http://angular-ui.github.io/bootstrap)
and inherits all of its options.

The dialog creation is invoked through the `open(options)` method.

`simpleDialog`-specific options are:

 * `dialogTitle`
 * `dialogContentTemplate` - the body of the dialog. Url or id of Angular-template (eg. if preloaded)
 * `onOk` - callback on OK
 * `onCancel` - callback on Cancel
 * `validator` - a function, if set, invoked when OK is clicked. Needs to return `true` to close dialog and result OK.

`controller` and `template` are used internally. Do not set in options unless you would like to extend default functionality.