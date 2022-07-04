<template>
    <ff-dialog header="Change Project Type" :open="isOpen">
        <template v-slot:default>
            <form class="space-y-6">
                <p>
                    Select the type for your project:
                </p>
                <ul class="flex flex-wrap gap-1 items-stretch">
                    <li v-for="(projType, index) in projectTypes" :key="index">
                        <ProjectTypeSummary :projectType="projType">
                            <template v-slot:header>
                                <div class="absolute">
                                    <input type="radio" name="project-type" :value="projType.id" v-model="input.projectType">
                                </div>
                            </template>
                        </ProjectTypeSummary>
                    </li>
                </ul>
            </form>
        </template>
        <template v-slot:actions>
            <ff-button kind="secondary" @click="close()">Cancel</ff-button>
            <ff-button class="ml-4" :disabled="!formValid" @click="confirm()">Set Project Type</ff-button>
        </template>
    </ff-dialog>
</template>

<script>
import { ref } from 'vue'

import projectTypesApi from '@/api/projectTypes'
import ProjectTypeSummary from '../../../team/components/ProjectTypeSummary'

export default {
    name: 'ChangeTypeDialog',
    components: {
        ProjectTypeSummary
    },
    data () {
        return {
            input: {
                projectType: ''
            },
            projectTypes: [],
            project: null
        }
    },
    methods: {
        confirm () {
            this.$emit('changeType', this.input.projectType)
            this.isOpen = false
        }
    },
    computed: {
        formValid () {
            return !!this.input.projectType
        }
    },
    setup () {
        const isOpen = ref(false)

        return {
            isOpen,
            close () {
                isOpen.value = false
            },
            async show (project) {
                this.project = project
                this.input.projectType = this.project.projectType
                isOpen.value = true
                const projectTypes = await projectTypesApi.getProjectTypes()
                this.projectTypes = projectTypes.types
            }
        }
    }
}
</script>
