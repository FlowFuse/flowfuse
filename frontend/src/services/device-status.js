function since (lastSeenAt, lastSeenMs) {
    if (!lastSeenAt) {
        return -1
    } else if (typeof lastSeenMs === 'number') {
        return lastSeenMs / 1000.0 / 60.0
    } else {
        return -1
    }
}

function lastSeenStatus (lastSeenAt, lastSeenMs) {
    const s = since(lastSeenAt, lastSeenMs)
    if (!lastSeenAt) {
        return {
            class: 'never',
            label: 'Never Seen'
        }
    } else if (s < 1.5) {
        return {
            class: 'running', // green
            label: '< 1.5 mins'
        }
    } else if (s < 3) {
        return {
            class: 'safe', // yellow
            label: '1.5 - 3 mins'
        }
    } else {
        return {
            class: 'error', // red
            label: '> 3 mins'
        }
    }
}

export default {
    since,
    lastSeenStatus
}
