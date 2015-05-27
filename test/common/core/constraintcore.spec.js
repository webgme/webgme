/* jshint node:true, mocha: true, expr:true*/

/**
 * @author kecso / https://github.com/kecso
 */
var testFixture = require('../../_globals.js');

describe('constraint.core', function () {
    'use strict';
    var gmeConfig = testFixture.getGmeConfig(),
        logger = testFixture.logger.fork('constraint.core:storage'),
        storage,
        TASYNC = testFixture.requirejs('common/core/tasync'),
        project,
        projectName = 'coreConstraintTesting',
        core,
        rootNode,

        gmeAuth,
        dbConn,
        db,

        guestAccount = gmeConfig.authentication.guestAccount;

    before(function (done) {
        var gmeauthDeferred = Q.defer();

        gmeAuth = new testFixture.GMEAuth(null, gmeConfig);
        gmeAuth.connect(function (err) {
            if (err) {
                gmeauthDeferred.reject(err);
            } else {
                gmeauthDeferred.resolve(gmeAuth);
            }
        });

        dbConn = Q.ninvoke(mongodb.MongoClient, 'connect', gmeConfig.mongo.uri, gmeConfig.mongo.options)
            .then(function (db_) {
                db = db_;
                return Q.all([
                    Q.ninvoke(db, 'collection', '_users')
                        .then(function (collection_) {
                            return Q.ninvoke(collection_, 'remove');
                        }),
                    Q.ninvoke(db, 'collection', '_organizations')
                        .then(function (orgs_) {
                            return Q.ninvoke(orgs_, 'remove');
                        }),
                    Q.ninvoke(db, 'collection', '_projects')
                        .then(function (projects_) {
                            return Q.ninvoke(projects_, 'remove');
                        })
                ]);
            });

        Q.all([dbConn, gmeauthDeferred.promise])
            .then(function () {
                return Q.all([
                    gmeAuth.addUser(guestAccount, guestAccount + '@example.com', guestAccount, true, {overwrite: true}),
                    gmeAuth.addUser('admin', 'admin@example.com', 'admin', true, {overwrite: true, siteAdmin: true})
                ]);
            })
            .then(function () {
                return Q.all([
                    gmeAuth.authorizeByUserId(guestAccount, projectName, 'create', {
                        read: true,
                        write: true,
                        delete: true
                    })
                ]);
            })
            .then(function() {
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                return storage.deleteProject({projectName: projectName});
            })
            .nodeify(done);
    });

    after(function (done) {
        storage.closeDatabase()
            //.catch() ???
            .finally(function () {
                db.close(true, function (err) {
                    if (err) {
                        done(err);
                        return;
                    }
                    gmeAuth.unload(function (err) {
                        if (err) {
                            done(err);
                            return;
                        }
                        done();
                    });
                });
            });
    });

    beforeEach(function (done) {
        storage.createProject({projectName: projectName})
            .then(function (dbProject) {
                var base,
                    instance;

                project = new testFixture.Project(dbProject, storage, logger, gmeConfig);
                core = new testFixture.WebGME.core(project, {
                    usertype: 'tasync',
                    globConf: gmeConfig,
                    logger: logger
                });
                rootNode = core.createNode();
                base = core.createNode({parent: rootNode});
                core.setAttribute(base, 'name', 'base');
                core.setRegistry(base, 'position', {x: 100, y: 100});
                core.setConstraint(base, 'global', {
                    priority: 100,
                    info: 'just info text',
                    script: 'script text for global constraint'
                });

                instance = core.createNode({parent: rootNode, base: base});
                core.setAttribute(instance, 'name', 'instance');
                core.setConstraint(instance, 'local', {
                    priority: 1,
                    info: 'just another info text',
                    script: 'script text for local constraint'
                });
                done();
            })
            .catch(done);
    });

    afterEach(function (done) {
        storage.deleteProject({projectName: projectName}, done);
    });

    it('gives back null for unknown contraint', function () {
        (core.getConstraint(rootNode, 'any') === null).should.be.true;
    });

    it('gives back proper names for own and all constraints', function (done) {
        TASYNC.call(function (children) {
            var base, instance, i;

            children.should.have.length(2);

            for (i = 0; i < children.length; i++) {
                if (core.getAttribute(children[i], 'name') === 'base') {
                    base = children[i];
                } else {
                    instance = children[i];
                }
            }

            core.getConstraintNames(rootNode).should.be.empty;
            core.getOwnConstraintNames(rootNode).should.be.empty;
            core.getConstraintNames(base).should.be.eql(['global']);
            core.getOwnConstraintNames(base).should.be.eql(['global']);
            core.getConstraintNames(instance).should.include.members(['global', 'local']);
            core.getOwnConstraintNames(instance).should.be.eql(['local']);

            done();
        }, core.loadChildren(rootNode));
    });
    it('removing constraints', function (done) {
        TASYNC.call(function (children) {
            var base, instance, i;

            children.should.have.length(2);

            for (i = 0; i < children.length; i++) {
                if (core.getAttribute(children[i], 'name') === 'base') {
                    base = children[i];
                } else {
                    instance = children[i];
                }
            }
            core.delConstraint(base, 'global');

            core.getConstraintNames(instance).should.be.eql(['local']);
            core.getOwnConstraintNames(instance).should.be.eql(['local']);

            done();
        }, core.loadChildren(rootNode));
    });
});
