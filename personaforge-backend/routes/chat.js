import { Router } from 'express';
import { agentsDb } from './forge.js';
import { getHistory, saveHistory } from '../services/memory.js';
import { runGuardrails } from '../services/guardrails.js';
import { buildSystemPrompt, buildStructuredPrompt } from '../services/promptBuilder.js';
import { chatWithPersona } from '../services/claude.js';

const router = Router();

router.post('/:agentId/chat', async (req, res) => {
    try {
        const { agentId } = req.params;
        const { message, session_id } = req.body;

        if (!message || !session_id) {
            return res.status(400).json({ error: "message and session_id are required" });
        }

        const agent = agentsDb.get(agentId);
        if (!agent) {
            return res.status(404).json({ error: "Agent not found" });
        }

        // 1. Get Memory
        const history = await getHistory(session_id);

        // 2. Input Guardrail
        const inputCheck = await runGuardrails(message, "", agent.domain, agent.guardrails);
        if (inputCheck.blocked) {
            return res.json({ message: inputCheck.reply, blocked: true, session_id });
        }

        // 3. Build format and query Claude
        const fullSystemPrompt = buildSystemPrompt(agent.systemPrompt, agent.domain, agent.guardrails);
        const structuredMessage = buildStructuredPrompt(message, agent.domain);

        let reply = await chatWithPersona(fullSystemPrompt, history, structuredMessage);

        // 4. Output Guardrail (validation before response)
        const outputCheck = await runGuardrails(message, reply, agent.domain, agent.guardrails);

        // If out of domain/blocked on output -> Regenerate with stricter constraint
        if (outputCheck.blocked) {
            console.log("Output guardrail triggered. Regenerating response...");
            const stricterSystemPrompt = fullSystemPrompt + "\nCRITICAL: You failed validation. You MUST act purely within your domain and avoid giving generic, unhelpful, or out-of-character responses. Try again.";
            reply = await chatWithPersona(stricterSystemPrompt, history, structuredMessage);

            // Secondary check (optional fail-safe)
            const secondCheck = await runGuardrails(message, reply, agent.domain, agent.guardrails);
            if (secondCheck.blocked) {
                return res.json({ message: "I apologize, but I am unable to provide a response to that within my domain expertise.", blocked: true, session_id });
            }
        }

        // 5. Save History (Save the actual user message for natural dialogue feeling)
        await saveHistory(session_id, message, reply);

        // 6. Return response
        return res.json({ message: reply, blocked: false, session_id });

    } catch (error) {
        console.error("Error in /chat:", error);
        return res.status(500).json({ error: "Internal server error during chat" });
    }
});

export default router;