<template>
    <FormHeading>{{ $t('ui.ssoConfigurations') }}</FormHeading>
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
                    <PlusSmallIcon />
                </template>
                {{ $t('ui.createSsoConfiguration') }}
            </ff-button>
        </template>
        <template #context-menu="{row}">
            <ff-kebab-item :label="$t('ui.edit')" @click.stop="providerSelected(row)" />
            <ff-kebab-item :label="$t('ui.delete')" kind="danger" @click.stop="deleteProvider(row)" />
        </template>
    </ff-data-table>
</template>

<script>
import { PlusSmallIcon } from '@heroicons/vue/24/outline'
import { mapState } from 'pinia'

import ssoApi from '../../../../api/sso.js'
import FormHeading from '../../../../components/FormHeading.vue'

import { t } from '../../../../i18n.js'
import Alerts from '../../../../services/alerts.js'
import Dialog from '../../../../services/dialog.js'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

export default {
    name: 'AdminSettingsSSO',
    components: {
        FormHeading,
        PlusSmallIcon
    },
    data () {
        return {
            loading: false,
            providers: [],
            selectedProvider: null
        }
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['features']),
        providerColumns () {
            return [
                { label: t('ui.active'), key: 'active', class: ['w-16'] },
                { label: t('ui.type'), key: 'type', class: ['w-16'] },
                { label: t('ui.configurationName'), key: 'name' },
                { label: t('ui.emailDomain'), key: 'domainFilter' }
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
                header: t('ui.deleteSsoProvider'),
                kind: 'danger',
                text: t('ui.areYouSureYouWantToDeleteThisSsoConfigurationAny'),
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
