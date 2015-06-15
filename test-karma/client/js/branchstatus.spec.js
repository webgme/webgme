/*globals requirejs, expect*/
/* jshint browser: true, mocha: true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

describe('branch status', function () {
    'use strict';
    var Client,
        client,
        Storage,
        logger,
        Core,
        gmeConfig,
        projectName = 'branchStatus';

    before(function (done) {
        requirejs([
            'js/client',
            'js/logger',
            'common/storage/browserstorage',
            'common/core/core',
            'text!gmeConfig.json'
        ], function (Client_, Logger, Storage_, Core_, gmeConfigJSON) {
            Client = Client_;
            Storage = Storage_;
            Core = Core_;
            gmeConfig = JSON.parse(gmeConfigJSON);
            logger = Logger.create('test:branchStatus', gmeConfig.client.log);
            client = new Client(gmeConfig);
            client.connectToDatabase(function (err) {
                expect(err).to.equal(null);
                client.selectProject(projectName, function (err) {
                    expect(err).to.equal(null);
                    done();
                });
            });
        });
    });

    it('should go from SYNC to PULLING to SYNC when external changes are made', function (done) {
        var branchName = 'master',
            prevStatus = client.getBranchStatus(),
            storage = Storage.getStorage(logger, gmeConfig, true);
        expect(prevStatus).to.equal(client.CONSTANTS.BRANCH_STATUS.SYNC);

        client.addEventListener(client.CONSTANTS.BRANCH_STATUS_CHANGED, function (__client, eventData) {
            if (prevStatus === client.CONSTANTS.BRANCH_STATUS.SYNC) {
                expect(eventData.status).to.equal(client.CONSTANTS.BRANCH_STATUS.PULLING);
                prevStatus = eventData.status;
            } else if (prevStatus === client.CONSTANTS.BRANCH_STATUS.PULLING) {
                expect(eventData.status).to.equal(client.CONSTANTS.BRANCH_STATUS.SYNC);
                done();
            } else {
                done(new Error('Unexpected BranchStatus' + eventData.status));
            }
        });

        storage.open(function (status) {
            logger.debug('storage is open');
            expect(status).to.equal(client.CONSTANTS.STORAGE.CONNECTED);

            storage.openProject(projectName, function (err, project, branches) {
                var currentHash;
                expect(err).to.equal(null);
                expect(typeof branches[branchName]).to.equal('string');
                expect(branches[branchName].indexOf('#')).to.equal(0);

                currentHash = branches[branchName];

                var core = new Core(project, {
                    globConf: gmeConfig,
                    logger: logger.fork('core')
                });
                project.loadObject(currentHash, function (err, commitObject) {
                    expect(err).to.equal(null);
                    expect(typeof commitObject.root).to.equal('string');
                    expect(commitObject.root.indexOf('#')).to.equal(0);
                    core.loadRoot(commitObject.root, function (err, rootNode) {
                        var oldRootName,
                            persisted;
                        expect(err).to.equal(null);

                        oldRootName = core.getAttribute(rootNode, 'name');
                        core.setAttribute(rootNode, 'name', oldRootName + 'new');
                        persisted = core.persist(rootNode);
                        project.makeCommit(
                            null,
                            [currentHash],
                            persisted.rootHash,
                            persisted.objects,
                            'should go from SYNC to PULLING to SYNC when external changes are made',
                            function (err, commitResult) {
                                expect(err).to.equal(null);
                                expect(typeof commitResult.hash).to.equal('string');
                                expect(commitResult.hash.indexOf('#')).to.equal(0);
                                project.setBranchHash(branchName, commitResult.hash, currentHash,
                                    function (err, result) {
                                        expect(err).to.equal(null);
                                        expect(result.status).to.equal(client.CONSTANTS.STORAGE.SYNCH);
                                    });
                            });
                    });
                });
            });
        });

    });
})