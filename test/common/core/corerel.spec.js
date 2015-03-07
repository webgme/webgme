/* jshint node:true, mocha: true*/

/**
 * @author kecso / https://github.com/kecso
 */
var testFixture = require('../../_globals.js');

describe('corerel', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        storage = null,
        project = null,
        baseCommitHash = '',
        root = null,
        core = null;

    before(function (done) {
        //load the project, import it, and save the base commit hash
        testFixture.importProject({
            filePath: './test/common/core/corerel/base001.json',
            projectName: 'coreRelTests'
        }, function (err, result) {
            if (err) {
                done(err);
                return;
            }
            storage = result.storage;
            project = result.project;
            core = result.core;
            baseCommitHash = result.commitHash;
            root = result.root;
            done();
        });
    });

    it('loads the children of the root and checks them', function (done) {
        core.loadChildren(root, function (err, children) {
            var i, checkObject = {};
            if (err) {
                done(err);
                return;
            }


            children.should.have.length(3);
            for (i = 0; i < children.length; i++) {
                checkObject[core.getGuid(children[i])] = core.getAttribute(children[i], 'name');
            }
            checkObject.should.be.eql({
                'b04de7e4-2c78-2b5c-d5c4-7e258cb5167a': 'sProject',
                'cd891e7b-e2ea-e929-f6cd-9faf4f1fc045': 'FCO',
                '55d8fca7-515f-3654-667b-b9ccb9d9645b': 'language'
            });
            done();

        });
    });

    it('checks the collections of Aladdin', function (done) {
        core.loadByPath(root, '/361825802/609643723', function (err, aladdin) {
            if (err) {
                done(err);
                return;
            }
            core.isValidNode(aladdin).should.be.true;

            core.loadCollection(aladdin, 'src', function (err, relations) {
                if (err) {
                    done(err);
                    return;
                }
                relations.should.have.length(3);
                done();
            });
        });
    });
    it('checks the path of children of sProject', function (done) {
        core.loadByPath(root, '/361825802', function (err, sProject) {
            if (err) {
                done(err);
                return;
            }
            var paths = core.getChildrenPaths(sProject);
            paths.should.have.length(23);
            paths.should.include.members([
                '/361825802/518187827',
                '/361825802/1428171139',
                '/361825802/1231207531',
                '/361825802/1994757842'
            ]);
            done();
        });
    });
});