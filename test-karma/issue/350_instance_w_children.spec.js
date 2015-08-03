/*globals requirejs, expect*/
/*jshint node: true, mocha: true*/
/**
 * @author kecso / https://github.com/kecso
 */
var WebGMEGlobal = {}; //jshint ignore: line

describe.skip('issue 350 client crashes when manipulating a node that has a model child which is an instance of' +
    'another model having children', function () {
    var Client,
        gmeConfig,
        projectImport,
        projectName = 'issue350',
        client,
        options = {};

    function buildUpForTest(testId, next) {
        client.selectProject(projectName, null, function (err) {
            expect(err).to.equal(null);

            client.selectBranch('master', null, function (err) {
                expect(err).to.equal(null);

                client.createBranch(projectName, testId, client.getActiveCommitHash(), function (err) {
                    expect(err).to.equal(null);

                    client.selectBranch(testId, null, function (err) {
                        expect(err).to.equal(null);

                        next();
                    });
                });
            });
        });
    }

    before(function (done) {
        this.timeout(10000);
        requirejs(['js/client', 'text!gmeConfig.json', 'text!karmatest/issue/350/project.json'
        ], function (Client_, gmeConfigJSON, projectJSON) {
            Client = Client_;
            gmeConfig = JSON.parse(gmeConfigJSON);
            projectImport = JSON.parse(projectJSON);

            client = new Client(gmeConfig);
            client.connectToDatabase(function (err) {
                expect(err).to.equal(null);

                client.deleteProject(projectName, function (err) {
                    expect(err).to.equal(null);

                    client.createProjectFromFileAsync(projectName, 'master', projectImport,
                        function (err, projectId, branchName) {
                            expect(err).to.equal(null);
                            client.selectProject(projectId, branchName, done);
                        }
                    );
                });
            });
        });
    });

    after(function (done) {
        client.deleteProject(projectName, function (err) {
            expect(err).to.equal(null);

            done();
        });
    });

    it('should be able to manipulate the node that contains the model instance', function (done) {
        var testId = 'manipulateContainer',
            testState = 'initial',
            eventFunction = function (events) {
                var i,
                    parentId = '/630504187',
                    baseId = '/1',
                    modelId = '/170462264',
                    nodeId, loadCount, node;

                if (testState === 'initial') {
                    expect(events).to.have.length(10);
                    expect(events).to.include({etype: 'load', eid: parentId});
                    expect(events).to.include({etype: 'load', eid: baseId});
                    expect(events).to.include({etype: 'load', eid: modelId});

                    testState = 'add new model';


                    client.createChild({
                        baseId: modelId,
                        parentId: parentId
                    });
                    return;
                }

                if (testState === 'add new model') {
                    expect(events).to.have.length(13);

                    loadCount = 0;
                    for (i = 0; i < events.length; i++) {
                        if (events[i].etype === 'load') {
                            loadCount += 1;
                        }
                    }
                    expect(loadCount).to.equal(3);

                    testState = 'add new child';

                    client.createChild({
                        baseId: baseId,
                        parentId: parentId
                    });
                    return;
                }

                if (testState === 'add new child') {
                    expect(events).to.have.length(14);

                    loadCount = 0;
                    for (i = 0; i < events.length; i++) {
                        if (events[i].etype === 'load') {
                            loadCount += 1;
                            nodeId = events[i].eid;
                        }
                    }
                    expect(loadCount).to.equal(1);

                    node = client.getNode(nodeId);
                    expect(node.getParentId()).to.equal(parentId);
                    expect(node.getBaseId()).to.equal(baseId);

                    testState = 'finished';

                    client.removeUI(testId);
                    done();
                }

                client.removeUI(testId);
                done(new Error('bad state have been reached'));
            };

        buildUpForTest(testId, function () {
            client.addUI({}, eventFunction, testId);
            client.updateTerritory(testId, {'': {children: 3}});
        });
    });

    it('should be able to manipulate the children of the instance inside the model', function (done) {
        // /630504187/301153743/601569562
        var testId = 'manipulateInstance',
            testState = 'initial',
            parentId = '/630504187',
            baseId = '/1',
            modelId = '/170462264',
            nodeId = null,
            position = {x: 200, y: 200},
            eventFunction = function (events) {
                var i,
                    loadCount, node;

                if (testState === 'initial') {
                    expect(events).to.have.length(10);
                    expect(events).to.include({etype: 'load', eid: parentId});
                    expect(events).to.include({etype: 'load', eid: baseId});
                    expect(events).to.include({etype: 'load', eid: modelId});

                    testState = 'add new model';


                    client.createChild({
                        baseId: modelId,
                        parentId: parentId
                    });
                    return;
                }

                if (testState === 'add new model') {
                    expect(events).to.have.length(13);

                    loadCount = 0;
                    for (i = 0; i < events.length; i++) {
                        if (events[i].etype === 'load') {
                            loadCount += 1;

                            node = client.getNode(events[i].eid);
                            expect(node).not.to.equal(null);

                            if (node.getAttribute('name') === 'child1') {
                                nodeId = events[i].eid;
                            }
                        }
                    }
                    expect(loadCount).to.equal(3);
                    expect(nodeId).not.to.equal(null);

                    testState = 'modify instance';

                    client.setRegistry(nodeId, 'position', position);
                    return;
                }

                if (testState === 'modify instance') {
                    expect(events).to.have.length(13);

                    node = client.getNode(nodeId);
                    expect(node).not.to.equal(null);
                    expect(node.getRegistry('position')).to.deep.equal(position);

                    testState = 'finished';

                    client.removeUI(testId);
                    done();
                }

                client.removeUI(testId);
                done(new Error('bad state have been reached'));
            };

        buildUpForTest(testId, function () {
            client.addUI({}, eventFunction, testId);
            client.updateTerritory(testId, {'': {children: 3}});
        });
    });
});