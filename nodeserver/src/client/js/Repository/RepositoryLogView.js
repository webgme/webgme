"use strict";

define(['logManager',
        'loaderCircles',
        'text!./CommitDetails.html',
        'raphaeljs',
        'css!RepositoryCSS/RepositoryLogView'], function (logManager,
                                                          LoaderCircles,
                                                          commitDetailsTemplate) {

    var RepositoryLogView,
        MASTER_BRANCH_NAME = 'master',
        REPOSITORY_LOG_VIEW_CLASS = 'repositoryLogView',
        SHOW_MORE_BUTTON_TEXT = "Show more...",
        LOCAL_HEADER = 'local',
        REMOTE_HEADER = 'remote',
        SHOW_MORE_COMMIT_NUM = 5,
        COMMIT_DATA = 'commitData',
        X_DELTA = 20,
        Y_DELTA = 25,
        CONTENT_WIDTH = 1,
        CONTENT_HEIGHT = 1,
        ITEM_WIDTH = 8,     //RepositoryLogView.css - #repoDiag .item
        ITEM_HEIGHT = 8,    //RepositoryLogView.css - #repoDiag .item
        LINE_CORNER_SIZE = 5,
        HEADMARKER_Y_SHIFT = -11,
        HEADMARKER_X_SHIFT = 10;

    RepositoryLogView = function (container) {
        this._el = container;

        this.clear();

        this._logger = logManager.create("RepositoryLogView");
        this._logger.debug("Created");
    };

    RepositoryLogView.prototype.clear = function () {
        this._commits = [];
        this._branches = [];
        this._orderedCommitIds = [];
        this._y = 0;
        this._trackEnds = [];
        this._renderIndex = -1;

        //clear UI content
        this._el.empty();

        //detach event handlers
        this._el.off("click");
        this._el.off("keyup");

        this._el.parent().css({"width": "",
            "margin-left": "",
            "margin-top": ""});

        this._initializeUI();
    };

    RepositoryLogView.prototype.addBranch = function (obj) {
        if (obj.name.toLowerCase() === MASTER_BRANCH_NAME) {
            this._branches.splice(0, 0, obj);
        } else {
            this._branches.push(obj);
        }
    };

    RepositoryLogView.prototype.addCommit = function (obj) {
        var idx = this._orderedCommitIds.push(obj.id) - 1;

        this._commits.push({"x": -1,
                            "y": -1,
                            "id": obj.id,
                            "commitData": obj,
                            "ui": undefined,
                            "labels": undefined});

        this._calculatePositionForCommit(idx);
    };

    RepositoryLogView.prototype.showPogressbar = function () {
        this._btnShowMore.hide();
        this._loader.start();
    };

    RepositoryLogView.prototype.hidePogressbar = function () {
        this._loader.stop();
        this._btnShowMore.show();
    };

    RepositoryLogView.prototype.render = function () {
        this._render();
    };

    RepositoryLogView.prototype.allCommitsDisplayed = function () {
        this._allCommitsDisplayed();
    };

    /******************* PUBLIC API TO BE OVERRIDDEN IN THE CONTROLLER **********************/

    RepositoryLogView.prototype.onShowMoreClick = function (num) {
        this._logger.warning("onShowMoreClick is not overridden in Controller...num: '" + num + "'");
    };

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

    RepositoryLogView.prototype._initializeUI = function () {
        var self = this;

        this._el.empty();

        this._el.addClass(REPOSITORY_LOG_VIEW_CLASS);

        //initialize all containers

        //generate COMMITS container
        this._commitsContainer = $('<div/>', {
            "class" : "commits",
            "id": "commits",
            "tabindex": 0
        });

        this._el.append(this._commitsContainer);

        this._svgPaper = Raphael(this._commitsContainer.attr("id"));
        this._svgPaper.canvas.style.pointerEvents = "visiblePainted";
        this._svgPaper.setSize("100%", "1px");

        //generate container for 'show more' button and progress bar
        this._showMoreContainer = $('<div/>', {
            "class" : "show-more"
        });

        this._el.append(this._showMoreContainer);

        this._loader = new LoaderCircles({"containerElement": this._showMoreContainer});
        this._loader.setSize(30);

        //show more button
        this._btnShowMore = $('<a/>', {
            "class": "btn",
            "href": "#"
        });

        this._btnShowMore.append(SHOW_MORE_BUTTON_TEXT);

        this._showMoreContainer.append(this._btnShowMore);

        /*this._el.on("click.btnLoadCommit", ".btnLoadCommit", function () {
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

         this._el.on("click.iconRemove", ".icon-remove", function (event) {
         var btn = $(this),
         branch = btn.data("branch");

         self.onDeleteBranchClick(branch);

         event.stopPropagation();
         event.preventDefault();
         });

         this._el.on("click.item", ".item", function (event) {
         self._onCommitClick($(this));
         event.stopPropagation();
         event.preventDefault();
         });*/

        this._btnShowMore.on('click', null, function (event) {
            self.onShowMoreClick(SHOW_MORE_COMMIT_NUM);
            event.stopPropagation();
            event.preventDefault();
        });

        this._el.on('shown', function (event) {
            event.stopPropagation();
        });

        this._el.on('hide', function (event) {
            event.stopPropagation();
        });

        this._el.on('hidden', function (event) {
            event.stopPropagation();
        });
    };


    RepositoryLogView.prototype._calculatePositionForCommit = function (cIndex) {
        var trackLen = this._trackEnds.length,
            cCommit = this._commits[cIndex],
            trackEndCommit,
            i,
            foundTrack = false,
            cIdx;

        //check which trackBottom's parent is this guy
        for (i = 0; i < trackLen; i += 1) {
            cIdx = this._orderedCommitIds.indexOf(this._trackEnds[i]);
            trackEndCommit = this._commits[cIdx];
            if (trackEndCommit[COMMIT_DATA].parents.indexOf(cCommit.id) !== -1) {
                foundTrack = true;
                break;
            }
        }

        //vertically it is sure to be next
        cCommit.y = this._y;
        this._y += Y_DELTA;

        //horizontally it goes to the same 'column' as the found trackEnd
        if (foundTrack === true) {
            cCommit.x = trackEndCommit.x;
            this._trackEnds[i] = cCommit.id;
        } else {
            //no fitting track-end found, start a new track for it
            this._trackEnds.push(cCommit.id);
            cCommit.x = (this._trackEnds.length - 1) * X_DELTA;
        }

        this._logger.warning("commitID: " + cCommit.id + ", X: " + cCommit.x + ", Y: " + cCommit.y);
    };


    RepositoryLogView.prototype._render = function () {
        //render commits from this._renderIndex + 1 --> lastItem
        var len = this._commits.length,
            cCommit,
            idx = this._renderIndex === -1 ? 0 : this._renderIndex,
            itemObj,
            i,
            pIdx,
            j;

        //draw the commit points
        for (i = idx ; i < len; i += 1) {
            cCommit = this._commits[i];
            itemObj= cCommit.ui = this._createItem({"x": cCommit.x,
                "y": cCommit.y,
                "counter": i,
                "id": cCommit.id,
                "parents": cCommit[COMMIT_DATA].parents,
                "actual": cCommit[COMMIT_DATA].actual,
                "branch": cCommit[COMMIT_DATA].branch,
                "isLocalHead": cCommit[COMMIT_DATA].isLocalHead,
                "isRemoteHead": cCommit[COMMIT_DATA].isRemoteHead});
        }

        this._renderIndex = i;

        //draw the connections
        for (i = 0 ; i < len; i += 1) {
            cCommit = this._commits[i];

            //draw lines to parents
            if (cCommit[COMMIT_DATA].parents && cCommit[COMMIT_DATA].parents.length > 0) {
                for (j = 0; j < cCommit[COMMIT_DATA].parents.length; j += 1) {
                    pIdx = this._orderedCommitIds.indexOf(cCommit[COMMIT_DATA].parents[j]);
                    if (pIdx >= idx) {
                        this._drawLine(this._commits[pIdx], cCommit);
                    }
                }
            }
        }

        this._resizeDialog(CONTENT_WIDTH, CONTENT_HEIGHT);

        this._applyHeaderLabels();
    };


    RepositoryLogView.prototype._applyHeaderLabels = function () {
        var len = this._branches.length,
            idx;

        while (len--) {
            if (this._branches[len].remoteHeadUI !== true) {
                idx = this._orderedCommitIds.indexOf(this._branches[len].remoteHead);
                if ( idx !== -1 ) {
                    this._applyHeaderLabel(this._commits[idx], this._branches[len].name, REMOTE_HEADER);
                    this._branches[len].remoteHeadUI = true;
                }
            }

            if (this._branches[len].localHeadUI !== true) {
                idx = this._orderedCommitIds.indexOf(this._branches[len].localHead);
                if ( idx !== -1 ) {
                    this._applyHeaderLabel(this._commits[idx], this._branches[len].name, LOCAL_HEADER);
                    this._branches[len].localHeadUI = true;
                }
            }
        }
    };


    RepositoryLogView.prototype._applyHeaderLabel = function (commit, branchName, headerType) {
        var headMarkerEl = commit.labels,
            label = $('<div class="tooltiplabel right"><div class="tooltiplabel-arrow"></div><div class="tooltiplabel-inner">' + branchName + '<i data-branch="' + branchName + '" class="icon-remove icon-white" title="Delete branch"></i></div></div>');

        if (headMarkerEl === undefined) {
            commit.labels = $('<div class="commitHeadWrapper"></div>');
            headMarkerEl = commit.labels;

            headMarkerEl.css({"top": commit.y + HEADMARKER_Y_SHIFT,
                "left": commit.x + HEADMARKER_X_SHIFT});

            this._commitsContainer.append(headMarkerEl);
        }

        if (headerType === REMOTE_HEADER) {
            label.addClass('remote-head');
        } else {
            label.addClass('local-head');
        }

        headMarkerEl.append(label);
    };


    RepositoryLogView.prototype._createItem = function (params) {
        var itemObj;

        itemObj =  $('<div/>', {
            "class" : "item",
            "data-id": params.id,
            "data-b": params.branch
        });

        itemObj.css({"left": params.x,
            "top": params.y});

        if (params.actual) {
            itemObj.addClass("actual");
        }

        this._commitsContainer.append(itemObj);

        CONTENT_WIDTH = Math.max(CONTENT_WIDTH,  params.x + ITEM_WIDTH);
        CONTENT_HEIGHT = Math.max(CONTENT_HEIGHT,  params.y + ITEM_HEIGHT);

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

        this._svgPaper.path(pathDef.join(","));
    };


    RepositoryLogView.prototype._resizeDialog = function (contentWidth, contentHeight) {
        var WINDOW_PADDING = 30,
            DIALOG_HEADER_HEIGHT = 70,
            DIALOG_FOOTER_HEIGHT = 70,
            wH = $(window).height(),
            wW = $(window).width(),
            repoDialog = $(".repoHistoryDialog"),
            dBody = repoDialog.find(".modal-body");

        this._svgPaper.setSize(contentWidth, contentHeight);

        //make it almost "full screen"
        wW = wW - 2 * WINDOW_PADDING;
        wH = wH - 2 * WINDOW_PADDING - DIALOG_HEADER_HEIGHT - DIALOG_FOOTER_HEIGHT;

        dBody.css({"max-height": wH });

        repoDialog.removeClass("fade ");

        repoDialog.css({"width": wW,
            "margin-left": wW / 2 * (-1),
            "margin-top": repoDialog.height() / 2 * (-1),
            "top": "50%"});
    };


    RepositoryLogView.prototype._allCommitsDisplayed = function () {
        this._btnShowMore.hide();

        this._btnShowMore.off('click');

        this._loader.destroy();

        //generate container for 'show more' button and progress bar
        this._showMoreContainer.empty();
        this._showMoreContainer.remove();
        this._showMoreContainer = undefined;
    };


    RepositoryLogView.prototype._onCommitClick = function (commitEl) {
        var commitId = commitEl.data("id"),
            popoverMsg,
            obj = this._commits[commitId],
            left = commitEl.position().left,
            bodyW = $('body').width(),
            placement = left < bodyW / 2 ? 'right' : 'left';

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
            "trigger": "manual",
            "placement": placement});

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