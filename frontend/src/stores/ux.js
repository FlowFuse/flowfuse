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
        shouldEnterOnboarding: false,
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
            this.shouldEnterOnboarding = true
        },
        // Returns whether this arrival should go to onboarding, and clears the
        // flag either way: it is a one-shot, so a user who navigates elsewhere
        // later is not dragged back.
        consumeOnboardingEntry () {
            const shouldEnter = this.shouldEnterOnboarding
            this.shouldEnterOnboarding = false
            return shouldEnter
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
                // Resolving the stage is itself a one-shot, so raising the
                // entry flag here is too. Email verification is not a reliable
                // hook: it only happens when the platform is set up to require
                // it, and a user who is verified already never sees it.
                this.shouldEnterOnboarding = this.isNewlyCreatedUser
            }
        },
        startOnboardingBuild () { this.onboardingStage = ONBOARDING_STAGES.BUILDING },
        endOnboarding () {
            this.onboardingStage = ONBOARDING_STAGES.DONE
            this.shouldEnterOnboarding = false
        },
        openOverlay () { this.overlay = true },
        closeOverlay () { this.overlay = false }
    },
    persist: {
        pick: ['isNewlyCreatedUser', 'onboardingStage', 'shouldEnterOnboarding', 'userActions'],
        storage: localStorage
    }
})
