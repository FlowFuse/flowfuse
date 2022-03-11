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
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-red-700">Save template</DialogTitle>
                <form class="space-y-6">
                  <div class="mt-2 space-y-2">
                      <p class="text-sm text-gray-500">
                          Are you sure you want to save this template?
                      </p>
                      <p class="text-sm text-gray-500">
                          This will create a new revision of the template. It will not modify any Projects using an existing revision of the template.
                      </p>
                  </div>
                  <div class="mt-4 flex flex-row justify-end">
                      <button type="button" class="forge-button-secondary ml-4" @click="close">Cancel</button>
                      <button type="button" class="forge-button ml-4" @click="confirm">Save Template</button>
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
    name: 'AdminTemplateSaveDialog',

    components: {
        TransitionRoot,
        TransitionChild,
        Dialog,
        DialogOverlay,
        DialogTitle,
        FormRow
    },
    methods: {
        confirm() {
            this.$emit('saveTemplate')
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
            show() {
                isOpen.value = true
            },
        }
    },
}
</script>
