import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { readFileTool } from "./readFileTool.js";

/**
 * Function 1 — forgePersona
 */
export async function forgePersona(description, tone, guardrails) {
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-2.0-flash",
        temperature: 0.7,
        apiKey: process.env.GOOGLE_API_KEY,
    });

    const promptText = `Convert this persona description into agent config JSON only.
No markdown, no explanation.
Description: {description}, Tone: {tone}, Guardrails: {guardrails}
Return: {{ "name": "...", "systemPrompt": "...", "domain": "...", "sampleReply": "..." }}`;

    const prompt = ChatPromptTemplate.fromTemplate(promptText);

    const chain = RunnableSequence.from([
        prompt,
        model,
        new StringOutputParser()
    ]);

    const res = await chain.invoke({
        description,
        tone,
        guardrails
    });

    try {
        const parsed = JSON.parse(res.trim());
        return parsed;
    } catch (e) {
        console.error("Failed to parse JSON from Gemini:", res);
        throw new Error("Invalid format returned by the model during persona creation.");
    }
}

/**
 * Function 2 — chatWithPersona
 */
export async function chatWithPersona(systemPrompt, history, userMessage, enabledTools = []) {
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-2.0-flash",
        temperature: 0.7,
        apiKey: process.env.GOOGLE_API_KEY,
    });
    const tools = Array.isArray(enabledTools) && enabledTools.includes("Read File")
        ? [readFileTool]
        : [];

    // Formatting history from generic {role, content} to Langchain message objects
    const formattedHistory = history.map(msg => {
        if (msg.role === "user") return new HumanMessage(msg.content);
        if (msg.role === "assistant") return new AIMessage(msg.content);
        return new AIMessage(msg.content);
    });

    const agent = createReactAgent({
        llm: model,
        tools,
        prompt: systemPrompt
    });

    const result = await agent.invoke({
        messages: [
            ...formattedHistory,
            new HumanMessage(userMessage)
        ]
    });

    const lastMessage = result.messages[result.messages.length - 1];
    return typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);
}

/**
 * Function 3 — judgeMessage
 */
export async function judgeMessage(message, context) {
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-2.0-flash",
        temperature: 0,
        apiKey: process.env.GOOGLE_API_KEY,
    });

    const promptText = `Is this message safe and on-topic for a {context} AI agent?
Message: {message}
Reply with ONLY one word: SAFE or UNSAFE`;

    const prompt = ChatPromptTemplate.fromTemplate(promptText);

    const chain = RunnableSequence.from([
        prompt,
        model,
        new StringOutputParser()
    ]);

    const res = await chain.invoke({
        context,
        message
    });

    return res.trim();
}
