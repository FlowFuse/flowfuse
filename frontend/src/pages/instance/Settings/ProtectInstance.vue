<template>
    <ff-loading v-if="updating" message="Updating Instance..." />
    <template v-else>
        <FeatureUnavailableToTeam v-if="!protectedFeatureAvailable" />
        <FormHeading>Protect Instance</FormHeading>
        <FormRow>
            <template #description>
                <p class="mb-3">
                    Protected Mode prevents all team members from editing flows directly.
                    Only team Owners will be able to view the editor and trigger deployments
                    to this instance using the Pipelines feature.
                </p>
            </template>
            <template #input>&nbsp;</template>
        </FormRow>
        <template v-if="!isProtected">
            <ff-button :disabled="!protectedFeatureAvailable" kind="secondary" date-nav="enable-protect" @click="enableProtected()">Enable Protected Mode</ff-button>
        </template>
        <template v-else>
            <ff-button :disabled="!protectedFeatureAvailable" kind="secondary" data-nav="disable-protect" @click="disableProtected()">Disable Protected Mode</ff-button>
        </template>
    </template>
</template>

<script>
import { mapState } from 'vuex'

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
        ...mapState('account', ['team', 'features']),
        isProtected () {
            return this.instance?.protected?.enabled
        },
        protectedFeatureAvailable () {
            const flag = this.team.type.properties.features?.protectedInstance
            return flag === undefined || flag
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
