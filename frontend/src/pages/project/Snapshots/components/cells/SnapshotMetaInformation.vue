<template>
    <div class="flex flex-col space-y-1 text-xs text-gray-500">
        <UserCell
            :avatar="user.avatar"
            :name="user.name"
            :username="user.username"
        />
        <span>{{ since }}</span>
    </div>
</template>

<script>
import UserCell from '@/components/tables/cells/UserCell'
import daysSince from '@/utils/daysSince'

export default {
    name: 'SnapshotMetaInformation',
    components: { UserCell },
    props: {
        user: {
            required: true,
            type: Object
        },
        createdAt: {
            required: true,
            type: String
        }
    },
    computed: {
        since: function () {
            return daysSince(this.createdAt)
        }
    }
}
</script>
