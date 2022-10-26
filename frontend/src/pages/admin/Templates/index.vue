<template>
    <div class="space-y-6">
        <FormHeading>
            <div class="text-xl font-bold flex">Templates</div>
            <template v-slot:tools>
                <ff-button size="small" :to="{ name: 'Admin Template', params: { id: 'create' } }">
                    <template v-slot:icon-right>
                        <PlusSmIcon />
                    </template>
                    Create template
                </ff-button>
            </template>
        </FormHeading>
        <ff-loading v-if="loading" message="Loading Templates..." />
        <ff-data-table v-if="!loading" :columns="columns" data-el="templates"
                       :rows="templates" :show-search="true" search-placeholder="Search Templates..."
                       :search-fields="['name', 'description', 'owner_username', 'owner_id']"
                       :rows-selectable="true" @row-selected="editTemplate"
        >
            <template v-slot:context-menu="{row}">
                <ff-list-item label="Edit Template" @click.stop="editTemplate(row)"/>
                <ff-list-item label="Delete Template" kind="danger" @click.stop="showDeleteDialog(row)"/>
            </template>
        </ff-data-table>
        <div v-if="nextCursor">
            <a v-if="!loading" @click.stop="loadItems" class="forge-button-inline">Load more...</a>
        </div>
    </div>
</template>

<script>
import templatesApi from '@/api/templates'

import Dialog from '@/services/dialog'

import FormHeading from '@/components/FormHeading'

import { markRaw } from 'vue'
import { mapState } from 'vuex'
import UserCell from '@/components/tables/cells/UserCell'

import { PlusSmIcon } from '@heroicons/vue/outline'

export default {
    name: 'AdminTemplates',
    data () {
        return {
            templates: [],
            loading: false,
            nextCursor: null,
            columns: [
                { label: 'Active', key: 'active', class: ['w-16', 'text-center'], sortable: true },
                { label: 'Template', key: 'name', class: ['w-56'], sortable: true },
                { label: 'Description', key: 'description', class: ['w-72'], sortable: true },
                {
                    label: 'Created by',
                    key: 'owner_username',
                    class: ['w-56'],
                    sortable: true,
                    component: {
                        is: markRaw(UserCell),
                        map: {
                            id: 'owner_id',
                            name: 'owner_username',
                            avatar: 'owner_avatar'
                        }
                    }
                },
                { label: 'Project Count', key: 'projectCount', class: ['w-32'], sortable: true }
            ]
        }
    },
    async created () {
        await this.loadItems()
    },
    computed: {
        ...mapState('account', ['settings'])
    },
    methods: {
        loadItems: async function () {
            this.loading = true
            const result = await templatesApi.getTemplates(this.nextCursor, 30)
            this.nextCursor = result.meta.next_cursor
            result.templates.forEach(v => {
                // map owner to top tier to show in table
                v.owner_avatar = v.owner.avatar
                v.owner_id = v.owner.id
                v.owner_username = v.owner.username

                this.templates.push(v)
            })
            this.loading = false
        },
        editTemplate (template) {
            console.log(template)
            this.$router.push({
                name: 'Admin Template',
                params: { id: template.id }
            })
        },
        showDeleteDialog (template) {
            const text = template.projectCount > 0 ? 'You cannot delete a template that is still being used by projects.' : 'Are you sure you want to delete this template?'
            Dialog.show({
                header: 'Delete Template',
                kind: 'danger',
                text,
                confirmLabel: 'Delete',
                disablePrimary: template.projectCount > 0
            }, async () => {
                await templatesApi.deleteTemplate(template.id)
                const index = this.templates.indexOf(template)
                this.templates.splice(index, 1)
            })
        }
    },
    components: {
        FormHeading,
        PlusSmIcon
    }
}
</script>
