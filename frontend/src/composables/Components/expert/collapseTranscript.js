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

export { buildCollapsedTranscript }
