const { snapshotsToDelete, isoWeek } = require('../../../../../../forge/ee/lib/timeseries/snapshots.js')

describe('Timeseries: snapshot retention', function () {
    const day = 86400000
    // Wednesday 2026-11-18, in ISO week 47
    const now = Date.UTC(2026, 10, 18, 3, 0, 0)

    function daily (count) {
        return Array.from({ length: count }, (_, i) => ({ name: `d${i}`, createdAt: new Date(now - i * day) }))
    }

    function kept (snapshots, doomed) {
        return snapshots.map(snapshot => snapshot.name).filter(name => !doomed.includes(name))
    }

    it('numbers ISO weeks, which start on Monday and belong to the year of their Thursday', function () {
        isoWeek(new Date(Date.UTC(2026, 10, 15))).should.equal('2026-W46')
        isoWeek(new Date(Date.UTC(2026, 10, 16))).should.equal('2026-W47')
        isoWeek(new Date(Date.UTC(2027, 0, 1))).should.equal('2026-W53')
        isoWeek(new Date(Date.UTC(2024, 11, 30))).should.equal('2025-W01')
    })

    it('keeps everything within the daily count', function () {
        snapshotsToDelete(daily(7), { daily: 7, weekly: 4 }, now).should.eql([])
        snapshotsToDelete([], undefined, now).should.eql([])
    })

    it('uses 7 daily and 4 weekly by default', function () {
        const snapshots = daily(40)
        const doomed = snapshotsToDelete(snapshots, undefined, now)
        // Older than the daily ones, the newest of each of the next four weeks: 46, 45, 44 and 43
        kept(snapshots, doomed).should.eql(['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd10', 'd17', 'd24'])
    })

    it('keeps no weekly snapshots when asked for none', function () {
        const snapshots = daily(12)
        kept(snapshots, snapshotsToDelete(snapshots, { daily: 3, weekly: 0 }, now)).should.eql(['d0', 'd1', 'd2'])
    })

    it('keeps fewer weekly snapshots when there are fewer older weeks', function () {
        const snapshots = daily(10)
        kept(snapshots, snapshotsToDelete(snapshots, { daily: 7, weekly: 4 }, now)).should.eql(['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'])
    })

    it('sorts by time, not by the order given', function () {
        const snapshots = daily(10).reverse()
        const doomed = snapshotsToDelete(snapshots, { daily: 3, weekly: 0 }, now)
        doomed.should.have.length(7)
        doomed.should.not.containEql('d0')
        doomed.should.not.containEql('d2')
        doomed.should.containEql('d3')
    })

    it('treats a snapshot without a creation time as the newest', function () {
        const snapshots = [...daily(3), { name: 'pending' }]
        snapshotsToDelete(snapshots, { daily: 2, weekly: 0 }, now).should.eql(['d1', 'd2'])
    })

    it('counts Sunday and Monday as different weeks', function () {
        const snapshots = [
            { name: 'newest', createdAt: new Date(Date.UTC(2026, 10, 18)) },
            { name: 'monday', createdAt: new Date(Date.UTC(2026, 10, 16)) },
            { name: 'sunday', createdAt: new Date(Date.UTC(2026, 10, 15)) },
            { name: 'saturday', createdAt: new Date(Date.UTC(2026, 10, 14)) }
        ]
        snapshotsToDelete(snapshots, { daily: 1, weekly: 2 }, now).should.eql(['saturday'])
        snapshotsToDelete(snapshots, { daily: 1, weekly: 1 }, now).should.eql(['sunday', 'saturday'])
    })
})
