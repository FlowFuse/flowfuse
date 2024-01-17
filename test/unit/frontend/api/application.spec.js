import { expect, vi } from 'vitest'

/*
    Mock Values & Imports
*/
const mockGet = vi.fn().mockImplementation().mockReturnValue(Promise.resolve({
    data: {
        teams: [],
        devices: [],
        deviceGroups: []
    }
}))
const mockPost = vi.fn().mockImplementation().mockReturnValue(Promise.resolve({ data: {} }))
const mockPut = vi.fn().mockImplementation().mockReturnValue(Promise.resolve({ data: {} }))
const mockDelete = vi.fn().mockImplementation().mockReturnValue(Promise.resolve({ data: {} }))
const mockPatch = vi.fn().mockImplementation().mockReturnValue(Promise.resolve({ data: {} }))

vi.mock('@/api/client', () => {
    return {
        default: {
            get: mockGet,
            post: mockPost,
            put: mockPut,
            delete: mockDelete,
            patch: mockPatch
        }
    }
})

/*
    Tests
*/
describe('Application API', async () => {
    const ApplicationAPI = await import('../../../../frontend/src/api/application.js')

    afterEach(() => {
        mockGet.mockClear()
        mockPost.mockClear()
        mockPut.mockClear()
        mockDelete.mockClear()
    })
    describe('Device Groups', async () => {
        test('getDeviceGroups calls the correct API endpoint when provided an applicationId', () => {
            const applicationId = '1234'
            ApplicationAPI.default.getDeviceGroups(applicationId)
            expect(mockGet).toHaveBeenCalledOnce()
            expect(mockGet).toHaveBeenCalledWith(`/api/v1/applications/${applicationId}/device-groups`)
        })

        test('getDeviceGroup calls the correct API endpoint when provided an applicationId and groupId', () => {
            const applicationId = '1234'
            const groupId = '5678'
            ApplicationAPI.default.getDeviceGroup(applicationId, groupId)
            expect(mockGet).toHaveBeenCalledOnce()
            expect(mockGet).toHaveBeenCalledWith(`/api/v1/applications/${applicationId}/device-groups/${groupId}`)
        })

        test('createDeviceGroup calls the correct API endpoint, with the relevant options', () => {
            const applicationId = '1234'
            const name = 'My Group'
            const description = 'My Group Description'
            ApplicationAPI.default.createDeviceGroup(applicationId, name, description)
            expect(mockPost).toHaveBeenCalledOnce()
            expect(mockPost).toHaveBeenCalledWith(`/api/v1/applications/${applicationId}/device-groups`, { name, description })
        })

        test('deleteDeviceGroup calls the correct API endpoint', () => {
            const applicationId = '1234'
            const groupId = '5678'
            ApplicationAPI.default.deleteDeviceGroup(applicationId, groupId)
            expect(mockDelete).toHaveBeenCalledOnce()
            expect(mockDelete).toHaveBeenCalledWith(`/api/v1/applications/${applicationId}/device-groups/${groupId}`)
        })

        test('updateDeviceGroup makes a PUT request to update a device group', () => {
            const applicationId = '1234'
            const groupId = '4321'
            const name = 'My Group'
            const description = 'My Group Description'
            ApplicationAPI.default.updateDeviceGroup(applicationId, groupId, name, description)
            expect(mockPut).toHaveBeenCalledOnce()
            expect(mockPut).toHaveBeenCalledWith(`/api/v1/applications/${applicationId}/device-groups/4321`, { name, description })
        })

        test('updateDeviceGroupMembership makes a PATCH request with `set` data', () => {
            const applicationId = '1234'
            const groupId = '4321'
            const data = {
                set: {
                    devices: ['1234', '5678']
                }
            }
            ApplicationAPI.default.updateDeviceGroupMembership(applicationId, groupId, data)
            expect(mockPatch).toHaveBeenCalledOnce()
            expect(mockPatch).toHaveBeenCalledWith(`/api/v1/applications/${applicationId}/device-groups/4321`, data)
        })
    })
})
