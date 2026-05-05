import { defineStore } from 'pinia'

export const useUxSnapshotDiffStore = defineStore('ux-snapshot-diff', {
    state: () => ({
        hidePositionChanges: false,
        expandedByDefault: true
    }),
    persist: {
        storage: localStorage
    }
})
