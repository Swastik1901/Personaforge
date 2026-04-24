import { Router } from 'express';
import { agentsDb } from './forge.js';
import { getHistory, saveHistory } from '../services/memory.js';
import { runGuardrails } from '../services/guardrails.js';
import { buildSystemPrompt, buildStructuredPrompt } from '../services/promptBuilder.js';
import { chatWithPersona } from '../services/claude.js';

const router = Router();

function isFileRelatedMessage(message) {
    return /\b(file|document|upload|uploaded|attachment|attached|read|open|summari[sz]e|analy[sz]e|json|csv|txt|md|report)\b/i.test(message);
}

function normalizeAttachedFiles(files) {
    if (!Array.isArray(files)) return [];

    return files
        .filter(file => file && typeof file.file_path === 'string')
        .map(file => ({
            file_path: file.file_path,
            file_name: typeof file.file_name === 'string' ? file.file_name : file.file_path,
            size_bytes: typeof file.size_bytes === 'number' ? file.size_bytes : null
        }));
}

router.post('/:agentId/chat', async (req, res) => {
    try {
        const { agentId } = req.params;
        const { message, session_id } = req.body;
        const attachedFiles = normalizeAttachedFiles(req.body.attached_files);

        if (!message || !session_id) {
            return res.status(400).json({ error: "message and session_id are required" });
        }

        const agent = agentsDb.get(agentId);
        if (!agent) {
            return res.status(404).json({ error: "Agent not found" });
        }

        console.log("[CHAT DEBUG] Agent record:", JSON.stringify(agent, null, 2));
        const enabledTools = Array.isArray(agent.tools) ? agent.tools : [];
        console.log("[CHAT DEBUG] Enabled tools:", enabledTools);
        const canReadFiles = enabledTools.includes("Read File");
        console.log("[CHAT DEBUG] Can read files:", canReadFiles);

        if (isFileRelatedMessage(message) && !canReadFiles) {
            return res.json({
                message: "I cannot inspect files for this agent because the Read File tool is not enabled. Enable Read File in the agent tools, then upload the file again.",
                blocked: false,
                session_id,
                tool_required: "Read File"
            });
        }

        // 1. Get Memory
        const history = await getHistory(session_id);

        // 2. Input Guardrail
        const inputCheck = await runGuardrails(message, "", agent.domain, agent.guardrails);
        if (inputCheck.blocked) {
            return res.json({ message: inputCheck.reply, blocked: true, session_id });
        }

        // 3. Build format and query Claude
        const fullSystemPrompt = buildSystemPrompt(agent.systemPrompt, agent.domain, agent.guardrails, enabledTools);
        let structuredMessage = buildStructuredPrompt(message, agent.domain);

        if (canReadFiles && attachedFiles.length > 0) {
            const fileContext = attachedFiles
                .map(file => `- ${file.file_name}: ${file.file_path}${file.size_bytes !== null ? ` (${file.size_bytes} bytes)` : ""}`)
                .join("\n");
            structuredMessage += `\n\nUploaded files available to this session:\n${fileContext}\nIf the user refers to "the file", "this file", an uploaded file, or asks to read/analyze/summarize file content, call read_file with the matching file_path before answering.`;
        }

        let reply = await chatWithPersona(fullSystemPrompt, history, structuredMessage, enabledTools);

        // 4. Output Guardrail (validation before response)
        const outputCheck = await runGuardrails(message, reply, agent.domain, agent.guardrails);

        // If out of domain/blocked on output -> Regenerate with stricter constraint
        if (outputCheck.blocked) {
            console.log("Output guardrail triggered. Regenerating response...");
            const stricterSystemPrompt = fullSystemPrompt + "\nCRITICAL: You failed validation. You MUST act purely within your domain and avoid giving generic, unhelpful, or out-of-character responses. Try again.";
            reply = await chatWithPersona(stricterSystemPrompt, history, structuredMessage, enabledTools);

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
