<template>
    <div class="acl flex gap-2.5 mb-3 items-start" data-el="acl-item">
        <div>
            <ff-listbox :key="orderKey" v-model="model.action" :options="actions" @update:model-value="update" />
            <div v-if="validationError.action" data-el="form-row-error" class="ml-4 text-red-400 text-xs">{{ validationError.action }}</div>
        </div>
        <div class="w-full">
            <form-row
                v-model="model.pattern"
                class="flex-1"
                type="input"
                containerClass="max-w-full"
                data-input="pattern"
                :error="validationError.pattern"
                @update:model-value="update"
            />
        </div>
        <ff-button
            kind="tertiary"
            size="small"
            class="self-top p-1 mt-1.5"
            :disabled="!canBeRemoved"
            @click="removeAcl"
        >
            <MinusIcon class="ff-icon" />
        </ff-button>
    </div>
</template>

<script>
import { MinusIcon } from '@heroicons/vue/solid'

import FormRow from '../../../../components/FormRow.vue'
import FfListbox from '../../../../ui-components/components/form/ListBox.vue'

export default {
    name: 'AclItem',
    components: { FfListbox, FormRow, MinusIcon },
    props: {
        modelValue: {
            required: true,
            type: Object
        },
        validationError: {
            required: true,
            type: [Object, undefined]
        },
        orderKey: {
            required: true,
            type: Number
        },
        acls: {
            required: true,
            type: Array
        }
    },
    emits: ['update:modelValue', 'remove-acl'],
    data () {
        return {
            model: {
                id: '',
                action: '',
                pattern: ''
            },
            actions: [
                { label: 'Publish & Subscribe', value: 'both' },
                { label: 'Subscribe', value: 'subscribe' },
                { label: 'Publish', value: 'publish' }
            ]
        }
    },
    computed: {
        hasActionError () {
            return !!this.validationError.action
        },
        hasPatternError () {
            return !!this.validationError.pattern
        },
        hasError () {
            return this.hasActionError || this.hasPatternError
        },
        canBeRemoved () {
            return this.acls.length > 1
        }
    },
    mounted () {
        this.model.id = this.modelValue.id
        this.model.action = this.modelValue.action
        this.model.pattern = this.modelValue.pattern
    },
    methods: {
        update () {
            this.$emit('update:modelValue', this.model)
        },
        removeAcl () {
            if (this.canBeRemoved) {
                this.$emit('remove-acl', this.model)
            }
        }
    }
}
</script>
