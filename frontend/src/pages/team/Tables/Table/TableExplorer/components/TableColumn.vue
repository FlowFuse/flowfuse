<template>
    <div class="column grid grid-cols-12 gap-1 mb-2">
        <div class="col-section col-span-3">
            <ff-text-input
                v-model="localColumn.name"
                placeholder="Name"
                type="text"
            />
        </div>
        <div class="col-section col-span-2">
            <ff-listbox
                v-model="localColumn.type"
                :options="typeOptions"
                option-title-key="title"
                placeholder="Select Type"
            />
        </div>
        <div class="col-section flex gap-1 col-span-4">
            <ff-checkbox v-model="localColumn.hasDefault" />
            <ff-text-input
                v-model="localColumn.default"
                :disabled="!localColumn.hasDefault"
                placeholder="Default Value"
                type="text"
            />
        </div>
        <div class="col-section col-span-1">
            <ff-checkbox v-model="localColumn.nullable" />
        </div>
        <div class="col-section col-span-1">
            <ff-checkbox v-if="canBeUnsigned" v-model="localColumn.unsigned" />
        </div>
        <div class="col-section col-span-1 flex items-center justify-end">
            <span v-ff-tooltip:left="'Remove'" @click="$emit('remove')">
                <XIcon class="ff-icon ff-icon-sm cursor-pointer text-gray-600" />
            </span>
        </div>
    </div>
</template>

<script>
import { XIcon } from '@heroicons/vue/solid'
import { defineComponent } from 'vue'

import FfListbox from '../../../../../../ui-components/components/form/ListBox.vue'

export default defineComponent({
    name: 'TableColumn',
    components: { FfListbox, XIcon },
    props: {
        column: {
            type: Object,
            required: true
        }
    },
    emits: ['update:column', 'remove'],
    data () {
        return {
            typeOptions: [
                {
                    label: 'int',
                    value: 'int',
                    title: '[integer, int4] signed four-byte integer'
                },
                {
                    label: 'bigint',
                    value: 'bigint',
                    title: '[int8] signed eight-byte integer'
                },
                {
                    label: 'bigserial',
                    value: 'bigserial',
                    title: '[serial8] autoincrementing eight-byte integer'
                },
                {
                    label: 'boolean',
                    value: 'boolean',
                    title: 'logical Boolean (true/false)'
                },
                {
                    label: 'date',
                    value: 'date',
                    title: 'calendar date (year, month, day)'
                },
                {
                    label: 'timestamptz',
                    value: 'timestamptz',
                    title: 'date and time, including time zone'
                },
                {
                    label: 'real',
                    value: 'real',
                    title: '[float4] single precision floating-point number (4 bytes)'
                },
                {
                    label: 'float8',
                    value: 'double precision',
                    title: '[double precision] double precision floating-point number (8 bytes)'
                },
                {
                    label: 'text',
                    value: 'text',
                    title: 'variable-length character string'
                },
                {
                    label: 'varchar',
                    value: 'varchar',
                    title: 'variable-length character string'
                }
            ]
        }
    },
    computed: {
        localColumn: {
            get () {
                return this.column
            },
            set (value) {
                this.$emit('update:column', value)
            }
        },
        canBeUnsigned () {
            return ['int', 'bigint', 'bigserial', 'real', 'float8'].includes(this.localColumn.type)
        }
    },
    watch: {
        'localColumn.hasDefault' (newValue) {
            if (newValue === false) {
                this.localColumn.default = null
            }
        },
        'localColumn.type' () {
            if (!this.canBeUnsigned) {
                this.localColumn.unsigned = false
            }
        }
    }
})
</script>

<style lang="scss">
.column {
    .col-section {

        .ff-listbox {
            min-width: 100%;
            max-width: 100%;
        }

        .ff-input {
            min-width: 10px;
        }

        .ff-checkbox {
            span {
                top: 8px;
            }
        }
    }
}
</style>
