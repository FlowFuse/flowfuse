<template>
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
</template>

<script>
import { ExternalLinkIcon } from '@heroicons/vue/solid'
import SemVer from 'semver'

import { mapState } from 'vuex'

import { Roles } from '../../../../../forge/lib/roles.js'

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
        isVisitingAdmin () {
            return this.teamMembership.role === Roles.Admin
        },
        isImmersiveEditor () {
            return SemVer.satisfies(SemVer.coerce(this.instance?.meta?.versions?.launcher), '>=2.3.1')
        },
        url () {
            if (this.isImmersiveEditor) {
                return this.$router.resolve({ name: 'instance-editor', params: { id: this.instance.id } }).fullPath
            }

            return this.instance.url
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
