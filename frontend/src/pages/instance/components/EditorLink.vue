<template>
    <div :data-type="`${isImmersiveEditor ? 'immersive' : 'standard'}-editor`">
        <slot name="default">
            <!-- Minimal view: simple icon-only button (used in InstanceTile) -->
            <ff-button
                v-if="minimalView"
                v-ff-tooltip:left="(editorDisabled || disabled) ? disabledReason : undefined"
                kind="tertiary"
                data-action="open-editor"
                :disabled="buttonDisabled"
                class="whitespace-nowrap ff-btn-icon editor-link-minimal"
                :emit-instead-of-navigate="true"
                @click.stop.prevent="openEditor"
                @click.middle.stop.prevent="openEditor"
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
                :dropdown-disabled="instanceLinkDisabled"
                :disabled-reason="disabledReason"
                :options="dropdownOptions"
                @primary-click="openEditor"
            >
                <template #icon>
                    <ProjectIcon class="ff-btn--icon mr-2" />
                </template>
            </SplitButton>
        </slot>
    </div>
</template>

<script>

import SemVer from 'semver'

import SplitButton from '../../../components/SplitButton.vue'
import ProjectIcon from '../../../components/icons/Projects.js'
import { useNavigationHelper } from '../../../composables/NavigationHelper.js'

export default {
    name: 'InstanceEditorLink',
    components: {
        ProjectIcon,
        SplitButton
    },
    inheritAttrs: false,
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
        instance: {
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
    setup () {
        const { openInANewTab, navigateTo } = useNavigationHelper()

        return {
            openInANewTab,
            navigateTo
        }
    },
    computed: {
        isImmersiveEditor () {
            // Immersive Editor only available for:
            // - Node-RED 4.0.2+
            // - Launcher 2.6.0+
            const validNR = SemVer.satisfies(this.instance?.meta?.versions?.['node-red'], '>=4.0.2', { includePrerelease: true })
            const validLauncher = SemVer.satisfies(SemVer.coerce(this.instance?.meta?.versions?.launcher), '>=2.6.0')
            return validNR && validLauncher
        },
        url () {
            if (this.isImmersiveEditor) {
                return this.$router.resolve({ name: 'instance-editor', params: { id: this.instance.id } }).fullPath
            }

            return this.editorURL
        },
        editorURL () {
            return this.instance.url || this.instance.editor?.url
        },
        buttonDisabled () {
            return this.editorDisabled || this.disabled || !this.url
        },
        instanceLinkDisabled () {
            return this.disabled || !this.editorURL
        },
        dropdownOptions () {
            return [
                { name: 'Open Direct URL', action: this.openInstance }
            ]
        }
    },
    methods: {
        openEditor (evt) {
            if (this.buttonDisabled) {
                return false
            }

            const target = { target: `_${this.instance.id}` }

            if (!this.isImmersiveEditor) {
                return this.navigateTo(this.editorURL, evt, target)
            }

            return this.navigateTo({ name: 'instance-editor', params: { id: this.instance.id } }, evt, target)
        },
        openInstance (evt) {
            if (this.instanceLinkDisabled) {
                return false
            }
            return this.navigateTo(this.editorURL, evt, { target: `_${this.instance.id}` })
        }
    }
}
</script>

<style lang="scss">
// Icon-only minimal button: remove icon margins added by .ff-btn--icon-left
.editor-link-minimal .ff-btn--icon-left {
    margin-left: 0;
    margin-right: 0;
}
</style>
