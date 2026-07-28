<template>
    <template v-if="googleSSOEnabled">
        <hr class="mb-4">
        <GoogleLogin
            class="w-full"
            :client-id="settings['platform:sso:google:clientId']"
            popup-type="TOKEN"
            :callback="ggCallback"
        >
            <ff-button type="button" class="w-full space-x-2" kind="secondary" data-action="google-login" :disabled="disabled || busy">
                <template #icon-left>
                    <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yMy41MiAxMi4yNzI3QzIzLjUyIDExLjQyMTggMjMuNDQzNiAxMC42MDM2IDIzLjMwMTggOS44MTgxNkgxMlYxNC40NkgxOC40NTgyQzE4LjE4IDE1Ljk2IDE3LjMzNDUgMTcuMjMwOSAxNi4wNjM2IDE4LjA4MThWMjEuMDkyN0gxOS45NDE4QzIyLjIxMDkgMTkuMDAzNiAyMy41MiAxNS45MjczIDIzLjUyIDEyLjI3MjdaIiBmaWxsPSIjNDI4NUY0Ii8+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTIgMjRDMTUuMjQgMjQgMTcuOTU2NCAyMi45MjU1IDE5Ljk0MTggMjEuMDkyN0wxNi4wNjM3IDE4LjA4MThDMTQuOTg5MSAxOC44MDE4IDEzLjYxNDYgMTkuMjI3MyAxMiAxOS4yMjczQzguODc0NTYgMTkuMjI3MyA2LjIyOTExIDE3LjExNjQgNS4yODU0NyAxNC4yOEgxLjI3NjM4VjE3LjM4OTFDMy4yNTA5MyAyMS4zMTA5IDcuMzA5MTEgMjQgMTIgMjRaIiBmaWxsPSIjMzRBODUzIi8+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNNS4yODU0NSAxNC4yOEM1LjA0NTQ1IDEzLjU2IDQuOTA5MDkgMTIuNzkwOSA0LjkwOTA5IDEyQzQuOTA5MDkgMTEuMjA5MSA1LjA0NTQ1IDEwLjQ0IDUuMjg1NDUgOS43MTk5OFY2LjYxMDg5SDEuMjc2MzZDMC40NjM2MzYgOC4yMzA4OSAwIDEwLjA2MzYgMCAxMkMwIDEzLjkzNjMgMC40NjM2MzYgMTUuNzY5MSAxLjI3NjM2IDE3LjM4OTFMNS4yODU0NSAxNC4yOFoiIGZpbGw9IiNGQkJDMDUiLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xMiA0Ljc3MjczQzEzLjc2MTggNC43NzI3MyAxNS4zNDM3IDUuMzc4MTggMTYuNTg3MyA2LjU2NzI3TDIwLjAyOTEgMy4xMjU0NUMxNy45NTA5IDEuMTg5MDkgMTUuMjM0NiAwIDEyIDBDNy4zMDkxMSAwIDMuMjUwOTMgMi42ODkwOSAxLjI3NjM4IDYuNjEwOTFMNS4yODU0NyA5LjcyQzYuMjI5MTEgNi44ODM2NCA4Ljg3NDU2IDQuNzcyNzMgMTIgNC43NzI3M1oiIGZpbGw9IiNFQTQzMzUiLz4KPC9zdmc+Cg==" class="ml-2">
                </template>
                <span>{{ label }}</span>
                <span v-if="busy" class="w-4">
                    <SpinnerIcon class="ff-icon ml-3 w-3.5!" />
                </span>
            </ff-button>
        </GoogleLogin>
        <span class="ff-error-inline" data-el="errors-googleSSO">{{ error }}</span>
    </template>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { GoogleLogin } from 'vue3-google-login'

import SSOApi from '@/api/sso.js'
import SpinnerIcon from '@/components/icons/Spinner.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'

withDefaults(defineProps<{
    label?: string
    disabled?: boolean
}>(), {
    label: 'Sign In with Google',
    disabled: false
})

const { settings } = storeToRefs(useAccountSettingsStore())

const error = ref('')
const busy = ref(false)

const googleSSOEnabled = computed(() => {
    return settings.value['platform:sso:google'] && settings.value['platform:sso:google:clientId']
})

async function ggCallback (response: { access_token: string }) {
    busy.value = true
    error.value = ''
    const result = await SSOApi.googleSSOCallback(response.access_token)
    if (result.url) {
        window.location = result.url
    } else if (result.error) {
        error.value = result.error
        busy.value = false
    } else {
        console.error(result)
        busy.value = false
    }
}
</script>
