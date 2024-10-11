<template>
    <FormRow data-form="file" container-class="max-w-full" :error="errors">
        <template #input>
            <div class="ff-file-upload">
                <input
                    id="fileUpload"
                    ref="fileUpload"
                    type="file"
                    data-el="upload-input"
                    style="display:none;"
                    @change="onFileChange"
                >
                <div v-if="!file" class="ff-file-upload--empty">
                    <PaperClipIcon class="ff-icon ff-icon-sm" />
                    <span>No File Selected</span>
                </div>
                <div v-else class="ff-file-upload--file">
                    <PaperClipIcon class="ff-icon ff-icon-sm" />
                    <span>{{ file.name }} (<FileSize :size="file.size" />)</span>
                    <span class="ff-file-upload--clear ff-clickable" data-action="clear-file" @click="file=null">
                        <XIcon class="ff-btn--icon" />
                    </span>
                </div>
                <ff-button
                    kind="secondary"
                    data-action="upload"
                    @click="$refs.fileUpload.click()"
                >
                    <template #icon-left>
                        <DocumentAddIcon />
                    </template>
                    <template #default>
                        Select File
                    </template>
                </ff-button>
            </div>
        </template>
    </FormRow>
</template>

<script>
import { DocumentAddIcon, PaperClipIcon, XIcon } from '@heroicons/vue/outline'

import FileSize from './FileSize.vue'
import FormRow from './FormRow.vue'

export default {
    name: 'FileUpload',
    components: {
        FileSize,
        PaperClipIcon,
        DocumentAddIcon,
        FormRow,
        XIcon
    },
    props: {
        modelValue: {
            type: Object,
            default: null
        }
    },
    emits: ['update:modelValue'],
    setup () {
        return {
            clear () {
                this.file = null
                this.errors = null
                // clear the input so that the same file can be selected again
                this.$refs.fileUpload.value = ''
                this.$emit('update:modelValue', null)
            }
        }
    },
    data () {
        return {
            file: null,
            errors: null
        }
    },
    methods: {
        onFileChange (event) {
            const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
            this.file = event.target && event.target.files && event.target.files[0]
            this.errors = null
            // check against max file size
            if (this.file.size > MAX_FILE_SIZE) {
                this.file = null
                this.errors = 'File size exceeds 5MB'
            }

            this.$emit('update:modelValue', this.file)
        }
    }
}
</script>

<style lang="scss">
.flex-break {
    flex-basis: 100%;
    height: 0;
}
.ff-file-upload {
    width: 100%;
    display: flex;
    gap: $ff-unit-sm;
    .ff-btn {
        flex-shrink: 0;
    }
}
.ff-file-upload--empty,
.ff-file-upload--file {
    flex-grow: 1;
    border: 1px solid $ff-grey-300;
    padding: $ff-unit-sm $ff-unit-md;
    border-radius: $ff-unit-sm;
    display: flex;
    align-items: center;
    gap: $ff-unit-sm;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow-x: hidden;
}
.ff-file-upload--empty {
    color: $ff-grey-400;
}
.ff-file-upload--clear {
    cursor: pointer;
    &:hover {
        color: $ff-blue-600;
    }
}
</style>
