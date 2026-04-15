# COCO - AI Voice Assistant

**COCO** is an intelligent AI assistant created by **Aditya Gupta**. It performs tasks, answers questions, and supports both Hinglish (mixed Hindi-English) and English interactions with adaptive language-aware responses.

## 🚀 Features

- **Language-Adaptive Responses**: Detects user input language and responds accordingly
  - **Hinglish/Hindi Input** → Single mixed Hinglish reply
  - **English Input** → English-only reply
- **Task Execution**: Open apps, websites, play YouTube videos, create files
- **Conversational**: Personalized greetings, user name retention, contextual responses
- **AI-Powered**: Groq API integration for natural language understanding
- **Modern Stack**: Next.js frontend, Express.js backend, MongoDB integration

## 📋 Project Structure

```
coco-the-ai-agent/
├── backend/               # Express.js server
│   ├── src/
│   │   ├── server.js     # Entry point
│   │   ├── app.js        # Express app configuration
│   │   ├── controllers/
│   │   │   └── commandController.js      # Command processing & language detection
│   │   ├── services/
│   │   │   ├── aiService.js             # Groq API integration & prompting
│   │   │   ├── modelRouter.js           # Information routing
│   │   │   ├── actionHandler.js         # Action execution layer (style-aware)
│   │   │   └── infoProviders/          # Data sources (weather, time, etc.)
│   │   └── utils/
│   │       └── helpers.js               # Utility functions
│   ├── package.json
│   └── .env.example
│
├── frontend/              # Next.js client
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── styles/
│   ├── public/
│   ├── package.json
│   └── next.config.mjs
│
└── README.md
```

## 🔄 Language-Style Adaptation Flow

### Request Processing
1. **User Input** → Backend receives raw command
2. **Language Detection** (commandController.js)
   - Checks for Devanagari script (U+0900-U+097F)
   - Scans for Hinglish keywords: `kya`, `kaise`, `mera`, `aap`, `theek`, etc.
   - Sets `responseStyle` to `"bilingual"` (Hinglish) or `"english"`
3. **Style Propagation**
   - Passed through validator → normalizer → plan executor
   - Embedded in action parameters as `_response_style`
4. **Action Execution**
   - Each action handler (chat, open_app, get_info, etc.) extracts style
   - Formats responses using `formatByStyle()` helper
5. **Response Return**
   - Hinglish: Natural mixed Hindi-English single reply
   - English: Standard English reply

### Key Files Updated

| File | Purpose | Change |
|------|---------|--------|
| `commandController.js` | Command entry point | Detects input language, propagates style |
| `aiService.js` | Groq LLM prompts | Updated system prompt to require single mixed Hinglish (no duplicate translation) |
| `modelRouter.js` | Info routing | Style-aware routing with conditional prompting |
| `actionHandler.js` | Action handlers | Style-aware responses for all actions |

## 🛠️ Tech Stack

### Backend
- **Express.js** (5.1.0) - HTTP server
- **Groq API** - LLM inference
- **Mongoose** (8.14.2) - MongoDB ODM
- **Puppeteer** (24.8.2) - Browser automation
- **dotenv** - Environment configuration

### Frontend
- **Next.js** (16.2.3) - React framework
- **React** (19.2.4) - UI library
- **Tailwind CSS** (4) - Styling
- **Lucide React** - Icons

## 📦 Installation & Setup

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Update .env with your Groq API key
npm run dev      # Development mode with watch
npm start        # Production mode
```

### Frontend
```bash
cd frontend
npm install
npm run dev      # Development server on localhost:3000
npm run build    # Production build
npm start        # Production server
```

## 🌐 API Endpoints

### `POST /api/command`
Send a command to COCO.

**Request:**
```json
{
  "command": "mera naam batao"
}
```

**Response:**
```json
{
  "finalMessage": "Ek ladka/ladki hain aap. [Personalized Hinglish response]",
  "stepsExecuted": [
    {
      "action": "chat",
      "status": "completed",
      "message": "..."
    }
  ]
}
```

## 🧠 How Language Detection Works

### Hinglish Detection
- **Script Detection**: Devanagari characters (Hindi)
- **Keyword Matching**: Common Hinglish words
  - Questions: `kya`, `kaise`, `kyu`, `kyon`
  - Pronouns: `mera`, `meri`, `mujhe`, `tum`, `tumhara`, `aap`, `aapka`
  - Verbs: `kar`, `karo`, `batao`, `samjhao`
  - Affirmations: `hai`, `haan`, `nahi`, `theek`
  - Greetings: `namaste`, `haanji`

### Response Formatting
```javascript
// Hinglish input
"Main theek hoon"
→ Detected as: "bilingual"
→ Response: "Main bhi theek hoon, shukrya. Kaise madad kar sakta hoon?"
  // Natural mixed Hinglish, no separate translation

// English input
"How are you?"
→ Detected as: "english"
→ Response: "I am doing well, thanks. How can I help?"
  // English only
```

## 🎯 Supported Actions

1. **chat** - Conversational response
2. **open_app** - Launch applications
3. **open_website** - Open URLs in browser
4. **play_youtube** - Play YouTube videos
5. **create_file** - Create text files
6. **get_info** - Retrieve information (weather, time, etc.)
7. **get_user_info** - Store/retrieve user profile data

## 📝 Example Interactions

### Hinglish
```
User: "Mera naam Aditya hai, kaise ho?"
COCO: "Aditya, mein bilkul theek hoon! Aaj main kya kar sakta hoon?"
```

### English
```
User: "My name is Aditya, how are you?"
COCO: "Aditya, I am doing great! What can I help you with today?"
```

### Code Example: YouTube
```
User (Hinglish): "Song play kar, Believer"
COCO: "Believer ka gaana play kar raha hoon."
→ Opens YouTube with Believer video

User (English): "Play song Believer"
COCO: "Playing your requested YouTube result."
→ Opens YouTube with Believer video
```

## 🔐 Environment Variables

### Backend (.env)
```
GROQ_API_KEY=your_groq_api_key_here
MONGODB_URI=mongodb+srv://...
PORT=5000
NODE_ENV=development
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## 🚀 Deployment

### Backend Deployment (e.g., Railway, Render, AWS)
1. Set environment variables (GROQ_API_KEY, MONGODB_URI, etc.)
2. Push code to GitHub
3. Connect to deployment platform
4. Auto-deploy on push

### Frontend Deployment (Vercel)
1. Connect GitHub repo to Vercel
2. Configure environment variables
3. Deploy with `next build`

## 🐛 Debugging

### Check Language Detection
```bash
cd backend
node -e "
import('./src/controllers/commandController.js').then(async ({postCommand}) => {
  const req = { body: { command: 'mera naam kya hai' } };
  const res = { 
    status(c) { this.code = c; return this; },
    json(o) { console.log(JSON.stringify(o, null, 2)); }
  };
  await postCommand(req, res);
}).catch(e => console.error(e));
"
```

### Check Backend Compilation
```bash
cd backend
node -e "import('./src/app.js').then(() => console.log('OK')).catch(e => console.error(e));"
```

## 📚 Recent Updates (Language-Style Adaptation)

**Latest Implementation (April 15, 2026):**
- ✅ Hinglish/Hindi input → Single mixed Hinglish response (no duplicate translation)
- ✅ English input → English-only response
- ✅ Updated system prompts across all LLM calls
- ✅ Style detection regex expanded with additional keywords
- ✅ All action handlers (7 total) made style-aware
- ✅ Backend validation: no errors, successful runtime tests

**Previous Implementation:**
- Language detection via script + keyword analysis
- Response style propagation through controller → validator → planner → executor
- 4 core backend files updated
- Extensive test coverage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit changes (`git commit -m 'Add feature'`)
4. Push to branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## 📄 License

Private project by Aditya Gupta

## 🙋 Support

For issues or questions, contact Aditya Gupta or check the project documentation.

---

**Last Updated:** April 15, 2026  
**Version:** 1.0.0  
**Status:** Active Development
