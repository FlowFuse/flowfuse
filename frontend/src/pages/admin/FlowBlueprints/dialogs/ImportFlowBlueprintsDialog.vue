<template>
    <ff-dialog
        ref="dialog"
        header="Import Blueprints"
        :close-on-confirm="false"
        confirm-label="Upload"
        :disablePrimary="disablePrimaryButton"
        data-dialog="import-flow-blueprints"
        @confirm="onConfirm"
        @cancel="clearModal"
    >
        <h3>Easily transfer your existing blueprints into FlowFuse.</h3>
        <p>You can start by</p>
        <section class="file-upload-section" :class="{disabled: !!input}">
            <FormRow :error="errors.file" data-form="file" container-class="max-w-full file-row">
                <template #input>
                    <input
                        id="fileUpload"
                        ref="fileUpload"
                        type="file"
                        data-el="upload-input"
                        accept="application/json, text/plain"
                        style="display:none;"
                        @change="onFileChange"
                    >
                    <ff-button
                        kind="secondary"
                        size="full-width"
                        :disabled="!!input"
                        data-action="upload"
                        @click="$refs.fileUpload.click()"
                    >
                        <template #default>
                            <span class="file-input">
                                <span>Choosing your file</span>
                                <span><DocumentAddIcon class="ff-btn--icon" /></span>
                            </span>
                        </template>
                    </ff-button>
                    <div v-if="file" class="loaded-file">
                        <span><DocumentIcon class="ff-btn--icon" /></span>
                        <span>{{ file.name }}</span>
                        <span class="clear" data-action="clear-file" @click="file=null">
                            <XIcon class="ff-btn--icon" />
                        </span>
                    </div>
                </template>
            </FormRow>
        </section>
        <h4 class="text-center divider">
            <span class="line" />
            <span class="text">or</span>
        </h4>
        <section class="textarea-section" :class="{disabled: !!file}">
            <FormRow :error="errors.input" type="textarea" data-form="name" container-class="max-w-full">
                <div class="textarea-wrapper">
                    <span>Pasting A JSON</span>
                    <span v-if="input" class="clear" data-action="clear-input" @click="clearInput">clear</span>
                </div>
                <template #input>
                    <textarea
                        v-model="input"
                        :disabled="!!file"
                        data-el="input-textarea"
                        class="w-full"
                        rows="10"
                        placeholder="Paste in a collection of blueprints here, in a JSON array."
                    />
                </template>
            </FormRow>
        </section>
    </ff-dialog>
</template>

<script>

import { DocumentAddIcon, DocumentIcon, XIcon } from '@heroicons/vue/outline'

import FormRow from '../../../../components/FormRow.vue'

export default {
    name: 'ImportFlowBlueprintsDialog',
    components: { FormRow, DocumentAddIcon, DocumentIcon, XIcon },
    emits: ['import-blueprints'],
    setup () {
        return {
            show () {
                this.$refs.dialog.show()
            }
        }
    },
    data () {
        return {
            input: null,
            file: null,
            fileOutput: null,
            errors: {
                input: null,
                file: null
            }
        }
    },
    computed: {
        jsonInput () {
            if (this.input) {
                try {
                    return JSON.parse(this.input)
                } catch (err) {
                }
            }

            return null
        },
        disablePrimaryButton () {
            if (!this.input && !this.file) {
                return true
            }
            return !!((this.input && this.errors.input) || (this.file && this.errors.file))
        }
    },
    watch: {
        input (newVal) {
            if (!newVal) {
                this.errors.input = null
            }

            try {
                JSON.parse(newVal)
                this.errors.input = null
            } catch (err) {
                this.errors.input = 'Invalid JSON'
            }

            this.file = null
        },
        file (newVal) {
            if (!newVal) {
                this.errors.file = null
            }
            this.input = null
        }
    },
    methods: {
        onFileChange (event) {
            this.file = event.target && event.target.files && event.target.files[0]

            const reader = new FileReader()

            reader.onload = (e) => {
                try {
                    this.fileOutput = JSON.parse(e.target.result)
                    this.errors.file = null
                } catch (err) {
                    this.errors.file = 'Invalid JSON'
                }
            }
            reader.readAsText(this.file)
        },
        clearInput () {
            this.input = null
        },
        clearModal () {
            this.input = null
            this.file = null
        },
        onConfirm () {
            if (this.errors.input || this.errors.file) {
                return false
            }

            const bp = this.fileOutput || this.jsonInput
            this.$emit('import-blueprints', bp)
            this.$refs.dialog.close()
            this.clearModal()
        }
    }
}
</script>

<style lang="scss">
.ff-dialog-container {
  .ff-dialog-content {
    display: flex;
    flex-direction: column;
    gap: 10px;

    .file-upload-section {
      .file-row > div {
        flex-direction: column;
        align-items: baseline;
      }

      .ff-btn {
        width: 100%;
      }

      .file-input {
        display: flex;
        gap: 5px;
      }

      .loaded-file {
        display: flex;
        gap: 5px;
        align-items: center;
        margin-top: 10px;

        .clear {
          cursor: pointer;
          padding: 5px;

          .ff-btn--icon {
            width: 15px;
            height: 15px;
          }
        }
      }
    }

    .textarea-section {
      .textarea-wrapper {
        display: flex;
        justify-content: space-between;

        .clear {
          font-weight: normal;
          cursor: pointer;
        }
      }
    }

    .divider {
      position: relative;
      .line {
        height: 1px;
        width: 100%;
        background: $ff-grey-400;
        position: absolute;
        top: 50%;
        display: block;
      }
      .text {
        background: white;
        padding: 5px;
        position: relative;
        z-index: 10;
      }
    }
  }
}
</style>
