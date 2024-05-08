const { readdir } = require('fs/promises')

module.exports = {
    viewportWidth: 1024,
    viewportHeight: 768,
    e2e: {
        experimentalSessionAndOrigin: true,
        downloadsFolder: 'test/e2e/frontend/cypress/downloads',
        fixturesFolder: 'test/e2e/frontend/cypress/fixtures',
        screenshotsFolder: 'test/e2e/frontend/cypress/screenshots',
        supportFile: 'test/e2e/frontend/cypress/support/index.js',
        videosFolder: 'test/e2e/frontend/cypress/videos',
        setupNodeEvents (on, config) {
            on('task', {
                // Check if a file exists in a dir. Unlike cypress readFile,
                // this can be used with a regex for 'fileName'
                fileExists (options) {
                    const baseDir = options.dir
                    let fileName = options.file
                    let debug = ''
                    return readdir(baseDir).then(files => {
                        if (options.file) {
                            return files.includes(options.file)
                        } else if (options.fileRE) {
                            const re = new RegExp(options.fileRE)
                            fileName = re.toString()
                            // fileName looks like a regex
                            debug = debug + JSON.stringify(files)
                            const filteredList = files.filter(file => !!file.match(re))
                            return filteredList.length === 1
                        }
                        return false
                    }).then(result => {
                        if (!result) {
                            throw new Error(`${fileName} not found in ${baseDir} ${debug}`)
                        }
                        return true
                    })
                }
            })
        }
    }
}
