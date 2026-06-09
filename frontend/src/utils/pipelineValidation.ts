/*
    `frontend/src/utils/pipelineValidation.ts` and `forge/lib/pipelineValidation.js` are 1:1 copies
     of each other (logic) and should be kept in sync to maintain domain cohesion and separation of concerns.
*/

import { Maybe } from '@/types/common/types'

// The PipelineStage shapes below are not exact domain types — they capture only the props
// these routines read, for clarity.

interface PipelineStageServerSide {
    Instances?: object[]
    Devices?: object[]
    DeviceGroups?: object[]
    PipelineStageGitRepo?: { GitTokenId?: unknown }
}

interface PipelineStageClientSide {
    instance?: object
    device?: object
    deviceGroup?: object
    gitRepo?: { GitTokenId?: unknown }
    stageType?: 'instance' | 'device' | 'device-group' | 'git-repo'
}

type PipelineStage = PipelineStageServerSide & PipelineStageClientSide & {
    id?: string
    name?: string
}

interface PipelineStageRule {
    type: string
    description: string
    canBeFirst: boolean
    canBeLast: boolean
    canPrecede: string[]
    canFollow: string[]
    mustBeLast: boolean
    canBeMoreThanOne: boolean
}

const pipelineStageRules: Record<string, PipelineStageRule> = {
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

const getPipelineStageRule = (stage: PipelineStage): Maybe<PipelineStageRule> => {
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

const getPipelineRules = (orderedStages: PipelineStage[]): PipelineStageRule[] => {
    const pipelineRules: PipelineStageRule[] = []
    for (const stage of orderedStages) {
        const rule = getPipelineStageRule(stage)
        if (!rule) {
            throw new Error('Unrecognised pipeline stage')
        }
        pipelineRules.push(rule)
    }
    return pipelineRules
}

export default {
    // Validate the stages of a pipeline (MUST be passed in order). Returns `true` if valid, throws otherwise.
    validateStages (orderedStages: PipelineStage[]): boolean {
        try {
            const rules = getPipelineRules(orderedStages)
            let prevRule: PipelineStageRule | null = null
            const typeCounts: Record<string, number> = {
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
