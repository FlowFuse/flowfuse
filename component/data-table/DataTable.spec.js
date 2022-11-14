import { mount } from '@vue/test-utils'
import DataTable from '@/components/data-table/DataTable.vue'

import FfDataTableRow from '@/components/data-table/DataTableRow.vue'
import FfDataTableCell from '@/components/data-table/DataTableCell.vue'
import FfKebabMenu from '@/components/KebabMenu.vue'
import FfTextInput from '@/components/form/TextInput.vue'
import FfCheck from '@/components/Check.vue'

describe('Data-Table > DataTable', () => {
    it('supports searching rows by values', async () => {
        const wrapper = mount(DataTable, {
            props: {
                columns: [{
                    key: 'name',
                    label: 'Name'
                }],
                rows: [
                    { name: 'Apple' },
                    { name: 'Orange', details: null },
                    { name: 'Grapefruit', details: { color: 'Orangey' } }
                ],
                showSearch: true
            },
            global: {
                components: {
                    FfDataTableRow, FfDataTableCell, FfTextInput, FfCheck, FfKebabMenu
                }
            }
        })

        expect(wrapper.find('tbody').text()).toBe('AppleOrangeGrapefruit')

        await wrapper.find('[data-form="search"] input').setValue('Orange')

        expect(wrapper.find('tbody').text()).toBe('OrangeGrapefruit')
    })

    it('supports searching rows by values in specific fields only', async () => {
        const wrapper = mount(DataTable, {
            props: {
                columns: [{
                    key: 'name',
                    label: 'Name'
                }],
                rows: [
                    { name: 'Apple' },
                    { name: 'Orange' },
                    { name: 'Grapefruit', details: { color: 'Orangey' } }
                ],
                showSearch: true,
                searchFields: ['name']
            },
            global: {
                components: {
                    FfDataTableRow, FfDataTableCell, FfTextInput, FfCheck, FfKebabMenu
                }
            }
        })

        expect(wrapper.find('tbody').text()).toBe('AppleOrangeGrapefruit')

        await wrapper.find('[data-form="search"] input').setValue('Orange')

        expect(wrapper.find('tbody').text()).toBe('Orange')
    })
})
