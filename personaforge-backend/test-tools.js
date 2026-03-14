import { chatWithPersona } from './services/claude.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    try {
        console.log("Starting chatWithPersona...");
        const reply = await chatWithPersona(
            "You are a helpful assistant.",
            [],
            "Can you search the web for the latest news on Apple and summarize it?",
            ["Web Search", "Google Calendar"]
        );
        console.log("Reply:", reply);
    } catch (e) {
        console.error("Error:", e);
    }
}
run();
