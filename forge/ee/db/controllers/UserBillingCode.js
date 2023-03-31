module.exports = {
    setUserCode: async function (app, user, code) {
        // A user can only have one code active
        // We can't upsert as we don't know the id/primary key for their billing code
        //  - we don't have UserId set as the primary key because we can't do that
        //    easily within the sequelize model.
        await app.db.models.UserBillingCode.destroy({
            where: {
                UserId: user.id
            }
        })
        await app.db.models.UserBillingCode.create({
            UserId: user.id,
            code
        })
    },

    getUserCode: async function (app, user) {
        return app.db.models.UserBillingCode.byUser(user)
    }
}
