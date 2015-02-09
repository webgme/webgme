/*globals require*/

/**
 * This takes a report file of a desktop GME instance model and creates a webgme project file.
 * @author pmeijer / https://github.com/pmeijer
 */
var requirejs = require('requirejs'),
    Chance = require('chance'),
    chance = new Chance(),
    fs = require('fs'),
    FILE_NAME = 'MSD_PET_stat.json';


function NodeObj(guid, base, parent) {
        this._guid = guid;
        this.attributes = {
            name: chance.last()
        }
        if (base) {
            this.base = base._guid;
            this.meta = {};
            this.meta.attributes = JSON.parse(JSON.stringify(base.meta.attributes));
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
        }
        this.registry = {
            position: {
                x: chance.integer({ min: 0, max: 1000 }),
                y: chance.integer({ min: 0, max: 1000 })
            }
        }
        this.sets = {};
    }

function generateProject (statModel, options) {
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
        fcoNode,
        opts = options || {},
        nbrOfPointerTypes = opts.nbrOfPointerTypes || 10,
        pathToNode = {},
        nbrOfPointers = statModel.NumberOfReferences + statModel.NumberOfConnections * 2,
        relIdCnt = 2;

    project.root.guid = chance.guid();
    project.containment = statModel.ContainmentTree;

    fcoNode = createRootNodeAndFCO(project.root.guid);
    traverseTree(project.containment, project.root.guid, '');
    project.containment[fcoNode._guid] = {};
    createPointers();

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
                SetID: 'MetaAspectSet_4451988f-ba3d-de2e-3f00-4f20d115aaca',
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
            MetaAspectSet: [metaAspectSet],
            'MetaAspectSet_4451988f-ba3d-de2e-3f00-4f20d115aaca': [metaAspectSet]
        }
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

        return fcoNode;
    };

    function traverseTree(root, rootguid, rootPath) {
        var id,
            path;
        for (id in root) {
            if (root.hasOwnProperty(id)) {
                path = addNode(id, rootguid, rootPath);
                traverseTree(root[id], id, path);
            }
        }
    }

    function addNode(guid, parentGuid, parentPath) {
        var node,
            relId,
            path;
        // TODO: Add inheritance (all inherit from fcoNode now).
        node = new NodeObj(guid, fcoNode, project.nodes[parentGuid]);
        project.nodes[guid] = node;
        relId = relIdCnt.toString();
        project.relids[guid] = relId;
        path = parentPath + '/' + relId;
        pathToNode[path] = node;
        relIdCnt += 1;
        return path;
    };

    function createPointers() {
        var pointerTypes = [],
            paths = Object.keys(pathToNode),
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
            targetPath = paths[chance.integer({min:0, max: paths.length-1})];
            whileCnt = 0;
            do {
                whileCnt += 1;
                typeIndex = chance.integer({min:0, max: nbrOfPointerTypes-1});
                collision = setPointer(pathToNode[paths[index]], pointerTypes[typeIndex], targetPath);
                if (collision && whileCnt > 2 * nbrOfPointerTypes) {
                    console.error('Too many collisions, skipping pointer..');
                }
            }
            while (collision)
        }
    };

    function setPointer(node, name, targetPath) {
        var targetNode = pathToNode[targetPath];

        if (node.pointers[name]) {
            console.log('Collision of pointer', node._guid, name, targetPath);
            return true;
        }
        node.pointers[name] = targetNode._guid;

        targetNode.collection = targetNode.collection || {};
        targetNode.collection[name] = targetNode.collection[name] || [];
        targetNode.collection[name].push(node._guid);
        return false;
    }

    return project;
};

var proj = generateProject(JSON.parse(fs.readFileSync(FILE_NAME, 'utf8')).Model);

fs.writeFile('_out_' + FILE_NAME, JSON.stringify(proj, function (key, value) {
    if (key === '_guid') {
        return undefined;
    }
    return value;
}));

