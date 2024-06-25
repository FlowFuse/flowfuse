<template>
    <ff-dialog ref="dialog" header="Import Blueprints" confirm-label="Upload" @confirm="onConfirm">
        <h3>Easily transfer your existing blueprints into FlowFuse.</h3>
        <p>You can start by</p>
        <section class="file-upload-section" :class="{disabled: !!input}">
            <input
                id="fileUpload"
                ref="fileUpload"
                type="file"
                accept="application/json, text/plain"
                style="display:none;"
                @change="onFileChange"
            >
            <ff-button kind="secondary" size="full-width" :disabled="!!input" @click="$refs.fileUpload.click()">
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
                <span class="clear" @click="file=null"><XIcon class="ff-btn--icon" /></span>
            </div>
        </section>
        <h4 class="text-center divider">
            <span class="line" />
            <span class="text">or</span>
        </h4>
        <section class="textarea-section" :class="{disabled: !!file}">
            <FormRow :error="errors.name" type="textarea" data-form="name" container-class="max-w-full">
                <div class="textarea-wrapper">
                    <span>Pasting A JSON</span>
                    <span v-if="input" class="clear" @click="clearInput">clear</span>
                </div>
                <template #input>
                    <textarea
                        v-model="input"
                        :disabled="!!file"
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
            errors: {
                name: null
            }
        }
    },
    watch: {
        input () {
            this.file = null
        },
        file () {
            this.input = null
        }
    },
    methods: {
        onFileChange (event) {
            this.file = event.target && event.target.files && event.target.files[0]
        },
        clearInput () {
            this.input = null
        },
        onConfirm () {

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
