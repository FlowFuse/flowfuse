<template>
    <ff-loading v-if="updating" message="Updating Instance..." />
    <template v-else>
        <FormHeading>High Availability</FormHeading>
        <FormRow>
            <template #description>
                <p class="mb-3">
                    High Availability mode allows you to run multiple copies
                    of your Node-RED instance, with incoming work distributed
                    between them.
                </p>
                <p>
                    This feature is currently free to use, but
                    will become a chargeable feature in a future release.
                </p>
                <p>
                    When HA mode is enabled the following restrictions apply:
                </p>
                <ul class="list-disc pl-6">
                    <li>Enabling or disabling HA mode requires a restart of the Instance.</li>
                    <li>Flows cannot be directly modified in an HA Instance; the editor is disabled.</li>
                    <li>A DevOps Pipeline should be created to deploy new flows to the instance.</li>
                    <li>Any internal state of the flows is not shared between the HA copies.</li>
                </ul>
                <p>
                    Check the documentation for more information about <a class="underline" href="https://flowforge.com/docs/user/high-availability/">High Availability</a>.
                </p>
            </template>
            <template #input>&nbsp;</template>
        </FormRow>
        <template v-if="!isHA">
            <ff-button kind="secondary" data-nav="enable-ha" @click="enableHA()">Enable HA mode</ff-button>
        </template>
        <template v-else>
            <ff-button kind="secondary" data-nav="disable-ha" @click="disableHA()">Disable HA mode</ff-button>
        </template>
    </template>
</template>

<script>

import InstanceApi from '../../../api/instances.js'

import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'
import Alerts from '../../../services/alerts.js'
import Dialog from '../../../services/dialog.js'

export default {
    name: 'InstanceSettingsStages',
    components: {
        FormHeading,
        FormRow
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
        isHA () {
            return this.instance?.ha?.replicas !== undefined
        }
    },
    methods: {
        async enableHA () {
            const msg = {
                header: 'Enable High Availability mode',
                html: `<p>Enabling HA mode will require a restart of the instance.</p>
                       <p>Once enabled, the editor will be disabled. The flows can only
                          be updated by using a DevOps Pipeline to deploy to this instance
                          from another one, or by disabling HA mode first.</p>`
            }
            Dialog.show(msg, async () => {
                this.updating = true
                await InstanceApi.enableHAMode(this.instance.id)
                this.updating = false
                if (this.instance.meta?.state === 'suspended') {
                    Alerts.emit('High Availability mode enabled', 'confirmation')
                } else {
                    Alerts.emit('High Availability mode enabled. The Instance will now be restarted', 'confirmation')
                }
                this.$emit('instance-updated')
            })
        },
        async disableHA () {
            const msg = {
                header: 'Disable High Availability mode',
                html: '<p>Disabling HA mode will require a restart of the instance.</p>'
            }
            Dialog.show(msg, async () => {
                this.updating = true
                await InstanceApi.disableHAMode(this.instance.id)
                this.updating = false
                if (this.instance.meta?.state === 'suspended') {
                    Alerts.emit('High Availability mode disabled', 'confirmation')
                } else {
                    Alerts.emit('High Availability mode disabled. The Instance will now be restarted', 'confirmation')
                }
                this.$emit('instance-updated')
            })
        }
    }
}
</script>
