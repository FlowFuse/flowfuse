<template>
    <ff-loading v-if="updating" message="Updating Instance..." />
    <template v-else>
        <FeatureUnavailableToTeam v-if="!protectedFeatureAvailable" />
        <FormHeading>Protect Instance</FormHeading>
        <FormRow>
            <template #description>
                <p class="mb-3">
                    Protected Mode prevents all team members from editing flows directly.
                    All team members get Read Only access to the Node-RED Editor and only
                    Team Owners can trigger a DevOps Pipeline deploy to the Instance
                </p>
            </template>
            <template #input>&nbsp;</template>
        </FormRow>
        <template v-if="!isProtected">
            <ff-button :disabled="!isOwner" kind="secondary" data-nav="enable-protect" @click="enableProtected()">Enable Protected Mode</ff-button>
        </template>
        <template v-else>
            <ff-button :disabled="!isOwner" kind="secondary" data-nav="disable-protect" @click="disableProtected()">Disable Protected Mode</ff-button>
        </template>
    </template>
</template>

<script>
import { mapState } from 'vuex'

import { Roles } from '../../../../../forge/lib/roles.js'

import InstanceApi from '../../../api/instances.js'

import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'
import FeatureUnavailableToTeam from '../../../components/banners/FeatureUnavailableToTeam.vue'

export default {
    name: 'InstanceSettingsProtect',
    components: {
        FormHeading,
        FormRow,
        FeatureUnavailableToTeam
    },
    inheritAttrs: false,
    props: {
        instance: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-updated'],
    data: function () {
        return {
            updating: false
        }
    },
    computed: {
        ...mapState('account', ['team', 'teamMembership', 'features']),
        isProtected () {
            return this.instance?.protected?.enabled
        },
        protectedFeatureAvailable () {
            const flag = this.team.type.properties.features?.protectedInstance
            return flag === undefined || flag
        },
        isOwner () {
            const flag = this.team.type.properties.features?.protectedInstance
            const enabled = flag === undefined || flag
            return this.teamMembership.role === Roles.Owner && enabled
        }
    },
    methods: {
        async enableProtected () {
            await InstanceApi.enableProtectedMode(this.instance.id)
            this.$emit('instance-updated')
        },
        async disableProtected () {
            await InstanceApi.disableProtectedMode(this.instance.id)
            this.$emit('instance-updated')
        }
    }
}

</script>
