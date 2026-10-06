/**
 * Transcript folding for the onboarding surface's collapsing-transcript
 * treatment. Pure functions over the store's message list: no state.
 *
 * A "questions turn" is an AI message carrying a questions answer, followed
 * (usually) by the human reply QuestionsList composed for it. Once the turn
 * has passed, the pair folds into one entry so the transcript stays quiet.
 */

function getQuestions (message) {
    if (message._type !== 'ai' || !Array.isArray(message.answer)) {
        return []
    }
    return message.answer
        .filter(answer => Array.isArray(answer.questions) && answer.questions.length > 0)
        .flatMap(answer => answer.questions)
}

/**
 * Match each question to its line in the composed reply. QuestionsList sends
 * one "<question> <answers>" line per question; anything that doesn't match
 * (a hand-typed reply, an edited answer) resolves to null and the caller
 * falls back to showing the raw reply.
 */
function extractAnswers (questions, replyContent) {
    const lines = (replyContent || '').split('\n')
    return questions.map(q => {
        const line = lines.find(l => l.startsWith(q.question))
        if (!line) {
            return { question: q.question, answer: null }
        }
        const answer = line.slice(q.question.length).trim()
        return { question: q.question, answer: answer.length > 0 ? answer : null }
    })
}

/**
 * Build the render list for a collapsing transcript.
 *
 * Returns entries of two kinds:
 *  - { kind: 'message', message }: render as-is
 *  - { kind: 'folded-turn', questionsMessage, replyMessage, entries }:
 *    a past questions turn folded to one line per question. replyMessage is
 *    the absorbed human reply, or null if the user never answered.
 */
function buildCollapsedTranscript (messages) {
    const result = []
    for (let i = 0; i < messages.length; i++) {
        const message = messages[i]
        const questions = getQuestions(message)
        const isLast = i === messages.length - 1
        if (questions.length === 0 || isLast) {
            result.push({ kind: 'message', message })
            continue
        }
        const next = messages[i + 1]
        const replyMessage = next && next._type === 'human' ? next : null
        if (replyMessage) {
            i++
        }
        result.push({
            kind: 'folded-turn',
            questionsMessage: message,
            replyMessage,
            entries: extractAnswers(questions, replyMessage?.content)
        })
    }
    return result
}

function isEvent (entry) {
    return entry.kind === 'message' && entry.message._type === 'event'
}

function isExpert (entry) {
    return entry.kind === 'folded-turn' || entry.message._type === 'ai'
}

function isHuman (entry) {
    return entry.kind === 'message' && entry.message._type === 'human'
}

/**
 * Mark the turn structure on a collapsed transcript, so the full page surfaces
 * can style turns from classes instead of working the structure out from
 * neighbouring elements in CSS. Event cards are skipped when looking at
 * neighbours. Adds `classes` to every entry:
 *  - turn-start: an Expert entry that follows the person's reply or a folded turn
 *  - answered: an Expert message the person has replied to, or a folded turn
 *    with a reply
 *  - has-questions: an Expert message carrying an open question set
 */
function annotateTurns (entries) {
    const positions = []
    entries.forEach((entry, index) => {
        if (!isEvent(entry)) {
            positions.push(index)
        }
    })
    const classes = entries.map(() => [])
    positions.forEach((index, position) => {
        const entry = entries[index]
        if (!isExpert(entry)) {
            return
        }
        const previous = entries[positions[position - 1]]
        const next = entries[positions[position + 1]]
        if (previous && (isHuman(previous) || previous.kind === 'folded-turn')) {
            classes[index].push('turn-start')
        }
        const answered = entry.kind === 'folded-turn' ? !!entry.replyMessage : !!next && isHuman(next)
        if (answered) {
            classes[index].push('answered')
        }
        if (entry.kind === 'message' && getQuestions(entry.message).length > 0) {
            classes[index].push('has-questions')
        }
    })
    return entries.map((entry, index) => ({ ...entry, classes: classes[index] }))
}

export { annotateTurns, buildCollapsedTranscript }
