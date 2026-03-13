const response = await fetch("http://localhost:8000/v1/43c6abd9-0a72-4e2a-868c-5161fc6a249e/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer pf_43b58a992d924591b5b7"
  },
  body: JSON.stringify({
    message: "Hello there!",
    session_id: "user-session-123"
  })
});
const data = await response.json();
console.log(data.message);