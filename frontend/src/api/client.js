import axios from "axios";

const client = axios.create({
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 5000
});

export default client;
