import { mount } from '@vue/test-utils'
import { expect } from 'vitest'

import FfCheck from '../../../../../../frontend/src/ui-components/components/Check.vue'
import FfKebabMenu from '../../../../../../frontend/src/ui-components/components/KebabMenu.vue'
import DataTable from '../../../../../../frontend/src/ui-components/components/data-table/DataTable.vue'
import FfDataTableCell from '../../../../../../frontend/src/ui-components/components/data-table/DataTableCell.vue'
import FfDataTableRow from '../../../../../../frontend/src/ui-components/components/data-table/DataTableRow.vue'
import FfTextInput from '../../../../../../frontend/src/ui-components/components/form/TextInput.vue'

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
