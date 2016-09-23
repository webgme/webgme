/*globals DEBUG,define,WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/logger',
    'module',
    'AutoRouterActionApplier',
    './ConnectionRouteManager2',
    'js/Utils/SaveToDisk'
], function (Logger,
             module,
             ActionApplier,
             ConnectionRouteManager2,
             Saver) {

    'use strict';

    var ConnectionRouteManager3,
        DESIGNERITEM_SUBCOMPONENT_SEPARATOR = '_x_',
        WORKER = true;

    ConnectionRouteManager3 = function (options) {
        if (window.Worker && WORKER) {
            // A queue of item operations to perform after the item is created. 
            // Unfortunately, promises didn't work because they
            // simply place the callbacks (eg, item move, item delete) on 
            // the event queue rather than executing the callback themselves
            this._onItemCreateQueue = {};
            this.workerQueue = [];

            // TODO: If merging into one js file, this may break
            var currentDir = module.id.split('/'),
                workerFile;

            currentDir.pop();
            currentDir = currentDir.join('/');
            workerFile = currentDir + '/AutoRouter.Worker.js';

            this.worker = new Worker(workerFile);
            this.worker.postMessage([WebGMEGlobal.gmeConfig.client]);

            this.worker.onmessage = this._handleWorkerResponse.bind(this);


        } else {
            this.readyToDownload = false;
            // inherit from the ActionApplier
            window._.extend(this.prototype, ActionApplier.prototype);
        }

        this.init();

        var loggerName = (options && options.loggerName) || 'gme:Widgets:DiagramDesigner:ConnectionRouteManager3';
        this.logger = (options && options.logger) || Logger.create(loggerName, WebGMEGlobal.gmeConfig.client.log);

        this.diagramDesigner = options ? options.diagramDesigner : null;
        this.simpleRouter = new ConnectionRouteManager2(options);

        if (this.diagramDesigner === undefined || this.diagramDesigner === null) {
            this.logger.error('Trying to initialize a ConnectionRouteManager3 without a canvas...');
            throw ('ConnectionRouteManager3 can not be created');
        }

        this.logger.debug('ConnectionRouteManager3 ctor finished');
        this._portSeparator = DESIGNERITEM_SUBCOMPONENT_SEPARATOR;
    };

    // These next 2 methods are only used if a web worker is used; otherwise, 
    // they are overridden by ActionApplier
    ConnectionRouteManager3.prototype.init = ActionApplier.prototype._clearRecords;

    ConnectionRouteManager3.prototype._invokeAutoRouterMethod = function () {
        var array = Array.prototype.slice.call(arguments),  // Remove the extra 'arguments' stuff
            id;
        if (this.workerReady) {
            this.worker.postMessage(array);
        } else {
            this.workerQueue.push(array);
        }

        // Update some record keeping
        switch (array[0]) {
            case 'addPath':

            case 'addBox':
                id = array[1][1];
                this._onItemCreateQueue[id] = [];
                break;

            case 'clear':
                this.init();  // Clear the records
                break;

            case 'remove':
                id = array[1][1];
                delete this._onItemCreateQueue[id];
                break;
        }
    };

    /**
     * Handle the web worker response.
     *
     * @private
     * @param {Object} data
     * @return {undefined}
     */
    ConnectionRouteManager3.prototype._handleWorkerResponse = function (data) {
        var response = data.data;

        if (response === 'READY') {
            this._processQueue();
            this.workerReady = true;
        } else {  // Plot points?
            // response = [cmd, args, result]

            // Render connections?
            var id,
                collection = '_autorouterBoxes';
            switch (response[0]) {
                case 'getPathPoints':
                    id = response[1][0];  // first arg from request
                    var points = response[2];  // result
                    this._renderConnection(id, points);
                    break;

                case 'routePaths':
                    var paths = response[1];
                    for (var i = paths.length; i--;) {
                        this._renderConnection.apply(this, paths[i]);
                    }
                    break;

                case 'addPath':
                    // Set the collection to store it then fall through
                    // to create the promise in the 'addBox' method
                    collection = '_autorouterPaths';  // jshint ignore:line
                case 'addBox':
                    // Record the item
                    id = response[1][1];
                    this[collection][id] = response[2];

                    // Evaluate the event queue for the item in order
                    if (this._onItemCreateQueue[id]) {  // FIXME: Sometimes this is null -> it is 
                        for (i = 0; i < this._onItemCreateQueue[id].length; i++) {
                            this._onItemCreateQueue[id][i].call(this, response[2]);
                        }
                    }
                    this._onItemCreateQueue[id] = null;
                    break;

                case 'BugReplayList':
                    if (DEBUG) {
                        this.download('AR_bug_report' + new Date().getTime() + '.json', response[1]);
                    }
                    this.readyToDownload = false;
                    break;
            }
        }
    };

    ConnectionRouteManager3.prototype.initialize = function () {
        this._clearGraph();

        //Adding event listeners
        var self = this;

        this._onComponentUpdate = function (_canvas, ID) {
            if (self.diagramDesigner.itemIds.indexOf(ID) !== -1) {
                if (self.diagramDesigner.items[ID].rotation !== self._autorouterBoxRotation[ID]) {
                    //Item has been rotated
                    var resizeFn = self._resizeItem.bind(self, ID);
                    self._modifyItem(ID, resizeFn);
                }
            } else if (self.diagramDesigner.connectionIds.indexOf(ID) !== -1) {
                // If the path is being updated, refresh it
                if (self._onItemCreateQueue[ID] !== undefined) {  // Should have been added
                    self.deleteItem(ID);
                    self.insertConnection(ID);
                } else {
                    self.logger.warn('Received update event for nonexistent path');
                }
            }
        };
        this.diagramDesigner.addEventListener(this.diagramDesigner.events.ON_COMPONENT_UPDATE, this._onComponentUpdate);

        this._onComponentCreate = function (_canvas, ID) {
            if (self._onItemCreateQueue[ID] === undefined) {  // New item
                if (self.diagramDesigner.itemIds.indexOf(ID) !== -1) {
                    self.insertBox(ID);
                } else if (self.diagramDesigner.connectionIds.indexOf(ID) !== -1) {
                    self.insertConnection(ID);
                }
            } else {  // Already created the item
                self.logger.warn('Received ON_COMPONENT_CREATE event for already created item! (' + ID + ')');
            }
        };
        this.diagramDesigner.addEventListener(this.diagramDesigner.events.ON_COMPONENT_CREATE, this._onComponentCreate);

        this._onComponentResize = function (_canvas, ID) {
            if (self._onItemCreateQueue[ID.ID] !== undefined) {
                var resizeFn = self._resizeItem.bind(self, ID.ID);
                self._modifyItem(ID.ID, resizeFn);
            } else {
                self.logger.warn('Received ITEM_SIZE_CHANGED event for nonexistent item! (' + ID.ID + ')');
                self.insertBox(ID.ID);
            }
        };
        this.diagramDesigner.addEventListener(this.diagramDesigner.events.ITEM_SIZE_CHANGED, this._onComponentResize);

        this._onComponentDelete = function (_canvas, ID) {  // Boxes and lines
            if (self._onItemCreateQueue[ID] !== undefined) {
                self.deleteItem(ID);
            } else {
                self.logger.warn('Received ON_COMPONENT_DELETE event for nonexistent item! (' + ID + ')');
            }
        };
        this.diagramDesigner.addEventListener(this.diagramDesigner.events.ON_COMPONENT_DELETE, this._onComponentDelete);
        //ON_UNREGISTER_SUBCOMPONENT

        this._onItemPositionChanged = function (_canvas, eventArgs) {
            if (self._onItemCreateQueue[eventArgs.ID] !== undefined) {
                var x = self.diagramDesigner.items[eventArgs.ID].getBoundingBox().x,
                    y = self.diagramDesigner.items[eventArgs.ID].getBoundingBox().y;

                self._modifyItem(eventArgs.ID, self._invokeAutoRouterMethod
                    .bind(self, 'move', [eventArgs.ID, {x: x, y: y}]));
            } else {
                self.logger.warn('Received ITEM_POSITION_CHANGED event for nonexistent item! (' + eventArgs.ID + ')');
            }
        };
        this.diagramDesigner.addEventListener(this.diagramDesigner.events.ITEM_POSITION_CHANGED,
            this._onItemPositionChanged);

        this._onClear = function () {
            self._clearGraph();
        };
        this.diagramDesigner.addEventListener(this.diagramDesigner.events.ON_CLEAR, this._onClear);

        this._onUnregisterSubcomponent = function (sender, ids) {
            var longid = ids.objectID + DESIGNERITEM_SUBCOMPONENT_SEPARATOR + ids.subComponentID;
            if (self._onItemCreateQueue[longid] !== undefined) {
                self.deleteItem(longid);
            } else {
                self.logger.warn('Received UNREGISTER event for nonexistent item! (' + longid + ')');
            }
        };
        this.diagramDesigner.addEventListener(this.diagramDesigner.events.ON_UNREGISTER_SUBCOMPONENT,
            this._onUnregisterSubcomponent);
    };

    ConnectionRouteManager3.prototype.destroy = function () {
        this.diagramDesigner.removeEventListener(this.diagramDesigner.events.ON_COMPONENT_CREATE,
            this._onComponentCreate);
        this.diagramDesigner.removeEventListener(this.diagramDesigner.events.ON_COMPONENT_UPDATE,
            this._onComponentUpdate);
        this.diagramDesigner.removeEventListener(this.diagramDesigner.events.ITEM_SIZE_CHANGED,
            this._onComponentResize);
        this.diagramDesigner.removeEventListener(this.diagramDesigner.events.ON_COMPONENT_DELETE,
            this._onComponentDelete);
        this.diagramDesigner.removeEventListener(this.diagramDesigner.events.ITEM_POSITION_CHANGED,
            this._onItemPositionChanged);
        this.diagramDesigner.removeEventListener(this.diagramDesigner.events.ON_CLEAR, this._onClear);
        this.diagramDesigner.removeEventListener(this.diagramDesigner.events.ON_UNREGISTER_SUBCOMPONENT,
            this._onUnregisterSubcomponent);

        if (this.worker) {
            this.worker.terminate();
        }
    };

    ConnectionRouteManager3.prototype.redrawConnections = function (ids) {

        this.simpleRouter.redrawConnections(ids);

        if (!this._initialized) {
            this._initializeGraph();
        }

        this._invokeAutoRouterMethod('routeAsync', []);
    };

    /**
     * Query the connection info from the autorouter and initiate a redraw
     *
     * @param {Array<String>} [ids] - Connection ids to redraw
     * @return {Array<String>} ids - Updated Ids
     */
    ConnectionRouteManager3.prototype.renderConnections = function (ids) {
        var idList = ids || this.diagramDesigner.connectionIds.slice(0);

        for (var i = idList.length; i--;) {
            if (this._autorouterPaths[idList[i]]) {
                this._invokeAutoRouterMethod('getPathPoints', [idList[i]]);
            }
        }

        return idList;
    };

    /**
     * Render the given connection in the WebGME
     *
     * @param {ConnectionId} id
     * @param {Array<Points>} points
     * @return {undefined}
     */
    ConnectionRouteManager3.prototype._renderConnection = function (id, points) {
        if (this.diagramDesigner.items[id]) {  // Only render if the box still exists
            this.diagramDesigner.items[id].setConnectionRenderData(points);
        }
    };

    ConnectionRouteManager3.prototype._clearGraph = function () {
        this._invokeAutoRouterMethod('clear', []);
        this._autorouterBoxRotation = {};  // Define container that will map obj+subID -> rotation
        this.endpointConnectionAreaInfo = {};
        this.initialized = false;
        this.readyToDownload = true;
        this._onItemCreateQueue = {};
    };

    ConnectionRouteManager3.prototype._initializeGraph = function () {
        /*
         * In this method, we will update the boxes using the canvas.itemIds list and
         * add any ports as needed (from the canvas.connectionIds)
         */
        var canvas = this.diagramDesigner,
            connIdList = canvas.connectionIds,
            itemIdList = canvas.itemIds,
            i = itemIdList.length;

        while (i--) {
            this.insertBox(itemIdList[i]);
        }

        i = connIdList.length;
        while (i--) {
            this.insertConnection(connIdList[i]);
        }

        this._initialized = true;

    };

    ConnectionRouteManager3.prototype._processQueue = function () {
        for (var i = 0; i < this.workerQueue.length; i++) {
            this.worker.postMessage(this.workerQueue[i]);
        }
        this.workerQueue = [];
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
        while (j--) {
            srcPorts[srcConnAreas[j].id] = sId;
        }

        j = dstConnAreas.length;
        while (j--) {
            dstPorts[dstConnAreas[j].id] = tId;
        }

        // If it has both a src and dst
        if (srcPorts.length !== 0 && dstPorts.length !== 0) {
            this._invokeAutoRouterMethod('addPath',
                [{src: srcPorts, dst: dstPorts}, connId]);
        }

        //Set custom points, if applicable
        if (canvas.items[connId].segmentPoints.length > 0) {
            var conn = canvas.items[connId],
                customPoints = conn.segmentPoints.slice();
            this._invokeAutoRouterMethod('setPathCustomPoints',
                [{'path': connId, 'points': customPoints}]);
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
            'x1': bBox.x,
            'y1': bBox.y,
            'x2': bBox.x2,
            'y2': bBox.y2,

            //PORTS
            'ports': []
        };

        while (j < areas.length) {
            //Building up the ports object
            boxdefinition.ports.push({
                'id': areas[j].id, 'area': [[areas[j].x1, areas[j].y1], [areas[j].x2, areas[j].y2]],
                'angles': [areas[j].angle1, areas[j].angle2]
            });
            j++;
        }

        this._invokeAutoRouterMethod('addBox', [boxdefinition, objId]);
        this._autorouterBoxRotation[objId] = canvas.items[objId].rotation;
    };

    ConnectionRouteManager3.prototype.deleteItem = function (objId) {
        // If I can query them from the objId, I can clear the entries with that info
        // Make sure that the path/box has been created
        var removeFn = this._invokeAutoRouterMethod.bind(this, 'remove', [objId]);

        this._modifyItem(objId, removeFn);
    };

    ConnectionRouteManager3.prototype._resizeItem = function (objId) {
        var canvas = this.diagramDesigner,
            isEnd = true,
            connectionMetaInfo,
            designerItem = canvas.items[objId],
            newCoord = designerItem.getBoundingBox(),
            newBox = {
                x1: newCoord.x,
                x2: newCoord.x2,
                y1: newCoord.y,
                y2: newCoord.y2
            },
            ports = [],
            connAreas = designerItem.getConnectionAreas(objId, isEnd, connectionMetaInfo),
            i;

        // Create the new box connection areas
        i = connAreas.length;
        while (i--) {
            // Building up the ConnectionAreas object
            ports.push({
                id: connAreas[i].id,
                area: [[connAreas[i].x1, connAreas[i].y1], [connAreas[i].x2, connAreas[i].y2]],
                angles: [connAreas[i].angle1, connAreas[i].angle2]
            });
        }

        // Update Box 
        this._invokeAutoRouterMethod('setBoxRect', [objId, newBox]);

        // Update box ports
        for (i = ports.length; i--;) {
            this._invokeAutoRouterMethod('updatePort', [objId, ports[i]]);
        }

    };

    ConnectionRouteManager3.prototype._updatePort = function (objId, subCompId) {
        var longid = objId + DESIGNERITEM_SUBCOMPONENT_SEPARATOR + subCompId,
            newBox,
            updateBoxFn;

        if (subCompId !== undefined) { //Updating a port
            // We need to know if the box even exists...
            if (this._onItemCreateQueue[longid] === undefined) {  // If the port doesn't exist, create it
                this._createPort(objId, subCompId);
            } else {
                // TODO Adjust size, connection info
                newBox = this._createPortInfo(objId, subCompId);
                updateBoxFn = this._invokeAutoRouterMethod.bind(this, 'setBoxRect', [longid, newBox]);
                this._modifyItem(longid, updateBoxFn);
            }
        } else { // Updating the box's connection areas
            this._modifyItem(objId, this._updateBoxConnectionAreas.bind(this, objId));
        }
    };

    /**
     * Call a function on an item which may or may not exist yet
     *
     * @param {String} id
     * @param {Function} fn
     * @return {undefined}
     */
    ConnectionRouteManager3.prototype._modifyItem = function (id, fn) {
        if (this._onItemCreateQueue[id] === null) {  // Item has been created
            fn();
        } else {  // Store the operation
            this._onItemCreateQueue[id].push(fn);
        }
    };

    ConnectionRouteManager3.prototype._updateBoxConnectionAreas = function (objId) {
        var areas = this.diagramDesigner.items[objId].getConnectionAreas() || [],
            newIds = {},
            connInfo = [],
            boxObject = this._autorouterBoxes[objId],
            id,
            j;

        for (j = areas.length; j--;) {
            //Building up the ports object
            connInfo.push({
                'id': areas[j].id, 'area': [[areas[j].x1, areas[j].y1], [areas[j].x2, areas[j].y2]],
                'angles': [areas[j].angle1, areas[j].angle2]
            });
            newIds[areas[j].id] = true;
        }

        // Update each AutoRouter port
        for (j = connInfo.length; j--;) {
            this._invokeAutoRouterMethod('updatePort', [objId, connInfo[j]]);
        }

        for (j = boxObject.ports.length; j--;) {
            id = boxObject.ports[j].id;
            if (!newIds[id]) {
                this._invokeAutoRouterMethod('removePort', [boxObject.ports[j]]);  // Not sure FIXME
            }
        }
    };

    ConnectionRouteManager3.prototype._createPort = function (objId, subCompId) {
        var longid = objId + DESIGNERITEM_SUBCOMPONENT_SEPARATOR + subCompId,
            newBox = this._createPortInfo(objId, subCompId);

        this._invokeAutoRouterMethod('addBox', [newBox, longid]);
        this._invokeAutoRouterMethod('setComponent', [objId, longid]);
    };

    ConnectionRouteManager3.prototype._createPortInfo = function (objId, subCompId) {
        //Ports will now be a subcomponent
        //We will do the following: 
        //  - Create a box for the port
        //      - Determine the connection areas
        //      - Determine the box
        //          - Use the connection angle
        //  - Set the box as a component of the parent
        var canvas = this.diagramDesigner,
            connectionMetaInfo = null,
            areas = canvas.items[objId].getConnectionAreas(subCompId, true, connectionMetaInfo) || [],
            j = areas.length,
            newBox = {
                'x1': null,
                'x2': null,
                'y1': null,
                'y2': null,
                'ports': []
            };

        while (j--) {
            var angles = [areas[j].angle1, areas[j].angle2],
                x1 = Math.min(areas[j].x1, areas[j].x2),
                x2 = Math.max(areas[j].x1, areas[j].x2),
                y1 = Math.min(areas[j].y1, areas[j].y2),
                y2 = Math.max(areas[j].y1, areas[j].y2);

            newBox.ports.push({
                'id': areas[j].id, 'area': [[x1, y1], [x2, y2]],
                'angles': angles
            });

            if (angles) {
                var a1 = angles[0], //min angle
                    a2 = angles[1], //max angle
                    rightAngle = 0,
                    bottomAngle = 90,
                    leftAngle = 180,
                    topAngle = 270;

                if (rightAngle < a1 || rightAngle > a2) {
                    x2 += 5;
                }

                if (leftAngle < a1 || leftAngle > a2) {
                    x1 -= 5;
                }

                if (topAngle < a1 || topAngle > a2) {
                    y1 -= 5;
                }

                if (bottomAngle < a1 || bottomAngle > a2) {
                    y2 += 5;
                }

            } else {
                if (x2 - x1 < 3) {
                    x2 += 3;
                }

                if (y2 - y1 < 3) {
                    y2 += 3;
                }
            }

            //Derive the box object
            newBox.x2 = Math.max(x2 + 1, newBox.x2) || x2 + 1;
            newBox.y1 = Math.min(y1 - 1, newBox.y1) || y1 - 1;
            newBox.x1 = Math.min(x1 - 1, newBox.x1) || x1 - 1;
            newBox.y2 = Math.max(y2 + 1, newBox.y2) || y2 + 1;
        }

        return newBox;
    };

    ConnectionRouteManager3.prototype.download = function (filename, data) {
        var self = this;
        if (!this.readyToDownload) {
            return;
        }

        if (!filename) {
            filename = 'console.json';
        }

        Saver.saveJsonToDisk(filename, data, self.logger, function (err, downloadUrl) {
            if (err) {
                self.logger.error('downloading resource for error handling failed', {metadata: {error: err}});
            }

            self.logger.error('Download url for auto-router debug data:', downloadUrl);
            self.readyToDownload = false;
        });
    };


    return ConnectionRouteManager3;
});
