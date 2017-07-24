/*jshint node:true, mocha:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

describe('tarjan algorithm', function () {
    'use strict';
    var testFixture = require('../../_globals.js'),
        Tarjan = testFixture.requirejs('common/util/tarjan'),
        expect = testFixture.expect;

    function sortRes(a, b) {
        if (a.length < b.length) {
            return -1;
        } else if (a.length === b.length) {
            return 0;
        }
        return 1;
    }

    it('should do example correctly', function () {
        var t = new Tarjan();
        t.addVertex(1);
        t.addVertex(2);
        t.addVertex(3);
        t.addVertex(4);
        t.connectVertices(1, 2);
        t.connectVertices(2, 3);
        t.connectVertices(3, 4);
        t.connectVertices(4, 2);

        expect(t.hasLoops()).to.equal(true);
        expect(t.calculateSCCs().length).to.equal(2);
        t.calculateSCCs().sort(sortRes);

        expect(t.calculateSCCs()[0]).to.deep.equal([1]);
        expect(t.calculateSCCs()[1].sort()).to.deep.equal([2, 3, 4]);
    });

    it('should return hasLoops false if chain', function () {
        var t = new Tarjan();
        t.addVertex(1);
        t.addVertex(2);
        t.addVertex(3);
        t.connectVertices(1, 2);
        t.connectVertices(2, 3);

        expect(t.hasLoops()).to.equal(false);
        expect(t.calculateSCCs().length).to.equal(3);
        t.calculateSCCs().forEach(function (scc) {
            expect(scc.length).to.equal(1);
        });
    });

    it('should return hasLoops false if two independent vertices', function () {
        var t = new Tarjan();
        t.addVertex(1);
        t.addVertex(2);

        expect(t.hasLoops()).to.equal(false);
        expect(t.calculateSCCs().length).to.equal(2);
        t.calculateSCCs().forEach(function (scc) {
            expect(scc.length).to.equal(1);
        });
    });

    it('addVertex should return false if node already added', function () {
        var t = new Tarjan();
        expect(t.addVertex(1)).to.equal(true);
        expect(t.addVertex(1)).to.equal(false);
    });

    it('should throw if adding vertex after it ran', function (done) {
        var t = new Tarjan();
        t.addVertex(1);

        expect(t.hasLoops()).to.equal(false);

        try {
            t.addVertex(2);
            done(new Error('should have thrown'));
        } catch (e) {
            if (e.message.indexOf('Cannot modify graph after algorithm ran') === 0) {
                done();
            } else {
                done(e);
            }
        }
    });

    it('should throw if adding connection after it ran', function (done) {
        var t = new Tarjan();
        t.addVertex(1);
        t.addVertex(2);

        expect(t.hasLoops()).to.equal(false);

        try {
            t.connectVertices(1, 2);
            done(new Error('should have thrown'));
        } catch (e) {
            if (e.message.indexOf('Cannot modify graph after algorithm ran') === 0) {
                done();
            } else {
                done(e);
            }
        }
    });

    it('should throw if connecting vertices that do not exist 1', function (done) {
        var t = new Tarjan();
        t.addVertex(1);

        try {
            t.connectVertices(1, 2);
            done(new Error('should have thrown'));
        } catch (e) {
            if (e.message.indexOf('Vertex [2] was never added to graph') === 0) {
                done();
            } else {
                done(e);
            }
        }
    });

    it('should throw if connecting vertices that do not exist 2', function (done) {
        var t = new Tarjan();
        t.addVertex(2);

        try {
            t.connectVertices(1, 2);
            done(new Error('should have thrown'));
        } catch (e) {
            if (e.message.indexOf('Vertex [1] was never added to graph') === 0) {
                done();
            } else {
                done(e);
            }
        }
    });

});