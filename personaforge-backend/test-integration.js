async function test() {
  console.log("Forging agent...");
  const forgeRes = await fetch('http://localhost:8000/forge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: "You are a helpful assistant.",
      tone: "helpful",
      guardrails: [],
      tools: ["Web Search", "Google Calendar", "Send Email"]
    })
  });
  const agent = await forgeRes.json();
  console.log("Agent:", agent.agentId);

  console.log("Chatting...");
  const chatRes = await fetch(`http://localhost:8000/v1/${agent.agentId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: "Write an email to vardaan1901@gmail.com talking about personaforge and send it. Also, what are the best practices for Python?",
      session_id: "test-session-123"
    })
  });
  const chatData = await chatRes.json();
  console.log("Chat Response:", JSON.stringify(chatData, null, 2));
}

test().catch(console.error);
