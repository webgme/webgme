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

    DesignerCanvas.prototype.deleteConnection = function (id) {
        var idx,
            endId;

        //keep up accounting
        this._deletedConnectionIDs.push(id);

        //remove connection from source list
        endId = this.connectionEndIDs[id].source;
        idx = this.connectionIDbyEndID[endId].indexOf(id);
        if (idx !== -1) {
            this.connectionIDbyEndID[endId].splice(idx, 1);
        }

        //remove connection from target list
        endId = this.connectionEndIDs[id].target;
        idx = this.connectionIDbyEndID[endId].indexOf(id);
        if (idx !== -1) {
            this.connectionIDbyEndID[endId].splice(idx, 1);
        }

        //remove connection from connection endpoint list
        delete this.connectionEndIDs[id];

        //remove ID from connection ID list
        idx = this.connectionIds.indexOf(id);
        this.connectionIds.splice(idx, 1);

        //get rid of the connection itself
        this.items[id].destroy();
        delete this.items[id];
    };

    return DesignerCanvas;
});
