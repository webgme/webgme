/*globals define*/
/*jshint browser: true*/

/**
 * @author brollb / https://github/brollb
 */

define([
    'js/logger',
    'common/util/assert',
    './AutoRouter.Constants',
    './AutoRouter.Utils',
    './AutoRouter.Point',
    './AutoRouter.Rect',
    './AutoRouter.Port'
], function (Logger,
             assert,
             CONSTANTS,
             Utils,
             ArPoint,
             ArRect,
             AutoRouterPort) {

    'use strict';

    var AutoRouterBox = function () {
        this.owner = null;
        this.rect = new ArRect();
        this.atomic = false;
        this.selfPoints = [];
        this.ports = [];
        this.childBoxes = [];//dependent boxes
        this.parent = null;
        this.id = null;

        this.calculateSelfPoints(); //Part of initialization
    };

    AutoRouterBox.prototype.calculateSelfPoints = function () {
        this.selfPoints = [];
        this.selfPoints.push(new ArPoint(this.rect.getTopLeft()));

        this.selfPoints.push(new ArPoint(this.rect.right, this.rect.ceil));
        this.selfPoints.push(new ArPoint(this.rect.right, this.rect.floor));
        this.selfPoints.push(new ArPoint(this.rect.left, this.rect.floor));
    };

    AutoRouterBox.prototype.deleteAllPorts = function () {
        for (var i = 0; i < this.ports.length; i++) {
            this.ports[i].destroy();
        }

        this.ports = [];

        this.atomic = false;
    };

    AutoRouterBox.prototype.hasOwner = function () {
        return this.owner !== null;
    };

    AutoRouterBox.prototype.createPort = function () {
        var port = new AutoRouterPort();
        assert(port !== null, 'ARBox.createPort: port !== null FAILED');

        return port;
    };

    AutoRouterBox.prototype.hasNoPort = function () {
        return this.ports.length === 0;
    };

    AutoRouterBox.prototype.isAtomic = function () {
        return this.atomic;
    };

    AutoRouterBox.prototype.addPort = function (port) {
        assert(port !== null, 'ARBox.addPort: port !== null FAILED');

        port.owner = this;
        this.ports.push(port);

        if (this.owner) {  // Not pointing to the ARGraph
            this.owner._addEdges(port);
        }
    };

    AutoRouterBox.prototype.deletePort = function (port) {
        assert(port !== null, 'ARBox.deletePort: port !== null FAILED');
        if (port === null) {
            return;
        }

        var index = this.ports.indexOf(port),
            graph = this.owner;

        assert(index !== -1, 'ARBox.deletePort: index !== -1 FAILED');

        graph.deleteEdges(port);
        this.ports.splice(index, 1);

        this.atomic = false;

    };

    AutoRouterBox.prototype.isRectEmpty = function () {
        return this.rect.isRectEmpty();
    };

    AutoRouterBox.prototype.setRect = function (r) {
        assert(r instanceof ArRect, 'Invalthis.id arg in ARBox.setRect. Requires ArRect');

        assert(r.getWidth() >= 3 && r.getHeight() >= 3,
            'ARBox.setRect: r.getWidth() >= 3 && r.getHeight() >= 3 FAILED!');

        assert(r.getTopLeft().x >= CONSTANTS.ED_MINCOORD && r.getTopLeft().y >= CONSTANTS.ED_MINCOORD,
            'ARBox.setRect: r.getTopLeft().x >= CONSTANTS.ED_MINCOORD && r.getTopLeft().y >= ' +
            'CONSTANTS.ED_MAXCOORD FAILED!');

        assert(r.getBottomRight().x <= CONSTANTS.ED_MAXCOORD && r.getBottomRight().y <= CONSTANTS.ED_MAXCOORD,
            'ARBox.setRect:  r.getBottomRight().x <= CONSTANTS.ED_MAXCOORD && r.getBottomRight().y <= ' +
            'CONSTANTS.ED_MAXCOORD FAILED!');

        assert(this.ports.length === 0 || this.atomic,
            'ARBox.setRect: this.ports.length === 0 || this.atomic FAILED!');

        this.rect.assign(r);
        this.calculateSelfPoints();

        if (this.atomic) {
            assert(this.ports.length === 1, 'ARBox.setRect: this.ports.length === 1 FAILED!');
            this.ports[0].setRect(r);
        }
    };

    AutoRouterBox.prototype.shiftBy = function (offset) {
        this.rect.add(offset);

        var i = this.ports.length;
        while (i--) {
            this.ports[i].shiftBy(offset);
        }

        /*
         This is not necessary; the ARGraph will shift all children
         i = this.childBoxes.length;
         while(i--){
         this.childBoxes[i].shiftBy(offset);
         }
         */
        this.calculateSelfPoints();
    };

    AutoRouterBox.prototype.resetPortAvailability = function () {
        for (var i = this.ports.length; i--;) {
            this.ports[i].resetAvailableArea();
        }
    };

    AutoRouterBox.prototype.adjustPortAvailability = function (box) {
        if (!box.hasAncestorWithId(this.id) &&   // Boxes are not dependent on one another
            !this.hasAncestorWithId(box.id)) {

            for (var i = this.ports.length; i--;) {
                this.ports[i].adjustAvailableArea(box.rect);
            }
        }
    };

    AutoRouterBox.prototype.addChild = function (box) {
        assert(this.childBoxes.indexOf(box) === -1,
            'ARBox.addChild: box already is child of ' + this.id);
        assert(box instanceof AutoRouterBox,
            'Child box must be of type AutoRouterBox');

        this.childBoxes.push(box);
        box.parent = this;
    };

    AutoRouterBox.prototype.removeChild = function (box) {
        var i = this.childBoxes.indexOf(box);
        assert(i !== -1, 'ARBox.removeChild: box isn\'t child of ' + this.id);
        this.childBoxes.splice(i, 1);
        box.parent = null;
    };

    AutoRouterBox.prototype.hasAncestorWithId = function (id) {
        var box = this;
        while (box) {
            if (box.id === id) {
                return true;
            }
            box = box.parent;
        }
        return false;
    };

    AutoRouterBox.prototype.getRootBox = function () {
        var box = this;
        while (box.parent) {
            box = box.parent;
        }
        return box;
    };

    AutoRouterBox.prototype.isBoxAt = function (point, nearness) {
        return Utils.isPointIn(point, this.rect, nearness);
    };

    AutoRouterBox.prototype.isBoxClip = function (r) {
        return Utils.isRectClip(this.rect, r);
    };

    AutoRouterBox.prototype.isBoxIn = function (r) {
        return Utils.isRectIn(this.rect, r);
    };

    AutoRouterBox.prototype.destroy = function () {
        var i = this.childBoxes.length;

        //notify this.parent of destruction
        //if there is a this.parent, of course
        if (this.parent) {
            this.parent.removeChild(this);
        }

        this.owner = null;
        this.deleteAllPorts();

        while (i--) {
            this.childBoxes[i].destroy();
        }
    };

    AutoRouterBox.prototype.assertValid = function () {
        for (var p = this.ports.length; p--;) {
            this.ports[p].assertValid();
        }
    };

    return AutoRouterBox;

});
