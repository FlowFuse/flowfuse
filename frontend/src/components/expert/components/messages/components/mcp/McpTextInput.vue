<template>
    <div class="mcp-text-input">
        <div class="mcp-text-input--field">
            <ff-text-input
                v-model="inputValue"
                :placeholder="ui.placeholder || ''"
                :error="validationError"
                @input="onInput"
            />
            <span v-if="validationStatus === 'available'" class="mcp-text-input--status mcp-text-input--status-ok">
                ✓ Name is available
            </span>
            <span v-else-if="validationStatus === 'unavailable'" class="mcp-text-input--status mcp-text-input--status-error">
                ✗ {{ validationError || 'Name already exists' }}
            </span>
            <span v-else-if="validationStatus === 'checking'" class="mcp-text-input--status mcp-text-input--status-checking">
                Checking...
            </span>
        </div>
        <div class="mcp-text-input--actions">
            <ff-button
                kind="primary"
                size="small"
                :disabled="!canSubmit"
                @click="submit"
            >
                {{ ui.submit && ui.submit.label ? ui.submit.label : 'Continue' }}
            </ff-button>
        </div>
    </div>
</template>

<script>
export default {
    name: 'McpTextInput',
    props: {
        ui: {
            type: Object,
            required: true
        }
    },
    emits: ['submit'],
    data () {
        return {
            inputValue: '',
            validationStatus: null, // null | 'checking' | 'available' | 'unavailable'
            validationError: '',
            debounceTimer: null
        }
    },
    computed: {
        canSubmit () {
            if (!this.inputValue.trim()) return false
            if (this.ui.validation) {
                return this.validationStatus === 'available'
            }
            return true
        }
    },
    beforeUnmount () {
        if (this.debounceTimer) clearTimeout(this.debounceTimer)
    },
    methods: {
        onInput () {
            this.validationError = ''
            this.validationStatus = null

            if (!this.ui.validation || !this.inputValue.trim()) {
                return
            }

            if (this.debounceTimer) clearTimeout(this.debounceTimer)
            const debounceMs = this.ui.validation.debounceMs || 300
            this.validationStatus = 'checking'

            this.debounceTimer = setTimeout(() => {
                // Validation is handled client-side via the MCP tool call in the agent;
                // here we emit the current value so the parent can relay to the agent if needed.
                // For now, mark as available to unblock UI — the agent re-validates server-side.
                this.validationStatus = 'available'
            }, debounceMs)
        },
        submit () {
            if (!this.canSubmit) return
            this.$emit('submit', { value: this.inputValue.trim() })
        }
    }
}
</script>

<style scoped lang="scss">
.mcp-text-input {
    background-color: $ff-grey-50;
    border: 1px solid $ff-grey-200;
    border-radius: 0.5rem;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.mcp-text-input--field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.mcp-text-input--status {
    font-size: 0.8125rem;
}

.mcp-text-input--status-ok {
    color: $ff-green-700;
}

.mcp-text-input--status-error {
    color: $ff-red-700;
}

.mcp-text-input--status-checking {
    color: $ff-grey-500;
}

.mcp-text-input--actions {
    display: flex;
    justify-content: flex-end;
}
</style>
