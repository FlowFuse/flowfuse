import adjectives from './adjectives.js'
import nouns from './nouns.js'

function pickRandom (list: string[]): string {
    return list[Math.floor(Math.random() * list.length)]
}

export default function (): string {
    const adj = pickRandom(adjectives)
    const noun = pickRandom(nouns)
    const suffix = 1000 + Math.floor(Math.random() * 9000)
    return adj + '-' + noun + '-' + suffix
}
