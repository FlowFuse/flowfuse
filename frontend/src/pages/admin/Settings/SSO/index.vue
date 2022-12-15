<template>
    <FormHeading>SSO Configurations</FormHeading>
    <ff-data-table
        data-el="sso-providers"
        :columns="providerColumns"
        :rows="providers"
        :rows-selectable="true"
        @row-selected="providerSelected"
        :show-search="true"
    >
        <template v-slot:actions>
            <ff-button :to="{ name: 'AdminSettingsSSOEdit', params: { id: 'create' } }">
                <template v-slot:icon-right>
                    <PlusSmIcon />
                </template>
                Create SSO SAML Configuration
            </ff-button>
        </template>
        <template v-slot:context-menu="{row}">
            <ff-list-item label="Edit Properties" @click.stop="providerSelected(row)"/>
            <ff-list-item label="Delete SAML Configuration" kind="danger" @click.stop="deleteProvider(row)"/>
        </template>
    </ff-data-table>
</template>

<script>
import FormHeading from '@/components/FormHeading'
import { mapState } from 'vuex'
import ssoApi from '@/api/sso'
import { PlusSmIcon } from '@heroicons/vue/outline'
import Alerts from '@/services/alerts'
import Dialog from '@/services/dialog'

export default {
    name: 'AdminSettingsSSO',
    computed: {
        ...mapState('account', ['features']),
        providerColumns () {
            return [
                { label: 'Active', key: 'active', class: ['w-16'] },
                { label: 'Configuration Name', key: 'name' },
                { label: 'Email Domain', key: 'domainFilter' }
            ]
        }
    },
    data () {
        return {
            loading: false,
            providers: [],
            selectedProvider: null
        }
    },
    methods: {
        fetchData: async function () {
            const data = await ssoApi.getProviders()
            this.providers = data.providers
            this.loading = false
        },
        providerSelected: function (provider) {
            this.$router.push({ name: 'AdminSettingsSSOEdit', params: { id: provider.id } })
        },
        deleteProvider: function (provider) {
            Dialog.show({
                header: 'Delete SAML Provider',
                kind: 'danger',
                text: 'Are you sure you want to delete this SAML Provider configuration? Any users with a matching email domain will no longer be able to login using SSO and will have to reset their FlowForge password to continue.',
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
    },
    async beforeMount () {
        if (!this.features.sso) {
            this.$router.push({ path: '/admin/settings' })
        }
    },
    mounted () {
        this.fetchData()
    },
    components: {
        FormHeading,
        PlusSmIcon
    }
}
</script>
