import http from 'http';

async function testPayload() {
  const config = {
    name: "AI Assistant",
    tone: "Friendly",
    expertise: "General Support",
    description: "You are a helpful AI assistant.",
    guardrails: ["stayOnTopic", "noHarmfulContent"],
    tools: ["Web Search"]
  };

  const forgeRes = await fetch('http://localhost:8000/forge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  
  const agent = await forgeRes.json();
  console.log("Forged:", agent);

  const chatRes = await fetch(`http://localhost:8000/v1/${agent.agentId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: "Can you search the web for the latest news on AI?",
      session_id: "ui-test-123"
    })
  });
  const chatData = await chatRes.json();
  console.log("Chat Response:", chatData);
}

testPayload().catch(console.error);
