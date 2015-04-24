/*jshint node:true*/

/**
 * node genprojectjson.js stat.json [projectNameInDataBase] [mongoip] [mongoport] [mongodb]
 *
 * With optional projectNameInDataBase argument the script will import the project into the database.
 *
 * This takes a report file of a desktop GME instance model and creates a webgme project file.
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var Chance = require('chance'),
    chance = new Chance(),
    fs = require('fs'),
    importProject = require('../../src/bin/import_project'),
    path = require('path');

function generateProject(stat, options) {
    var project = {
            bases: {},
            root: {
                path: '',
                guid: null
            },
            relids: {},
            containment: {},
            nodes: {},
            metaSheets: {}
        },
        META_ASPECT_SET = 'MetaAspectSet_' + chance.guid(),
        metaSheetCounter = 1,
        fcoNode,
        statModel = stat.Model,
        opts = options || {},
        nbrOfPointerTypes = opts.nbrOfPointerTypes || 10,
        pathToModelNode = {},
        guidToMetaNode = {},
        nbrOfPointers = statModel.NumberOfReferences + statModel.NumberOfConnections * 2,
        relIdCnt = 2;

    function createRootNodeAndFCO(rootGuid) {
        var rootNode = new NodeObj(rootGuid),
            fcoGuid = chance.guid(),
            fcoNode = new NodeObj(fcoGuid, null, rootNode),
            metaAspectSet = {
                attributes: {},
                guid: fcoGuid,
                registry: {
                    position: {
                        x: 100,
                        y: 100
                    }
                }
            },
            metaChildren = {
                minItems: [
                    -1
                ],
                maxItems: [
                    -1
                ],
                items: [
                    fcoGuid
                ]
            };
        // Build the root node
        rootNode.attributes.name = 'ROOT';
        rootNode.meta.children = metaChildren;
        rootNode.registry = {
            MetaSheets: [{
                SetID: META_ASPECT_SET,
                order: 0,
                title: 'META'
            }],
            ProjectRegistry: {
                FCO_ID: '/1',
            },
            usedAddOns: 'ConstraintAddOn',
            validPlugins: '',
        };
        rootNode.sets = {
            MetaAspectSet: [metaAspectSet]
        };
        rootNode.sets[META_ASPECT_SET] = [metaAspectSet];
        // Build the fco node
        fcoNode.attributes.name = 'FCO';
        fcoNode.meta.children = metaChildren;
        fcoNode.registry.DisplayFormat = '$name';
        fcoNode.registry.PortSVGIcon = '';
        fcoNode.registry.SVGIcon = '';
        fcoNode.registry.decorator = '';
        fcoNode.registry.isAbstract = false;
        fcoNode.registry.isPort = false;

        // add to nodes and relids.
        project.nodes[rootGuid] = rootNode;
        project.nodes[fcoGuid] = fcoNode;
        project.relids[rootGuid] = null;
        project.relids[fcoGuid] = '1';
        guidToMetaNode[fcoGuid] = fcoNode;
        return fcoNode;
    }

    function traverseMetaTree(root, rootguid) {
        var id,
            path;
        for (id in root) {
            if (root.hasOwnProperty(id)) {
                path = addNode(id, rootguid);
                traverseMetaTree(root[id], id);
            }
        }
    }

    function traverseTree(root, rootguid, rootPath) {
        var id,
            path;
        for (id in root) {
            if (root.hasOwnProperty(id) && guidToMetaNode.hasOwnProperty(id) === false) {
                path = addNode(id, rootguid, rootPath);
                traverseTree(root[id], id, path);
            }
        }
    }

    function addNode(guid, parentGuid, parentPath) {
        var node,
            relId,
            path,
            isMeta,
            base;
        if (statModel.InheritanceTree[guid]) {
            isMeta = false;
            base = statModel.InheritanceTree[guid];
        } else {
            isMeta = true;
            base = fcoNode._guid;
        }

        node = new NodeObj(guid, base, project.nodes[parentGuid]);
        project.nodes[guid] = node;
        relId = relIdCnt.toString();
        project.relids[guid] = relId;
        if (isMeta) {
            guidToMetaNode[guid] = node;
            addToMetaAspectSet(guid);
        } else {
            path = parentPath + '/' + relId;
            pathToModelNode[path] = node;
        }
        relIdCnt += 1;
        return path;
    }

    function addToMetaAspectSet(guid) {
        var rootNode = project.nodes[project.root.guid],
            metaAspectSet = {
                attributes: {},
                guid: guid,
                registry: {
                    position: {
                        x: chance.integer({min: 0, max: 1000}),
                        y: chance.integer({min: 0, max: 1000})
                    }
                }
            };

        rootNode.sets.MetaAspectSet.push(metaAspectSet);
        rootNode.sets[META_ASPECT_SET].push(metaAspectSet);

        metaSheetCounter += 1;
        if (metaSheetCounter % 30 === 0) {
            META_ASPECT_SET = 'MetaAspectSet_' + chance.guid();
            rootNode.registry.MetaSheets.push({
                SetID: META_ASPECT_SET,
                order: metaSheetCounter / 30,
                title: chance.first()
            });
            rootNode.sets[META_ASPECT_SET] = [];
        }
    }

    function createPointers() {
        var pointerTypes = [],
            paths = Object.keys(pathToModelNode),
            index,
            typeIndex,
            targetPath,
            collision,
            whileCnt,
            i;
        for (i = 0; i < nbrOfPointerTypes; i += 1) {
            pointerTypes.push(chance.first());
        }
        console.log('Generated pointerTypes ', pointerTypes);
        for (i = 0; i < nbrOfPointers; i += 1) {
            index = i % paths.length;
            targetPath = paths[chance.integer({min: 0, max: paths.length - 1})];
            whileCnt = 0;
            do {
                whileCnt += 1;
                typeIndex = chance.integer({min: 0, max: nbrOfPointerTypes - 1});
                collision = setPointer(pathToModelNode[paths[index]], pointerTypes[typeIndex], targetPath);
                if (collision && whileCnt > 2 * nbrOfPointerTypes) {
                    console.error('Too many collisions, skipping pointer..');
                }
            }
            while (collision);
        }
    }

    function setPointer(node, name, targetPath) {
        var targetNode = pathToModelNode[targetPath];

        if (node.pointers[name]) {
            console.log('Collision of pointer', node._guid, name, targetPath);
            return true;
        }
        node.pointers[name] = targetNode._guid;

        //targetNode.collection = targetNode.collection || {};
        //targetNode.collection[name] = targetNode.collection[name] || [];
        //targetNode.collection[name].push(node._guid);
        return false;
    }

    project.root.guid = chance.guid();
    project.containment = statModel.ContainmentTree;

    fcoNode = createRootNodeAndFCO(project.root.guid);
    addNode(stat.MetaModel.RootGUID, project.root.guid);
    guidToMetaNode[stat.MetaModel.RootGUID].attributes.name = 'META_' + stat.ParadigmName;
    traverseMetaTree(project.containment[stat.MetaModel.RootGUID], stat.MetaModel.RootGUID);
    traverseTree(project.containment, project.root.guid, '');
    project.containment[fcoNode._guid] = {};
    createPointers();

    function NodeObj(guid, baseGuid, parent) {
        var cnt = 0;
        this._guid = guid;
        this.attributes = {
            name: chance.last()
        };
        if (baseGuid) {
            this.base = baseGuid;
            this.meta = {};
            do {
                cnt += 1;
                if (guidToMetaNode[baseGuid]) {
                    this.meta.attributes = JSON.parse(JSON.stringify(guidToMetaNode[baseGuid].meta.attributes));
                    break;
                }
                baseGuid = stat.Model.InheritanceTree[baseGuid];
                if (cnt > 1000) {
                    console.error('Caught in a loop!');
                    break;
                }
            } while (true);
        } else {
            this.base = null;
            this.meta = {
                attributes: {
                    name: {
                        type: 'string'
                    }
                }
            };
        }
        this.parent = parent ? parent._guid : null;
        this.pointers = {
            base: this.base
        };
        this.registry = {
            position: {
                x: chance.integer({min: 0, max: 1000}),
                y: chance.integer({min: 0, max: 1000})
            }
        };
        this.sets = {};
    }

    return project;
}

if (require.main === module) {
    var inputFile = process.argv[2],
        baseName = path.basename(inputFile, '.json'),
        outName = path.join(path.dirname(inputFile), baseName + '_out.json'),
        projectName = process.argv[3],
        mongoOpts = {
            mongoip: process.argv[4] || '127.0.0.1',
            mongoport: process.argv[5] || 27017,
            mongodb: process.argv[6] || 'multi'
        };

    var proj = generateProject(JSON.parse(fs.readFileSync(inputFile, 'utf8')));
    if (projectName) {
        importProject.importProject(projectName, proj, mongoOpts, function (err) {
            if (err) {
                console.error('Could not import project to database!, err', err);
            } else {
                console.log('Project successfully imported to ' + projectName);
            }
        });
    } else {
        console.log('Will write to', outName);
        fs.writeFile(outName, JSON.stringify(proj, function (key, value) {
            if (key === '_guid') {
                return undefined;
            }
            return value;
        }));
    }
}

module.exports.generateProject = generateProject;

