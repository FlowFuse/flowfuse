module.exports = {
    clean: function (app, topic) {
        const result = topic.toJSON()
        const cleaned = {
            id: result.hashid,
            topic: result.topic,
            metadata: result.metadata ? JSON.parse(result.metadata) : undefined
        }
        return cleaned
    },
    cleanList: function (app, list) {
        const filtered = []
        list.topics.forEach(t => {
            filtered.push(this.clean(app, t))
        })
        list.topics = filtered
        return list
    }
}
