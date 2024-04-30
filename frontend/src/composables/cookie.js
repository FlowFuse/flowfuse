function get (cookieName) {
    // Split document.cookie by semicolons into an array of individual cookies
    const cookies = document.cookie.split(';')
    // Loop through each cookie
    for (let i = 0; i < cookies.length; i++) {
        // Split the current cookie by '=' to separate name and value
        const cookie = cookies[i].trim().split('=')

        // Check if the current cookie's name matches the desired name
        if (cookie[0] === cookieName) {
            // Return the cookie value
            return decodeURIComponent(cookie[1])
        }
    }

    // If the cookie with the given name was not found, return null
    return null
}

export default {
    get
}
