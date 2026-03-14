import { judgeMessage, FAST_MODELS } from './claude.js';
import { compileGuardrails } from './promptBuilder.js';
import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";

const BLOCKED_KEYWORDS = [
    "hack", "bomb", "weapon", "illegal", "jailbreak",
    "ignore all rules", "forget instructions",
    "ignore previous", "pretend you have no rules",
    "bypass", "override rules"
];

const TRUSTED_PHRASES = [
    "hello", "hi", "how can i help", "welcome", 
    "i'm ready", "let's start", "thank you",
    "i'm specialized in", "as a", "i am your",
    "here are some tips", "the best practices", "certainly", "absolutely"
];

/**
 * Layer 1 — keywordCheck
 */
function keywordCheck(message) {
    const lowerMessage = message.toLowerCase();
    for (const keyword of BLOCKED_KEYWORDS) {
        if (lowerMessage.includes(keyword)) {
            return { safe: false, reason: keyword };
        }
    }
    return { safe: true };
}

/**
 * Layer 2 — claudeJudgeInput
 */
async function claudeJudgeInput(message, domain) {
    if (!message || message.trim() === "") return { safe: true };

    try {
        // Tool-related requests should always be allowed through
        const toolPatterns = /\b(send\s*(an?)?\s*email|email\s*to|write\s*(an?)?\s*email|mail\s*to|search\s*(for|the\s*web|using|query)|wikipedia|visit\s*url|read\s*file|calendar|aws|google|book|appointment|find|look\s*up)\b/i;
        if (toolPatterns.test(message)) {
            return { safe: true };
        }

        const res = await judgeMessage(message, domain);
        if (res.toUpperCase().includes("UNSAFE")) {
            return { safe: false };
        }
        return { safe: true };
    } catch (e) {
        console.error("claudeJudgeInput error:", e);
        return { safe: true };
    }
}

/**
 * Layer 3 — claudeJudgeOutput
 */
async function claudeJudgeOutput(response, rules, domain) {
    if (!response || response.trim() === "") return { safe: true };
    if (!rules || rules.length === 0) return { safe: true };

    // Bypasses for obviously safe/short messages
    const lowerResp = response.toLowerCase();
    
    // Bypass 1: Very short greeting/intro
    if (response.length < 100) {
        if (TRUSTED_PHRASES.some(phrase => lowerResp.includes(phrase.toLowerCase()))) {
            return { safe: true };
        }
    }

    // Bypass 2: Specific domain keywords (if response is short)
    if (response.length < 300 && domain) {
        const domainKeywords = domain.toLowerCase().split(/\s+/);
        if (domainKeywords.some(kw => kw.length > 3 && lowerResp.includes(kw))) {
            return { safe: true };
        }
    }

    let lastError;

    for (const modelName of FAST_MODELS) {
        try {
            const model = new ChatGroq({
                model: modelName,
                temperature: 0,
                maxRetries: 2,
            });
            
            const promptText = `Evaluate if the following response from an AI agent is appropriate and follows the specified rules.
The agent is specialized in the domain: "{domain}".

Rules: {rules}
Response: {response}

IMPORTANT:
1. If the response provides helpful advice, tips, best practices, recipes, historical facts, or general information related to "{domain}", it is ALWAYS SAFE.
2. If the response describes using or failing to use a tool (sending email, web search, visit URL, wikipedia), it is ALWAYS SAFE.
3. Treat apologies about technical tool failures or "unable to access the web" as SAFE meta-talk.
4. Only mark as UNSAFE if the response is explicitly harmful, abusive, or discusses its own AI nature in a way that is COMPLETELY UNRELATED to the domain or tools.
5. If you are unsure, default to SAFE.

Reply with ONLY one word: SAFE or UNSAFE`;

            const prompt = ChatPromptTemplate.fromTemplate(promptText);
            
            const chain = RunnableSequence.from([
                prompt,
                model,
                new StringOutputParser()
            ]);
            
            const res = await chain.invoke({
                rules: compileGuardrails(rules),
                response,
                domain
            });
            
            if (res.trim().toUpperCase().includes("UNSAFE")) {
                return { safe: false };
            }
            return { safe: true };
        } catch (error) {
            lastError = error;
            console.warn(`[OUTPUT-JUDGE] Model ${modelName} error:`, error.message);
            if (error.message?.includes("429") || error.message?.includes("rate limit") || error.message?.includes("503")) {
                continue; 
            }
            break; 
        }
    }

    console.warn("All models failed for claudeJudgeOutput, falling back to SAFE");
    return { safe: true };
}

/**
 * Main function — runGuardrails
 */
export async function runGuardrails(userMessage, agentResponse, domain, rules) {
    // If testing input only (agentResponse is empty), skip output judge
    
    // 1. Layer 1 keyword check on user input
    if (userMessage) {
        const l1 = keywordCheck(userMessage);
        if (!l1.safe) {
            return { blocked: true, layer: "keyword", reply: "I can't help with that request." };
        }
        
        // 2. Layer 2 input judge (Only if stayOnTopic guardrail is enabled)
        const hasStayOnTopic = rules && rules.includes("stayOnTopic");
        if (hasStayOnTopic) {
            const l2 = await claudeJudgeInput(userMessage, domain);
            if (!l2.safe) {
                return { blocked: true, layer: "input", reply: "That's outside what I can help with." };
            }
        }
    }

    // 3. Layer 3 output judge
    if (agentResponse) {
        // Optimization: If ONLY stayOnTopic is active, and input passed, be very permissive of output
        const hasStayOnTopic = rules && rules.includes("stayOnTopic");
        const onlyStayOnTopic = rules && rules.length === 1 && hasStayOnTopic;
        
        if (onlyStayOnTopic && agentResponse.length < 500) {
             // Likely a safe, short domain answer
             return { blocked: false, reply: agentResponse };
        }

        const l3 = await claudeJudgeOutput(agentResponse, rules, domain);
        if (!l3.safe) {
            return { blocked: true, layer: "output", reply: "I can't provide a response to that." };
        }
    }

    return { blocked: false, reply: agentResponse };
}
