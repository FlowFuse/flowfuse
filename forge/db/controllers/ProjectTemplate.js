module.exports = {
    validateSettings: function (app, settings) {
        if (settings.httpAdminRoot !== undefined) {
            let httpAdminRoot = settings.httpAdminRoot
            delete settings.httpAdminRoot
            if (typeof httpAdminRoot === 'string') {
                httpAdminRoot = httpAdminRoot.trim()
                if (httpAdminRoot.length > 0) {
                    if (httpAdminRoot[0] !== '/') {
                        httpAdminRoot = `/${httpAdminRoot}`
                    }
                    if (httpAdminRoot[httpAdminRoot.length - 1] === '/') {
                        httpAdminRoot = httpAdminRoot.substring(httpAdminRoot.length - 2)
                    }
                    if (!/[0-9a-z_\-\\/]+$/i.test(httpAdminRoot)) {
                        throw new Error('Invalid settings.httpAdminRoot')
                    }
                    settings.httpAdminRoot = httpAdminRoot
                }
            }
        }
        if (settings.palette?.nodeExcludes !== undefined) {
            const paletteNodeExcludes = settings.palette.nodeExcludes
            delete settings.palette.nodeExcludes
            if (typeof paletteNodeExcludes === 'string' && paletteNodeExcludes.length > 0) {
                const parts = paletteNodeExcludes.split(',').map(fn => fn.trim()).filter(fn => fn.length > 0)
                if (parts.length > 0) {
                    for (let i = 0; i < parts.length; i++) {
                        const fn = parts[i]
                        if (!/^[a-z0-9\-._]+\.js$/i.test(fn)) {
                            throw new Error('Invalid settings.palette.nodeExcludes')
                        }
                    }
                    settings.palette.nodeExcludes = parts.join(',')
                }
            }
        }
        return settings
    }
}
