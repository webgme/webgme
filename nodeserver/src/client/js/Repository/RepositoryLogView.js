"use strict";

define(['logManager',
        'raphaeljs',
        'css!RepositoryCSS/RepositoryLogView'], function (logManager) {

    var RepositoryLogView;

    RepositoryLogView = function (container) {
        this._el = container;

        this._commits = {};
        this._orderedCommitIds = [];

        this._logger = logManager.create("RepositoryLogView");
        this._logger.debug("Created");

        this._yDelta = 25;
        this._xDelta = 20;
        this._xBranchDelta = 20;
    };

    RepositoryLogView.prototype.addCommit = function (obj) {
        this._commits[obj.id] = obj;
        this._insertIntoOrderedListByKey(obj.id, "timestamp", this._orderedCommitIds, this._commits);
    };

    RepositoryLogView.prototype.clear = function () {
        this._commits = {};
        this._orderedCommitIds = [];
        this._el.empty();

        this._el.parent().css({"width": "",
            "margin-left": "",
            "margin-top": ""});
    };

    RepositoryLogView.prototype.displayProgress = function () {
        this._el.html($('<div class="progress-big"></div>'));
    };

    RepositoryLogView.prototype.render = function () {
        var i,
            len = this._orderedCommitIds.length,
            parentsLen,
            commitRenderData = {},
            branchOffsets = {},
            inBranchLanes = {},
            endItems = [],
            x = 0,
            y = this._yDelta * (len - 1),
            maxX = 0,
            obj,
            objParent,
            cBranch,
            cBranchOffset,
            li,
            logMsg,
            branchCount = 0,
            inBranchLaneCount = 0,
            guiObj,
            self = this,
            padding = 30,
            endItemParentObjectIdx,
            headMarkerEl;

        this._branchNames = [];

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
                        branchOffsets[obj.branch] = branchCount * this._xBranchDelta + inBranchLaneCount * this._xDelta;
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
                        //if (objParent.id === this._orderedCommitIds[i - 1]) {
                        endItemParentObjectIdx = endItems.indexOf(objParent.id);
                        if (endItemParentObjectIdx > -1) {
                            //all good, stays in the same lane
                            commitRenderData[obj.id] = { "x": commitRenderData[objParent.id].x, "y": y };
                            endItems.splice(endItemParentObjectIdx, 1);
                        } else {
                            //parent's lane is already taken and parent is not the direct previous item
                            commitRenderData[obj.id] = { "x": (inBranchLanes[obj.branch] + 1) * this._xDelta, "y": y };

                            //rebase all other branches by one lane
                            cBranch = obj.branch;
                            cBranchOffset = branchOffsets[obj.branch];
                            for (li in branchOffsets) {
                                if (branchOffsets.hasOwnProperty(li)) {
                                    if (li !== cBranch && cBranchOffset <= branchOffsets[li]) {
                                        branchOffsets[li] += this._xDelta;
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

            y -= this._yDelta;
            endItems.push(obj.id);
        }

        this._initializeUI();

        len = this._orderedCommitIds.length;
        for (i = 0; i < len; i += 1) {
            obj = this._commits[this._orderedCommitIds[i]];

            x =  commitRenderData[obj.id].x + branchOffsets[obj.branch];
            y = commitRenderData[obj.id].y;

            obj.counter = i;

            guiObj = this._createItem({"x": x,
                              "y": y,
                              "text": i,
                              "id": obj.id,
                              "parents": obj.parents,
                              "actual": obj.actual,
                              "branch": obj.branch,
                              "isLocalHead": obj.isLocalHead,
                              "isRemoteHead": obj.isRemoteHead});

            logMsg = "(" + i + ")  " + obj.id;
            logMsg += "\n\ttimestamp: " + obj.timestamp;
            logMsg += "\n\tBranch: " + obj.branch;
            if (obj.message) {
                logMsg += "\n\t" + obj.message;
            }
            logMsg += "\n\tx:" + x + " , y: " + y;
            this._logger.debug(logMsg);

            maxX = x > maxX ? x : maxX;

            if (obj.isRemoteHead || obj.isLocalHead) {
                headMarkerEl = $("<div></div>");

                if (obj.isRemoteHead) {
                    this._branchNames.push(obj.branch);

                    headMarkerEl.append($('<div class="tooltiplabel right nowrap remote-head"><div class="tooltiplabel-arrow"></div><div class="tooltiplabel-inner">' + obj.branch + '</div></div>'));

                    if (obj.branch.toLowerCase() !== "master") {
                        headMarkerEl.find(".tooltiplabel-inner").append(' <i data-branch="' + obj.branch + '" class="icon-remove icon-white" title="Delete branch"></i>');
                    }
                }

                if (obj.isLocalHead) {
                    headMarkerEl.append($('<div class="tooltiplabel right nowrap local-head"><div class="tooltiplabel-arrow"></div><div class="tooltiplabel-inner">local @ ' + obj.branch + '</div></div>'));
                }

                headMarkerEl.css({"top": y - 11,
                    "left": x + 10,
                    "position": "absolute",
                    "white-space": "nowrap"});

                this._skinParts.htmlContainer.append(headMarkerEl);
            }
        }

        this._skinParts.htmlContainer.on("click", ".icon-remove", function () {
            var btn = $(this),
                branch = btn.data("branch");

            self.onDeleteBranchClick(branch);
        });

        this._skinParts.htmlContainer.on("click", ".item", function () {
            self._onCommitClick($(this));
        });

        this._resizeDialog(maxX + padding, this._yDelta * len + padding);
    };

    /******************* PUBLIC API TO BE OVERRIDDEN IN THE CONTROLLER **********************/

    RepositoryLogView.prototype.onCommitDblClick = function (params) {
        this._logger.warning("onCommitDblClick is not overridden in Controller...params: '" + JSON.stringify(params) + "'");
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

        this._renderCache = {};

        this._el.on("click.btnLoadCommit", ".btnLoadCommit", function () {
            var btn = $(this),
                commitId = btn.data("commitid");

            self._onLoadCommit(commitId);
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
            self.destroyCommitPopover();
        });
    };

    RepositoryLogView.prototype.destroyCommitPopover = function () {
        if (this._lastCommitPopOver) {
            this._lastCommitPopOver.popover("destroy");
            this._lastCommitPopOver = null;
        }
    };

    RepositoryLogView.prototype._onLoadCommit = function (commitId) {
        this.onCommitDblClick({"id": commitId});

        this._skinParts.htmlContainer.find(".item.actual").removeClass("actual");
        this._lastCommitPopOver.addClass("actual");

        this.destroyCommitPopover();
    };

    RepositoryLogView.prototype._createItem = function (params) {
        var i,
            itemObj =  $('<div/>', {
                "class" : "item",
                "id": params.id.replace("#", "").replace("*", ""),
                "data-id": params.id,
                "data-b": params.branch
            });

        itemObj.css({"left": params.x,
            "top": params.y});

        /*if (params.text !== null && params.text !== "") {
            itemObj.html(params.text);
        }*/

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
            "y": params.y,
            "w": itemObj.outerWidth(),
            "h": itemObj.outerHeight() };

        //draw lines to parents
        if (params.parents && params.parents.length > 0) {
            for (i = 0; i < params.parents.length; i += 1) {
                this._drawLine(this._renderCache[params.parents[i]], this._renderCache[params.id]);
            }
        }

        return itemObj;
    };

    RepositoryLogView.prototype._drawLine = function (srcDesc, dstDesc) {
        var pathDef,
            x = srcDesc.x + srcDesc.w / 2,
            y = srcDesc.y + srcDesc.h / 2,
            x2 = dstDesc.x + dstDesc.w / 2,
            y2 = dstDesc.y + dstDesc.h / 2,
            dX = x2 - x,
            cornerSize = 5;

        if (dX === 0) {
            //vertical line
            y = srcDesc.y - 1;
            y2 = dstDesc.y + dstDesc.h + 3;
            pathDef = ["M", x, y, "L", x2, y2 ];
        } else {
            //multiple segment line
            if (x2 < x) {
                //from right to left (merge)
                x2 = dstDesc.x + dstDesc.w + 2;
                y = srcDesc.y - 1;
                y2 += 1;
                pathDef = ["M", x, y, "L", x, y2 + cornerSize, "L", x - cornerSize, y2, "L", x2, y2 ];
            } else {
                //from left to right (new branch)
                x = srcDesc.x + srcDesc.w + 2;
                y2 = dstDesc.y + dstDesc.h + 3;
                y += 1;
                pathDef = ["M", x, y, "L", x2 - cornerSize, y, "L", x2, y - cornerSize, "L", x2, y2 ];
            }
        }

        this._skinParts.svgPaper.path(pathDef.join(","));
    };

    RepositoryLogView.prototype._resizeDialog = function (contentWidth, contentHeight) {
        var wPadding = 30,
            hPadding = 15,
            wH = $(window).height() - 2 * wPadding,
            wW = $(window).width() - 2 * wPadding,
            repoDialog = $(".repoHistoryDialog"),
            dHeaderH = 70,
            dFooterH = 70,
            dBody = repoDialog.find(".modal-body"),
            minWidth = 400;


        this._skinParts.svgPaper.setSize(contentWidth, contentHeight);

        contentWidth += 2 * wPadding;

        wW = contentWidth < wW ? contentWidth : wW;
        wW = wW < minWidth ? minWidth : wW;
        wH = contentHeight + dHeaderH + dFooterH + 2 * hPadding < wH ? contentHeight : wH - dHeaderH - dFooterH - 2 * hPadding;

        dBody.css({"max-height": wH /*- dHeaderH - dFooterH*/ });

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

        //hook up popover
        popoverMsg = "<li class='nowrap'>TimeStamp: " + new Date(parseInt(obj.timestamp, 10)) + "</li>";
        popoverMsg += "<li>Name: " + obj.branch + "</li>";
        if (obj.message) {
            popoverMsg += "<li>Message: " + obj.message + "</li>";
        }
        popoverMsg = "<ul>" + popoverMsg + "</ul>";

        if (!commitEl.hasClass("actual")) {
            popoverMsg += "<br><button class='btn btn-primary btn-mini btnLoadCommit' data-commitId='" + commitId + "'>To switch to this commit click here</button><br>";
        }

        popoverMsg += '<br><p class="muted">To create a new branch from here, specify a name and click "create":</p><div class="input-append control-group"><input class="span4" id="appendedInputButton" type="text"><button class="btn btn-info btnCreateBranch" type="button" data-commitId="' + commitId + '">Create</button></div>';

        popoverMsg += "<br><button class='btn btn-mini pull-right btnCloseCommitDetails'>Close</button><br>";

        this._lastCommitPopOver = commitEl;

        this._lastCommitPopOver.popover({"title": obj.id + "@" + obj.branch + " / " + obj.counter,
            "html": true,
            "content": popoverMsg,
            "trigger": "manual" });

        this._lastCommitPopOver.popover("show");
    };

    return RepositoryLogView;
});