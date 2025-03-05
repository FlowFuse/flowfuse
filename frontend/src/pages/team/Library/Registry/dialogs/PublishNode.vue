<template>
    <ff-dialog
        ref="dialog" :header="'Publish Custom Node Package'"
        :confirm-label="'Close'"
        @confirm="confirm()"
    >
        <template #default>
            Hello World
            <!-- <label class="block font-bold mb-2">Install Device Agent</label>
            <p>Run this command on the hardware where you want your Remote Instance to run:</p>
            <pre class="overflow-auto text-xs font-light p-4 my-2 border rounded bg-gray-800 text-gray-200">npm install -g @flowfuse/device-agent</pre>
            <div class="flex flex-row justify-end space-x-2 -mt-1">
                <ff-button kind="tertiary" size="small" @click="copy('npm install -g @flowfuse/device-agent')">
                    <template #icon-right><ClipboardCopyIcon /></template>
                    <span class="">Copy</span>
                </ff-button>
            </div>
            <p class="text-gray-600 italic text-sm">
                Note: For more detailed instructions on installing the Device Agent, checkout the documentation <a href="https://flowfuse.com/docs/device-agent/" target="_blank">here</a>.
            </p>
            <label class="block font-bold mt-4 mb-2">Connect Agent to FlowFuse</label>
            <p class="mt-2">
                Then, with the Device Agent installed, run the following command, on your hardware, to connect it to FlowFuse:
            </p>
            <pre class="overflow-auto text-xs font-light p-4 my-2 border rounded bg-gray-800 text-gray-200">{{ otcCommand }}</pre>
            <div class="flex flex-row justify-end space-x-2 -mt-1">
                <ff-button kind="tertiary" size="small" @click="copy(otcCommand)">
                    <template #icon-right><ClipboardCopyIcon /></template>
                    <span class="">Copy</span>
                </ff-button>
            </div>
            <p class="text-gray-600 italic text-sm">
                <span>Notes:</span>
                <ul class="list-disc list-inside ml-2">
                    <li>this command is single use and expires in 24h.</li>
                    <li>requires device-agent v2.1 or later (follow the manual setup below for older versions).</li>
                </ul>
            </p> -->
        </template>
    </ff-dialog>
</template>

<script>
import { mapState } from 'vuex'

// import TeamAPI from '../../../../api/team.js'

export default {
    name: 'PublishNodeDialog',
    setup () {
        return {
            show () {
                this.$refs.dialog.show()
            }
        }
    },
    data () {
        return {
        }
    },
    computed: {
        ...mapState('account', ['team'])
    },
    async mounted () {

    },
    methods: {
        confirm () {
        }
    }
}
</script>
