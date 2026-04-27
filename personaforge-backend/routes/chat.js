import { Router } from 'express';
import { agentsDb } from './forge.js';
import { getHistory, saveHistory } from '../services/memory.js';
import { runGuardrails } from '../services/guardrails.js';
import { buildSystemPrompt, buildStructuredPrompt } from '../services/promptBuilder.js';
import { chatWithPersona } from '../services/claude.js';

const router = Router();

/**
 * Helper function to detect generic assistant responses
 * Returns true if response appears to be generic/non-persona
 */
function detectGenericResponse(response, domain) {
    const genericPatterns = [
        /^(hello|hi|hey)[!.]?\s+(i'm|i am)\s+(claude|an ai|a language model|an assistant)/i,
        /^(i'm|i am)\s+(claude|an ai|a language model|an assistant)/i,
        /how can i (help|assist) you today\?$/i,
        /^(sure|of course|certainly)[!,.]?\s+i('d| would) be (happy|glad) to help/i,
        /as an ai (assistant|language model)/i,
        /i don't have personal (opinions|feelings|experiences)/i,
    ];

    const lowerResponse = response.toLowerCase();
    
    // Check for generic patterns
    for (const pattern of genericPatterns) {
        if (pattern.test(response)) {
            return true;
        }
    }
    
    // Check if domain is mentioned at all in first 100 chars (should be for greetings)
    if (domain && response.length < 200) {
        const domainLower = domain.toLowerCase();
        const firstPart = lowerResponse.substring(0, 100);
        if (!firstPart.includes(domainLower)) {
            // Domain not mentioned in opening - likely generic
            return true;
        }
    }
    
    return false;
}

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

        const enabledTools = Array.isArray(agent.tools) ? agent.tools : [];
        const canReadFiles = enabledTools.includes("Read File");

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

        // 2. Input Guardrail (safety check only, NOT domain filtering)
        const inputCheck = await runGuardrails(message, "", agent.domain, agent.guardrails);
        if (inputCheck.blocked) {
            // Only block if truly unsafe (harmful content), not domain-related
            return res.json({ message: inputCheck.reply, blocked: true, session_id });
        }

        // 3. Build system prompt and ALWAYS structure user input (no filtering)
        const fullSystemPrompt = buildSystemPrompt(agent.systemPrompt, agent.domain, agent.guardrails, enabledTools);
        
        // CRITICAL: ALL user inputs are structured, regardless of intent
        let structuredMessage = buildStructuredPrompt(message, agent.domain);

        if (canReadFiles && attachedFiles.length > 0) {
            const fileContext = attachedFiles
                .map(file => `- ${file.file_name}: ${file.file_path}${file.size_bytes !== null ? ` (${file.size_bytes} bytes)` : ""}`)
                .join("\n");
            structuredMessage += `\n\nUploaded files available to this session:\n${fileContext}\nIf the user refers to "the file", "this file", an uploaded file, or asks to read/analyze/summarize file content, call read_file with the matching file_path before answering.`;
        }

        let reply = await chatWithPersona(fullSystemPrompt, history, structuredMessage, enabledTools);

        // Pre-validation: Quick check for generic responses
        if (detectGenericResponse(reply, agent.domain)) {
            console.log("⚠️ Generic response detected - Regenerating immediately");
            const stricterSystemPrompt = fullSystemPrompt + `

====== IMMEDIATE CORRECTION REQUIRED ======
Your response was too generic and did not reflect your ${agent.domain} specialization.

MANDATORY REQUIREMENTS:
1. Start by establishing your identity as a ${agent.domain} specialist
2. Use ${agent.domain}-specific terminology and context
3. Frame everything within ${agent.domain} expertise
4. Do NOT sound like a general AI assistant
5. If asked "what can you do?", explain ${agent.domain} capabilities specifically
6. Use soft, friendly redirection for off-topic queries (NOT hard rejection)

REGENERATE NOW with strong ${agent.domain} persona.`;
            
            reply = await chatWithPersona(stricterSystemPrompt, history, structuredMessage, enabledTools);
        }

        // 4. Output Guardrail (validates persona adherence, NOT domain relevance of input)
        const outputCheck = await runGuardrails(message, reply, agent.domain, agent.guardrails);

        // If out of domain/blocked on output -> Regenerate with stricter constraint
        if (outputCheck.blocked) {
            console.log("⚠️ Output guardrail triggered - Response failed persona adherence check");
            console.log("Regenerating with enhanced persona enforcement...");
            
            const stricterSystemPrompt = fullSystemPrompt + `

====== REGENERATION NOTICE ======
⚠️ YOUR PREVIOUS RESPONSE FAILED VALIDATION ⚠️

Failure Reason: Response did not maintain strict ${agent.domain} persona integrity.

CORRECTIVE INSTRUCTIONS:
1. You MUST respond as a ${agent.domain} specialist ONLY
2. Do NOT provide generic, general-purpose assistant responses
3. If the user asked "what can you do?", explain ${agent.domain} capabilities specifically
4. If the user's input was a simple greeting, respond with a ${agent.domain}-focused greeting
5. If the user's input was off-topic, use SOFT, FRIENDLY redirection (NOT hard rejection)
6. Every word must reflect your specialized ${agent.domain} expertise
7. Be helpful and conversational while maintaining persona
8. Think: "How would a real ${agent.domain} professional respond to this?"

REGENERATE YOUR RESPONSE NOW with strict adherence to your ${agent.domain} persona.`;

            reply = await chatWithPersona(stricterSystemPrompt, history, structuredMessage, enabledTools);

            // Secondary check (fail-safe)
            const secondCheck = await runGuardrails(message, reply, agent.domain, agent.guardrails);
            if (secondCheck.blocked) {
                console.log("❌ Second validation failed - Using fallback response");
                // Provide a helpful, domain-specific fallback
                reply = `I'm here to help with ${agent.domain}-related questions and topics. What specific aspect of ${agent.domain} would you like to explore?`;
            } else {
                console.log("✅ Regenerated response passed validation");
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
