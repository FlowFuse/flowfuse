import adjectives from './adjectives'
import nouns from './nouns'

function pickRandom (list) {
    return list[Math.floor(Math.random() * list.length)]
}

export default function () {
    const adj = pickRandom(adjectives)
    const noun = pickRandom(nouns)
    const suffix = 1000 + Math.floor(Math.random() * 9000)
    return adj + '-' + noun + '-' + suffix
}
