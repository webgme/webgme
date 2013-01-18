"use strict";

define([], function () {

    var MetaDesignerControlDEBUG,
        DEBUG_CONNECTION_TYPE = "CONNECTION";

    MetaDesignerControlDEBUG = function () {
    };

    MetaDesignerControlDEBUG.prototype._addMetaDebugModeExtensions = function () {
        var self = this;

        this.logger.warning("MetaDesignerControlDEBUG _addDebugModeExtensions activated...");

        /*********** OVERRIDE NON-DEBUG HANDLERS ***************/

        this.designerCanvas._onCreateNewConnection = this.designerCanvas.onCreateNewConnection;
        this.designerCanvas.onCreateNewConnection = function (params) {
            var src = self.componentsMapRev[params.src],
                dst = self.componentsMapRev[params.dst],
                desc;

            if (DEBUG && (self._debugItemIDs.indexOf(src) !== -1 || self._debugItemIDs.indexOf(dst) !== -1)) {

                desc =  self._generateObjectDescriptorDEBUG(-1, DEBUG_CONNECTION_TYPE);

                desc.source = src;
                desc.target = dst;

                desc.type =  params.metaInfo.type;

                self._dispatchCreateEvent([desc.id]);

            } else {
                self.designerCanvas._onCreateNewConnection(params);
            }
        };

        /*********/
    };

    return MetaDesignerControlDEBUG;
});
