<template>
    <section class="broker-form" data-form="broker-form">
        <div class="max-w-3xl">
            <form class="flex gap-9 flex-wrap" @submit.prevent="onSubmit">
                <section class="server space-y-3 max-w-lg min-w-min flex-1">
                    <h6 class="mb-5 pb-2 title">Server</h6>
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

                    <div class="flex gap-3 md:flex-nowrap flex-wrap">
                        <FormRow
                            v-model="form.host"
                            :error="formErrors.host"
                            type="input"
                            name="host"
                            class="host flex-1"
                            container-class="max-w"
                            data-input="host"
                        >
                            <template #default>
                                Host
                            </template>
                        </FormRow>

                        <FormRow
                            v-model="form.port"
                            type="number"
                            name="port"
                            placeholder="1883"
                            class="port flex-1"
                            container-class="max-w"
                            data-input="port"
                        >
                            <template #default>
                                Port
                            </template>
                        </FormRow>
                    </div>

                    <div class="flex gap-3 md:flex-nowrap flex-wrap">
                        <div class="form-row flex flex-col protocol flex-1">
                            <label for="protocol" class="text-gray-800 block text-sm font-medium mb-1">Protocol</label>
                            <ff-listbox id="protocol" v-model="form.protocol" :options="protocolOptions" data-select="protocol" />
                        </div>

                        <div class="form-row flex flex-col protocolVersion flex-1">
                            <label for="protocolVersion" class="text-gray-800 block text-sm font-medium mb-1">Protocol Version</label>
                            <ff-listbox id="protocolVersion" v-model="form.protocolVersion" :options="protocolVersionOptions" data-select="protocolVersion" />
                        </div>
                    </div>

                    <div class="flex gap-3 md:flex-nowrap flex-wrap">
                        <div class="form-row flex flex-col flex-1 ssl">
                            <label for="ssl" class="text-gray-800 block text-sm font-medium mb-1">SSL</label>
                            <ff-listbox id="ssl" v-model="form.ssl" :options="booleanOptions" data-select="ssl" />
                        </div>

                        <div class="form-row flex flex-col flex-1 verifySSL">
                            <label for="verifySSL" class="text-gray-800 block text-sm font-medium mb-1">Verify SSL</label>
                            <ff-listbox id="verifySSL" v-model="form.verifySSL" :options="booleanOptions" data-select="verifySSL" />
                        </div>
                    </div>
                </section>

                <section class="credentials space-y-3 flex-1 max-w-sm">
                    <h6 class="mb-5 pb-2 title">Credentials</h6>

                    <FormRow v-model="form.clientId" type="input" name="clientId" class="clientId" data-input="clientId">
                        <template #default>
                            ClientID
                        </template>
                    </FormRow>

                    <FormRow v-model="form.credentials.username" type="input" name="username" class="username" data-input="username">
                        <template #default>
                            Username
                        </template>
                    </FormRow>

                    <FormRow v-model="form.credentials.password" type="password" name="password" class="password" data-input="password">
                        <template #default>
                            Password
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
import FfListbox from '../../../../ui-components/components/form/ListBox.vue'

export default {
    name: 'BrokerForm',
    components: {
        FfListbox,
        FormRow,
        FfButton
    },
    props: {
        broker: {
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
                name: '',
                host: '',
                port: null,
                protocol: 'mqtt:',
                protocolVersion: '4',
                ssl: 'false',
                verifySSL: 'true',
                clientId: '',
                credentials: {
                    username: '',
                    password: ''
                }
            },
            protocolOptions: [
                {
                    label: 'MQTT',
                    value: 'mqtt:'
                },
                {
                    label: 'WS',
                    value: 'ws:'
                }
            ],
            protocolVersionOptions: [
                {
                    label: '3.0',
                    value: '3'
                },
                {
                    label: '3.1',
                    value: '4'
                },
                {
                    label: '5.0',
                    value: '5'
                }
            ],
            booleanOptions: [
                {
                    label: 'Yes',
                    value: 'true'
                },
                {
                    label: 'No',
                    value: 'false'
                }
            ]
        }
    },
    computed: {
        isFormValid () {
            if (this.form.name.length === 0) {
                return false
            }
            if (this.form.host.length === 0) {
                return false
            }

            return true
        },
        formErrors () {
            return {
                name: this.form.name.length ? '' : 'Name is mandatory',
                host: this.form.host.length ? '' : 'Host is mandatory'
            }
        }
    },
    watch: {
        broker: 'hydrateForm'
    },
    mounted () {
        if (this.broker) this.hydrateForm(this.broker)
    },
    methods: {
        onSubmit () {
            const payload = { ...this.form }

            if (!payload.port) {
                payload.port = 1883
            }

            this.$emit('submit', payload)
        },
        hydrateForm (payload) {
            if (payload) {
                const { id, ...broker } = payload
                broker.ssl = broker.ssl.toString()
                broker.verifySSL = broker.verifySSL.toString()

                this.form = { ...this.form, ...broker }
            }
        }
    }
}
</script>

<style scoped lang="scss">
.broker-form {
    .server, .credentials {
        .title {
            border-bottom: 1px solid $ff-grey-200;
        }
    }

    .server {
        &::after {
            content: ' ';
            width: 1px;
            height: 10px;
            background: red;
        }
    }
}
</style>
