# 🚀 PersonaForge - Beginner's Guide

Welcome to **PersonaForge**! 

If you are completely new to coding or setting up projects, don't worry! This guide is written exactly for you. Just follow these steps one by one.

## 🌟 What is PersonaForge?
PersonaForge is a web application that lets you create and chat with custom AI agents. 
The project has two main parts:
1. **Frontend**: The user interface you see in your browser (built with Next.js).
2. **Backend**: The server that handles logic and talks to the AI (built with Node.js & Express).

---

## 🛠️ Step 1: Install Required Software (Prerequisites)

Before we start, you need to install a few tools on your computer. If you already have them, you can skip to Step 2.

1. **[Node.js](https://nodejs.org/)**: This allows your computer to run our code. 
   - *Action*: Download and install the "LTS" (Long Term Support) version.
2. **[Git](https://git-scm.com/)**: This helps download the code from the internet.
   - *Action*: Download and install it.
3. **[Visual Studio Code (VS Code)](https://code.visualstudio.com/)**: A friendly text editor to view and edit the project files.
   - *Action*: Download and install it.

---

## 📂 Step 2: Download the Project

1. Open your computer's terminal:
   - **Windows**: Search for "Command Prompt" or "PowerShell"
   - **Mac**: Search for "Terminal" using Spotlight (Cmd + Space)
2. Type the following command and press **Enter** to download the code:
   ```bash
   git clone <your-repository-url>
   ```
   *(Note: replace `<your-repository-url>` with the actual link to this repository)*
3. Move into the new project folder by typing:
   ```bash
   cd persona-forge-main
   ```
4. Now, open this folder in VS Code by typing:
   ```bash
   code .
   ```

---

## 📦 Step 3: Install Dependencies

Think of dependencies as building blocks our project needs to run. We need to install them for both the frontend and backend. 

Inside VS Code, open a new terminal (**Terminal > New Terminal** from the very top menu bar).

1. **Install Frontend packages:**
   Type this and press Enter:
   ```bash
   npm install
   ```
   *(Wait for it to finish downloading everything)*

2. **Install Backend packages:**
   Type these commands one by one, pressing Enter after each line:
   ```bash
   cd personaforge-backend
   npm install
   cd ..
   ```

---

## 🗄️ Step 4: Set Up Databases (MongoDB & Redis)

Before starting the app, we need to set up free databases to save your data.

### 1. MongoDB (Main Database)
MongoDB is where all user data and AI chats are saved.
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas/database) and sign up for a free account.
2. Create a new "M0 Free" cluster.
3. Under **Database Access**, create a database user (remember the password you set!).
4. Under **Network Access**, add the IP address `0.0.0.0/0` so your app can connect from anywhere.
5. Click **Database** on the left menu, then click **Connect**, select **Drivers**, and copy your **Connection String** (it looks like `mongodb+srv://...`). Save this for Step 5!

### 2. Redis (Cache Database)
Redis stores temporary data to make the AI responses much faster. Installing it on your computer can be tricky, so we will use a free cloud Redis provider called Upstash.
1. Go to [Upstash](https://upstash.com/) and sign up for a free account.
2. Click **Create Database** under the Redis section and name it "personaforge" (leave other settings as default).
3. Once created, scroll down to the **Connection** section in your dashboard and copy the **Redis URL** (it usually looks like `rediss://...`). Save this for Step 5!

---

## 🔑 Step 5: Set Up Your Secret Keys (.env files)

The app needs certain keys (like passwords and API keys) to work. We keep these hidden in files called `.env`.

### A. Frontend Secrets
1. In VS Code, look at the files on the left sidebar. Make sure you are at the very top level (not inside any folder).
2. Right-click in the empty space underneath the file list and select **New File**.
3. Name the file exactly `.env.local`
4. Open it and paste the following text inside:

```env
# 1. MongoDB Database URL (Paste your Connection String from Step 4 here)
# Make sure to replace <username> and <password> with the database user you created!
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/personaforge?retryWrites=true&w=majority

# 2. Security Keys (You can just type random letters/numbers for these two)
JWT_SECRET=my-super-secret-text-123
NEXTAUTH_SECRET=another-super-secret-text-456
NEXTAUTH_URL=http://localhost:3000

# 3. Google/GitHub Login (Optional: if you want social login to work)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id

# 4. AI Key (Get a free API key at https://console.groq.com/)
GROQ_API_KEY=your_groq_api_key
```

### B. Backend Secrets
1. In VS Code's left sidebar, open the folder named `personaforge-backend`.
2. Inside that specific folder, create a new file named exactly `.env`
3. Open it and paste the following inside:

```env
# The same Groq AI key you used above
GROQ_API_KEY=your_groq_api_key

# Redis connection (Paste your Upstash URL from Step 4 here, e.g., rediss://...)
REDIS_URL=redis://localhost:6379

# The port the backend will run on
PORT=8000
```

---

## 🏃 Step 6: Start the App!

You are almost there! Now we just need to start the servers.

In your VS Code terminal (make sure you are in the main `persona-forge-main` folder, not the backend folder), run this magic command:

```bash
npm run dev:all
```

*(This single command starts both the frontend and the backend up for you automatically!)*

Now, open your favorite web browser (like Chrome or Safari) and go to:
👉 **[http://localhost:3000](http://localhost:3000)**

🎉 **Congratulations! You are now running PersonaForge!**

---

## 🆘 Troubleshooting (If things go wrong)

- **"npm is not recognized"**: You didn't install Node.js properly. Try restarting your computer after installing it.
- **Database Connection Error**: If the app crashes on startup, double-check your `MONGODB_URI` in `.env.local`. Make sure there are no special symbols like `@` or `:` in your database password (if there are, you have to URL-encode them).
- **AI isn't replying**: Ensure your `GROQ_API_KEY` is correct in **both** your `.env` files.
- **Ports already in use**: If the terminal says port 3000 or 8000 is already in use, restart your computer or close any other running servers.

If you followed every step and it's still not working, take a deep breath! Programming can be tricky. Try reading the error message in the terminal, or ask for help in our community!


