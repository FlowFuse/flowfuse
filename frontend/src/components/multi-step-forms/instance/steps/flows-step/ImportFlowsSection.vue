<template>
    <section data-section="import-flows" class="import-flows flex flex-col gap-5 h-full overflow-auto">
        <h1 class="mt-16 mb-5">Import your own custom Node-RED flows</h1>

        <div class="wrapper gap-16 overflow-auto">
            <div class="preview">
                <h3>Preview </h3>
                <hr class="my-3">
                <flow-viewer :flow="rawFlows ? JSON.parse(rawFlows) : []" />
            </div>

            <div class="add-flows h-full overflow-auto flex flex-col flex-1">
                <h3>Add flows</h3>
                <hr class="my-3">
                <div class="h-full overflow-auto flex flex-col gap-5">
                    <ff-button kind="tertiary" class="w-full" @click="uploadFlows">
                        Upload your flows.json file

                        <input
                            id="fileUpload" ref="fileUpload" type="file" accept="application/json, text/plain, *"
                            style="display:none;"
                        >
                    </ff-button>

                    <p class="text-center">or</p>

                    <FormRow
                        v-model="rawFlows"
                        class="flex-1 flex flex-col w-full max-h-20" wrapper-class="w-full flex" container-class="w-full"
                        data-el="notification-message"
                    >
                        <p class="text-center">paste them in</p>
                        <template #input>
                            <textarea v-model="rawFlows" class="flex-1 rounded-md w-full min-h-[300px]" />
                        </template>
                    </FormRow>
                </div>
            </div>
        </div>

        <div class="notice ff-page-banner ">
            <div class="max-w-3xl w-full m-auto flex flex-col gap-4">
                <div>
                    <h3>Flow validation</h3>
                    <p>Imported flows are not checked for validity.</p>
                    <p>Invalid or broken nodes may prevent the instance from starting.</p>
                    <p>Always verify the reliability of imported flows and avoid copying flows from the World Wild Web.</p>
                </div>

                <div>
                    <h3>Third-party nodes</h3>
                    <p>External nodes are not installed automatically but can be added once the instance is running.</p>
                </div>

                <div>
                    <h3>Credentials and secrets</h3>
                    <p>These are not imported with the flows but can be reconfigured after deployment.</p>
                </div>

                <div>
                    <h3>Environment variables</h3>
                    <p>Any required variables must be manually added to your environment after the instance is set up.</p>
                </div>
            </div>
        </div>
    </section>
</template>

<script>
import alerts from '../../../../../services/alerts.js'
import FormRow from '../../../../FormRow.vue'
import FlowViewer from '../../../../flow-viewer/FlowViewer.vue'

export default {
    name: 'ImportFlowsSection',
    components: {
        FlowViewer,
        FormRow
    },
    emits: ['flows-updated'],
    data () {
        return {
            rawFlows: null,
            fileUpload: null
        }
    },
    watch: {
        rawFlows: {
            immediate: true,
            handler (flows) {
                this.$emit('flows-updated', flows)
            }
        }
    },
    mounted () {
        this.$refs.fileUpload.addEventListener('change', (e) => {
            if (!e.target.files?.length) {
                return
            }
            const file = e.target.files[0]
            this.fileUpload = null
            const reader = new FileReader()
            reader.onload = () => {
                const data = reader.result
                try {
                    const flows = JSON.parse(data)
                    this.fileUpload = {
                        flows,
                        name: file.name
                    }
                    this.rawFlows = JSON.stringify(flows)
                } catch (e) {
                    console.warn(e)
                    alerts.emit('Failed to read flows.json file')
                }
            }
            reader.readAsText(file)
        })
    },
    methods: {
        uploadFlows () {
            this.$refs.fileUpload.value = ''
            const fileUpload = this.$refs.fileUpload
            fileUpload.click()
        }
    }
}
</script>

<style scoped lang="scss">
.import-flows {
    .wrapper {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        flex: 1;

        .preview {
            flex: 1;
            min-width: 0;
        }

        .add-flows {
            min-width: 350px;
            max-width: 600px;

            textarea {
                background: none;
                border-color: transparent;
                resize: none;
                max-height: 600px;
                transition: background-color ease-out .3s, border-color ease-out .3s;

                &:hover {
                    background: $ff-white;
                    border-color:$ff-grey-300;
                    resize: vertical;
                }
            }
        }
    }

    .notice {
        h3 {
            font-weight: bold
        }

        p {
            font-style: italic;
        }
    }
}
</style>
