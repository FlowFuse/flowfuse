<template>
    <div class="acl-rule grid grid-cols-6 gap-4">
        <div class="action col-start-2 flex gap-2.5">
            <span :class="pubClass" data-el="pub">
                <CheckIcon v-if="canPublish" class="ff-icon-sm" />
                <XIcon v-else class="ff-icon-sm" />
                pub
            </span>
            <span :class="subClass" data-el="sub">
                <CheckIcon v-if="canSubscribe" class="ff-icon-sm" />
                <XIcon v-else class="ff-icon-sm" />
                sub
            </span>
        </div>
        <div class="pattern">
            {{ acl.pattern }}
        </div>
    </div>
</template>

<script>
import { CheckIcon, XIcon } from '@heroicons/vue/outline'

export default {
    name: 'BrokerAclRule',
    components: {
        CheckIcon,
        XIcon
    },
    props: {
        acl: {
            required: true,
            type: Object
        }
    },
    computed: {
        canPublish () {
            return ['publish', 'both'].includes(this.acl.action)
        },
        canOnlyPublish () {
            return ['publish'].includes(this.acl.action)
        },
        canSubscribe () {
            return ['subscribe', 'both'].includes(this.acl.action)
        },
        canOnlySubscribe () {
            return ['subscribe'].includes(this.acl.action)
        },
        pubClass () {
            return {
                'text-green-500': this.canPublish,
                'text-red-500': this.canOnlySubscribe
            }
        },
        subClass () {
            return {
                'text-green-500': this.canSubscribe,
                'text-red-500': this.canOnlyPublish
            }
        }
    }
}
</script>

<style scoped lang="scss">

</style>
