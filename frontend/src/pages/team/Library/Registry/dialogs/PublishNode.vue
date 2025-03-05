<template>
    <ff-dialog
        ref="dialog" :header="'Publish Custom Node Package'"
        :confirm-label="'Close'"
        @confirm="confirm()"
    >
        <template #default>
            <div>
                <p>
                    These commands should be run wherever you store your codebase for your custom node package.
                </p>
                <p class="mt-2">
                    Publishing to this registry, will make your package available to all of your Node-RED instances in FlowFuse.
                </p>
                <label class="block font-bold mt-4 mb-2">Login to Registry</label>
                <CodeSnippet>{{ commands.login }}</CodeSnippet>
                <CopySnippet :snippet="commands.login" />
                <label class="block font-bold mt-2 mb-2">Credentials</label>
                <p class="mb-3">
                    You will be prompted to insert a <b>username</b> and <b>password</b>.
                    You can re-use the credentials you have previously used, or regenerate credentials now.
                </p>
                <label class="block font-bold mt-2 mb-2">Publish Package</label>
                <CodeSnippet>{{ commands.publish }}</CodeSnippet>
                <CopySnippet :snippet="commands.publish" />
            </div>
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

import CodeSnippet from '../../../../../components/CodeSnippet.vue'
import CopySnippet from '../../../../../components/CopySnippet.vue'

// import TeamAPI from '../../../../api/team.js'

export default {
    name: 'PublishNodeDialog',
    components: {
        CopySnippet,
        CodeSnippet
    },
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
        ...mapState('account', ['settings', 'team']),
        registryHost () {
            return this.settings ? this.settings['team:npm:registry'] : ''
        },
        commands () {
            return {
                login: `npm login --registry ${this.registryHost}`,
                publish: 'npm publish'
            }
        }
    },
    async mounted () {

    },
    methods: {
        confirm () {
        }
    }
}
</script>
