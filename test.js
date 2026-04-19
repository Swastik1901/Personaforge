const response = await fetch("http://localhost:8000/v1/4e05087e-7f1c-4465-9fff-f5bc93528030/chat", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer pf_0c5fc8cfca3d4cefb144"
    },
    body: JSON.stringify({
        message: "Who is Mona Lisa?",
        session_id: "user-session-123"
    })
});
const data = await response.json();
console.log(data.message);