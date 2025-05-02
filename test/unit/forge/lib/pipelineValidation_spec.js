require('should')

const fs = require('fs')
const path = require('path')

const { validateStages } = require('../../../../forge/lib/pipelineValidation')

describe('Pipeline Validation', function () {
    describe('File Sync', function () {
        it('pipelineValidation.js files in frontend and backend should be identical', function () {
            const frontendPath = path.join(__dirname, '../../../../frontend/src/utils/pipelineValidation.js')
            const forgePath = path.join(__dirname, '../../../../forge/lib/pipelineValidation.js')

            const frontendContent = fs.readFileSync(frontendPath, 'utf8')
            const forgeContent = fs.readFileSync(forgePath, 'utf8')

            frontendContent.should.equal(forgeContent, 'The server side and client side pipelineValidation.js files are not identical')
        })
    })

    describe('validateStages', function () {
        /**
         * Creates a mock stage object for testing purposes.
         * @param {'instance'|'device'|'device-group'|'git-repo'} stageType - The type of the stage (e.g., 'device', 'instance', 'device-group', 'git-repo')
         * @param {String} id
         * @param {String} name
         * @param {Boolean} serverSideProps - flag to include server side properties
         * @param {Boolean} clientSideProps - flag to include client side properties
         * @returns {Object} - The created stage object
         */
        function createStage (stageType, id, name, serverSideProps, clientSideProps) {
            // Create a mock instance object
            id = id || 'stage-id'
            name = name || 'stage-name'
            stageType = stageType || 'instance'
            const pls = { id, name }
            if (serverSideProps) {
                pls.Instances = stageType === 'instance' ? [{}] : undefined
                pls.Devices = stageType === 'device' ? [{}] : undefined
                pls.DeviceGroups = stageType === 'device-group' ? [{}] : undefined
                pls.PipelineStageGitRepo = stageType === 'git-repo' ? { gitTokenId: 'abc123' } : undefined
            }
            if (clientSideProps) {
                pls.instance = stageType === 'instance' ? {} : undefined
                pls.device = stageType === 'device' ? {} : undefined
                pls.deviceGroup = stageType === 'device-group' ? {} : undefined
                pls.gitRepo = stageType === 'git-repo' ? { gitTokenId: 'abc123' } : undefined
                pls.stageType = stageType
            }
            return pls
        }
        const createServerSideStage = (stageType, id, name) => createStage(stageType, id, name, true, false)
        const createClientSideStage = (stageType, id, name) => createStage(stageType, id, name, false, true)

        describe('Server Side Pipeline stages', function () {
            it('should pass: single instance', function () {
                const stages = [createServerSideStage('instance')]
                validateStages(stages).should.be.true()
            })

            it('should pass: single device', function () {
                const stages = [createServerSideStage('device')]
                validateStages(stages).should.be.true()
            })

            it('should pass: instance -> instance', function () {
                const stages = [
                    createServerSideStage('instance', 'id1', 'Instance 1'),
                    createServerSideStage('instance', 'id2', 'Instance 2')
                ]
                validateStages(stages).should.be.true()
            })

            it('should pass: device -> device', function () {
                const stages = [
                    createServerSideStage('device', 'id1', 'Device 1'),
                    createServerSideStage('device', 'id2', 'Device 2')
                ]
                validateStages(stages).should.be.true()
            })

            it('should pass: instance -> device', function () {
                const stages = [
                    createServerSideStage('instance', 'id1', 'Instance 1'),
                    createServerSideStage('device', 'id2', 'Device 1')
                ]
                validateStages(stages).should.be.true()
            })

            it('should pass: device -> instance', function () {
                const stages = [
                    createServerSideStage('device', 'id1', 'Device 1'),
                    createServerSideStage('instance', 'id2', 'Instance 1')
                ]
                validateStages(stages).should.be.true()
            })

            it('should pass: instance -> device group', function () {
                const stages = [
                    createServerSideStage('instance', 'id1', 'Instance 1'),
                    createServerSideStage('device-group', 'id2', 'Device Group 1')
                ]
                validateStages(stages).should.be.true()
            })

            it('should pass: device -> device group', function () {
                const stages = [
                    createServerSideStage('device', 'id1', 'Device 1'),
                    createServerSideStage('device-group', 'id2', 'Device Group 1')
                ]
                validateStages(stages).should.be.true()
            })

            it('should pass: instance -> device group -> device group', function () {
                const stages = [
                    createServerSideStage('instance', 'id1', 'Instance 1'),
                    createServerSideStage('device-group', 'id2', 'Device Group 1'),
                    createServerSideStage('device-group', 'id3', 'Device Group 2')
                ]
                validateStages(stages).should.be.true()
            })

            it('should pass: device -> device group -> device group', function () {
                const stages = [
                    createServerSideStage('device', 'id1', 'Device 1'),
                    createServerSideStage('device-group', 'id2', 'Device Group 1'),
                    createServerSideStage('device-group', 'id3', 'Device Group 2')
                ]
                validateStages(stages).should.be.true()
            })

            it('should pass: instance -> git repo', function () {
                const stages = [
                    createServerSideStage('instance', 'id1', 'Instance 1'),
                    createServerSideStage('git-repo', 'id2', 'Git Repo 1')
                ]
                validateStages(stages).should.be.true()
            })

            it('should fail: device group as the first stage', function () {
                const stages = [createServerSideStage('device-group')]
                ;(() => validateStages(stages)).should.throw(/A Device Group Pipeline stage cannot be the first stage/)
            })

            it('should fail: git repo as the first stage', function () {
                const stages = [createServerSideStage('git-repo')]
                ;(() => validateStages(stages)).should.throw(/A Git Repository Pipeline stage cannot be the first stage/)
            })

            it('should fail: device group -> instance', function () {
                const stages = [
                    createServerSideStage('instance', 'id1', 'Instance 1'),
                    createServerSideStage('device-group', 'id2', 'Device Group 1'),
                    createServerSideStage('instance', 'id3', 'Instance 2')
                ]
                ;(() => validateStages(stages)).should.throw(/A Device Group Pipeline stage cannot precede a Hosted Instance/)
            })

            it('should fail: device group -> device', function () {
                const stages = [
                    createServerSideStage('instance', 'id1', 'Instance 1'),
                    createServerSideStage('device-group', 'id2', 'Device Group 1'),
                    createServerSideStage('device', 'id3', 'Device 2')
                ]
                ;(() => validateStages(stages)).should.throw(/A Device Group Pipeline stage cannot precede a Remote Instance/)
            })

            it('should fail: git repo -> instance', function () {
                const stages = [
                    createServerSideStage('instance', 'id1', 'Instance 1'),
                    createServerSideStage('git-repo', 'id2', 'Git Repo 1'),
                    createServerSideStage('instance', 'id3', 'Instance 2')
                ]
                ;(() => validateStages(stages)).should.throw(/A Git Repository Pipeline stage must be the last stage/)
            })

            it('should fail: git repo -> device', function () {
                const stages = [
                    createServerSideStage('instance', 'id1', 'Instance 1'),
                    createServerSideStage('git-repo', 'id2', 'Git Repo 1'),
                    createServerSideStage('device', 'id3', 'Device 1')
                ]
                ;(() => validateStages(stages)).should.throw(/A Git Repository Pipeline stage must be the last stage/)
            })

            it('should fail: git repo -> device group', function () {
                const stages = [
                    createServerSideStage('instance', 'id1', 'Instance 1'),
                    createServerSideStage('git-repo', 'id2', 'Git Repo 1'),
                    createServerSideStage('device-group', 'id3', 'Device Group 1')
                ]
                ;(() => validateStages(stages)).should.throw(/A Git Repository Pipeline stage must be the last stage/)
            })
        })
        describe('Client Side Pipeline stages', function () {
            it('should pass: single instance', function () {
                const stages = [createClientSideStage('instance')]
                validateStages(stages).should.be.true()
            })

            it('should pass: single device', function () {
                const stages = [createClientSideStage('device')]
                validateStages(stages).should.be.true()
            })

            it('should pass: instance -> instance', function () {
                const stages = [
                    createClientSideStage('instance', 'id1', 'Instance 1'),
                    createClientSideStage('instance', 'id2', 'Instance 2')
                ]
                validateStages(stages).should.be.true()
            })

            it('should pass: device -> device', function () {
                const stages = [
                    createClientSideStage('device', 'id1', 'Device 1'),
                    createClientSideStage('device', 'id2', 'Device 2')
                ]
                validateStages(stages).should.be.true()
            })

            it('should pass: instance -> device', function () {
                const stages = [
                    createClientSideStage('instance', 'id1', 'Instance 1'),
                    createClientSideStage('device', 'id2', 'Device 1')
                ]
                validateStages(stages).should.be.true()
            })

            it('should pass: device -> instance', function () {
                const stages = [
                    createClientSideStage('device', 'id1', 'Device 1'),
                    createClientSideStage('instance', 'id2', 'Instance 1')
                ]
                validateStages(stages).should.be.true()
            })

            it('should pass: instance -> device group', function () {
                const stages = [
                    createClientSideStage('instance', 'id1', 'Instance 1'),
                    createClientSideStage('device-group', 'id2', 'Device Group 1')
                ]
                validateStages(stages).should.be.true()
            })

            it('should pass: device -> device group', function () {
                const stages = [
                    createClientSideStage('device', 'id1', 'Device 1'),
                    createClientSideStage('device-group', 'id2', 'Device Group 1')
                ]
                validateStages(stages).should.be.true()
            })

            it('should pass: instance -> device group -> device group', function () {
                const stages = [
                    createClientSideStage('instance', 'id1', 'Instance 1'),
                    createClientSideStage('device-group', 'id2', 'Device Group 1'),
                    createClientSideStage('device-group', 'id3', 'Device Group 2')
                ]
                validateStages(stages).should.be.true()
            })

            it('should pass: device -> device group -> device group', function () {
                const stages = [
                    createClientSideStage('device', 'id1', 'Device 1'),
                    createClientSideStage('device-group', 'id2', 'Device Group 1'),
                    createClientSideStage('device-group', 'id3', 'Device Group 2')
                ]
                validateStages(stages).should.be.true()
            })

            it('should pass: instance -> git repo', function () {
                const stages = [
                    createClientSideStage('instance', 'id1', 'Instance 1'),
                    createClientSideStage('git-repo', 'id2', 'Git Repo 1')
                ]
                validateStages(stages).should.be.true()
            })

            it('should fail: device group as the first stage', function () {
                const stages = [createClientSideStage('device-group')]
                ;(() => validateStages(stages)).should.throw(/A Device Group Pipeline stage cannot be the first stage/)
            })

            it('should fail: git repo as the first stage', function () {
                const stages = [createClientSideStage('git-repo')]
                ;(() => validateStages(stages)).should.throw(/A Git Repository Pipeline stage cannot be the first stage/)
            })

            it('should fail: device group -> instance', function () {
                const stages = [
                    createClientSideStage('instance', 'id1', 'Instance 1'),
                    createClientSideStage('device-group', 'id2', 'Device Group 1'),
                    createClientSideStage('instance', 'id3', 'Instance 2')
                ]
                ;(() => validateStages(stages)).should.throw(/A Device Group Pipeline stage cannot precede a Hosted Instance/)
            })

            it('should fail: device group -> device', function () {
                const stages = [
                    createClientSideStage('instance', 'id1', 'Instance 1'),
                    createClientSideStage('device-group', 'id2', 'Device Group 1'),
                    createClientSideStage('device', 'id3', 'Device 2')
                ]
                ;(() => validateStages(stages)).should.throw(/A Device Group Pipeline stage cannot precede a Remote Instance/)
            })

            it('should fail: git repo -> instance', function () {
                const stages = [
                    createClientSideStage('instance', 'id1', 'Instance 1'),
                    createClientSideStage('git-repo', 'id2', 'Git Repo 1'),
                    createClientSideStage('instance', 'id3', 'Instance 2')
                ]
                ;(() => validateStages(stages)).should.throw(/A Git Repository Pipeline stage must be the last stage/)
            })

            it('should fail: git repo -> device', function () {
                const stages = [
                    createClientSideStage('instance', 'id1', 'Instance 1'),
                    createClientSideStage('git-repo', 'id2', 'Git Repo 1'),
                    createClientSideStage('device', 'id3', 'Device 1')
                ]
                ;(() => validateStages(stages)).should.throw(/A Git Repository Pipeline stage must be the last stage/)
            })

            it('should fail: git repo -> device group', function () {
                const stages = [
                    createClientSideStage('instance', 'id1', 'Instance 1'),
                    createClientSideStage('git-repo', 'id2', 'Git Repo 1'),
                    createClientSideStage('device-group', 'id3', 'Device Group 1')
                ]
                ;(() => validateStages(stages)).should.throw(/A Git Repository Pipeline stage must be the last stage/)
            })
        })
    })
})
