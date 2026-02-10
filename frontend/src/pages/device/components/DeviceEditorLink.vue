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
            <div v-else class="editor-link-split" :class="{ 'editor-link-split--primary': primary }">
                <button
                    :title="buttonDisabled ? disabledReason : undefined"
                    class="editor-link-split__action"
                    :class="{ 'editor-link-split--disabled': buttonDisabled }"
                    data-action="open-editor"
                    :disabled="buttonDisabled"
                    @click.stop.prevent="openImmersiveEditor"
                    @click.middle.stop.prevent="openImmersiveEditor"
                >
                    <ProjectIcon class="ff-btn--icon mr-2" />
                    <span class="hidden sm:inline editor-link-text">{{ editorDisabled ? 'Editor Disabled' : 'Open Editor' }}</span>
                </button>
                <DropdownMenu
                    class="editor-link-split__dropdown"
                    :buttonClass="'editor-link-split__toggle' + (buttonDisabled ? ' editor-link-split--disabled' : '')"
                    :options="dropdownOptions"
                    :disabled="buttonDisabled"
                    @click.stop
                />
            </div>
        </slot>
    </div>
</template>

<script>
import DropdownMenu from '../../../components/DropdownMenu.vue'
import ProjectIcon from '../../../components/icons/Projects.js'

export default {
    name: 'DeviceEditorLink',
    components: {
        ProjectIcon,
        DropdownMenu
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

<style scoped lang="scss">

</style>
