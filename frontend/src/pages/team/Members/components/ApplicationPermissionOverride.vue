<template>
    <div>
        <span v-if="alteredPermissions === 0" class="opacity-50">No Overrides</span>
        <span v-else>{{ alteredPermissions }} x {{ pluralize('Override', 1) }}</span>
    </div>
</template>

<script>
import { defineComponent } from 'vue'

import { pluralize } from '../../../../composables/String.js'

export default defineComponent({
    name: 'ApplicationPermissionOverride',
    props: {
        permissions: {
            type: Object,
            required: true
        },
        role: {
            type: Number,
            required: true
        }
    },
    setup () { return { pluralize } },
    computed: {
        alteredPermissions () {
            let counter = 0
            Object.keys((this.permissions?.applications || {})).forEach(key => {
                const appPerm = parseInt(this.permissions.applications[key])
                const rolePerm = parseInt(this.role)
                if (appPerm !== rolePerm) { counter++ }
            })

            return counter
        }
    }

})
</script>

<style scoped lang="scss">

</style>
