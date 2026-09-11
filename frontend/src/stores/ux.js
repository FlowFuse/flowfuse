import { defineStore } from 'pinia'

// Where a user is in the AI-led onboarding process.
//   null       undecided, nothing has resolved it yet
//   'intake'   in the onboarding conversation, on the onboarding page
//   'building' the Expert has taken them into the editor, still onboarding
//   'done'     finished or skipped, and not to be started again
export const ONBOARDING_STAGES = Object.freeze({
    INTAKE: 'intake',
    BUILDING: 'building',
    DONE: 'done'
})

const ACTIVE_ONBOARDING_STAGES = [ONBOARDING_STAGES.INTAKE, ONBOARDING_STAGES.BUILDING]

export const useUxStore = defineStore('ux', {
    state: () => ({
        userActions: {
            hasOpenedDeviceEditor: false
        },
        isNewlyCreatedUser: false,
        onboardingStage: null,
        overlay: false
    }),
    getters: {
        isOnboarding: (state) => ACTIVE_ONBOARDING_STAGES.includes(state.onboardingStage),
        isOnboardingIntake: (state) => state.onboardingStage === ONBOARDING_STAGES.INTAKE
    },
    actions: {
        setNewlyCreatedUser () {
            this.isNewlyCreatedUser = true
            this.onboardingStage = ONBOARDING_STAGES.INTAKE
        },
        validateUserAction (action) {
            if (Object.prototype.hasOwnProperty.call(this.userActions, action)) {
                this.userActions[action] = true
            }
        },
        checkIfIsNewlyCreatedUser (user) {
            const userCreatedDate = new Date(user.createdAt).getTime()
            const oneWeekAgo = new Date()
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
            this.isNewlyCreatedUser = userCreatedDate >= oneWeekAgo.getTime()
            // Only seeds while undecided. isNewlyCreatedUser is recomputed on
            // every boot for a week, so seeding unconditionally would restart
            // onboarding for anyone who had already finished or skipped it.
            if (this.onboardingStage === null) {
                this.onboardingStage = this.isNewlyCreatedUser
                    ? ONBOARDING_STAGES.INTAKE
                    : ONBOARDING_STAGES.DONE
            }
        },
        startOnboardingBuild () { this.onboardingStage = ONBOARDING_STAGES.BUILDING },
        endOnboarding () { this.onboardingStage = ONBOARDING_STAGES.DONE },
        openOverlay () { this.overlay = true },
        closeOverlay () { this.overlay = false }
    },
    persist: {
        pick: ['isNewlyCreatedUser', 'onboardingStage', 'userActions'],
        storage: localStorage
    }
})
