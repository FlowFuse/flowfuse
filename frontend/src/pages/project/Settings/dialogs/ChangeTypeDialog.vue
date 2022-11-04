<template>
    <ff-dialog ref="dialog" header="Change Project Type" :disable-primary="!formValid" confirm-label="Set Project Type" @confirm="confirm()">
        <template v-slot:default>
            <form class="space-y-6" @submit.prevent>
                <p>
                    Select the type for your project:
                </p>
                <ff-tile-selection v-model="input.projectType">
                    <ff-tile-selection-option v-for="(projType, index) in projectTypes" :key="index"
                                              :label="projType.name" :description="projType.description"
                                              :price="projType.properties?.billingDescription?.split('/')[0]"
                                              :price-interval="projType.properties?.billingDescription?.split('/')[1]"
                                              :value="projType.id"/>
                </ff-tile-selection>
            </form>
        </template>
    </ff-dialog>
</template>

<script>

import projectTypesApi from '@/api/projectTypes'

export default {
    name: 'ChangeTypeDialog',
    emits: ['confirm'],
    data () {
        return {
            input: {
                projectType: null
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
                this.input.projectType = this.project.projectType.id
                const projectTypes = await projectTypesApi.getProjectTypes()
                this.projectTypes = projectTypes.types
            }
        }
    }
}
</script>
