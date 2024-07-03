<template>
    <div :data-type="`${isImmersiveEditor ? 'immersive' : 'standard'}-editor`" @click.stop="openEditor()">
        <slot name="default">
            <ff-button
                v-ff-tooltip:left="(editorDisabled || disabled) ? disabledReason : undefined"
                kind="secondary"
                data-action="open-editor"
                :disabled="editorDisabled || disabled || !url"
                class="whitespace-nowrap"
                :has-right-icon="!isImmersiveEditor"
                @click.stop="openEditor()"
            >
                <template #icon-right>
                    <ExternalLinkIcon />
                </template>
                {{ editorDisabled ? 'Editor Disabled' : 'Open Editor' }}
            </ff-button>
        </slot>
    </div>
</template>

<script>
import { ExternalLinkIcon } from '@heroicons/vue/solid'
// import SemVer from 'semver'

import { mapState } from 'vuex'

export default {
    name: 'InstanceEditorLink',
    components: { ExternalLinkIcon },
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
        }
    },
    computed: {
        ...mapState('account', ['team', 'teamMembership']),
        isImmersiveEditor () {
            return false

            // const nrSemver = SemVer.parse(this.instance?.meta?.versions?.['node-red'])
            // // Supported from 4.0.0-beta.4 and later. This requires a bit more effort to check
            // if (nrSemver && nrSemver.major >= 4 && (nrSemver.prerelease.length === 0 || nrSemver.prerelease[1] >= 4)) {
            //     return SemVer.satisfies(SemVer.coerce(this.instance?.meta?.versions?.launcher), '>=2.5.0')
            // }
            // return false
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
