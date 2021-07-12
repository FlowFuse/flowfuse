module.exports = {
    /**
     * Render a User object for returning on the API.
     *
     * Only fields listed here will be returned - ensuring that if a new field
     * is added to the model, it won't accidentally leak out of the API
     *
     */
    userProfile: function(db, user) {
        const result = {};
        [
            'name',
            'email',
            'avatar',
            'admin',
            'createdAt'
        ].forEach(p => result[p] = user[p])
        return result
    }
}
