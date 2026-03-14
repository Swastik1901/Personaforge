import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import forgeRouter from './routes/forge.js';
import chatRouter from './routes/chat.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/forge', forgeRouter);
app.use('/v1', chatRouter);

app.get('/health', (req, res) => {
    res.json({ status: "ok" });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`PersonaForge server running on port ${PORT}`);
    console.log(`Groq Key loaded: ${process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.substring(0, 10) + '...' : 'MISSING'}`);
});
