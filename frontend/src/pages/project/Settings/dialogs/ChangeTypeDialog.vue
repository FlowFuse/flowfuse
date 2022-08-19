<template>
    <ff-dialog ref="dialog" header="Change Project Type" :disable-primary="!formValid" confirm-label="Set Project Type" @confirm="confirm()">
        <template v-slot:default>
            <form class="space-y-6" @submit.prevent>
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
    </ff-dialog>
</template>

<script>

import projectTypesApi from '@/api/projectTypes'
import ProjectTypeSummary from '../../../team/components/ProjectTypeSummary'

export default {
    name: 'ChangeTypeDialog',
    emits: ['confirm'],
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
            if (this.formValid) {
                this.$emit('confirm', this.input.projectType)
            }
        }
    },
    computed: {
        formValid () {
            return !!this.input.projectType
        }
    },
    setup () {
        return {
            async show (project) {
                this.$refs.dialog.show()
                this.project = project
                this.input.projectType = this.project.projectType
                const projectTypes = await projectTypesApi.getProjectTypes()
                this.projectTypes = projectTypes.types
            }
        }
    }
}
</script>
