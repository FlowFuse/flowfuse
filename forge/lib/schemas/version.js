const semver = require('semver')

// Each part is stored as a 32-bit integer
const MAX_VERSION_PART = 2147483647

/**
 * Check that a schema version is a plain `major.minor.patch` string.
 * Strings that semver would normalise (`v1.2.0`, `=1.2.0`, ` 1.2.0`, `1.2.0+build`)
 * and prerelease versions (`1.2.0-rc.1`) are rejected rather than normalised.
 * Each part must be at most 2147483647.
 * @param {string} version
 * @returns {boolean}
 */
function isValidVersion (version) {
    if (typeof version !== 'string') {
        return false
    }
    if (semver.valid(version) !== version) {
        return false
    }
    if (semver.prerelease(version) !== null) {
        return false
    }
    return version.split('.').every(part => Number(part) <= MAX_VERSION_PART)
}

/**
 * Check a version chosen for a new publish against the versions that already exist.
 * @param {string} version the version to publish
 * @param {string[]} existingVersions every published and deprecated version of the schema
 * @returns {null | { code: 'invalid_version' } | { code: 'version_exists' } | { code: 'version_not_higher', highest: string }}
 *   `null` when the version can be published
 */
function checkNewVersion (version, existingVersions) {
    if (!isValidVersion(version)) {
        return { code: 'invalid_version' }
    }
    if (existingVersions.includes(version)) {
        return { code: 'version_exists' }
    }
    const highest = highestVersion(existingVersions)
    if (highest && !semver.gt(version, highest)) {
        return { code: 'version_not_higher', highest }
    }
    return null
}

/**
 * @param {string[]} versions
 * @returns {string | null} the highest version, or `null` when there are none
 */
function highestVersion (versions) {
    const valid = versions.filter(isValidVersion)
    if (valid.length === 0) {
        return null
    }
    return semver.rsort(valid)[0]
}

module.exports = {
    isValidVersion,
    checkNewVersion,
    highestVersion
}
