<template>
    <ff-dialog :open="isOpen" header="Change Role" @close="close">
        <template v-slot:default v-if="user">
            <form class="space-y-6">
                <div class="mt-2 space-y-2">
                    <template v-if="ownerCount < 2 && isOwner">
                        <p class="text-sm text-gray-500">You cannot change the role for <span class="font-bold">{{ user.username }}</span> as
                            they are the only owner of the team.</p>
                    </template>
                    <template v-else>
                        <p class="text-sm text-gray-500">
                            Select a role for <span class="font-bold">{{ user.username }}</span>:
                        </p>
                        <FormRow id="role-owner" :value="Roles.Owner" v-model="input.role" type="radio">Owner
                            <template v-slot:description>Owners can add and remove members to the team and create projects</template>
                        </FormRow>
                        <FormRow id="role-member" :value="Roles.Member" v-model="input.role" type="radio">Member
                            <template v-slot:description>Members can access the team projects</template>
                        </FormRow>
                    </template>
                </div>
            </form>
        </template>
        <template v-slot:actions>
            <ff-button kind="secondary" class="ml-4" @click="close()">Cancel</ff-button>
            <ff-button :disabled="ownerCount < 2 && isOwner" class="ml-4" @click="confirm()">Change</ff-button>
        </template>
    </ff-dialog>
</template>

<script>
import { ref } from 'vue'

import FormRow from '@/components/FormRow'
import teamApi from '@/api/team'
import { Roles, RoleNames } from '@core/lib/roles'

export default {
    name: 'ChangeTeamRoleDialog',
    components: {
        FormRow
    },
    emits: ['roleUpdated'],
    data () {
        return {
            ownerCount: 0,
            team: null,
            user: null,
            input: {
                role: ''
            },
            Roles: Roles,
            RoleNames: RoleNames
        }
    },
    methods: {
        async confirm () {
            try {
                await teamApi.changeTeamMemberRole(this.team.id, this.user.id, this.input.role)
                this.user.role = this.input.role
                this.$emit('roleUpdated', this.user)
            } catch (err) {
                console.warn(err)
            }
            this.isOpen = false
        }
    },
    computed: {
        isOwner: function () {
            return this.user?.role === Roles.Owner
        }
    },
    setup () {
        const isOpen = ref(false)
        return {
            isOpen,
            close () {
                isOpen.value = false
            },
            show (team, user, ownerCount) {
                this.team = team
                this.ownerCount = ownerCount
                this.user = user
                this.input.role = user.role
                isOpen.value = true
            }
        }
    }
}
</script>
