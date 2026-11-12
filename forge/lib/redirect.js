module.exports = {
    localPath (target) {
        if (typeof target !== 'string') {
            return '/'
        }
        return /^\/(?![/\\])\P{Cc}*$/u.test(target) ? target : '/'
    }
}
