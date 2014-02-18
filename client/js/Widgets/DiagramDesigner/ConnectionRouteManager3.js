"use strict";

define(['logManager', './AutoRouter', './Profiler'], function (logManager, AutoRouter, Profiler) {

    var ConnectionRouteManager3,
        DESIGNERITEM_SUBCOMPONENT_SEPARATOR = "_x_";

    ConnectionRouteManager3 = function (options) {
        this.logger = (options && options.logger) || logManager.create(((options && options.loggerName) || "ConnectionRouteManager3"));

        this.diagramDesigner = options ? options.diagramDesigner : null;

        if (this.diagramDesigner === undefined || this.diagramDesigner === null) {
            this.logger.error("Trying to initialize a ConnectionRouteManager3 without a canvas...");
            throw ("ConnectionRouteManager3 can not be created");
        }

        this.autorouter = new AutoRouter();

        this.logger.debug("ConnectionRouteManager3 ctor finished");
    };

    ConnectionRouteManager3.prototype.initialize = function () {
        this._clearGraph();

        //Adding event listeners
        var self = this;

        this._onComponentUpdate = function(_canvas, ID) {//Boxes and lines
            if( self.diagramDesigner.itemIds.indexOf( ID ) !== -1 ){
                if( self.diagramDesigner.items[ID].rotation !== self._autorouterBoxRotation[ID] ) //Item has been rotated
                    self._resizeItem( ID );
            }
       };
        this.diagramDesigner.addEventListener(this.diagramDesigner.events.ON_COMPONENT_UPDATE, this._onComponentUpdate);

        this._onComponentCreate = function(_canvas, ID) {//Boxes and lines
            if( self.diagramDesigner.itemIds.indexOf( ID ) !== -1 ){

                if( self._autorouterBoxes[ID] === undefined )
                    self.insertBox( ID );

            }else if( self.diagramDesigner.connectionIds.indexOf( ID ) !== -1 )
                self.insertConnection( ID );
        };
        this.diagramDesigner.addEventListener(this.diagramDesigner.events.ON_COMPONENT_CREATE, this._onComponentCreate);

        this._onComponentResize = function(_canvas, ID) {
            if( self._autorouterBoxes[ID.ID] )
                self._resizeItem( ID.ID );
            else
                self.insertBox( ID.ID );
        };
        this.diagramDesigner.addEventListener(this.diagramDesigner.events.ITEM_SIZE_CHANGED, this._onComponentResize);

        this._onComponentDelete = function(_canvas, ID) {//Boxes and lines
            self.deleteItem( ID );
        };
        this.diagramDesigner.addEventListener(this.diagramDesigner.events.ON_COMPONENT_DELETE, this._onComponentDelete);
        //ON_UNREGISTER_SUBCOMPONENT

        this._onItemPositionChanged = function(_canvas, eventArgs) {
            if( self._autorouterBoxes[eventArgs.ID] ){
                var x = self.diagramDesigner.items[eventArgs.ID].getBoundingBox().x,
                    y = self.diagramDesigner.items[eventArgs.ID].getBoundingBox().y;

                self.autorouter.move(self._autorouterBoxes[eventArgs.ID].box, { "x": x, "y": y });
            }
        };
        this.diagramDesigner.addEventListener(this.diagramDesigner.events.ITEM_POSITION_CHANGED, this._onItemPositionChanged);

        this._onClear = function(_canvas, eventArgs) {
            self._clearGraph();
        };
        this.diagramDesigner.addEventListener(this.diagramDesigner.events.ON_CLEAR, this._onClear);

    };

    ConnectionRouteManager3.prototype.destroy = function () {
        //removeEventListener(eventName, handler);
        this.diagramDesigner.removeEventListener(this.diagramDesigner.events.ON_COMPONENT_CREATE, this._onComponentCreate);
        this.diagramDesigner.removeEventListener(this.diagramDesigner.events.ON_COMPONENT_UPDATE, this._onComponentUpdate);
        this.diagramDesigner.removeEventListener(this.diagramDesigner.events.ITEM_SIZE_CHANGED, this._onComponentResize);
        this.diagramDesigner.removeEventListener(this.diagramDesigner.events.ON_COMPONENT_DELETE, this._onComponentDelete);
        this.diagramDesigner.removeEventListener(this.diagramDesigner.events.ITEM_POSITION_CHANGED, this._onItemPositionChanged);
        this.diagramDesigner.removeEventListener(this.diagramDesigner.events.ON_CLEAR, this._onClear);
    };

    ConnectionRouteManager3.prototype.redrawConnections = function (idList) {

        if( !this._initialized ){
            this._initializeGraph();
        }else{
            this._refreshConnData(idList);
        }

        //no matter what, we want the id's of all the connections
        //not just the ones that explicitly needs rerouting
        idList = this.diagramDesigner.connectionIds.slice(0);

        var i = idList.length;

        //1 - autoroute
        this.autorouter.autoroute();

        //2 - Get the path points and redraw
        var pathPoints,
            realPathPoints;
        for (i = 0; i < idList.length; i += 1) {
            if( this._autorouterPaths[idList[i]] ){
                pathPoints = this.autorouter.getPathPoints(this._autorouterPaths[idList[i]]);
            }else{
                pathPoints = [];
            }

            realPathPoints = [];
            for(var j = 0; j < pathPoints.length; j++){
                realPathPoints.push({'x': pathPoints[j][0], 'y': pathPoints[j][1] });
            }

            this.diagramDesigner.items[idList[i]].setConnectionRenderData(realPathPoints);
        }

        //need to return the IDs of the connections that was really
        //redrawn or any other visual property changed (width, etc)

        return idList;
    };

    ConnectionRouteManager3.prototype._refreshConnData = function (idList) {
        //Clear connection data and paths then re-add them
        var i = idList.length;

        while(i--){
            this.deleteItem(idList[i]);
            this.insertConnection([idList[i]]);
        }

    };

    ConnectionRouteManager3.prototype._clearGraph = function () {
        this.autorouter.clear();
        this._autorouterBoxes = {};//Define container that will map obj+subID -> box
        this._autorouterPorts = {};//Maps boxIds to an array of port ids that have been mapped
        this._autorouterPaths = {};
        this._autorouterBoxRotation = {};//Define container that will map obj+subID -> rotation
        this.endpointConnectionAreaInfo = {};
        this.initialized = false;
    };

    ConnectionRouteManager3.prototype._initializeGraph = function () {
        /*
         * In this method, we will update the boxes using the canvas.itemIds list and
         * add any ports as needed (from the canvas.connectionIds)
         */
        var canvas = this.diagramDesigner,
            connIdList = canvas.connectionIds,
            itemIdList = canvas.itemIds,
            i = itemIdList.length,
            connId,
            srcObjId,
            srcSubCompId,
            dstObjId,
            dstSubCompId;

        while(i--){
            this.insertBox(itemIdList[i]);
        }

        i = connIdList.length;
        while( i-- ){
            this.insertConnection(connIdList[i]);
        }

        this._initialized = true;

    };

    ConnectionRouteManager3.prototype.insertConnection = function (connId) {
        var canvas = this.diagramDesigner,
            srcObjId = canvas.connectionEndIDs[connId].srcObjId,
            srcSubCompId = canvas.connectionEndIDs[connId].srcSubCompId,
            dstObjId = canvas.connectionEndIDs[connId].dstObjId,
            dstSubCompId = canvas.connectionEndIDs[connId].dstSubCompId,
            sId = srcSubCompId ? srcObjId + DESIGNERITEM_SUBCOMPONENT_SEPARATOR + srcSubCompId : srcObjId,
            tId = dstSubCompId ? dstObjId + DESIGNERITEM_SUBCOMPONENT_SEPARATOR + dstSubCompId : dstObjId,
            connMetaInfo = canvas.items[connId].getMetaInfo(),
            srcConnAreas = canvas.items[srcObjId].getConnectionAreas(srcSubCompId, false, connMetaInfo),
            dstConnAreas = canvas.items[dstObjId].getConnectionAreas(dstSubCompId, true, connMetaInfo),
            srcPorts = {},
            dstPorts = {},
            j;

        this._updatePort(srcObjId, srcSubCompId);//Adding ports for connection
        this._updatePort(dstObjId, dstSubCompId);

        //Get available ports for this connection
        j = srcConnAreas.length;
        while(j--){
            srcPorts[srcConnAreas[j].id] = this._autorouterBoxes[sId].ports[srcConnAreas[j].id];
            //srcPorts.push(this._autorouterBoxes[sId].ports[srcConnAreas[j].id]);
        }
        
        j = dstConnAreas.length;
        while(j--){
            dstPorts[dstConnAreas[j].id] = this._autorouterBoxes[tId].ports[dstConnAreas[j].id];
            //dstPorts.push(this._autorouterBoxes[tId].ports[dstConnAreas[j].id]);
        }

        //If it has both a src and dst
        if( this._autorouterBoxes[sId].ports.length !== 0 && this._autorouterBoxes[tId].ports.length !== 0 ){
            this._autorouterPaths[connId] = this.autorouter.addPath({ "src": srcPorts,
                                                                      "dst": dstPorts });
        }

        //Set custom points, if applicable
        if( canvas.items[connId].segmentPoints.length > 0 ){
            this.autorouter.setPathCustomPoints({
                    "path": this._autorouterPaths[ connId ], 
                    "points": canvas.items[ connId ].segmentPoints
                    });
        }

     };

    ConnectionRouteManager3.prototype.insertBox = function (objId) {
        var canvas = this.diagramDesigner,
            designerItem,
            areas, 
            bBox,
            boxdefinition,
            isEnd,
            j = 0;

        designerItem = canvas.items[objId];
        bBox = designerItem.getBoundingBox();
        areas = designerItem.getConnectionAreas(objId, isEnd) || [];

        boxdefinition = {
            //BOX
            "x1": bBox.x,
            "y1": bBox.y,
            "x2": bBox.x2,
            "y2": bBox.y2,

            //PORTS
            "ConnectionInfo": []
        };

        while (j < areas.length) {
            //Building up the ConnectionInfo object
            boxdefinition.ConnectionInfo.push({ 'id': areas[j].id, 'area': [ [ areas[j].x1, areas[j].y1 ], [ areas[j].x2, areas[j].y2 ] ] });
            j++;
        }

        this._autorouterBoxes[objId] = this.autorouter.addBox(boxdefinition);
        this._autorouterBoxRotation[objId] = canvas.items[objId].rotation;
    };

    ConnectionRouteManager3.prototype.deleteItem = function (objId) {
        //If I can query them from the objId, I can clear the entries with that info
        var item = this.diagramDesigner.items[objId],
            connIds = this.diagramDesigner.connectionIds,
            itemIds = this.diagramDesigner.itemIds;
        if(itemIds.indexOf(objId) !== -1){
            item = this._autorouterBoxes[objId];

            var i = this._autorouterPorts[objId] ? this._autorouterPorts[objId].length : 0;
            while( i-- ){
                var id = objId + DESIGNERITEM_SUBCOMPONENT_SEPARATOR + this._autorouterPorts[objId][i]; //ID of child port
                delete this._autorouterBoxes[id];
            }

            delete this._autorouterBoxes[objId];
        }else if(connIds.indexOf(objId) !== -1){
            item = this._autorouterPaths[objId];//If objId is a connection

        }
            this.autorouter.remove(item);

    };

    ConnectionRouteManager3.prototype._resizeItem = function (objId) {
        var canvas = this.diagramDesigner,
            isEnd = true, 
            connectionMetaInfo,
            designerItem = canvas.items[objId],
            newCoord = designerItem.getBoundingBox(),
            newBox = { 'x1': newCoord.x, 
                       'x2': newCoord.x2, 
                       'y1': newCoord.y, 
                       'y2': newCoord.y2,
          'ConnectionAreas': [] },
            connAreas = designerItem.getConnectionAreas(objId, isEnd, connectionMetaInfo),
            i;

        //Create the new box connection areas
        i = connAreas.length;
        while (i--) {
            //Building up the ConnectionAreas obiect
            newBox.ConnectionAreas.push({ 'id': connAreas[i].id, 'area': [ [ connAreas[i].x1, connAreas[i].y1 ], [ connAreas[i].x2, connAreas[i].y2 ] ] });
        }

        //Update Box 
        this.autorouter.setBox(this._autorouterBoxes[objId], newBox);

    };

    ConnectionRouteManager3.prototype._updatePort = function (objId, subCompId) {
        var longid = objId + DESIGNERITEM_SUBCOMPONENT_SEPARATOR + subCompId,
            canvas = this.diagramDesigner,
            connectionMetaInfo = null;

        this._autorouterPorts[objId] = this._autorouterPorts[objId] === undefined ? [] : this._autorouterPorts[objId];
        

        if( subCompId !== undefined ){
        //Add ports to our list of _autorouterBoxes and add the port to the respective box (if undefined, of course)
            var parentBox = this._autorouterBoxes[objId].box,
                portdefinition = [],
                areas = canvas.items[objId].getConnectionAreas(subCompId, true, connectionMetaInfo) || [],
                j = areas.length;

        while (j--) {
            portdefinition.push({ 'id': areas[j].id, 'area': [ [ areas[j].x1, areas[j].y1 ], [ areas[j].x2, areas[j].y2 ] ] });
        }
            this._autorouterBoxes[longid] = { "ports": this.autorouter.addPort(parentBox, portdefinition) };

            if(this._autorouterPorts[objId].indexOf(subCompId) === -1)
                this._autorouterPorts[objId].push(subCompId);
        }else{ //Updating the box's connection areas
            var areas = canvas.items[objId].getConnectionAreas() || [],
                connInfo = [],
                j = areas.length;

            while (j--) {
                //Building up the ConnectionInfo object
                connInfo.push({ 'id': areas[j].id, 'area': [ [ areas[j].x1, areas[j].y1 ], [ areas[j].x2, areas[j].y2 ] ] });
            }
            this._autorouterBoxes[objId] = this.autorouter.setConnectionInfo(this._autorouterBoxes[objId], connInfo);
        }
     };

    return ConnectionRouteManager3;
});
