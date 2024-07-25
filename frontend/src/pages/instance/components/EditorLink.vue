<template>
    <div :data-type="`${isImmersiveEditor ? 'immersive' : 'standard'}-editor`" @click.stop="openEditor()">
        <slot name="default">
            <ff-button
                v-ff-tooltip:left="(editorDisabled || disabled) ? disabledReason : undefined"
                kind="secondary"
                data-action="open-editor"
                :disabled="editorDisabled || disabled || !url"
                class="whitespace-nowrap"
                @click.stop="openEditor()"
            >
                <template v-if="showText" #icon-right>
                    <ProjectIcon />
                </template>
                <template v-else #icon>
                    <ProjectIcon />
                </template>
                <template v-if="showText">
                    {{ editorDisabled ? 'Editor Disabled' : 'Open Editor' }}
                </template>
            </ff-button>
        </slot>
    </div>
</template>

<script>

import SemVer from 'semver'

import { mapState } from 'vuex'

import ProjectIcon from '../../../components/icons/Projects.js'

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

            return this.instance.url || this.instance.editor?.url
        }
    },
    methods: {
        openEditor () {
            if (this.disabled) {
                return
            }

            window.open(this.url, !this.isImmersiveEditor ? '_blank' : '_self')
        }
    }
}
</script>
