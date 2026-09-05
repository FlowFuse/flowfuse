<template>
    <ff-page>
        <template #header>
            <ff-page-header :title="$t('ui.library')" :tabs="navigation">
                <template #context>
                    {{ $t('ui.commonResourcesThatAreSharedAcrossAllOfYourTeamS') }}
                </template>
                <template #pictogram>
                    <img src="../../../images/pictograms/library_red.png" alt="logo">
                </template>
                <template #helptext>
                    <p>{{ $t('ui.inNodeRedYouCanExportAndImportFlowsAndFunctionsA') }}</p>
                    <p>{{ $t('ui.theContentsOfYourTeamLibraryAreAvailableAcrossAn') }}</p>
                    <p>{{ $t('ui.youCanReadMoreAbout') }} <a href="https://nodered.org/docs/user-guide/editor/workspace/import-export" target="_blank">Import &amp; Exporting Flows</a> {{ $t('ui.inTheNodeRedDocumentation') }}</p>
                </template>
            </ff-page-header>
        </template>

        <router-view />
    </ff-page>
</template>

<script>
import { mapState } from 'pinia'

import { t } from '../../../i18n.js'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

export default {
    name: 'SharedLibrary',
    computed: {
        ...mapState(useAccountSettingsStore, ['featuresCheck']),
        navigation () {
            const list = [
                {
                    label: t('ui.teamLibrary'),
                    to: {
                        name: 'team-library-files'
                    }
                },
                {
                    label: t('ui.blueprints'),
                    to: {
                        name: 'team-library-blueprints'
                    }
                }
            ]
            if (this.featuresCheck?.isPrivateRegistryFeatureEnabledForPlatform) {
                list.splice(1, 0, {
                    label: t('ui.customNodes'),
                    featureUnavailable: !this.featuresCheck?.isPrivateRegistryFeatureEnabledForPlatform || !this.featuresCheck?.isPrivateRegistryFeatureEnabledForTeam,
                    to: {
                        name: 'team-library-registry'
                    }
                })
            }
            return list
        }
    }
}
</script>
