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
                            <DialogTitle as="h3" class="text-lg font-medium leading-6 text-red-700">Remove user from team</DialogTitle>
                            <form class="space-y-6">
                                <div class="mt-2 space-y-2">
                                    <template v-if="ownerCount < 2 && user.role === 'owner'">
                                        <p class="text-sm text-gray-500">You cannot remove <span class="font-bold">{{user.username}}</span> as
                                            they are the only owner of the team.</p>
                                    </template>
                                    <template v-else>
                                        <p class="text-sm text-gray-500">
                                            Are you sure you want to remove <span class="font-bold">{{user.username}}</span> from the team <span class="font-bold">{{team.name}}</span>?
                                        </p>
                                    </template>
                                </div>
                                <div class="mt-4 flex flex-row justify-end">
                                    <ff-button kind="secondary" class="forge-button-secondary ml-4" @click="close()">Cancel</ff-button>
                                    <ff-button kind="danger" :disabled="ownerCount < 2 && user.role === 'owner'" class="ml-4" @click="confirm()">Remove</ff-button>
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
    DialogTitle
} from '@headlessui/vue'

import teamApi from '@/api/team'

export default {
    name: 'ConfirmTeamUserRemoveDialog',

    components: {
        TransitionRoot,
        TransitionChild,
        Dialog,
        DialogOverlay,
        DialogTitle
    },
    data () {
        return {
            ownerCount: 0,
            user: null,
            team: null
        }
    },
    methods: {
        async confirm () {
            try {
                await teamApi.removeTeamMember(this.team.id, this.user.id)
                this.$emit('userRemoved', this.user)
            } catch (err) {
                console.warn(err)
            }
            this.isOpen = false
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
                this.user = user
                this.team = team
                this.ownerCount = ownerCount
                isOpen.value = true
            }
        }
    }
}
</script>
