<template>
    <div>
        <slot name="default">
            <!-- Minimal view: simple icon-only button (used in InstanceTile) -->
            <ff-button
                v-if="minimalView"
                :title="(editorDisabled || disabled) ? disabledReason : undefined"
                kind="tertiary"
                data-action="open-editor"
                :disabled="buttonDisabled"
                class="whitespace-nowrap ff-btn-icon editor-link-minimal"
                :emit-instead-of-navigate="true"
                @click.stop.prevent="openImmersiveEditor"
                @click.middle.stop.prevent="openImmersiveEditor"
            >
                <template #icon-left>
                    <ProjectIcon />
                </template>
            </ff-button>

            <!-- Full view: split dropdown button -->
            <SplitButton
                v-else
                :label="editorDisabled ? 'Editor Disabled' : 'Open Editor'"
                data-action="open-editor"
                :primary="primary"
                :disabled="buttonDisabled"
                :disabled-reason="disabledReason"
                :options="dropdownOptions"
                @primary-click="openImmersiveEditor"
            >
                <template #icon>
                    <ProjectIcon class="ff-btn--icon mr-2" />
                </template>
            </SplitButton>
        </slot>
    </div>
</template>

<script>
import SplitButton from '../../../components/SplitButton.vue'
import ProjectIcon from '../../../components/icons/Projects.js'

export default {
    name: 'DeviceEditorLink',
    components: {
        ProjectIcon,
        SplitButton
    },
    props: {
        editorDisabled: {
            default: false,
            type: Boolean
        },
        disabled: {
            default: false,
            type: Boolean
        },
        disabledReason: {
            default: null,
            type: String
        },
        device: {
            type: Object,
            required: true
        },
        showText: {
            default: true,
            type: Boolean
        },
        minimalView: {
            type: Boolean,
            default: false
        },
        primary: {
            type: Boolean,
            default: false
        }
    },
    emits: ['open-immersive-editor', 'open-editor'],
    computed: {
        buttonDisabled () {
            return !!(this.disabled && !this.device?.editor?.url)
        },
        dropdownOptions () {
            return [
                { name: 'Open Direct URL', action: this.openEditor }
            ]
        }
    },
    methods: {
        openImmersiveEditor (event) {
            this.$emit('open-immersive-editor', event)
        },
        openEditor (event) {
            this.$emit('open-editor', event)
        }
    }
}
</script>
