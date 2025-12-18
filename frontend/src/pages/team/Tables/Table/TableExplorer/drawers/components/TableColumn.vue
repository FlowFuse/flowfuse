<template>
    <div class="column grid grid-cols-12 gap-1 mb-2">
        <div class="col-section col-span-3">
            <ff-text-input
                v-model="localColumn.name"
                placeholder="Name"
                type="text"
            />
        </div>
        <div class="col-section col-span-3">
            <ff-combobox
                v-model="localColumn.type"
                :options="typeOptions"
                option-title-key="title"
                placeholder="Select Type"
            >
                <template #option="{ option }">
                    <div :title="option.title" class="ff-option-content" data-click-exclude="right-drawer">
                        <p class="clipped-overflow flex-nowrap flex justify-between items-center">
                            <span class="clipped-overflow">
                                {{ option.label }}
                            </span>
                            <span class="italic text-sm text-gray-400 clipped-overflow">
                                ({{ option.type }})
                            </span>
                        </p>
                    </div>
                </template>
            </ff-combobox>
        </div>
        <div class="col-section flex gap-1 col-span-4">
            <ff-checkbox v-model="localColumn.hasDefault" :disabled="cantHaveDefault" />
            <ff-text-input
                v-if="!hasPreDefinedDefaultValues"
                v-model="localColumn.default"
                :disabled="!localColumn.hasDefault"
                :error="errors.default"
                placeholder="Default Value"
                type="text"
            />
            <ff-combobox
                v-else-if="hasPreDefinedDefaultValues && allowsFreeFormPreDefinedValue"
                v-model="localColumn.default"
                :disabled="!localColumn.hasDefault"
                :options="predefinedDefaultValues[localColumn.type].values"
                :hasCustomValue="true"
                placeholder="Default Value"
                option-title-key="title"
            />
            <ff-listbox
                v-else
                v-model="localColumn.default"
                :disabled="!localColumn.hasDefault"
                :options="predefinedDefaultValues[localColumn.type].values"
                placeholder="Default Value"
                option-title-key="title"
            />
        </div>
        <div class="col-section col-span-1">
            <ff-checkbox v-model="localColumn.nullable" :disabled="cantBeNull" />
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

export default defineComponent({
    name: 'TableColumn',
    components: { XIcon },
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
                    label: 'Big Number',
                    type: 'int8',
                    value: 'bigint',
                    title: '[int8] signed eight-byte integer'
                },
                {
                    label: 'Auto-increment Big Number',
                    type: 'serial8',
                    value: 'bigserial',
                    title: '[serial8] autoincrementing eight-byte integer'
                },
                {
                    label: 'True/False',
                    type: 'boolean',
                    value: 'boolean',
                    title: 'logical Boolean (true/false)'
                },
                {
                    label: 'Date',
                    type: 'date',
                    value: 'date',
                    title: 'calendar date (year, month, day)'
                },
                {
                    label: 'Date & Time with Timezone',
                    type: 'timestamptz',
                    value: 'timestamptz',
                    title: 'date and time, including time zone'
                },
                {
                    label: 'Number',
                    type: 'float4',
                    value: 'real',
                    title: '[float4] single precision floating-point number (4 bytes)'
                },
                {
                    label: 'Number – Double Precision',
                    type: 'float8',
                    value: 'double precision',
                    title: '[double precision] double precision floating-point number (8 bytes)'
                },
                {
                    label: 'Text',
                    type: 'text',
                    value: 'text',
                    title: 'variable-length character string'
                }
            ],
            typeOptionsMap: {
                varchar: {
                    placeholder: 'Max Length',
                    key: 'maxLength',
                    type: 'number'
                }
            },
            typeRestrictions: {
                bigserial: {
                    nullable: false,
                    default: false
                }
            },
            predefinedDefaultValues: {
                timestamptz: {
                    allowFreeForm: false,
                    values: [
                        {
                            label: 'NOW()',
                            value: 'NOW()',
                            title: 'Now'
                        }
                    ]
                }
            }
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
        isNumericType () {
            return ['int', 'bigint', 'bigserial', 'real', 'float8'].includes(this.localColumn.type)
        },
        hasTypeOption () {
            return Object.prototype.hasOwnProperty.call(this.typeOptionsMap, this.localColumn.type)
        },
        errors () {
            const errors = {}

            if (this.hasTypeOption) {
                const optionValue = this.localColumn[this.typeOptionsMap[this.localColumn.type].key]
                const isValueNumeric = !isNaN(optionValue) && !isNaN(parseFloat(optionValue))
                const requiredType = this.typeOptionsMap[this.localColumn.type].type
                if (optionValue !== undefined) {
                    if (requiredType === 'number' && !isValueNumeric) {
                        errors[this.typeOptionsMap[this.localColumn.type].key] = 'Value must be numeric'
                    }
                    if (requiredType === 'string' && optionValue.length && isValueNumeric) {
                        errors[this.typeOptionsMap[this.localColumn.type].key] = 'Value must be a string'
                    }
                }
            }

            if (this.localColumn.hasDefault) {
                const value = this.localColumn.default
                const isEmptyString = typeof value === 'string' && value.length === 0

                if (!isEmptyString) {
                    const isValueNumeric = !isNaN(value) && !isNaN(parseFloat(value))
                    if (this.isNumericType && !isValueNumeric) {
                        errors.default = 'Value must be numeric'
                    }
                }
            }

            return errors
        },
        cantBeNull () {
            return Object.prototype.hasOwnProperty.call(this.typeRestrictions, this.localColumn.type) &&
                Object.prototype.hasOwnProperty.call(this.typeRestrictions[this.localColumn.type], 'nullable')
        },
        cantHaveDefault () {
            return Object.prototype.hasOwnProperty.call(this.typeRestrictions, this.localColumn.type) &&
                Object.prototype.hasOwnProperty.call(this.typeRestrictions[this.localColumn.type], 'default')
        },
        hasPreDefinedDefaultValues () {
            return Object.prototype.hasOwnProperty.call(this.predefinedDefaultValues, this.localColumn.type)
        },
        allowsFreeFormPreDefinedValue () {
            return this.hasPreDefinedDefaultValues && this.predefinedDefaultValues[this.localColumn.type].allowFreeForm
        }
    },
    watch: {
        'localColumn.hasDefault' (newValue) {
            if (newValue === false) {
                this.localColumn.default = null
            }
        },
        'localColumn.type' () {
            if (!this.isNumericType) {
                this.localColumn.unsigned = false
            }
            this.localColumn.default = null
            this.localColumn.hasDefault = false
            this.localColumn.nullable = false
        },
        errors: {
            deep: true,
            handler (newVal) {
                this.localColumn._errors_ = !!Object.keys(newVal).length
            }
        }
    },
    methods: {
        propertyHasError (name) {
            return Object.prototype.hasOwnProperty.call(this.errors, name)
        }
    }
})
</script>

<style lang="scss">
.column {
    .col-section {

        .ff-combobox, .ff-listbox {
            min-width: 10px; // resetting min-width
            max-width: 100%;
            width: 100%;
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
