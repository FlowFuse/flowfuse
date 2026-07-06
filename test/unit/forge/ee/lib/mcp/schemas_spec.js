const should = require('should') // eslint-disable-line no-unused-vars

const FF_UTIL = require('flowforge-test-utils')

const {
    teamId,
    applicationId,
    hostedInstanceId,
    remoteInstanceId,
    snapshotId,
    basePagination,
    paginationParams,
    auditLogQuery,
    basePaginationKeys,
    paginationParamsKeys,
    auditLogQueryKeys,
    appendQuery
} = FF_UTIL.require('forge/ee/lib/mcp/schemas')

describe('MCP shared query schemas', function () {
    describe('entity-id params', function () {
        it('hashid params accept any non-empty string', function () {
            for (const param of [teamId, applicationId, remoteInstanceId, snapshotId]) {
                param.parse('aBc123').should.equal('aBc123')
            }
        })
        it('hostedInstanceId accepts a UUID and rejects a hashid', function () {
            hostedInstanceId.parse('4f8c1e2a-1b2c-4d3e-8f90-abcdef123456').should.be.a.String()
            hostedInstanceId.safeParse('aBc123').success.should.equal(false)
        })
    })

    describe('fragment composition', function () {
        it('basePagination exposes only cursor/limit/page', function () {
            basePaginationKeys.should.eql(['cursor', 'limit', 'page'])
        })
        it('paginationParams is basePagination plus search and sort fields', function () {
            paginationParamsKeys.should.eql(['cursor', 'limit', 'page', 'query', 'sort', 'dir', 'order'])
        })
        it('auditLogQuery is paginationParams plus the audit filters', function () {
            auditLogQueryKeys.should.eql(['cursor', 'limit', 'page', 'query', 'sort', 'dir', 'order', 'event', 'username'])
        })
        it('key lists match the shape objects they describe', function () {
            basePaginationKeys.should.eql(Object.keys(basePagination))
            paginationParamsKeys.should.eql(Object.keys(paginationParams))
            auditLogQueryKeys.should.eql(Object.keys(auditLogQuery))
        })
    })

    describe('appendQuery', function () {
        it('returns the url unchanged when no supported params are set', function () {
            appendQuery('/api/v1/x', {}, basePaginationKeys).should.equal('/api/v1/x')
        })
        it('returns the url unchanged when only unsupported keys are present', function () {
            appendQuery('/api/v1/x', { teamId: 'abc' }, basePaginationKeys).should.equal('/api/v1/x')
        })
        it('serialises only the defined, supported params', function () {
            appendQuery('/api/v1/x', { limit: 10, page: 2, cursor: undefined }, basePaginationKeys)
                .should.equal('/api/v1/x?limit=10&page=2')
        })
        it('url-encodes values', function () {
            appendQuery('/api/v1/x', { query: 'a b&c' }, paginationParamsKeys)
                .should.equal('/api/v1/x?query=a+b%26c')
        })
        it('appends an array value once per element', function () {
            appendQuery('/api/v1/x', { event: ['flows.created', 'flows.deleted'] }, auditLogQueryKeys)
                .should.equal('/api/v1/x?event=flows.created&event=flows.deleted')
        })
        it('skips null and undefined but keeps other values', function () {
            appendQuery('/api/v1/x', { limit: null, page: 1 }, basePaginationKeys)
                .should.equal('/api/v1/x?page=1')
        })
    })
})
