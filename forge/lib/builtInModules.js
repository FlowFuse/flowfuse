// These are the modules we preinstall that Node-RED will report back in its
// runtime settings that we don't want to appear in snapshots/settings

const BUILT_IN_MODULES = [
    '@flowforge/nr-file-nodes',
    '@flowfuse/nr-file-nodes'
]
module.exports = {
    BUILT_IN_MODULES
}
