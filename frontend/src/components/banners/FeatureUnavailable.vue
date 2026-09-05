<template>
    <div
        class="ff-page-banner my-4"
        :class="{minimal: minimal}"
        data-el="page-banner-feature-unavailable"
    >
        <SparklesIcon class="ff-icon mr-2" style="stroke-width: 1px;" />
        <slot name="default">
            <div>
                {{ message }}.
                <span v-if="!onlyCustomMessage">{{ $t('ui.please') }} <a class="ff-link" href="https://flowfuse.com/docs/upgrade/open-source-to-premium/" target="_blank" rel="noopener noreferrer">{{ $t('ui.upgrade2') }}</a> {{ $t('ui.yourInstanceOfFlowfuseInOrderToUseIt') }}</span>
            </div>
        </slot>
        <SparklesIcon class="ff-icon ml-2" style="stroke-width: 1px;" />
    </div>
</template>

<script>
import { SparklesIcon } from '@heroicons/vue/24/outline'

import { t } from '../../i18n.js'

export default {
    name: 'FeatureUnavailable',
    components: {
        SparklesIcon
    },
    props: {
        message: {
            type: String,
            default: t('ui.thisFeatureIsNotAvailableWithYourCurrentLicense')
        },
        minimal: {
            type: Boolean,
            required: false,
            default: false
        },
        onlyCustomMessage: {
            type: Boolean,
            required: false,
            default: false
        }
    }
}
</script>
