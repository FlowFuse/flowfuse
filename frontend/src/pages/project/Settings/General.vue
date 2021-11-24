<template>
    <form class="space-y-2">
        <FormRow v-model="input.projectId" type="uneditable" id="projectId" inputClass="font-mono">
            Project ID
            <!-- <template v-slot:append>
                <button type="button" class="forge-button-inline px-1" @click="copyProjectId"><ClipboardCopyIcon class="w-5" /></button>
            </template> -->
        </FormRow>

        <FormRow v-model="input.projectName" :type="editing.name?'text':'uneditable'" id="projectName">
            Name
            <template v-slot:append>
                <div class="space-x-2 whitespace-nowrap">
                    <template v-if="!editing.name">
                        <button type="button" class="forge-button forge-button-small" @click="editName">edit</button>
                    </template>
                    <template v-else>
                        <button type="button" class="forge-button-tertiary forge-button-small" @click="cancelEditName">cancel</button>
                        <button type="button" class="forge-button forge-button-small" @click="saveEditName">save</button>
                    </template>
                </div>
            </template>
        </FormRow>
    </form>
</template>

<script>
import projectApi from '@/api/project'
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import { ClipboardCopyIcon } from '@heroicons/vue/outline'


export default {
    name: 'ProjectSettings',

    props:[ "project" ],
    data() {
        return {
            editing: {
                name: false
            },
            input: {
                projectId: "",
                projectName: ""
            },
            original: {
                projectName: ""
            }
        }
    },
    watch: {
         project: 'fetchData'
    },
    mounted() {
        this.fetchData()
    },
    // beforeRouteLeave(to, from, next) {
    //     console.log(to,from);
    //     if (this.editing.name) {
    //         next(false);
    //     } else {
    //         next();
    //     }
    // },
    methods: {
        copyProjectId() {

        },
        editName() {
            this.original.projectName = this.input.projectName;
            this.editing.name = true
            setTimeout(() => {
                document.getElementById("projectName").focus()
            },0)
        },
        async saveEditName() {
            this.editing.name = false
            await projectApi.updateProject(this.project.id, {name: this.input.projectName});
            this.$emit('projectUpdated')
        },
        cancelEditName() {
            this.editing.name = false
            this.input.projectName = this.original.projectName;
        },
        fetchData () {
            this.input.projectId = this.project.id;
            this.input.projectName = this.project.name;
        }
    },
    components: {
        FormRow,
        FormHeading,
        ClipboardCopyIcon
    }
}
</script>
