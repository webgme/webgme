"use strict";

define(['logManager',
        'text!./CommitDetails.html',
        'text!./CommitHeadLabel.html',
        'raphaeljs',
        'css!RepositoryCSS/RepositoryLogView'], function (logManager,
                                                          commitDetailsTemplate,
                                                          commitHeadLabelTemplate) {

    var RepositoryLogView,
        X_DELTA = 20,
        Y_DELTA = 25,
        BRANCH_X_DELTA = 20,
        CONTENT_WIDTH = 1,
        CONTENT_HEIGHT = 1,
        ITEM_WIDTH = 8,     //RepositoryLogView.css - #repoDiag .item
        ITEM_HEIGHT = 8,    //RepositoryLogView.css - #repoDiag .item
        LINE_CORNER_SIZE = 5,
        HEADMARKER_Y_SHIFT = -11,
        HEADMARKER_X_SHIFT = 10;

    RepositoryLogView = function (container) {
        this._el = container;

        this._commits = {};
        this._orderedCommitIds = [];

        this._logger = logManager.create("RepositoryLogView");
        this._logger.debug("Created");
    };

    RepositoryLogView.prototype.addCommit = function (obj) {
        this._commits[obj.id] = obj;
        this._insertIntoOrderedListByKey(obj.id, "timestamp", this._orderedCommitIds, this._commits);
    };

    RepositoryLogView.prototype.clear = function () {
        this._commits = {};
        this._orderedCommitIds = [];

        //clear UI content
        this._el.empty();

        //detach event handlers
        this._el.off("click");
        this._el.off("keyup");

        this._el.parent().css({"width": "",
            "margin-left": "",
            "margin-top": ""});
    };

    RepositoryLogView.prototype.displayProgress = function () {
        this._el.html($('<div class="progress-big"></div>'));
    };

    RepositoryLogView.prototype.render = function () {
        this._render();
    };

    /******************* PUBLIC API TO BE OVERRIDDEN IN THE CONTROLLER **********************/

    RepositoryLogView.prototype.onLoadCommit = function (params) {
        this._logger.warning("onLoadCommit is not overridden in Controller...params: '" + JSON.stringify(params) + "'");
    };

    RepositoryLogView.prototype.onDeleteBranchClick = function (branch) {
        this._logger.warning("onDeleteBranchClick is not overridden in Controller...branch: '" + branch + "'");
    };

    RepositoryLogView.prototype.onCreateBranchFromCommit = function (params) {
        this._logger.warning("onCreateBranchFromCommit is not overridden in Controller...params: '" + JSON.stringify(params) + "'");
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
        var self = this;

        this._el.empty();

        //initialize all containers
        this._renderCache = {};
        this._skinParts = {};

        //generate HTML container
        this._skinParts.htmlContainer = $('<div/>', {
            "class" : "repoDiag",
            "id": "repoDiag",
            "tabindex": 0
        });

        this._el.append(this._skinParts.htmlContainer);

        this._skinParts.svgPaper = Raphael(this._skinParts.htmlContainer.attr("id"));
        this._skinParts.svgPaper.canvas.style.pointerEvents = "visiblePainted";
        this._skinParts.svgPaper.setSize("100%", "100px");

        this._el.on("click.btnLoadCommit", ".btnLoadCommit", function () {
            var btn = $(this),
                commitId = btn.data("commitid");

            self.onLoadCommit({"id": commitId});
        });

        this._el.on("click.btnCreateBranch", ".btnCreateBranch", function () {
            var btn = $(this),
                commitId = btn.data("commitid"),
                textInput = $("#appendedInputButton"),
                textVal = textInput.val().toLowerCase();

            if (textVal !== "" && self._branchNames.indexOf(textVal) === -1 ) {
                self.onCreateBranchFromCommit({"commitId": commitId,
                                                "name": textVal});
            }
        });

        this._el.on("keyup", "#appendedInputButton", function () {
            var textInput = $(this),
                textVal = textInput.val().toLowerCase(),
                parentControlGroup = textInput.parent();

            if (textVal === "" || self._branchNames.indexOf(textVal) !== -1 ) {
                parentControlGroup.addClass("error");
            } else {
                parentControlGroup.removeClass("error");
            }
        });

        this._el.on("click.btnCloseCommitDetails", ".btnCloseCommitDetails", function () {
            self._destroyCommitPopover();
        });

        this._el.on("click.iconRemove", ".icon-remove", function () {
            var btn = $(this),
                branch = btn.data("branch");

            self.onDeleteBranchClick(branch);
        });

        this._el.on("click.item", ".item", function () {
            self._onCommitClick($(this));
        });
    };

    RepositoryLogView.prototype._render = function () {
        var i,
            len = this._orderedCommitIds.length,
            parentsLen,
            commitRenderData = {},
            branchOffsets = {},
            inBranchLanes = {},
            endItems = [],
            x = 0,
            y = Y_DELTA * (len - 1),
            obj,
            objParent,
            cBranch,
            cBranchOffset,
            li,
            logMsg,
            branchCount = 0,
            inBranchLaneCount = 0,
            endItemParentObjectIdx;

        //calculate X,Y coordinates for each commit object
        for (i = 0; i < len; i += 1) {
            obj = this._commits[this._orderedCommitIds[i]];

            if (i === 0) {
                //very first item
                branchOffsets[obj.branch] = 0;
                inBranchLanes[obj.branch] = 1;
                branchCount = 1;
                inBranchLaneCount = 1;
                commitRenderData[obj.id] = { "x": x, "y": y };
            } else {
                //let's see how many parents this obj has
                if (obj.parents.length > 1) {
                    //multiple parents
                    //find the one that has the lowest shift value
                    objParent = this._commits[obj.parents[0]];
                    cBranchOffset = branchOffsets[objParent.branch] + commitRenderData[objParent.id].x;
                    parentsLen = obj.parents.length;
                    for (li = 1; li < parentsLen; li += 1) {
                        if (branchOffsets[this._commits[obj.parents[li]].branch] + commitRenderData[this._commits[obj.parents[li]].id].x < cBranchOffset) {
                            objParent = this._commits[obj.parents[li]];
                            cBranchOffset = branchOffsets[objParent.branch] + commitRenderData[objParent.id].x;
                        }
                    }

                    commitRenderData[obj.id] = { "x": commitRenderData[objParent.id].x, "y": y };
                } else {
                    //only one parent
                    //we need to see if this obj needs to be shifted from the parent or stays in the same lane
                    //shift #1: its parent is not directly in front of it in the list
                    //shift #2: its "branch" is different than it's parent's "branch"

                    //check the guy's parent to see if we need to shift is somehow
                    objParent = this._commits[obj.parents[0]];

                    //might be under a different "branch"
                    //test for shift #2
                    if (objParent.branch !== obj.branch) {
                        branchOffsets[obj.branch] = branchCount * BRANCH_X_DELTA + inBranchLaneCount * X_DELTA;
                        commitRenderData[obj.id] = { "x": 0, "y": y };
                        branchCount += 1;
                        inBranchLanes[obj.branch] = 0;

                        logMsg = "(" + i + ")  NEW BRANCH FOR: " + obj.id;
                        logMsg += "\n\tBranch: " + obj.branch;
                        logMsg += "\n\tbranchOffsets: " + JSON.stringify(branchOffsets);
                        this._logger.debug(logMsg);
                    } else {
                        //under the same "branch", but still might need to be shifted in that branch
                        //test for shift #1
                        endItemParentObjectIdx = endItems.indexOf(objParent.id);
                        if (endItemParentObjectIdx > -1) {
                            //all good, stays in the same lane
                            commitRenderData[obj.id] = { "x": commitRenderData[objParent.id].x, "y": y };
                            endItems.splice(endItemParentObjectIdx, 1);
                        } else {
                            //parent's lane is already taken and parent is not the direct previous item
                            commitRenderData[obj.id] = { "x": (inBranchLanes[obj.branch] + 1) * X_DELTA, "y": y };

                            //rebase all other branches by one lane
                            cBranch = obj.branch;
                            cBranchOffset = branchOffsets[obj.branch];
                            for (li in branchOffsets) {
                                if (branchOffsets.hasOwnProperty(li)) {
                                    if (li !== cBranch && cBranchOffset <= branchOffsets[li]) {
                                        branchOffsets[li] += X_DELTA;
                                    }
                                }
                            }

                            inBranchLaneCount += 1;
                            inBranchLanes[obj.branch] += 1;

                            logMsg = "(" + i + ")  LANE SHIFT IN BRANCH FOR: " + obj.id;
                            logMsg += "\n\tBranch: " + obj.branch;
                            logMsg += "\n\tobjParent.id: " + objParent.id;
                            logMsg += "\n\tbranchOffsets: " + JSON.stringify(branchOffsets);
                            this._logger.debug(logMsg);
                        }
                    }
                }
            }

            y -= Y_DELTA;
            endItems.push(obj.id);
        }

        //collect all the branch names for new branch creation name conflict check
        this._branchNames = [];
        for (i in branchOffsets) {
            if (branchOffsets.hasOwnProperty(i)) {
                this._branchNames.push(i);
            }
        }

        //we have the X,Y coordinates for each commit object
        //start building UI
        this._initializeUI();

        len = this._orderedCommitIds.length;
        for (i = 0; i < len; i += 1) {
            obj = this._commits[this._orderedCommitIds[i]];
            obj.counter = i;

            x =  commitRenderData[obj.id].x + branchOffsets[obj.branch];
            y = commitRenderData[obj.id].y;

            //log creation of commit UI data
            logMsg = "(" + i + ")  " + obj.id;
            logMsg += "\n\ttimestamp: " + obj.timestamp;
            logMsg += "\n\tBranch: " + obj.branch;
            logMsg += obj.message ? "\n\t" + obj.message : "";
            logMsg += "\n\tx:" + x + " , y: " + y;
            this._logger.debug(logMsg);

            this._createItem({"x": x,
                "y": y,
                "counter": i,
                "id": obj.id,
                "parents": obj.parents,
                "actual": obj.actual,
                "branch": obj.branch,
                "isLocalHead": obj.isLocalHead,
                "isRemoteHead": obj.isRemoteHead});
        }

        this._resizeDialog(CONTENT_WIDTH, CONTENT_HEIGHT);
    };

    RepositoryLogView.prototype._createItem = function (params) {
        var i,
            itemObj,
            headMarkerEl;

        itemObj =  $('<div/>', {
            "class" : "item",
            "id": params.id.replace("#", "").replace("*", ""),
            "data-id": params.id,
            "data-b": params.branch
        });

        itemObj.css({"left": params.x,
            "top": params.y});

        if (params.actual) {
            itemObj.addClass("actual");
        }

        if (params.isLocalHead) {
            itemObj.addClass("local-head");
        }

        if (params.isRemoteHead) {
            itemObj.addClass("remote-head");
        }

        this._skinParts.htmlContainer.append(itemObj);

        this._renderCache[params.id] = {"x": params.x,
            "y": params.y };

        CONTENT_WIDTH = Math.max(CONTENT_WIDTH,  params.x + ITEM_WIDTH);
        CONTENT_HEIGHT = Math.max(CONTENT_HEIGHT,  params.y + ITEM_HEIGHT);

        //draw lines to parents
        if (params.parents && params.parents.length > 0) {
            for (i = 0; i < params.parents.length; i += 1) {
                this._drawLine(this._renderCache[params.parents[i]], this._renderCache[params.id]);
            }
        }

        if (params.isRemoteHead || params.isLocalHead) {
            headMarkerEl = $(_.template(commitHeadLabelTemplate, {"branch": params.branch}));

            if (params.isRemoteHead) {
                if (params.branch.toLowerCase() === "master") {
                    headMarkerEl.find(".tooltiplabel-inner > i").remove();
                }
            } else {
                headMarkerEl.find(".remote-head").remove();
            }

            if (params.isLocalHead === false) {
                headMarkerEl.find(".local-head").remove();
            }

            headMarkerEl.css({"top": params.y + HEADMARKER_Y_SHIFT,
                "left": params.x + HEADMARKER_X_SHIFT});

            this._skinParts.htmlContainer.append(headMarkerEl);
        }

        return itemObj;
    };

    RepositoryLogView.prototype._drawLine = function (srcDesc, dstDesc) {
        var pathDef,
            x = srcDesc.x + ITEM_WIDTH / 2,
            y = srcDesc.y + ITEM_HEIGHT / 2,
            x2 = dstDesc.x + ITEM_WIDTH / 2,
            y2 = dstDesc.y + ITEM_HEIGHT / 2,
            dX = x2 - x;

        if (dX === 0) {
            //vertical line
            y = srcDesc.y - 1;
            y2 = dstDesc.y + ITEM_HEIGHT + 3;
            pathDef = ["M", x, y, "L", x2, y2 ];
        } else {
            //multiple segment line
            if (x2 < x) {
                //from right to left (merge)
                x2 = dstDesc.x + ITEM_WIDTH + 2;
                y = srcDesc.y - 1;
                y2 += 1;
                pathDef = ["M", x, y, "L", x, y2 + LINE_CORNER_SIZE, "L", x - LINE_CORNER_SIZE, y2, "L", x2, y2 ];
            } else {
                //from left to right (new branch)
                x = srcDesc.x + ITEM_WIDTH + 2;
                y2 = dstDesc.y + ITEM_HEIGHT + 3;
                y += 1;
                pathDef = ["M", x, y, "L", x2 - LINE_CORNER_SIZE, y, "L", x2, y - LINE_CORNER_SIZE, "L", x2, y2 ];
            }
        }

        this._skinParts.svgPaper.path(pathDef.join(","));
    };

    RepositoryLogView.prototype._resizeDialog = function (contentWidth, contentHeight) {
        var WINDOW_PADDING = 30,
            DIALOG_HEADER_HEIGHT = 70,
            DIALOG_FOOTER_HEIGHT = 70,
            wH = $(window).height(),
            wW = $(window).width(),
            repoDialog = $(".repoHistoryDialog"),
            dBody = repoDialog.find(".modal-body");

        this._skinParts.svgPaper.setSize(contentWidth, contentHeight);

        //make it almost "full screen"
        wW = wW - 2 * WINDOW_PADDING;
        wH = wH - 2 * WINDOW_PADDING - DIALOG_HEADER_HEIGHT - DIALOG_FOOTER_HEIGHT;

        dBody.css({"max-height": wH });

        repoDialog.css({"width": wW,
            "margin-left": wW / 2 * (-1),
            "margin-top": repoDialog.height() / 2 * (-1)});
    };

    RepositoryLogView.prototype._onCommitClick = function (commitEl) {
        var commitId = commitEl.data("id"),
            popoverMsg,
            obj = this._commits[commitId];

        if (this._lastCommitPopOver) {
            this._lastCommitPopOver.popover("destroy");
        }

        popoverMsg = _.template(commitDetailsTemplate,
            {"timestamp": new Date(parseInt(obj.timestamp, 10)),
                "branch": obj.branch,
                "message": obj.message || "N/A",
                "commitid": commitId});


        this._lastCommitPopOver = commitEl;

        this._lastCommitPopOver.popover({"title": obj.id + " [" + obj.counter + "]",
            "html": true,
            "content": popoverMsg,
            "trigger": "manual" });

        this._lastCommitPopOver.popover("show");
    };

    RepositoryLogView.prototype._destroyCommitPopover = function () {
        if (this._lastCommitPopOver) {
            this._lastCommitPopOver.popover("destroy");
            this._lastCommitPopOver = null;
        }
    };

    return RepositoryLogView;
});