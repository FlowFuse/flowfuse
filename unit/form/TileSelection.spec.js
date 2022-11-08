import { mount } from '@vue/test-utils'

import TileSelection from '@/components/form/TileSelection.vue'
import TileSelectionOption from '@/components/form/TileSelectionOption.vue'

describe('Form > Tile Selection', () => {
    it('should have no children by default', async () => {
        const parent = mount(TileSelection, {
            props: {
                modelValue: null
            },
            global: {
                components: {
                    TileSelectionOption
                }
            }
        })

        expect(parent.findAllComponents('.ff-tile-selection-option').length).toBe(0)
        expect(parent.vm.children.length).toBe(0)
    })
    it('should track registered children', async () => {
        const mockCheckState = jest.spyOn(TileSelection.methods, 'checkState')
        const parent = mount(TileSelection, {
            props: {
                modelValue: null
            },
            global: {
                components: {
                    TileSelectionOption
                }
            }
        })

        parent.vm.registerOption({})
        expect(parent.vm.children.length).toBe(1)
        expect(mockCheckState).toHaveBeenCalled()
    })
    it('emit updates to the model value - equal to the provided value if different to the existing value', async () => {
        const tile = mount(TileSelection, {
            props: {
                modelValue: null
            },
            global: {
                components: {
                    TileSelectionOption
                }
            }
        })

        const selected = { value: 1 }

        tile.vm.setSelected(selected)
        await tile.vm.$nextTick()
        expect(tile.emitted()['update:modelValue']).toBeTruthy()
        expect(tile.emitted()['update:modelValue'][0]).toEqual([1])
    })
    it('emit updates to the model value - equal to null if different to the existing value', async () => {
        const tile = mount(TileSelection, {
            props: {
                modelValue: null
            },
            global: {
                components: {
                    TileSelectionOption
                }
            }
        })

        const selected = { value: 1 }

        // set the model value to 1
        await tile.setProps({ modelValue: 1 })
        // run the "select" function, to assign to existing value
        tile.vm.setSelected(selected)
        await tile.vm.$nextTick()
        // the emission should have occured
        expect(tile.emitted()['update:modelValue']).toBeTruthy()
        expect(tile.emitted()['update:modelValue'][0]).toEqual([null])
    })
    it('should update the child "selected" state depending on the controllers model value', async () => {
        const tile = mount(TileSelection, {
            props: {
                modelValue: null
            },
            global: {
                components: {
                    TileSelectionOption
                }
            }
        })

        await tile.setData({ children: [{ value: 1, selected: false }, { value: 2, selected: false }] })

        tile.vm.checkState(2)
        await tile.vm.$nextTick()
        // the emission should have occured
        expect(tile.vm.children.length).toBe(2)
        expect(tile.vm.children[0].selected).toBeFalsy()
        expect(tile.vm.children[1].selected).toBeTruthy()
    })
})
