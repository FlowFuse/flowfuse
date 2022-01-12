<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="close">
      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="min-h-screen px-4 text-center">
          <DialogOverlay class="fixed inset-0 bg-black opacity-50" />
          <span class="inline-block h-screen align-middle" aria-hidden="true">
            &#8203;
          </span>
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <div class="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-lg rounded">
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-red-700">Delete team</DialogTitle>
                <form class="space-y-6">
                  <div class="mt-2 space-y-2">
                      <p class="text-sm text-gray-500">
                          Are you sure you want to delete this team? Once deleted, there is no going back.
                      </p>
                      <p class="text-sm text-gray-500">
                          Enter the team name '<code>{{team.name}}</code>' to continue.
                      </p>
                  </div>
                  <FormRow v-model="input.teamName" id="projectName">Name</FormRow>
                  <div class="mt-4 flex flex-row justify-end">
                      <button type="button" class="forge-button-secondary ml-4" @click="close">Cancel</button>
                      <button type="button" :disabled="!formValid" class="forge-button-danger ml-4" @click="confirm">Delete</button>
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

export default {
    name: 'ConfirmProjectDeleteDialog',

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
            input: {
                teamName: ""
            },
            formValid: false,
            team: null
        }
    },
    watch: {
        'input.teamName': function() {
            this.formValid = this.team.name === this.input.teamName
        }
    },
    methods: {
        confirm() {
            this.$emit('deleteTeam')
            this.isOpen = false
        }
    },
    setup() {
        const isOpen = ref(false)
        return {
            isOpen,
            close() {
                isOpen.value = false
            },
            show(team) {
                this.team = team;
                isOpen.value = true
            },
        }
    },
}
</script>
