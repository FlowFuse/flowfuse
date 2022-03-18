<template>
    <!-- <div class="mb-8 text-sm text-gray-500 max-w-lg">
        Teams are how you organize who collaborates on your projects.
    </div> -->
    <table class="w-full max-w-3xl table-fixed text-sm rounded overflow-hidden">
        <thead>
            <tr class="font-medium bg-gray-100 ">
                <td class="border p-2 w-auto">Name</td>
                <td class="border p-2 w-auto">Value</td>
                <td class="border p-2 w-16"></td>
            </tr>
        </thead>
        <tbody class="bg-white">
            <tr v-for="(item, itemIdx) in env"  :key="item.name">
                <td class="px-4 py-4 border w-auto align-top">
                    <input class="w-full font-mono" type="text" :value="item.name" :disabled="item.encrypted" >
                </td>
                <td class="px-4 py-4 border w-auto align-top" :class="{'align-middle':item.encrypted}">
                    <div class="w-full" v-if="!item.encrypted">
                        <textarea rows="1" class="w-full font-mono" v-model="item.value"></textarea>
                    </div>
                    <div class="pt-1 text-gray-400 " v-else><LockClosedIcon class="inline w-4" /> encrypted</div>
                </td>
                <td class="pb-2 pt-4 border w-16 text-center align-top">
                    <button type="button" @click="removeEnv(itemIdx)" class="forge-button-inline px-2 py-2"><TrashIcon class="w-5" /></button>
                </td>
            </tr>

            <tr class="">
                <td class="px-4 pt-4 border w-auto align-top">
                    <input class="w-full" type="text" v-model="input.name">
                </td>
                <td class="px-4 pt-4 pb-3 border w-auto align-top space-y-3">
                    <textarea rows="1" class="w-full font-mono" v-model="input.value"></textarea>
                    <FormRow id="encrypt-env-var" v-model="input.encrypt" type="checkbox"> <span class="text-gray-500"><LockClosedIcon class="inline w-4" /> encrypt</span>
                        <!-- <template v-slot:description>Owners can add and remove members to the team and create projects</template> -->
                    </FormRow>
                </td>
                <td class="pb-2 pt-4 border w-16 text-center align-top">
                    <button type="button" @click="addEnv" class="forge-button-inline px-2 py-2"><PlusSmIcon class="w-5" /></button>
                </td>
            </tr>
        </tbody>
    </table>
</template>

<script>
import FormRow from '@/components/FormRow'
import { TrashIcon, PlusSmIcon, LockClosedIcon } from '@heroicons/vue/outline'

export default {
    name: 'ProjectEnvVars',

    props: ['project'],
    data () {
        return {
            input: {
                name: '',
                value: '',
                encrypt: false
            },
            env: [
                {
                    name: 'NR_GITHU"B_CLIENTID',
                    value: '',
                    encrypted: true
                },
                {
                    name: 'DB_HOST',
                    value: '192.16.0.1'
                }
            ]
        }
    },
    watch: {
        project: 'fetchData'
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        addEnv () {
            this.env.push({
                name: this.input.name,
                value: this.input.value,
                encrypted: this.input.encrypt
            })
            this.input.name = ''
            this.input.value = ''
            this.input.encrypt = false
        },
        removeEnv (index) {
            this.env.splice(index, 1)
        },
        fetchData () {
        }
    },
    components: {
        FormRow,
        TrashIcon,
        PlusSmIcon,
        LockClosedIcon
    }
}
</script>
