<template>
    <div
        :data-type="`${isImmersiveEditor ? 'immersive' : 'standard'}-editor`"
        @click.stop.prevent="openEditor"
        @click.middle.stop.prevent="openEditor"
    >
        <slot name="default">
            <ff-button
                v-ff-tooltip:left="(editorDisabled || disabled) ? disabledReason : undefined"
                :kind="minimalView ? 'tertiary' : 'secondary'"
                data-action="open-editor"
                :disabled="buttonDisabled"
                class="whitespace-nowrap ff-btn-icon"
                :emit-instead-of-navigate="true"
            >
                <template #icon-left>
                    <ProjectIcon />
                </template>
                <template v-if="!minimalView">
                    <span class="editor-link-text">{{ editorDisabled ? 'Editor Disabled' : 'Open Editor' }}</span>
                </template>
            </ff-button>
        </slot>
    </div>
</template>

<script>

import SemVer from 'semver'

import { mapState } from 'vuex'

import ProjectIcon from '../../../components/icons/Projects.js'
import { useNavigationHelper } from '../../../composables/NavigationHelper.js'

export default {
    name: 'InstanceEditorLink',
    components: { ProjectIcon },
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
        }
    },
    setup () {
        const { openInANewTab } = useNavigationHelper()

        return {
            openInANewTab
        }
    },
    computed: {
        ...mapState('account', ['team', 'teamMembership']),
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
        buttonDisabled: function () {
            return this.editorDisabled || this.disabled || !this.url
        }
    },
    methods: {
        openEditor (evt) {
            if (this.disabled) {
                return false
            }

            const target = `_${this.instance.id}`
            if (!this.isImmersiveEditor) {
                return this.openInANewTab(this.editorURL, target)
            } else {
                if (evt.button === 1) {
                    // open in a new tab when using the middle mouse button
                    return this.openInANewTab(this.url, target)
                } else {
                    return this.$router.push({ name: 'instance-editor', params: { id: this.instance.id } })
                }
            }
        }
    }
}
</script>

<style scoped lang="scss">
// Container query for drawer context - responsive button behavior
// Breakpoint matches DRAWER_MOBILE_BREAKPOINT constant in Editor/index.vue
.editor-link-text {
  display: inline; // Default: show text
}

@container drawer (max-width: 639px) {
  // Hide text when drawer is narrow - icon-only mode
  .editor-link-text {
    display: none;
  }
}
</style>
