"use strict";

define(['js/DragDrop/DragHelper',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget'], function (DragHelper,
                                                             DiagramDesignerWidget) {

    var ModelEditorWidget;

    ModelEditorWidget = function (container, params) {
        params = params || {};
        params.loggerName = "ModelEditorWidget";

        DiagramDesignerWidget.call(this, container, params);

        this.logger.debug("ModelEditorWidget ctor");
    };

    _.extend(ModelEditorWidget.prototype, DiagramDesignerWidget.prototype);


    ModelEditorWidget.prototype.getDragEffects = function (selectedElements, event) {
        var ctrlKey = event.ctrlKey || event.metaKey,
            altKey = event.altKey,
            effects = DiagramDesignerWidget.prototype.getDragEffects.apply(this, [selectedElements, event]);

        //ALT_KEY --> copy_2
        if (!ctrlKey && altKey) {
            effects = [DragHelper.DRAG_EFFECTS.DRAG_CREATE_INSTANCE];
        }

        return effects;
    };

    /* OVERWRITE DiagramDesignerWidget.prototype._dragHelper */
    ModelEditorWidget.prototype._dragHelper = function (el, event, dragInfo) {
        var helperEl = DiagramDesignerWidget.prototype._dragHelper.apply(this, [el, event, dragInfo]),
            dragEffects = DragHelper.getDragEffects(dragInfo);

        if (dragEffects.length === 1) {
            if (dragEffects[0] === DragHelper.DRAG_EFFECTS.DRAG_CREATE_INSTANCE) {
                helperEl.html($('<i class="icon-share-alt"></i>'));
            }
        }

        return helperEl;
    };

    return ModelEditorWidget;
});