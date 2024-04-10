const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('ProjectType model', function () {
    // Use standard test data.
    let app
    before(async function () {
        app = await setup()
    })
    after(async function () {
        await app.close()
    })
    describe('Relations', function () {
        let ProjectType
        beforeEach(async () => {
            ({ ProjectType } = app.db.models)
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

        // RELATION: defaultStackId INTEGER REFERENCES ProjectStacks (id) ON DELETE SET NULL ON UPDATE CASCADE
        it('should set ProjectType.defaultStackId to null when ProjectStack is deleted', async function () {
            const projectType = await newProjectType()
            const projectStack1 = await newProjectStack(projectType.id)
            // const projectStack2 = await newProjectStack(projectType.id)
            projectType.defaultStackId = projectStack1.id
            await projectType.save()

            await projectStack1.destroy()
            const updatedProjectType = await ProjectType.findByPk(projectStack1.id)
            should(updatedProjectType).not.be.null()
            updatedProjectType.should.have.property('defaultStackId', null)
        })

        // RELATION: defaultStackId INTEGER REFERENCES ProjectStacks (id) ON DELETE SET NULL ON UPDATE CASCADE
        it('should update ProjectType.defaultStackId when ProjectStack.id is updated', async function () {
            // NOTE: Although this test attempts to update the id, sequelize does not allow this.
            // The id is a primary key and cannot be updated using sequelize ORM methods.
            // The test is included to catch any future changes to the schema that might allow this.
            // Or any changes that might allow the id to be updated in a different way - thus ensuring
            // that the relationship is maintained.

            const projectType = await newProjectType()
            const projectStack1 = await newProjectStack(projectType.id)
            const projectStack1Id = projectStack1.id
            projectType.defaultStackId = projectStack1.id
            await projectType.save()
            projectStack1.update({ id: projectStack1Id + 1 })
            await projectStack1.reload()
            await projectStack1.save()
            const updatedProjectType = await ProjectType.findByPk(projectType.id)

            // at this point, the id may or may not have been updated however the relationship
            // should be maintained and the id should match the foreign key
            updatedProjectType.defaultStackId.should.equal(projectStack1.id)
        })
    })
})
