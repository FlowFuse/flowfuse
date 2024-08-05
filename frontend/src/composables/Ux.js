export const highlightElement = (el) => {
    el.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    })
    el.classList.add('animate-bounce')
    setTimeout(() => {
        el.classList.remove('animate-bounce')
    }, 2500) // matches animation-bounce duration
}
