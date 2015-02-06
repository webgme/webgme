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

function generateProject (statModel) {
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
        relIdCnt = 2;

    project.root.guid = chance.guid();
    project.containment = statModel.ContainmentTree;

    fcoNode = createRootNodeAndFCO(project.root.guid);
    traverseTree(project.containment, project.root.guid);
    project.containment[fcoNode._guid] = {};

    function traverseTree(root, rootId) {
        var id;
        for (id in root) {
            if (root.hasOwnProperty(id)) {
                addNode(id, rootId);
                traverseTree(root[id], id);
            }
        }
    }

    function addNode(guid, parentGuid) {
        var node;
        // TODO: Add inheritance (all inherit from fcoNode now).
        node = new NodeObj(guid, fcoNode, project.nodes[parentGuid]);
        project.nodes[guid] = node;
        project.relids[guid] = relIdCnt.toString();
        relIdCnt += 1;
    };

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

    return project;
};

var proj = generateProject(JSON.parse(fs.readFileSync(FILE_NAME, 'utf8')).Model);

fs.writeFile('_out_' + FILE_NAME, JSON.stringify(proj, function (key, value) {
    if (key === '_guid') {
        return undefined;
    }
    return value;
}));

