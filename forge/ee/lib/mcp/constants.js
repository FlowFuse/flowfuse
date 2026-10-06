// Minimum Device Agent versions for behaviour the MCP tools depend on.
const MIN_AGENT_VERSIONS = {
    // Older agents ignore the forced update the platform sends to a device in
    // developer mode, so a new target snapshot is stored but never deployed.
    devModeSnapshotDeploy: '3.8.0'
}

module.exports = {
    MIN_AGENT_VERSIONS
}
