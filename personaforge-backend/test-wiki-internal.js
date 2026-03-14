import { WikipediaQueryRun } from "@langchain/community/tools/wikipedia_query_run";

async function testWiki() {
    try {
        const tool = new WikipediaQueryRun();
        console.log("Searching Wikipedia for 'March 14'...");
        const result = await tool.invoke("March 14");
        console.log("Result (first 500 chars):", result.slice(0, 500));
    } catch (e) {
        console.error("Wiki Error:", e.name, e.message);
    }
}

testWiki();
