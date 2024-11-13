<template>
    <FormHeading>SSO Configurations</FormHeading>
    <ff-data-table
        data-el="sso-providers"
        :columns="providerColumns"
        :rows="providers"
        :rows-selectable="true"
        :show-search="true"
        @row-selected="providerSelected"
    >
        <template #actions>
            <ff-button :to="{ name: 'admin-settings-sso-edit', params: { id: 'create' } }">
                <template #icon-right>
                    <PlusSmIcon />
                </template>
                Create SSO Configuration
            </ff-button>
        </template>
        <template #context-menu="{row}">
            <ff-list-item label="Edit" @click.stop="providerSelected(row)" />
            <ff-list-item label="Delete" kind="danger" @click.stop="deleteProvider(row)" />
        </template>
    </ff-data-table>
</template>

<script>
import { PlusSmIcon } from '@heroicons/vue/outline'
import { mapState } from 'vuex'

import ssoApi from '../../../../api/sso.js'
import FormHeading from '../../../../components/FormHeading.vue'

import Alerts from '../../../../services/alerts.js'
import Dialog from '../../../../services/dialog.js'

export default {
    name: 'AdminSettingsSSO',
    components: {
        FormHeading,
        PlusSmIcon
    },
    data () {
        return {
            loading: false,
            providers: [],
            selectedProvider: null
        }
    },
    computed: {
        ...mapState('account', ['features']),
        providerColumns () {
            return [
                { label: 'Active', key: 'active', class: ['w-16'] },
                { label: 'Type', key: 'type', class: ['w-16'] },
                { label: 'Configuration Name', key: 'name' },
                { label: 'Email Domain', key: 'domainFilter' }
            ]
        }
    },
    async beforeMount () {
        if (!this.features.sso) {
            this.$router.push({ path: '/admin/settings' })
        }
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        fetchData: async function () {
            const data = await ssoApi.getProviders()
            data.providers.sort((A, B) => {
                if (A.active === B.active) {
                    return A.name.localeCompare(B.name)
                } else if (A.active) {
                    return -1
                }
                return 1
            })
            this.providers = data.providers
            this.loading = false
        },
        providerSelected: function (provider) {
            this.$router.push({ name: 'admin-settings-sso-edit', params: { id: provider.id } })
        },
        deleteProvider: function (provider) {
            Dialog.show({
                header: 'Delete SSO Provider',
                kind: 'danger',
                text: 'Are you sure you want to delete this SSO configuration? Any users with a matching email domain will no longer be able to login using SSO and will have to reset their FlowFuse password to continue.',
                confirmLabel: 'Delete'
            }, async () => {
                ssoApi.deleteProvider(provider.id)
                    .then(() => {
                        this.fetchData()
                    }).catch((err) => {
                        if (err.response && err.response.data && err.response.data.error) {
                            Alerts.emit(err.response.data.error, 'warning')
                        } else {
                            Alerts.emit(err.message, 'warning')
                        }
                    })
            })
        }
    }
}
</script>
