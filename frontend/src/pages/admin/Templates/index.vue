<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Templates">
                <template #tools>
                    <ff-button :to="{ name: 'admin-templates-template', params: { id: 'create' } }" size="small">
                        <template #icon-right>
                            <PlusSmIcon />
                        </template>
                        Create template
                    </ff-button>
                </template>
            </ff-page-header>
        </template>
        <div v-if="loading" class="space-y-6">
            <ff-loading message="Loading Templates..." />
        </div>
        <ff-loading v-if="loading" message="Loading Templates..." />
        <ff-data-table
            v-if="!loading"
            :columns="columns"
            data-el="templates"
            :rows="templates"
            :show-search="true"
            search-placeholder="Search Templates..."
            :search-fields="['name', 'description', 'owner_username', 'owner_id']"
            :rows-selectable="true"
            @row-selected="editTemplate"
        >
            <template #context-menu="{row}">
                <ff-list-item label="Edit Template" @click.stop="editTemplate(row)" />
                <ff-list-item label="Delete Template" kind="danger" @click.stop="showDeleteDialog(row)" />
            </template>
        </ff-data-table>
        <div v-if="nextCursor">
            <a v-if="!loading" class="forge-button-inline" @click.stop="loadItems">Load more...</a>
        </div>
    </ff-page>
</template>

<script>
import { PlusSmIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'

import { mapState } from 'vuex'

import templatesApi from '../../../api/templates.js'

import UserCell from '../../../components/tables/cells/UserCell.vue'
import Dialog from '../../../services/dialog.js'

export default {
    name: 'AdminTemplates',
    components: {
        PlusSmIcon
    },
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
                { label: 'Instance Count', key: 'instanceCount', class: ['w-32'], sortable: true }
            ]
        }
    },
    computed: {
        ...mapState('account', ['settings'])
    },
    async created () {
        await this.loadItems()
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
            this.$router.push({
                name: 'admin-templates-template',
                params: { id: template.id }
            })
        },
        showDeleteDialog (template) {
            const text = template.instanceCount > 0 ? 'You cannot delete a template that is still being used by instances.' : 'Are you sure you want to delete this template?'
            Dialog.show({
                header: 'Delete Template',
                kind: 'danger',
                text,
                confirmLabel: 'Delete',
                disablePrimary: template.instanceCount > 0
            }, async () => {
                await templatesApi.deleteTemplate(template.id)
                const index = this.templates.indexOf(template)
                this.templates.splice(index, 1)
            })
        }
    }
}
</script>
