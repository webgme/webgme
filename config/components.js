/*jshint node: true*/
/**
 * Configuration file for configuring specific components.
 *
 * @author pmeijer / https://github.com/pmeijer
 */

module.exports =  {
    // TreeBrowser
    '7786674bf30f48b6835a0f134b5ba73e': {
        treeRoot: '',
        filters: {
            toggled: {
                hideConnections: false,
                hideAbstracts: false,
                hideLeaves: false
            }
        },
        byProjectName: {
            treeRoot: {
                Constraints: '/E'
            }
        },
        byProjectId: {
            treeRoot: {
                'guest+ass': '/n'
            }
        }
    },
    // ModelEditor
    f8c3cab5bf2c4cdc893a027b0c96a45e: {
        topNode: '',
        byProjectName: {
            topNode: {
                Constraints: '/E'
            }
        },
        byProjectId: {
            topNode: {
                'guest+ass': '/n'
            }
        }
    }
};