import { expect, vi } from 'vitest'

const mockGet = vi.fn().mockImplementation().mockReturnValue(Promise.resolve({ data: {} }))
const mockPost = vi.fn().mockImplementation().mockReturnValue(Promise.resolve({ data: {} }))
const mockPut = vi.fn().mockImplementation().mockReturnValue(Promise.resolve({ data: {} }))
const mockDelete = vi.fn().mockImplementation().mockReturnValue(Promise.resolve({ data: {} }))

vi.mock('@/api/client', () => {
    return {
        default: {
            get: mockGet,
            post: mockPost,
            put: mockPut,
            delete: mockDelete
        }
    }
})

const mockPaginateUrl = vi.fn().mockImplementation().mockReturnValue('<paginated-url>')

vi.mock('@/utils/paginateUrl', () => {
    return {
        default: mockPaginateUrl
    }
})

describe('Users API', async () => {
    const UsersAPI = await import('@/api/users')

    afterEach(() => {
        mockGet.mockClear()
        mockPost.mockClear()
        mockPut.mockClear()
        mockDelete.mockClear()
        mockPaginateUrl.mockClear()
    })

    test('getUsers handles pagination parameters appropriately', () => {
        const cursor = 5
        const limit = 10
        UsersAPI.default.getUsers(cursor, limit)
        expect(mockPaginateUrl).toHaveBeenCalledOnce()
        expect(mockPaginateUrl).toHaveBeenCalledWith('/api/v1/users', cursor, limit, undefined)
    })

    test('getUsers calls the correct API endpoint', () => {
        UsersAPI.default.getUsers()
        expect(mockGet).toHaveBeenCalledOnce()
        expect(mockGet).toHaveBeenCalledWith('<paginated-url>')
    })

    test('create calls client.post with the correct args', () => {
        const options = {
            mock: 'options'
        }
        UsersAPI.default.create(options)
        expect(mockPost).toHaveBeenCalledOnce()
        expect(mockPost).toHaveBeenCalledWith('/api/v1/users', options)
    })

    test('deleteUsers calls client.delete with the correct args', () => {
        const userid = 'mockuser'
        UsersAPI.default.deleteUser(userid)
        expect(mockDelete).toHaveBeenCalledOnce()
        expect(mockDelete).toHaveBeenCalledWith('/api/v1/users/' + userid)
    })

    test('updateUser calls client.put with the correct args', () => {
        const userid = 'mockuser'
        const options = {
            mock: 'options'
        }
        UsersAPI.default.updateUser(userid, options)
        expect(mockPut).toHaveBeenCalledOnce()
        expect(mockPut).toHaveBeenCalledWith('/api/v1/users/' + userid, options)
    })
})
