// Mocking the EXACT fetch from the Sandbox
const config = {
    name: "AI Assistant",
    tone: "Friendly",
    expertise: "General Support",
    description: "You are a helpful AI assistant.",
    guardrails: ["stayOnTopic"],
    tools: ["Web Search"]
};

fetch("http://localhost:8000/forge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config)
}).then(res => res.json()).then(console.log);
