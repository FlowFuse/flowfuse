<template>
    <section class="database-form" data-form="database-form">
        <div class="max-w-lg">
            <form class="flex gap-9 flex-wrap" @submit.prevent="onSubmit">
                <section class="database space-y-3 max-w-lg min-w-min flex-1">
                    <h6 class="mb-5 pb-2 title">Database</h6>
                    <FormRow
                        v-model="form.name"
                        :error="formErrors.name"
                        type="input"
                        name="name"
                        class="name"
                        container-class="max-w"
                        data-input="name"
                    >
                        <template #default>
                            Name
                        </template>
                    </FormRow>
                </section>
            </form>
            <div class="my-6 flex gap-3 justify-end max-w-full lg:max-w-3xl">
                <ff-button v-if="hasBackButton" kind="tertiary" data-action="back" @click="$router.back()">
                    Cancel
                </ff-button>
                <ff-button
                    v-if="hasDeleteButton" kind="tertiary" class="ff-btn--tertiary-danger"
                    data-action="delete"
                    @click="$emit('delete')"
                >
                    Delete
                </ff-button>
                <ff-button kind="secondary" data-action="submit" :disabled="!isFormValid" @click="onSubmit">
                    Submit
                </ff-button>
            </div>
        </div>
    </section>
</template>

<script>

import FormRow from '../../../../components/FormRow.vue'
import FfButton from '../../../../ui-components/components/Button.vue'

export default {
    name: 'DatabaseForm',
    components: {
        FormRow,
        FfButton
    },
    props: {
        database: {
            type: Object,
            default: null,
            required: false
        },
        hasDeleteButton: {
            type: Boolean,
            default: false
        },
        hasBackButton: {
            type: Boolean,
            default: false
        }
    },
    emits: ['delete', 'submit'],
    data () {
        return {
            form: {
                name: ''
            }
        }
    },
    computed: {
        isFormValid () {
            if (this.form.name.length === 0) {
                return false
            }

            return true
        },
        formErrors () {
            const errors = {
                name: this.form.name.length ? '' : 'Name is mandatory'
            }

            return errors
        }
    },
    watch: {
        database: 'hydrateForm'
    },
    mounted () {
        if (this.database) this.hydrateForm(this.database)
    },
    methods: {
        onSubmit () {
            const payload = { ...this.form }
            this.$emit('submit', payload)
        },
        hydrateForm (payload) {
            if (payload) {
                const { id, ...database } = payload

                this.form = { ...this.form, ...database }
            }
        }
    }
}
</script>

<style scoped lang="scss">
.database-form {
    .database, .credentials {
        .title {
            border-bottom: 1px solid $ff-grey-200;
        }
    }
    dl {
        padding: 10px;
        max-width: 600px;

        dt, dd {
            margin: 0;
        }

        dt {
            font-weight: 600;
        }
        dd {
            text-indent: 10px;
            margin-bottom: 10px;
        }
    }

}
</style>
