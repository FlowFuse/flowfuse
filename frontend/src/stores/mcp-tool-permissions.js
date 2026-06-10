import { defineStore } from 'pinia'

const READ_ONLY_TOOLS = [
    'platform.list-teams',
    'platform.list-applications',
    'platform.list-instances',
    'platform.get-instance',
    'platform.list-instance-types',
    'platform.list-stacks',
    'platform.list-blueprints',
    'platform.get-instance-status',
    'platform.check-name-availability'
]

export const useMCPToolPermissionsStore = defineStore('mcp-tool-permissions', {
    state: () => ({
        defaultPolicy: 'prompt',
        allowlist: [],
        denylist: [],
        _initialized: false
    }),
    getters: {
        /**
         * Returns the effective policy for a given tool name.
         * Denylist takes precedence over allowlist; both take precedence over defaultPolicy.
         * @returns {function(string): 'allow'|'deny'|'prompt'}
         */
        getPolicy () {
            return (toolName) => {
                if (this.denylist.includes(toolName)) return 'deny'
                if (this.allowlist.includes(toolName)) return 'allow'
                return this.defaultPolicy
            }
        }
    },
    actions: {
        /**
         * Allow a tool (removes from denylist if present).
         * @param {string} toolName
         */
        addToAllowlist (toolName) {
            if (!this.allowlist.includes(toolName)) {
                this.allowlist.push(toolName)
            }
            const idx = this.denylist.indexOf(toolName)
            if (idx >= 0) this.denylist.splice(idx, 1)
        },
        /**
         * Deny a tool (removes from allowlist if present).
         * @param {string} toolName
         */
        addToDenylist (toolName) {
            if (!this.denylist.includes(toolName)) {
                this.denylist.push(toolName)
            }
            const idx = this.allowlist.indexOf(toolName)
            if (idx >= 0) this.allowlist.splice(idx, 1)
        },
        /**
         * Remove a tool from the allowlist (reverts to defaultPolicy unless also on denylist).
         * @param {string} toolName
         */
        removeFromAllowlist (toolName) {
            const idx = this.allowlist.indexOf(toolName)
            if (idx >= 0) this.allowlist.splice(idx, 1)
        },
        /**
         * Remove a tool from the denylist.
         * @param {string} toolName
         */
        removeFromDenylist (toolName) {
            const idx = this.denylist.indexOf(toolName)
            if (idx >= 0) this.denylist.splice(idx, 1)
        },
        /**
         * Set the default policy for tools not explicitly listed.
         * @param {'allow'|'deny'|'prompt'} policy
         */
        setDefaultPolicy (policy) {
            if (['allow', 'deny', 'prompt'].includes(policy)) {
                this.defaultPolicy = policy
            }
        },
        populateReadOnlyDefaults () {
            if (this._initialized) return
            for (const tool of READ_ONLY_TOOLS) {
                if (!this.allowlist.includes(tool)) {
                    this.allowlist.push(tool)
                }
            }
            this._initialized = true
        }
    },
    persist: {
        pick: ['defaultPolicy', 'allowlist', 'denylist', '_initialized'],
        storage: localStorage,
        afterRestore: (ctx) => {
            ctx.store.populateReadOnlyDefaults()
        }
    }
})
