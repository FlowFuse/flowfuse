<template>
    <section class="ff-instance-step text-center flex flex-col gap-4 pt-6 max-w-md m-auto">
        <h1>Registration Complete</h1>
        <p>
            Close this window and return to the Device Agent to complete the setup.
        </p>
        <p>
            If prompted, enter the following One-Time Code (OTC) in the Device Agent to complete the registration
        </p>
        <!-- make this text larger and bold-->
        <p class="font-bold text-lg border border-gray-300 rounded-full p-2 bg-gray-100">
            <TextCopier :text="device.credentials.otc" />
        </p>
        <p>
            <img src="../../../../images/empty-states/team-devices.png">
        </p>
        <!-- <template #actions>
                <ff-button
                    v-ff-tooltip:bottom="!hasPermission('device:create') && 'Your role does not allow creating remote instances. Contact a team admin to change your role.'"
                    class="font-normal ff-btn-icon"
                    kind="primary"
                    :disabled="teamDeviceLimitReached || teamRuntimeLimitReached || !hasPermission('device:create', applicationContext)"
                    data-action="register-device"
                    @click="showCreateDeviceDialog"
                >
                    <template #icon-left>
                        <PlusSmallIcon />
                    </template>
                    <span class="hidden sm:inline add-remote-instance-text">Add Remote Instance</span>
                </ff-button>
            </template> -->
    </section>
</template>

<script>
import { mapState } from 'pinia'

import TextCopier from '../../../TextCopier.vue'

import { useContextStore } from '@/stores/context.js'

// This isn't really a MultiStepForm step, but it is a step in the flow, so we are using the same pattern for consistency
export default {
    name: 'SuccessStep',
    components: {
        TextCopier
    },
    props: {
        device: {
            required: true,
            type: Object
        }
    },
    data () {
        return {
        }
    },
    computed: {
        ...mapState(useContextStore, ['team'])
    },
    methods: {
    }
}
</script>

<style scoped lang="scss">
h1 {
        font-size: 1.5rem;
        line-height: 1.75rem;
        margin: auto;
        margin-top: 1.5rem;
        margin-bottom: 1rem;
        font-weight: 500;
        max-width: 450px;
}
img {
    text-align: center;
    margin: 2em auto;
    max-width: 180px;
}
</style>
