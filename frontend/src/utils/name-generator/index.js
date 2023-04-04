import adjectives from './adjectives.js'
import nouns from './nouns.js'

function pickRandom (list) {
    return list[Math.floor(Math.random() * list.length)]
}

export default function () {
    const adj = pickRandom(adjectives)
    const noun = pickRandom(nouns)
    const suffix = 1000 + Math.floor(Math.random() * 9000)
    return adj + '-' + noun + '-' + suffix
}
