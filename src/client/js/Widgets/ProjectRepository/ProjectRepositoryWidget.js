/*globals define, Raphael, WebGMEGlobal, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define(['js/logger',
    'js/util',
    'js/Loader/LoaderCircles',
    './ProjectRepositoryWidgetControl',
    'common/regexp',
    'moment',
    'blockies',
    'raphaeljs',
    'css!./styles/ProjectRepositoryWidget.css'
], function (Logger,
             util,
             LoaderCircles,
             ProjectRepositoryWidgetControl,
             REGEXP,
             moment,
             blockies) {
    'use strict';

    var ProjectRepositoryWidget,
        MASTER_BRANCH_NAME = 'master',
        REPOSITORY_LOG_VIEW_CLASS = 'project-repository-widget',
        SHOW_MORE_BUTTON_TEXT = 'Show more...',
        COMMIT_PACKAGE_COUNT = 100,
        COMMIT_DATA = 'commitData',
        COMMIT_CLASS = 'commit',
        ACTUAL_COMMIT_CLASS = 'actual',
        X_DELTA = 15,
        Y_DELTA = 25,   //Widgets/ProjectRepository/ProjectRepositoryWidget.scss - $table-row-height
        CONTENT_WIDTH = 1,
        CONTENT_HEIGHT = 1,
        ITEM_WIDTH = 8,     //Widgets/ProjectRepository/ProjectRepositoryWidget.scss - $commit-size
        ITEM_HEIGHT = 8,    //Widgets/ProjectRepository/ProjectRepositoryWidget.scss - $commit-size
        LINE_CORNER_SIZE = 5,
        LINE_FILL_COLOR = '#000000',
        NON_EXISTING_PARENT_LINE_GRADIENT_NAME = 'grad1',
        CREATE_BRANCH_EDIT_CONTROL_CLASS = 'create-branch-from-commit',
        BRANCH_LABEL_CLASS = 'branch-label',
        TAG_LABEL_CLASS = 'tag-label',
        COMMON_LABEL_CLASS = 'common-label',
        BTN_LOAD_COMMIT_CLASS = 'btnLoadCommit',
        COMMIT_IT = 'commitId',
        MESSAGE_DIV_CLASS = 'commit-message',
        USER_TO_AVATAR_PATH = {};

    ProjectRepositoryWidget = function (container, client, params) {
        var commitCount = 'commit_count';
        this._el = container;
        this._historyType = 'commits';
        this._start = null;
        this._projectAccess = client.getProjectAccess();
        this.clear();
        this._initializeUI();

        if (params) {
            COMMIT_PACKAGE_COUNT = params[commitCount] || COMMIT_PACKAGE_COUNT;
            this._start = params.start;
        }

        //attach its controller
        new ProjectRepositoryWidgetControl(client, this);

        this._logger = Logger.create('gme:Widgets:ProjectRepository:ProjectRepositoryWidget',
            WebGMEGlobal.gmeConfig.client.log);
        this._logger.debug('Created');
    };

    ProjectRepositoryWidget.prototype.clear = function () {
        this._commits = [];
        this._orderedCommitIds = [];
        this._actualCommitId = undefined;
        this._branches = [];
        this._branchNames = [];
        this._branchListUpdated = false;
        this._tags = [];
        this._tagNames = [];
        this._tagListUpdated = false;

        this._y = 0;
        this._trackEnds = [];
        this._renderIndex = -1;

        this._width = CONTENT_WIDTH;
        this._height = CONTENT_HEIGHT;

        this._nonExistingParentPaths = [];

        //clear UI content
        this._el.empty();

        //detach event handlers
        this._el.off('click');
        this._el.off('keyup');

        this._el.parent().css({
            width: '',
            'margin-left': '',
            'margin-top': '',
            top: ''
        });
    };

    ProjectRepositoryWidget.prototype.destroy = function () {
        this.clear();
        this._el.removeClass(REPOSITORY_LOG_VIEW_CLASS);
    };

    ProjectRepositoryWidget.prototype.addBranch = function (obj) {
        this._addBranch(obj);
    };

    ProjectRepositoryWidget.prototype.clearBranches = function () {
        this._clearBranches();
    };

    ProjectRepositoryWidget.prototype.addTag = function (obj) {
        this._addTag(obj);
    };

    ProjectRepositoryWidget.prototype.clearTags = function () {
        this._clearTags();
    };

    ProjectRepositoryWidget.prototype.addCommit = function (obj) {
        var idx = this._orderedCommitIds.push(obj.id) - 1;

        this._commits.push({
            x: -1,
            y: -1,
            id: obj.id,
            commitData: obj,
            ui: undefined
        });

        this._calculatePositionForCommit(idx);
    };

    ProjectRepositoryWidget.prototype.showProgressbar = function () {
        this._btnShowMore.hide();
        this._loader.start();
    };

    ProjectRepositoryWidget.prototype.hideProgressbar = function () {
        this._loader.stop();
        this._btnShowMore.show();
    };

    ProjectRepositoryWidget.prototype.render = function () {
        this._render();
    };

    ProjectRepositoryWidget.prototype.noMoreCommitsToDisplay = function () {
        this._noMoreCommitsToDisplay();
    };

    ProjectRepositoryWidget.prototype.loadMoreCommits = function (start) {
        if (start) {
            this.onLoadMoreCommits(this._commits.length + COMMIT_PACKAGE_COUNT, start);
        } else {
            this.onLoadMoreCommits(COMMIT_PACKAGE_COUNT, start);
        }
    };

    ProjectRepositoryWidget.prototype.branchesAndTagsUpdated = function () {
        if (this._commits.length === 0) {
            this._table.addClass('no-commits-in-table');
        } else {
            this._table.removeClass('no-commits-in-table');
        }
    };

    /******************* PUBLIC API TO BE OVERRIDDEN IN THE CONTROLLER **********************/

    ProjectRepositoryWidget.prototype.onLoadMoreCommits = function (num, start) {
        this._logger.warn('onLoadMoreCommits not overridden in Controller num: "' + num + '", start: "' + start + '"');
    };

    ProjectRepositoryWidget.prototype.onLoadCommit = function (params) {
        this._logger.warn('onLoadCommit is not overridden in Controller...params: \'' + JSON.stringify(params) + '\'');
    };

    ProjectRepositoryWidget.prototype.onDeleteBranchClick = function (branchName, branchHash) {
        this._logger.warn('onDeleteBranchClick is not overridden in Controller...branch, branchHash:',
            branchName, branchHash);
    };

    ProjectRepositoryWidget.prototype.onDeleteTagClick = function (branchName, branchHash) {
        this._logger.warn('onDeleteTagClick is not overridden in Controller...branch, branchHash:',
            branchName, branchHash);
    };

    ProjectRepositoryWidget.prototype.onCreateBranchFromCommit = function (params) {
        this._logger.warn('onCreateBranchFromCommit is not overridden in Controller...params: \'' +
            JSON.stringify(params) + '\'');
    };

    ProjectRepositoryWidget.prototype.onCreateTagFromCommit = function (params) {
        this._logger.warn('onCreateTagFromCommit is not overridden in Controller...params: \'' +
            JSON.stringify(params) + '\'');
    };

    ProjectRepositoryWidget.prototype.onSelectBranch = function (params) {
        this._logger.warn('onSelectBranch is not overridden in Controller...params: \'' +
            JSON.stringify(params) + '\'');
    };

    /******************* PRIVATE API *****************************/

    ProjectRepositoryWidget.cMessageStyleStr = 'div.' + MESSAGE_DIV_CLASS + ' { max-width: __MW__px; }';

    ProjectRepositoryWidget.prototype._initializeUI = function () {
        var self = this;

        this._el.empty();

        this._el.addClass(REPOSITORY_LOG_VIEW_CLASS);

        //initialize all containers
        this._cMessageStyle = $('<style/>', {type: 'text/css'});
        this._cMessageStyle.html(ProjectRepositoryWidget.cMessageStyleStr.replace('__MW__', '400'));
        this._el.append(this._cMessageStyle);

        /*table layout*/
        this._table = $('<table/>', {class: 'table table-hover user-select-on commit-list'});
        this._tHead = $('<thead/>');
        this._tHead.append($('<tr><th>Graph</th><th>Actions</th><th>Commit</th>' +
            '<th>Message</th><th>User</th><th>Time</th></tr>'));
        this._tBody = $('<tbody/>');

        this._table.append(this._tHead).append(this._tBody);

        this._tableCellActionsIndex = 1;
        this._tableCellCommitIDIndex = 2;
        this._tableCellMessageIndex = 3;
        this._tableCellUserIndex = 4;
        this._tableCellTimeStampIndex = 5;

        this._el.append(this._table);

        //generate container for 'show more' button and progress bar
        this._showMoreContainer = $('<div/>', {
            class: 'show-more'
        });

        this._el.append(this._showMoreContainer);

        this._loader = new LoaderCircles({containerElement: this._showMoreContainer});
        this._loader.setSize(30);

        //show more button
        this._btnShowMore = $('<a/>', {
            class: '',
            href: '#'
        });

        this._btnShowMore.append(SHOW_MORE_BUTTON_TEXT);

        this._showMoreContainer.append(this._btnShowMore);

        //generate COMMITS container
        this._commitsContainer = $('<div/>', {
            class: 'commits',
            /*"id": "commits",*/
            tabindex: 0
        });

        this._el.append(this._commitsContainer);

        this._svgPaper = Raphael(this._commitsContainer[0]); //jshint ignore: line
        this._svgPaper.canvas.style.pointerEvents = 'visiblePainted';
        this._svgPaper.setSize('100%', '1px');
        $(this._svgPaper.canvas).css({top: '0'});

        this._generateSVGGradientDefinition();

        /*********** HOOK UP EVENT HANDLERS ***********/
        this._el.on('click.' + BTN_LOAD_COMMIT_CLASS, '.' + BTN_LOAD_COMMIT_CLASS, function () {
            var btn = $(this),
                commitId = btn.data(COMMIT_IT);

            self.onLoadCommit({id: commitId});
        });

        this._el.on('click.iconRemove', '.remove-branch-button', function (event) {
            var btn = $(this),
                branchName = btn.data('branch') + '', //force to be string
                branchHash,
                i;

            for (i = 0; i < self._branches.length; i += 1) {
                if (self._branches[i].name === branchName) {
                    branchHash = self._branches[i].commitId;
                }
            }

            self.onDeleteBranchClick(branchName, branchHash);

            event.stopPropagation();
            event.preventDefault();
        });

        this._el.on('click.iconRemove', '.remove-tag-button', function (event) {
            var btn = $(this),
                tagName = btn.data('tag') + ''; //force to be string

            self.onDeleteTagClick(tagName);

            event.stopPropagation();
            event.preventDefault();
        });

        this._el.on('click.select-branch-in-text', '.select-branch-in-text', function (event) {
            var branchName = $(this).text();

            self.onSelectBranch(branchName);

            event.stopPropagation();
            event.preventDefault();
        });

        this._btnShowMore.on('click', null, function (event) {
            self.loadMoreCommits(self._start);

            event.stopPropagation();
            event.preventDefault();
        });


        this._el.off('click.btnCreateBranchFromCommit', '.btnCreateBranchFromCommit');
        this._el.on('click.btnCreateBranchFromCommit', '.btnCreateBranchFromCommit', function () {
            self._onCreateFromCommitButtonClick($(this));
        });

        this._el.off('click.btnCreateTagFromCommit', '.btnCreateTagFromCommit');
        this._el.on('click.btnCreateTagFromCommit', '.btnCreateTagFromCommit', function () {
            self._onCreateFromCommitButtonClick($(this));
        });
    };


    ProjectRepositoryWidget.prototype._calculatePositionForCommit = function (cIndex) {
        var trackLen = this._trackEnds.length,
            cCommit = this._commits[cIndex],
            trackEndCommit,
            i,
            foundTrack = false,
            cIdx,
            masterRemoteHeadCommit = false;

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
            if (this._branches && this._branches.length > 0) {
                if (this._branches[0].name === MASTER_BRANCH_NAME && this._branches[0].commitId === cCommit.id) {
                    masterRemoteHeadCommit = true;
                }
            }
            if (masterRemoteHeadCommit === true) {
                //insert this guy to be the first track from the left
                this._trackEnds.splice(0, 0, cCommit.id);
                cCommit.x = 0;

                //shift all the already existing commits by one to the right
                i = this._commits.length - 1;
                while (i--) {
                    this._commits[i].x += X_DELTA;
                }
                this._renderIndex = -1;
            } else {
                this._trackEnds.push(cCommit.id);
                cCommit.x = (this._trackEnds.length - 1) * X_DELTA;
            }
        }

        //this._logger.debug("commitID: " + cCommit.id + ", X: " + cCommit.x + ", Y: " + cCommit.y);
    };


    ProjectRepositoryWidget.prototype._render = function () {
        //render commits from this._renderIndex + 1 to lastItem
        var len = this._commits.length,
            cCommit,
            idx = this._renderIndex === -1 ? 0 : this._renderIndex,
            i,
            pIdx,
            j,
            hasVisibleParent;

        //render from the beginning
        //clear commit container
        if (this._renderIndex === -1) {
            this._commitsContainer.find('.' + COMMIT_CLASS).remove();
            this._svgPaper.clear();

            this._tBody.empty();
        }

        //draw the commit points
        for (i = idx; i < len; i += 1) {
            cCommit = this._commits[i];
            if (cCommit.ui) {
                cCommit.ui.remove();
            }
            cCommit.ui = this._createItem({
                x: cCommit.x,
                y: cCommit.y,
                id: cCommit.id,
                parents: cCommit[COMMIT_DATA].parents,
                branch: cCommit[COMMIT_DATA].branch,
                user: cCommit[COMMIT_DATA].user,
                timestamp: cCommit[COMMIT_DATA].timestamp,
                message: cCommit[COMMIT_DATA].message
            });
        }

        this._renderIndex = i;

        this._resizeDialog(this._width, this._height);

        //remove all nonexsiting parent connections
        i = this._nonExistingParentPaths.length;
        while (i--) {
            this._nonExistingParentPaths[i].remove();
        }
        this._nonExistingParentPaths = [];

        //draw the connections
        for (i = 0; i < len; i += 1) {
            cCommit = this._commits[i];

            //draw lines to parents
            if (cCommit[COMMIT_DATA].parents && cCommit[COMMIT_DATA].parents.length > 0) {
                hasVisibleParent = false;
                for (j = 0; j < cCommit[COMMIT_DATA].parents.length; j += 1) {
                    pIdx = this._orderedCommitIds.indexOf(cCommit[COMMIT_DATA].parents[j]);
                    if (pIdx >= idx) {
                        this._drawLine(this._commits[pIdx], cCommit);
                    }

                    hasVisibleParent = pIdx !== -1;
                }

                if (hasVisibleParent === false) {
                    //has no visible parent
                    //ie no line connecting to this guy, just floats in the air
                    //draw a line to the bottom of the page with a lighter color
                    this._drawLine(undefined, cCommit);
                }
            }
        }

        this._addBranchHeaderLabels();
        this._addTagHeaderLabels();
    };

    ProjectRepositoryWidget.prototype._removeBranchHeaderLabels = function () {
        this._tBody.find('.' + BRANCH_LABEL_CLASS).remove();
    };

    ProjectRepositoryWidget.prototype._removeTagHeaderLabels = function () {
        this._tBody.find('.' + TAG_LABEL_CLASS).remove();
    };

    ProjectRepositoryWidget.prototype._addBranchHeaderLabels = function () {
        var len = this._branches.length,
            idx;

        //update branch information only if any update happened
        if (this._branchListUpdated === true) {
            //remove existing labels
            this._removeBranchHeaderLabels();

            while (len--) {
                idx = this._orderedCommitIds.indexOf(this._branches[len].commitId);
                if (idx !== -1) {
                    this._applyBranchHeaderLabel(this._commits[idx], this._branches[len].name);
                }
            }

            this._branchListUpdated = false;
        }
    };

    ProjectRepositoryWidget.prototype._addTagHeaderLabels = function () {
        var len = this._tags.length,
            idx;

        //update branch information only if any update happened
        if (this._tagListUpdated === true) {
            //remove existing labels
            this._removeTagHeaderLabels();

            while (len--) {
                idx = this._orderedCommitIds.indexOf(this._tags[len].commitId);
                if (idx !== -1) {
                    this._applyTagHeaderLabel(this._commits[idx], this._tags[len].name);
                }
            }

            this._tagListUpdated = false;
        }
    };

    ProjectRepositoryWidget.prototype._branchLabelDOMBase = $(
        '<span class="label"><span class="label-name select-branch-in-text" title="Select branch"></span><i data-branch="" ' +
        'class="glyphicon glyphicon-remove icon-white remove-branch-button" title="Delete branch"></i></span>'
    );

    ProjectRepositoryWidget.prototype._tagLabelDOMBase = $(
        '<span class="label"><span class="label-name"><i data-tag="" ' +
        'class="glyphicon glyphicon-tag tag-label-icon"></i></span>'
    );

    ProjectRepositoryWidget.prototype._applyBranchHeaderLabel = function (commit, branchName) {
        var label = this._branchLabelDOMBase.clone(),
            td,
            div;

        label.find('span.label-name').text(branchName);
        label.find('i').attr('data-branch', branchName);
        label.addClass(BRANCH_LABEL_CLASS);
        label.addClass(COMMON_LABEL_CLASS);

        label.addClass('label-success');

        if (this._projectAccess.write === false) {
            label.addClass('delete-prohibited');
        }


        td = this._tBody.children()[this._orderedCommitIds.indexOf(commit.id)].cells[this._tableCellMessageIndex];
        div = $(td).find('div.' + MESSAGE_DIV_CLASS)[0];
        div.insertBefore(label[0], div.childNodes[0]);
    };

    ProjectRepositoryWidget.prototype._applyTagHeaderLabel = function (commit, tagName) {
        var label = this._tagLabelDOMBase.clone(),
            td,
            div;

        label.find('span.label-name').text(tagName);
        label.append($('<i data-tag="' + tagName + '" class="glyphicon glyphicon-remove icon-white remove-tag-button"' +
            ' title="Delete tag"/>'));

        label.addClass(TAG_LABEL_CLASS);
        label.addClass(COMMON_LABEL_CLASS);

        label.addClass('label-primary');

        if (this._projectAccess.delete === false) {
            label.addClass('delete-prohibited');
        }

        td = this._tBody.children()[this._orderedCommitIds.indexOf(commit.id)].cells[this._tableCellMessageIndex];
        div = $(td).find('div.' + MESSAGE_DIV_CLASS)[0];
        div.insertBefore(label[0], div.childNodes[0]);
    };

    ProjectRepositoryWidget.prototype._addBranch = function (obj) {

        var branchName = obj.name,
            idx;

        idx = this._branchNames.indexOf(branchName);

        if (idx !== -1) {
            //branch info already in the list
            this._branches[idx] = obj;
        } else {
            if (branchName === MASTER_BRANCH_NAME) {
                this._branches.splice(0, 0, obj);
                this._branchNames.splice(0, 0, branchName);
            } else {
                this._branches.push(obj);
                this._branchNames.push(branchName);
            }
        }

        this._branchListUpdated = true;

        this._addBranchHeaderLabels();
    };

    ProjectRepositoryWidget.prototype._addTag = function (obj) {

        var tagName = obj.name,
            idx;

        idx = this._tagNames.indexOf(tagName);

        if (idx !== -1) {
            //branch info already in the list
            this._tags[idx] = obj;
        } else {
            this._tags.push(obj);
            this._tagNames.push(tagName);
        }

        this._tagListUpdated = true;

        this._addTagHeaderLabels();
    };

    ProjectRepositoryWidget.prototype._clearBranches = function () {
        this._branches = [];
        this._branchNames = [];

        this._removeBranchHeaderLabels();

        this._branchListUpdated = true;
    };

    ProjectRepositoryWidget.prototype._clearTags = function () {
        this._tags = [];
        this._tagNames = [];

        this._removeTagHeaderLabels();

        this._tagListUpdated = true;
    };

    ProjectRepositoryWidget.prototype._trDOMBase = $(
        '<tr><td></td><td class="actions"></td><td class="commit-hash"></td><td class="message-column">' +
        '<div class="' + MESSAGE_DIV_CLASS + '"></div></td><td></td><td></td></tr>'
    );
    ProjectRepositoryWidget.prototype._createBranchBtnDOMBase = $(
        '<button class="btn btn-default btn-xs btnCreateBranchFromCommit" ' +
        'href="#" title="Create new branch from here">' +
        '<i class="glyphicon glyphicon-edit create-branch-icon"></i></button>'
    );
    ProjectRepositoryWidget.prototype._createTagBtnDOMBase = $(
        '<button class="btn btn-default btn-xs btnCreateTagFromCommit" ' +
        'href="#" title="Create a tag here">' +
        '<i class="glyphicon glyphicon-tags create-tag-icon"></i></button>'
    );

    //ProjectRepositoryWidget.prototype._loadCommitBtnDOMBase = $('' +
    //    '<button class="btn btn-default btn-xs ' + BTN_LOAD_COMMIT_CLASS + '" href="#" title="Load this commit">' +
    //    '<i class="glyphicon glyphicon-share"></i></button>'
    //);


    ProjectRepositoryWidget.prototype._createItem = function (params) {
        var itemObj,
            tr,
            btn,
            firstRow = this._tBody.children().length === 0,
            userId = params.user || '',
            when;

        itemObj = $('<div/>', {
            class: COMMIT_CLASS,
            'data-id': params.id,
            'data-b': params.branch
        });

        itemObj.css({
            left: params.x,
            top: params.y
        });

        if (params.actual) {
            itemObj.addClass('actual');
        }

        this._commitsContainer.append(itemObj);

        this._width = Math.max(this._width, params.x + ITEM_WIDTH);
        this._height = Math.max(this._height, params.y + ITEM_HEIGHT);

        //generate table row for this guy
        tr = this._trDOMBase.clone();

        //fill the data into the columns
        if (firstRow === true) {
            this._graphPlaceHolder = $('<div/>');
            $(tr[0].cells[0]).append(this._graphPlaceHolder);
        }

        when = new Date(parseInt(params.timestamp, 10));

        $(tr[0].cells[this._tableCellCommitIDIndex]).append(params.id.substr(0, 7));
        $(tr[0].cells[this._tableCellCommitIDIndex]).attr('title', 'Select commit ' + params.id);
        $(tr[0].cells[this._tableCellCommitIDIndex]).addClass(BTN_LOAD_COMMIT_CLASS);
        $(tr[0].cells[this._tableCellCommitIDIndex]).data(COMMIT_IT, params.id);
        $(tr[0].cells[this._tableCellMessageIndex]).find('div.' + MESSAGE_DIV_CLASS).text(params.message);

        if (USER_TO_AVATAR_PATH.hasOwnProperty(userId) === false) {
            USER_TO_AVATAR_PATH[userId] = blockies({
                seed: userId,
                size: 6,
                scale: 8
            }).toDataURL();
        }

        $(tr[0].cells[this._tableCellUserIndex]).addClass('user-column');

        $(tr[0].cells[this._tableCellUserIndex]).append(
            $('<span class="avatar-container">' + userId +
                '<img class="avatar-image" src="' + USER_TO_AVATAR_PATH[userId] + '"/></span>'));

        $(tr[0].cells[this._tableCellTimeStampIndex]).append(
            //util.formattedDate(new Date(parseInt(params.timestamp, 10)), 'elapsed')
            moment(when).fromNow()
        );

        $(tr[0].cells[this._tableCellTimeStampIndex]).attr(
            'title', moment(when).local().format('dddd, MMMM Do YYYY, h:mm:ss a')
        );

        //generate 'Create branch from here' button
        btn = this._createBranchBtnDOMBase.clone();
        btn.data(COMMIT_IT, params.id);
        if (this._projectAccess.write === false) {
            btn.disable(true);
        }

        tr[0].cells[this._tableCellActionsIndex].appendChild(btn[0]);

        //generate 'Create tag here' button
        btn = this._createTagBtnDOMBase.clone();
        btn.data(COMMIT_IT, params.id);
        if (this._projectAccess.write === false) {
            btn.disable(true);
        }

        tr[0].cells[this._tableCellActionsIndex].appendChild(btn[0]);

        //generate 'switch to this commit' button
        //btn = this._generateLoadCommitBtnForCommit(params.id);
        //tr[0].cells[this._tableCellActionsIndex].appendChild(btn[0]);

        this._tBody.append(tr);

        return itemObj;
    };

    //ProjectRepositoryWidget.prototype._generateLoadCommitBtnForCommit = function (commitId) {
    //    var btn = this._loadCommitBtnDOMBase.clone();
    //    btn.data(COMMIT_IT, commitId);
    //
    //    return btn;
    //};

    ProjectRepositoryWidget.prototype.setActualCommitId = function (commitId) {
        var oldId = this._actualCommitId;

        if (this._actualCommitId !== commitId) {
            this._actualCommitId = commitId;

            this._updateActualCommitUI(oldId, this._actualCommitId);
        }
    };

    ProjectRepositoryWidget.prototype._updateActualCommitUI = function (oldId, newId) {
        var idx = this._orderedCommitIds.indexOf(oldId);

        //remove old actual marker
        if (idx !== -1) {
            this._commits[idx].ui.removeClass(ACTUAL_COMMIT_CLASS);

            //btn = this._generateLoadCommitBtnForCommit(oldId);

            //add 'LoadCommit' button to that row
            //this._tBody.children()[idx].cells[this._tableCellActionsIndex].appendChild(btn[0]);
        }

        //add 'actual' marker to new value
        idx = this._orderedCommitIds.indexOf(newId);
        if (idx !== -1) {
            //add 'actual' class to commit DOM
            this._commits[idx].ui.addClass(ACTUAL_COMMIT_CLASS);

            //remove 'LoadCommit' button from that row
            $(this._tBody.children()[idx].cells[this._tableCellActionsIndex]).
                find('.' + BTN_LOAD_COMMIT_CLASS).remove();
        }
    };

    ProjectRepositoryWidget.prototype._drawLine = function (srcDesc, dstDesc) {
        var pathDef,
            nonVisibleSource = srcDesc === undefined,
            x = nonVisibleSource ? dstDesc.x + ITEM_WIDTH / 2 : srcDesc.x + ITEM_WIDTH / 2,
            y = nonVisibleSource ? this._height : srcDesc.y + ITEM_HEIGHT / 2,
            x2 = dstDesc.x + ITEM_WIDTH / 2,
            y2 = dstDesc.y + ITEM_HEIGHT / 2,
            dX = x2 - x,
            path,
            pathDefGradient;

        if (dX === 0) {
            //vertical line
            y2 = dstDesc.y + ITEM_HEIGHT + 2;

            if (nonVisibleSource === false) {
                y = srcDesc.y - 2;
                pathDef = ['M', x, y, 'L', x2, y2];
            } else {
                //is it the most bottom commit circle??
                if (y !== dstDesc.y + ITEM_HEIGHT) {
                    //will be drawn as two separate path
                    //send one will be the gradient
                    pathDef = ['M', x, y - Y_DELTA, 'L', x2, y2];

                    //inject fake initial "move to" --> Gradient will be applied
                    pathDefGradient = ['M', x - 1, y, 'M', x, y, 'L', x2, y - Y_DELTA];
                }
            }
        } else {
            //multiple segment line
            if (x2 < x) {
                //from right to left (merge)
                x2 = dstDesc.x + ITEM_WIDTH + 2;
                y = srcDesc.y - 1;
                y2 += 1;
                pathDef = ['M', x, y, 'L', x, y2 + LINE_CORNER_SIZE, 'L', x - LINE_CORNER_SIZE, y2, 'L', x2, y2];
            } else {
                //from left to right (new branch)
                x = srcDesc.x + ITEM_WIDTH + 2;
                y2 = dstDesc.y + ITEM_HEIGHT + 3;
                y += 1;
                pathDef = ['M', x, y, 'L', x2 - LINE_CORNER_SIZE, y, 'L', x2, y - LINE_CORNER_SIZE, 'L', x2, y2];
            }
        }


        if (nonVisibleSource === true) {
            if (pathDef) {
                path = this._svgPaper.path(pathDef.join(','));
                path.attr({stroke: LINE_FILL_COLOR});
                this._nonExistingParentPaths.push(path);
            }

            if (pathDefGradient) {
                path = this._svgPaper.path(pathDefGradient.join(','));

                path.node.setAttribute('stroke', 'url(#' + NON_EXISTING_PARENT_LINE_GRADIENT_NAME + ')');
                this._nonExistingParentPaths.push(path);
            }
        } else {
            path = this._svgPaper.path(pathDef.join(','));
            path.attr({stroke: LINE_FILL_COLOR});
        }
    };

    ProjectRepositoryWidget.prototype._resizeDialog = function (contentWidth, contentHeight) {
        var WINDOW_PADDING = 30,
            DIALOG_HEADER_HEIGHT = 70,
            DIALOG_FOOTER_HEIGHT = 70,
            wH = $(window).height(),
            wW = $(window).width(),
            tWidth;

        this._svgPaper.setSize(contentWidth, contentHeight);
        this._generateSVGGradientDefinition();

        //set the correct with for the 'Graph' column in the table to fit the drawn graph
        this._graphPlaceHolder.css('width', contentWidth);

        //make it almost "full screen"
        wW = wW - 2 * WINDOW_PADDING;
        wH = wH - 2 * WINDOW_PADDING - DIALOG_HEADER_HEIGHT - DIALOG_FOOTER_HEIGHT;

        this._cMessageStyle.html(ProjectRepositoryWidget.cMessageStyleStr.replace('__MW__', wW * 0.66));

        tWidth = this._table.width();
        this._showMoreContainer.css('width', tWidth);
    };

    ProjectRepositoryWidget.prototype._noMoreCommitsToDisplay = function () {
        this._btnShowMore.hide();

        this._btnShowMore.off('click');

        this._loader.destroy();

        //generate container for 'show more' button and progress bar
        this._showMoreContainer.empty();
        this._showMoreContainer.remove();
        this._showMoreContainer = undefined;
    };

    ProjectRepositoryWidget.prototype._generateSVGGradientDefinition = function () {
        if (!this._svgPaper.canvas.getElementById(NON_EXISTING_PARENT_LINE_GRADIENT_NAME)) {
            //generate gradient color dinamically into SVG
            var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs'),
                linearGradient, stop0, stop1;

            linearGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
            linearGradient.setAttribute('x1', '0%');
            linearGradient.setAttribute('x2', '0%');
            linearGradient.setAttribute('y1', '0%');
            linearGradient.setAttribute('y2', '100%');
            linearGradient.setAttribute('id', NON_EXISTING_PARENT_LINE_GRADIENT_NAME);


            stop0 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop0.setAttribute('offset', '0%');
            stop0.setAttribute('style', 'stop-color: ' + LINE_FILL_COLOR);

            stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop1.setAttribute('offset', '100%');
            stop1.setAttribute('style', 'stop-color: #FFFFFF');

            linearGradient.appendChild(stop0);
            linearGradient.appendChild(stop1);

            defs.appendChild(linearGradient);

            this._svgPaper.canvas.appendChild(defs);
        }
    };

    ProjectRepositoryWidget.prototype._onCreateFromCommitButtonClick = function (btn) {
        var td = btn.parent(),
            currentBranchCreateCtrl,
            isBranch = btn.hasClass('btnCreateBranchFromCommit'),
            createBranchHTML = $('<div class="input-group form-group"></div>'),
            txtInput = $('<input class="form-control span2 input-mini" type="text">'),
            btnSave = $('<button class="btn btn-default btn-xs" type="button" title="Create">' +
                '<i class="glyphicon glyphicon-ok"></i></button>'),
            btnCancel = $('<button class="btn btn-default btn-xs" type="button" title="Cancel">' +
                '<i class="glyphicon glyphicon-remove"></i></button>'),
            self = this;

        //find already displayed branch create control and 'cancel' it
        currentBranchCreateCtrl = this._tBody.find('.' + CREATE_BRANCH_EDIT_CONTROL_CLASS + ' > .btn');
        if (currentBranchCreateCtrl.length !== 0) {
            $(currentBranchCreateCtrl[1]).trigger('click');
        }

        //create new one for the clicked commit
        createBranchHTML.addClass(CREATE_BRANCH_EDIT_CONTROL_CLASS);
        createBranchHTML.append(txtInput).append(btnSave).append(btnCancel);

        //save old content
        td.children().css('display', 'none');

        //add control to TD cell
        td.append(createBranchHTML);

        //on CANCEL don't do anything, revert DOM change
        btnCancel.on('click', function (event) {
            td.find('.' + CREATE_BRANCH_EDIT_CONTROL_CLASS).remove();
            td.children().css('display', 'inline-block');
            event.stopPropagation();
        });

        txtInput.on('keyup', function (event) {
            var textVal = txtInput.val(),
                hasError = false;

            if (textVal === '') {
                hasError = true;
            } else if (isBranch) {
                hasError = self._branchNames.indexOf(textVal) !== -1 || !REGEXP.BRANCH.test(textVal);
            } else {
                hasError = self._tagNames.indexOf(textVal) !== -1 || !REGEXP.TAG.test(textVal);
            }

            if (hasError) {
                createBranchHTML.addClass('has-error');
                btnSave.disable(true);
            } else {
                createBranchHTML.removeClass('has-error');
                btnSave.disable(false);
            }

            switch (event.which) {
                case 27: // [esc]
                    // discard changes on [esc]
                    btnCancel.trigger('click');
                    event.preventDefault();
                    event.stopPropagation();
                    break;
                case 13: // [enter]
                    // save changes on [ENTER]
                    btnSave.trigger('click');
                    event.preventDefault();
                    event.stopPropagation();
                    break;
            }
        });
        txtInput.focus().trigger('keyup');

        //on SAVE save changes and revert DOM
        btnSave.on('click', function (event) {
            var newName = txtInput.val(),
                exists = isBranch ? self._branchNames.indexOf(newName) > -1 : self._tagNames.indexOf(newName) > -1;

            if (newName !== '' && exists === false) {
                td.find('.' + CREATE_BRANCH_EDIT_CONTROL_CLASS).remove();
                td.children().css('display', 'inline-block');
                if (isBranch) {
                    self.onCreateBranchFromCommit({
                        commitId: btn.data(COMMIT_IT),
                        name: newName
                    });
                } else {
                    self.onCreateTagFromCommit({
                        commitId: btn.data(COMMIT_IT),
                        name: newName
                    });
                }
            }
            event.stopPropagation();
        });
    };

    return ProjectRepositoryWidget;
});
