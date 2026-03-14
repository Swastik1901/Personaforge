import dotenv from 'dotenv';
dotenv.config();
console.log('GROQ_API_KEY prefix:', process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.substring(0, 10) + '...' : 'MISSING');
console.log('CWD:', process.cwd());
