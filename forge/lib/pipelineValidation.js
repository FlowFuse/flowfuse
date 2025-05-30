/*
    `frontend/src/utils/pipelineValidation.js` and `forge/lib/pipelineValidation.js` are 1:1 copies
     of each other and should be kept in sync to maintain domain cohesion and separation of concerns.
*/

// NOTE: The below PipelineStage Type definitions are not exact types but used in this code file only
//       for clarity of the props and types we use in these routines.

/**
 * @typedef {Object} PipelineStageServerSide
 * @property {Array<Object>} [Instances] - Array of instances in the stage (if it contains any, then this stage is an INSTANCE)
 * @property {Array<Object>} [Devices] - Array of devices in the stage (if it contains any, then this stage is a DEVICE)
 * @property {Array<Object>} [DeviceGroups] - Array of device groups in the stage (if it contains any, then this stage is a DEVICE_GROUP)
 * @property {Object} [PipelineStageGitRepo] - The git repository for the stage (if this is an object then this stage is a GITHUB_REPO)
*/
/**
 * @typedef {Object} PipelineStageClientSide
 * @property {Object} [instance] - The instance associated with the stage (if present, this stage is an INSTANCE)
 * @property {Object} [device] - The device associated with the stage (if present, this stage is a DEVICE)
 * @property {Object} [deviceGroup] - The deviceGroup associated with the stage (if present, this stage is an DEVICE_GROUP)
 * @property {Object} [gitRepo] - The "view" compatible alternative for PipelineStageGitRepo object that signifies this stage is a GITHUB_REPO
 * @property {'instance'|'device'|'device-group'|'git-repo'} [stageType] - The type of the stage (e.g., 'device', 'instance', 'device-group', 'git-repo')
*/
/**
 * @typedef {PipelineStageServerSide & PipelineStageClientSide} PipelineStage
 * @property {string} [id] - The ID of the stage
 * @property {string} [name] - The name of the stage
*/

const pipelineStageRules = {
    INSTANCE: {
        type: 'INSTANCE',
        description: 'Hosted Instance',
        canBeFirst: true,
        canBeLast: true,
        canPrecede: ['*'],
        canFollow: ['INSTANCE', 'DEVICE', 'GITHUB_REPO'],
        mustBeLast: false,
        canBeMoreThanOne: true
    },
    DEVICE: {
        type: 'DEVICE',
        description: 'Remote Instance',
        canBeFirst: true,
        canBeLast: true,
        canPrecede: ['*'],
        canFollow: ['INSTANCE', 'DEVICE', 'GITHUB_REPO'],
        mustBeLast: false,
        canBeMoreThanOne: true
    },
    DEVICE_GROUP: {
        type: 'DEVICE_GROUP',
        description: 'Device Group',
        canBeFirst: false,
        canBeLast: true,
        canPrecede: ['DEVICE_GROUP', 'GITHUB_REPO'],
        canFollow: ['DEVICE_GROUP', 'INSTANCE', 'DEVICE', 'GITHUB_REPO'],
        canBeMoreThanOne: true,
        mustBeLast: false
    },
    GITHUB_REPO: {
        type: 'GITHUB_REPO',
        description: 'Git Repository',
        canBeFirst: true,
        canBeLast: true,
        canFollow: ['*'],
        canPrecede: ['*'],
        mustBeLast: false,
        canBeMoreThanOne: true
    }
}
// freeze the rules so they cannot be modified
Object.freeze(pipelineStageRules)

/**
 * Get the pipeline stage rule for a given stage
 * @param {PipelineStage} stage - The pipeline stage to get the rule for
 * @returns {Object|null} The pipeline stage rule for the given stage, or null if no rule is found
 */
const getPipelineStageRule = (stage) => {
    if (!stage) {
        return null
    }
    if (stage.DeviceGroups?.length || stage.deviceGroup || stage.stageType === 'device-group') {
        return pipelineStageRules.DEVICE_GROUP
    } else if (stage.Devices?.length || stage.device || stage.stageType === 'device') {
        return pipelineStageRules.DEVICE
    } else if (stage.Instances?.length || stage.instance || stage.stageType === 'instance') {
        return pipelineStageRules.INSTANCE
    } else if (stage.PipelineStageGitRepo?.GitTokenId || stage.gitRepo?.GitTokenId || stage.stageType === 'git-repo') {
        return pipelineStageRules.GITHUB_REPO
    }
    return null
}

/**
 * Get the pipeline rules for a given ordered list of stages
 * @param {Array<PipelineStage>} orderedStages - The ordered list of pipeline stages to get the rules for
 * @returns {Array<Object>} The pipeline rules for the given ordered list of stages
 */
const getPipelineRules = (orderedStages) => {
    const pipelineRules = []
    for (const stage of orderedStages) {
        const rule = getPipelineStageRule(stage)
        if (!rule) {
            throw new Error('Unrecognised pipeline stage')
        }
        pipelineRules.push(rule)
    }
    return pipelineRules
}

module.exports = {
    /**
     * Validate the stages of a pipeline
     * @param {Array<PipelineStage>} orderedStages Pipeline stages to validate (MUST be in order - use the helper function `app.db.models.PipelineStage.sortStages` to get the ordered stages)
     * @returns {boolean} `true` if the stages are valid
     */
    validateStages (orderedStages) {
        try {
            const rules = getPipelineRules(orderedStages)
            let prevRule = null
            const typeCounts = {
                INSTANCE: 0,
                DEVICE: 0,
                DEVICE_GROUP: 0,
                GITHUB_REPO: 0
            }
            for (let i = 0; i < rules.length; i++) {
                const thisRule = rules[i]
                const isFirst = i === 0
                const isLast = i === rules.length - 1
                const nextRule = rules[i + 1] || null
                typeCounts[thisRule.type]++

                if (typeCounts[thisRule.type] > 1 && !thisRule.canBeMoreThanOne) {
                    throw new Error(`A ${thisRule.description} Pipeline stage cannot appear more than once`)
                }
                if (isFirst && thisRule.canBeFirst === false) {
                    throw new Error(`A ${thisRule.description} Pipeline stage cannot be the first stage`)
                }
                if (isLast && thisRule.canBeLast === false) {
                    throw new Error(`A ${thisRule.description} Pipeline stage cannot be the last stage`)
                }
                if (thisRule.mustBeLast && !isLast) {
                    throw new Error(`A ${thisRule.description} Pipeline stage must be the last stage`)
                }
                if (nextRule) {
                    if (!thisRule.canPrecede.includes(nextRule.type) && !thisRule.canPrecede.includes('*')) {
                        throw new Error(`A ${thisRule.description} Pipeline stage cannot precede a ${nextRule.description}`)
                    }
                    if (!nextRule.canFollow.includes(thisRule.type) && !nextRule.canFollow.includes('*')) {
                        throw new Error(`A ${nextRule.description} Pipeline stage cannot follow a ${thisRule.description}`)
                    }
                }
                if (prevRule) {
                    if (!prevRule.canPrecede.includes(thisRule.type) && !prevRule.canPrecede.includes('*')) {
                        throw new Error(`A ${prevRule.description} Pipeline stage cannot precede a ${thisRule.description}`)
                    }
                    if (!thisRule.canFollow.includes(prevRule.type) && !thisRule.canFollow.includes('*')) {
                        throw new Error(`A ${thisRule.description} Pipeline stage cannot follow a ${prevRule.description}`)
                    }
                }

                prevRule = thisRule
            }
            return true
        } catch (err) {
            err.code = 'pipeline_validation_failed'
            throw err
        }
    }
}
