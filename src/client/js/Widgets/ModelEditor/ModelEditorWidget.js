/*globals define, $, _*/
/*jshint browser: true, camelcase: false*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/DragDrop/DragHelper',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget'
], function (DragHelper, DiagramDesignerWidget) {

    'use strict';

    var ModelEditorWidget;

    ModelEditorWidget = function (container, params) {
        params = params || {};
        params.loggerName = 'gme:Widgets:ModelEditor:ModelEditorWidget';

        params.tabsEnabled = true;
        params.addTabs = false;
        params.deleteTabs = false;
        params.reorderTabs = false;

        DiagramDesignerWidget.call(this, container, params);

        this.logger.debug('ModelEditorWidget ctor');
    };

    _.extend(ModelEditorWidget.prototype, DiagramDesignerWidget.prototype);

    ModelEditorWidget.prototype._afterManagersInitialized = function () {
        //turn on open btn
        this.enableOpenButton(true);
    };

    ModelEditorWidget.prototype.getDragEffects = function (selectedElements, event) {
        var ctrlKey = event.ctrlKey || event.metaKey,
            altKey = event.altKey,
            shiftKey = event.shiftKey,
            effects = DiagramDesignerWidget.prototype.getDragEffects.apply(this, [selectedElements, event]);

        //ALT_KEY --> DRAG_CREATE_INSTANCE
        if (!ctrlKey && altKey && !shiftKey) {
            effects = [DragHelper.DRAG_EFFECTS.DRAG_CREATE_INSTANCE];
        } else if (!ctrlKey && !altKey && shiftKey) {
            effects = [DragHelper.DRAG_EFFECTS.DRAG_CREATE_POINTER];
        }

        return effects;
    };

    /* OVERWRITE DiagramDesignerWidget.prototype._dragHelper */
    ModelEditorWidget.prototype._dragHelper = function (el, event, dragInfo) {
        var helperEl = DiagramDesignerWidget.prototype._dragHelper.apply(this, [el, event, dragInfo]),
            dragEffects = DragHelper.getDragEffects(dragInfo);

        if (dragEffects.length === 1) {
            if (dragEffects[0] === DragHelper.DRAG_EFFECTS.DRAG_CREATE_INSTANCE) {
                helperEl.html($('<i class="glyphicon glyphicon-share-alt"></i>')).append(' Create instance...');
            } else if (dragEffects[0] === DragHelper.DRAG_EFFECTS.DRAG_CREATE_POINTER) {
                helperEl.html($('<i class="glyphicon glyphicon-share"></i>')).append(' Create pointer...');
            }
        }

        return helperEl;
    };

    return ModelEditorWidget;
});