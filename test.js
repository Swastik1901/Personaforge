const response = await fetch("http://localhost:8000/v1/22201aa3-641f-4dff-a593-b773756f2e4b/chat", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer pf_024b439b4f2f4572ac51"
    },
    body: JSON.stringify({
        message: "Do you have any advice for someone learning to code?",
        session_id: "user-session-123"
    })
});
const data = await response.json();
console.log(data.message);