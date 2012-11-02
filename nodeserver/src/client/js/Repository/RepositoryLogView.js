"use strict";

define(['logManager',
        'raphaeljs',
        'css!RepositoryCSS/RepositoryLogView'], function (logManager) {

    var RepositoryLogView;

    RepositoryLogView = function (container) {
        this._el = container;

        this._initializeUI();

        this._commits = {};
        this._orderedCommitIds = [];

        this._logger = logManager.create("RepositoryLogView");
        this._logger.debug("Created");

        this._yDelta = 35;
        this._xDelta = 50;
        this._xBranchShiftValue = 50;
    };

    RepositoryLogView.prototype.addCommit = function (obj) {
        this._commits[obj.id] = obj;
        this._insertIntoOrderedListByKey(obj.id, "timestamp", this._orderedCommitIds, this._commits);
    };

    RepositoryLogView.prototype.render = function () {
        var i,
            len = this._orderedCommitIds.length,
            commitRenderData = {},
            branchOffsets = {},
            x = 0,
            y = 0,
            obj,
            objParent,
            cLane,
            cLaneOffset,
            li,
            logMsg,
            branchCount = 0,
            guiObj,
            popoverMsg,
            self = this;

        this._initializeUI();

        for (i = 0; i < len; i += 1) {
            obj = this._commits[this._orderedCommitIds[i]];

            if (i === 0) {
                //very first item
                branchOffsets[obj.name] = 0;
                branchCount = 1;
                commitRenderData[obj.id] = { "x": 0, "y": 0 };
            } else {
                //let's see how many parents this obj has
                if (obj.parents.length > 1) {
                    //multiple parents
                    //find the one that has the lowest shift value
                    objParent = this._commits[obj.parents[0]];
                    cLaneOffset = branchOffsets[objParent.name] + commitRenderData[objParent.id].x;
                    len = obj.parents.length;
                    for (li = 1; li < len; li += 1) {
                        if (branchOffsets[this._commits[obj.parents[li]].name] + commitRenderData[this._commits[obj.parents[li]].id].x < cLaneOffset) {
                            objParent = this._commits[obj.parents[li]];
                            cLaneOffset = branchOffsets[objParent.name] + commitRenderData[objParent.id].x;
                        }
                    }

                    commitRenderData[obj.id] = { "x": commitRenderData[objParent.id].x, "y": y };
                } else {
                    //only one parent
                    //we need to see if this obj needs to be shifted from the parent or stays in the same lane
                    //shift #1: its parent is not directly in front of it in the list
                    //shift #2: its "name" is different than it's parent's "name"

                    //check the guy's parent to see if we need to shift is somehow
                    objParent = this._commits[obj.parents[0]];

                    //might be under a different "name"
                    //test for shift #2
                    if (objParent.name !== obj.name) {
                        branchOffsets[obj.name] = branchCount * this._xBranchShiftValue;
                        commitRenderData[obj.id] = { "x": 0, "y": y };
                        branchCount += 1;
                    } else {
                        //under the same "name", but still might need to be shifted
                        //test for shift #1
                        if (objParent.id === this._orderedCommitIds[i - 1]) {
                            //all good, stays in the same lane
                            commitRenderData[obj.id] = { "x": commitRenderData[objParent.id].x, "y": y };
                        } else {
                            //parent is not directly at pos - 1
                            //if object @ pos - 1 is in different "name", still stay in parent's lane
                            if (this._commits[this._orderedCommitIds[i - 1]].name !== obj.name) {
                                //all good, stays in the same lane as parent
                                commitRenderData[obj.id] = { "x": commitRenderData[objParent.id].x, "y": y };
                            } else {
                                //shift inside the parent's lane
                                commitRenderData[obj.id] = { "x": commitRenderData[objParent.id].x + this._xDelta, "y": y };

                                //rebase all other lanes by 1
                                cLane = obj.name;
                                cLaneOffset = branchOffsets[obj.name];
                                for (li in branchOffsets) {
                                    if (branchOffsets.hasOwnProperty(li)) {
                                        if (li !== cLane && cLaneOffset <= branchOffsets[li]) {
                                            branchOffsets[li] += this._xDelta;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            y += this._yDelta;
        }

        len = this._orderedCommitIds.length;
        for (i = 0; i < len; i += 1) {
            obj = this._commits[this._orderedCommitIds[i]];

            x =  commitRenderData[obj.id].x + branchOffsets[obj.name];
            y = commitRenderData[obj.id].y;

            guiObj = this._createItem({"x": x,
                              "y": y,
                              "text": i,
                              "id": obj.id,
                              "parents": obj.parents,
                              "actual": obj.actual,
                              "name": obj.name,
                              "isEnd": obj.isEnd});

            logMsg = "(" + i + ")  " + obj.id;
            logMsg += "\n\ttimestamp: " + obj.timestamp;
            logMsg += "\n\tname: " + obj.name;
            if (obj.message) {
                logMsg += "\n\t" + obj.message;
            }
            logMsg += "\n\tx:" + x + " , y: " + y;
            this._logger.debug(logMsg);

            //hook up popover
            popoverMsg = "<li>TimeStamp: " + new Date(parseInt(obj.timestamp, 10)) + "</li>";
            popoverMsg += "<li>Name: " + obj.name + "</li>";
            if (obj.message) {
                popoverMsg += "<li>Message: " + obj.message + "</li>";
            }
            popoverMsg = "<ul>" + popoverMsg + "</ul>";

            popoverMsg += "<br><p class='muted'>Double-click to switch to this commit.</p>";

            guiObj.popover({"title": obj.id + "@" + obj.name,
                "content": popoverMsg,
                "trigger": "hover" });
        }

        this._skinParts.htmlContainer.on("dblclick", function (event) {
            event.stopPropagation();
            event.preventDefault();

            self._skinParts.htmlContainer.find(".item.actual").removeClass("actual");
            $(event.target).addClass("actual");

            self.onCommitDblClick({"id": $(event.target).attr("data-id"),
                                   "name": $(event.target).attr("data-n")});
        });

        this._skinParts.svgPaper.setSize("100%", y + 30);
    };

    RepositoryLogView.prototype.onCommitDblClick = function (params) {
        this._logger.warning("onCommitDblClick is not overridden in Controller...params: '" + JSON.stringify(params) + "'");
    };

    /******************* PRIVATE API *****************************/

    RepositoryLogView.prototype._insertIntoOrderedListByKey = function (objId, key, orderedList, objList) {
        var i = orderedList.length,
            len = i,
            inserted = false;

        //array is empty, just simply store it
        if (i === 0) {
            orderedList.push(objId);
        } else {
            while (--i >= 0) {
                if (objList[objId][key] > objList[orderedList[i]][key]) {
                    if (i + 1 === len) {
                        orderedList.push(objId);
                    } else {
                        orderedList.splice(i + 1, 0, objId);
                    }
                    inserted = true;
                    break;
                }
            }
            if (inserted === false) {
                orderedList.splice(0, 0, objId);
            }
        }
    };

    RepositoryLogView.prototype._initializeUI = function () {
        this._el.empty();

        //generate HTML container
        this._skinParts = {};

        this._skinParts.htmlContainer = $('<div/>', {
            "class" : "repoDiag",
            "id": "repoDiag",
            "tabindex": 0
        });

        this._el.append(this._skinParts.htmlContainer);

        this._skinParts.svgPaper = Raphael(this._skinParts.htmlContainer.attr("id"));
        this._skinParts.svgPaper.canvas.style.pointerEvents = "visiblePainted";
        this._skinParts.svgPaper.setSize("100%", "100px");
    };

    RepositoryLogView.prototype._createItem = function (params) {
        var i,
            pObj,
            objBBox,
            parentBBox,
            itemObj =  $('<div/>', {
                "class" : "item",
                "id": params.id.replace("#", ""),
                "data-id": params.id,
                "data-n": params.name
            });

        itemObj.css({"left": params.x,
            "top": params.y});

        if (params.text !== null && params.text !== "") {
            itemObj.html(params.text);
        }

        if (params.actual) {
            itemObj.addClass("actual");
        }

        if (params.isEnd) {
            itemObj.addClass("at-end");
        }

        this._skinParts.htmlContainer.append(itemObj);

        objBBox = {"x": params.x,
            "y": params.y,
            "w": itemObj.outerWidth(),
            "h": itemObj.outerHeight() };

        //draw lines to parents
        if (params.parents && params.parents.length > 0) {
            for (i = 0; i < params.parents.length; i += 1) {
                pObj = this._skinParts.htmlContainer.find("#" + params.parents[i].replace("#", ""));

                parentBBox = {"x": parseInt(pObj.css("left"), 10),
                    "y": parseInt(pObj.css("top"), 10),
                    "w": pObj.outerWidth(),
                    "h": pObj.outerHeight() };

                this._drawLine(parentBBox, objBBox);
            }
        }

        return itemObj;
    };

    RepositoryLogView.prototype._drawLine = function (srcDesc, dstDesc) {
        var pathDef,
            x = srcDesc.x + srcDesc.w / 2,
            y = srcDesc.y + srcDesc.h / 2,
            x2 =  dstDesc.x + dstDesc.w / 2,
            y2 = dstDesc.y + dstDesc.h / 2,
            dX = x2 - x,
            cornerSize = 10;

        if (dX === 0) {
            //vertical line
            pathDef = ["M", x, y, "L", x2, y2 ];
        } else {
            //multiple segment line
            pathDef = ["M", x, y, "L", x2 - cornerSize, y, "L", x2, y + cornerSize, "L", x2, y2 ];
        }

        this._skinParts.svgPaper.path(pathDef.join(","));
    };

    return RepositoryLogView;
});