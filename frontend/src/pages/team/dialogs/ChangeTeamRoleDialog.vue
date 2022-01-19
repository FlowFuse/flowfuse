<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="close">
      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="min-h-screen px-4 text-center">
          <DialogOverlay class="fixed inset-0 bg-black opacity-50" />
          <span class="inline-block h-screen align-middle" aria-hidden="true">
            &#8203;
          </span>
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
            <div class="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-lg rounded">
              <DialogTitle as="h3" class="text-lg font-medium leading-6">Change role</DialogTitle>
                <form class="space-y-6">
                  <div class="mt-2 space-y-2">
                      <template v-if="ownerCount < 2 && isOwner">
                          <p class="text-sm text-gray-500">You cannot change the role for <span class="font-bold">{{user.username}}</span> as
                              they are the only owner of the team.</p>
                      </template>
                      <template v-else>
                          <p class="text-sm text-gray-500">
                              Select a role for <span class="font-bold">{{user.username}}</span>:
                          </p>
                          <FormRow id="role-owner" :value="Roles.Owner" v-model="input.role" type="radio">Owner
                              <template v-slot:description>Owners can add and remove members to the team and create projects</template>
                          </FormRow>
                          <FormRow id="role-member" :value="Roles.Member" v-model="input.role" type="radio">Member
                              <template v-slot:description>Members can access the team projects</template>
                          </FormRow>
                      </template>
                  </div>
                  <div class="mt-4 flex flex-row justify-end">
                      <button type="button" class="forge-button-secondary ml-4" @click="close">Cancel</button>
                      <button type="button" :disabled="ownerCount < 2 && isOwner" class="forge-button ml-4" @click="confirm">Change</button>
                  </div>
              </form>
          </div>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script>
import { ref } from 'vue'
import {
    TransitionRoot,
    TransitionChild,
    Dialog,
    DialogOverlay,
    DialogTitle,
} from '@headlessui/vue'

import FormRow from '@/components/FormRow'
import teamApi from '@/api/team'
import { Roles, RoleNames } from '@core/lib/roles'

export default {
    name: 'ChangeTeamRoleDialog',

    components: {
        TransitionRoot,
        TransitionChild,
        Dialog,
        DialogOverlay,
        DialogTitle,
        FormRow
    },
    data() {
        return {
            ownerCount:0,
            team: null,
            user: null,
            input: {
                role: ""
            },
            Roles: Roles,
            RoleNames: RoleNames
        }
    },
    methods: {
        async confirm() {
            try {
                await teamApi.changeTeamMemberRole(this.team.id, this.user.id , this.input.role)
                this.user.role = this.input.role;
                this.$emit('roleUpdated',this.user);
            } catch(err) {
                console.warn(err);
            }
            this.isOpen = false;
        }
    },
    computed: {
        isOwner: function() {
            return this.user.role === Roles.Owner
        }
    },
    setup() {
        const isOpen = ref(false)
        return {
            isOpen,
            close() {
                isOpen.value = false
            },
            show(team, user, ownerCount) {
                this.team = team;
                this.ownerCount = ownerCount;
                this.user = user;
                this.input.role = user.role;
                isOpen.value = true
            },
        }
    },
}
</script>
