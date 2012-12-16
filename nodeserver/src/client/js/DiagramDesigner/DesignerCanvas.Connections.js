"use strict";

define(['js/DiagramDesigner/Connection'], function (Connection) {

    var DesignerCanvas;

    DesignerCanvas = function () {

    };

    DesignerCanvas.prototype.createConnection = function (objDescriptor) {
        var connectionId = objDescriptor.id,
            sourceId = objDescriptor.source,
            targetId = objDescriptor.target,
            newComponent;

        this.logger.debug("Creating connection component with parameters: " + JSON.stringify(objDescriptor));

        objDescriptor.designerCanvas = this;

        this.connectionIds.push(connectionId);

        //add to accounting queues for performance optimization
        this._insertedConnectionIDs.push(connectionId);

        //accounting connection info
        this.connectionEndIDs[connectionId] = {"source": sourceId,
                                              "target": targetId };

        this.connectionIDbyEndID[sourceId] = this.connectionIDbyEndID[sourceId] || [];
        this.connectionIDbyEndID[sourceId].push(connectionId);

        this.connectionIDbyEndID[targetId] = this.connectionIDbyEndID[targetId] || [];
        this.connectionIDbyEndID[targetId].push(connectionId);

        newComponent = this.items[connectionId] = new Connection(connectionId);
        newComponent._initialize(objDescriptor);

        return newComponent;
    };

    return DesignerCanvas;
});
