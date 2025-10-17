<template>
    <section data-section="import-flows" class="import-flows flex flex-col gap-5 h-full">
        <h1 class="mt-6 mb-5">Import your own custom Node-RED flows</h1>

        <div class="wrapper gap-5">
            <div class="preview">
                <h3>Preview </h3>
                <hr class="my-3">
                <flow-viewer :flow="flows" />
            </div>

            <div class="add-flows flex flex-col">
                <h3>Add flows</h3>
                <hr class="my-3">
                <div class="content flex flex-col gap-1">
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
                        class="flex flex-col flex-1" wrapper-class="w-full flex flex-1"
                        container-class="w-full"
                        data-el="notification-message"
                    >
                        <p class="text-center">paste them in</p>
                        <template #input>
                            <div class="flow-input-wrapper w-full relative">
                                <textarea
                                    v-model="rawFlows" class="rounded-md w-full"
                                    :class="{'has-content': rawFlows}"
                                />
                                <ff-button
                                    v-if="rawFlows" kind="secondary" class="absolute bottom-1 right-1"
                                    @click="rawFlows = null"
                                >
                                    clear
                                </ff-button>
                            </div>
                        </template>
                    </FormRow>
                </div>
            </div>
        </div>

        <div class="notice ff-page-banner ">
            <div class="notice-element">
                <h3>Flow validation</h3>
                <p>Imported flows are not checked for validity.</p>
                <p>Invalid or broken nodes may prevent the instance from starting.</p>
                <p>
                    Always verify the reliability of imported flows and avoid copying flows from the World Wild
                    Web.
                </p>
            </div>

            <div class="notice-element">
                <h3>Third-party nodes</h3>
                <p>External nodes are not installed automatically but can be added once the instance is running.</p>
            </div>
            <div class="notice-element">
                <h3>Credentials and secrets</h3>
                <p>These are not imported with the flows but can be reconfigured after deployment.</p>
            </div>

            <div class="notice-element">
                <h3>Environment variables</h3>
                <p>
                    Any required variables must be manually added to your environment after the instance is set
                    up.
                </p>
            </div>
        </div>
    </section>
</template>

<script>
import alerts from '../../../../../services/alerts.js'
import FfButton from '../../../../../ui-components/components/Button.vue'
import FormRow from '../../../../FormRow.vue'
import FlowViewer from '../../../../flow-viewer/FlowViewer.vue'

export default {
    name: 'ImportFlowsSection',
    components: {
        FfButton,
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
    computed: {
        flows () {
            if (!this.rawFlows) {
                return []
            }
            try {
                return JSON.parse(this.rawFlows)
            } catch (e) {
                return []
            }
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
    overflow: auto;

    & > .wrapper {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        flex: 1;
        overflow: auto;

        @media (max-width: 768px) {
            flex-direction: column;
            gap: 15px;
        }

        .preview {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            max-height: 100%;

            @media (max-width: 768px) {
                max-width: 100%;
                max-height: 400px;
                order: 2;
            }
        }

        .add-flows {
            overflow: auto;
            min-width: 350px;
            max-width: 600px;
            height: 100%;
            flex: 1;

            .content {
                overflow: auto;
                flex: 1;

                .flow-input-wrapper {
                    height: 100%;
                    display: flex;

                    textarea {
                        background: none;
                        border-color: $ff-grey-200;
                        resize: none;
                        min-height: 200px;
                        transition: background-color ease-out .3s, border-color ease-out .3s;
                        flex: 1;

                        &:hover, &:focus {
                            background: $ff-white;
                            border-color: $ff-grey-300;
                            resize: vertical;
                        }

                        &.has-content {
                            border-color: $ff-grey-300;
                        }

                        @media (max-width: 768px) {
                            max-height: 100%;
                            min-height: 100px;
                            background: $ff-white;
                            border-color: $ff-grey-300;
                            resize: none;
                        }
                    }
                }

                @media (max-width: 768px) {
                    overflow: initial;
                    gap: 0;
                }
            }

            @media (max-width: 768px) {
                width: 100%;
                min-width: 100%;
                max-width: fit-content;
                height: auto;
                flex: 0 0 auto;
            }
        }
    }

    .notice {
        display: flex;
        gap: 15px;
        align-items: baseline;
        font-size: 0.8rem;

        .notice-element {

            h3 {
                font-weight: bold
            }

            p {
                font-style: italic;
                margin-bottom: 5px;
            }
        }

        @media (max-width: 768px) {
            flex: 0 0 auto;
            align-items: flex-start;
            justify-content: initial;
            padding: 10px;
            flex-direction: column;
            overflow: auto;
            height: fit-content;
            max-height: 10vh;
        }
    }
}
</style>
<style lang="scss">
.import-flows {
    & > .wrapper {
        .preview {
            .ff-flow-viewer {
                flex: 1;
            }
        }
    }
}
</style>
