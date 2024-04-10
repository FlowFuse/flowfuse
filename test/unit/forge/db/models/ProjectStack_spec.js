const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('ProjectStack model', function () {
    // Use standard test data.
    let app
    before(async function () {
        app = await setup()
    })
    after(async function () {
        await app.close()
    })
    describe('Relations', function () {
        let ProjectStack
        beforeEach(async () => {
            ({ ProjectStack } = app.db.models)
        })

        // helper functions
        const nameGenerator = (name) => `${name} ${Math.random().toString(36).substring(7)}`
        const newProjectStack = async (projectTypeId) => {
            const name = nameGenerator('Test ProjectStack')
            const projectStack = await app.db.models.ProjectStack.create({ name, ProjectTypeId: projectTypeId })
            return projectStack
        }
        const newProjectType = async () => {
            const name = nameGenerator('Test ProjectType')
            const projectType = await app.db.models.ProjectType.create({ name })
            return projectType
        }

        // TESTS

        // RELATION: ProjectTypeId INTEGER REFERENCES ProjectTypes (id) ON DELETE SET NULL ON UPDATE CASCADE
        it('should set ProjectStack.ProjectTypeId to null when ProjectType is deleted', async function () {
            const projectType = await newProjectType()
            const projectStack = await newProjectStack(projectType.id)
            projectStack.should.have.property('ProjectTypeId', projectType.id)
            const psid = projectStack.id
            await projectType.destroy()
            const foundProjectStack = await ProjectStack.findByPk(psid)
            should(foundProjectStack).not.be.null()
            foundProjectStack.should.have.property('ProjectTypeId', null)
        })

        // RELATION: ProjectTypeId INTEGER REFERENCES ProjectTypes (id) ON DELETE SET NULL ON UPDATE CASCADE
        it('should update ProjectStack.ProjectTypeId when ProjectType is updated', async function () {
            // NOTE: Although this test attempts to update the id, sequelize does not allow this.
            // The id is a primary key and cannot be updated using sequelize ORM methods.
            // The test is included to catch any future changes to the schema that might allow this.
            // Or any changes that might allow the id to be updated in a different way - thus ensuring
            // that the relationship is maintained.
            const projectType = await newProjectType()
            const projectStack = await newProjectStack(projectType.id)
            projectType.id = projectType.id + 1
            await projectType.save()
            await projectType.reload()

            // reload the projectStack
            const foundProjectStack = await ProjectStack.findByPk(projectStack.id)

            // at this point, the id may or may not have been updated however the relationship
            // should be maintained and the id should match the foreign key
            foundProjectStack.ProjectTypeId.should.equal(projectType.id)
        })

        // RELATION: replacedBy INTEGER REFERENCES ProjectStacks (id) ON DELETE SET NULL ON UPDATE CASCADE
        it('should set ProjectStack.replacedBy to null when ProjectStack is deleted', async function () {
            // NOTE: Although the relationship defined on the table is ON DELETE SET NULL, the actual
            // behavior is an error is thrown when trying to delete a ProjectStack that has a replacedby value.
            // This behavior is enforced by the application code in the Team model in the beforeDestroy hook.

            const projectType = await newProjectType()

            const projectStack1 = await newProjectStack(projectType.id)
            const projectStack2 = await newProjectStack(projectType.id)

            // apply a replacement
            projectStack1.replacedBy = projectStack2.id
            await projectStack1.save()
            projectStack1.should.have.property('replacedBy', projectStack2.id)

            // delete the replacement
            try {
                await projectStack2.destroy()
            } catch (err) {
                err.message.should.equal('Cannot delete stack that is the latest version of an active stack')
            }
        })

        // RELATION: replacedBy INTEGER REFERENCES ProjectStacks (id) ON DELETE SET NULL ON UPDATE CASCADE
        it('should update ProjectStack.replacedBy when ProjectStack is updated', async function () {
            // NOTE: Although this test attempts to update the id, sequelize does not allow this.
            // The id is a primary key and cannot be updated using sequelize ORM methods.
            // The test is included to catch any future changes to the schema that might allow this.
            // Or any changes that might allow the id to be updated in a different way - thus ensuring
            // that the relationship is maintained.

            const projectType = await newProjectType()
            const projectStack1 = await newProjectStack(projectType.id)
            const projectStack2 = await newProjectStack(projectType.id)

            // apply a replacement
            projectStack1.replacedBy = projectStack2.id
            await projectStack1.save()
            projectStack1.should.have.property('replacedBy', projectStack2.id)

            // update the replacement
            projectStack2.id = projectStack2.id + 1
            await projectStack2.save()
            await projectStack2.reload()

            // reload the projectStack
            const foundProjectStack = await ProjectStack.findByPk(projectStack1.id)

            // at this point, the id may or may not have been updated however the relationship
            // should be maintained and the id should match the foreign key
            foundProjectStack.replacedBy.should.equal(projectStack2.id)
        })
    })
})
