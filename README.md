# 🔗 URLShortner

A full-stack **URL Shortener** web application built with **Node.js**, **Express**, **MongoDB**, and a Vanilla JS/HTML/CSS frontend. Features user authentication, custom aliases, QR code generation, click analytics, and link expiration.

---

## 🚀 Features

- 🔐 **User Authentication** — Register & Login with JWT-based sessions
- ✂️ **URL Shortening** — Instantly shorten any long URL
- 🎯 **Custom Aliases** — Set your own custom short code (3–20 chars)
- 📊 **Click Analytics** — Track click counts and daily trends with charts
- 📱 **QR Code Generation** — Auto-generates a QR code for every shortened URL
- ⏰ **Link Expiration** — Set expiry dates (1, 7, 30 days or never)
- 🛡️ **Rate Limiting** — 100 requests per 15 minutes per IP
- 💾 **MongoDB / In-Memory DB** — Auto-falls back to in-memory MongoDB in dev if local DB is unavailable

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | REST API server |
| MongoDB + Mongoose | Database & ORM |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT authentication |
| nanoid | Short code generation |
| qrcode | QR code generation |
| validator | Input validation |
| express-rate-limit | API rate limiting |
| mongodb-memory-server | In-memory DB for development |

### Frontend
| Technology | Purpose |
|---|---|
| HTML5 | SPA shell structure |
| CSS3 | Dark theme + glassmorphism UI |
| Vanilla JavaScript | SPA routing, auth flow, API calls |
| Chart.js (CDN) | Click analytics charts |

---

## 📁 Project Structure

```
URLShortner/
├── backend/
│   ├── middleware/
│   │   └── auth.js           # JWT protect middleware
│   ├── models/
│   │   ├── Url.js            # URL schema (shortCode, clicks, QR, expiry)
│   │   └── User.js           # User schema with bcrypt hashing
│   ├── routes/
│   │   ├── auth.js           # /api/auth — register, login, me
│   │   └── urls.js           # /api/urls — CRUD + analytics
│   ├── server.js             # Express app entry point
│   └── package.json          # Dependencies
├── frontend/
│   └── public/
│       ├── index.html        # SPA shell
│       ├── style.css         # Dark theme with glassmorphism
│       └── app.js            # SPA logic, routing, API integration
├── .gitignore
└── README.md
```

---

## ⚙️ Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) v16+
- [MongoDB](https://www.mongodb.com/) (optional — falls back to in-memory in dev)

### 1. Clone the Repository
```bash
git clone https://github.com/hssinchana04-svg/URLShortner.git
cd URLShortner
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 3. Configure Environment Variables
Create a `.env` file inside the `backend/` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/urlshortner
JWT_SECRET=your_super_secret_jwt_key
BASE_URL=http://localhost:5000
NODE_ENV=development
```

> **Note:** If `MONGODB_URI` is not reachable in development, the app auto-starts an in-memory MongoDB instance.

### 4. Start the Server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### 5. Open the App
Visit [http://localhost:5000](http://localhost:5000) in your browser.

---

## 🔌 API Endpoints

### Authentication — `/api/auth`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register a new user | ❌ |
| POST | `/api/auth/login` | Login and receive JWT | ❌ |
| GET | `/api/auth/me` | Get current user info | ✅ |

### URLs — `/api/urls`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/urls` | Create a short URL | ✅ |
| GET | `/api/urls` | Get all URLs for user | ✅ |
| GET | `/api/urls/:id` | Get single URL + analytics | ✅ |
| DELETE | `/api/urls/:id` | Delete a URL | ✅ |

### Redirect
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:code` | Redirect to original URL and track click |

---

## 📦 Request & Response Examples

### Register
```json
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secret123"
}
```

### Create Short URL
```json
POST /api/urls
Authorization: Bearer <token>
{
  "originalUrl": "https://www.example.com/very/long/url",
  "customAlias": "mylink",
  "expiresIn": "7"
}
```

---

## 🔒 Security
- Passwords hashed with **bcrypt** (12 salt rounds)
- JWT tokens expire after **7 days**
- API rate limiting — **100 req / 15 min**
- CORS restricted to `BASE_URL` in production

---

## 📸 UI Overview

The frontend is a single-page application with a **premium dark theme** featuring:
- **Glassmorphism** cards and panels
- **Smooth animations** and micro-interactions
- **Responsive layout** for mobile and desktop
- **Chart.js** powered analytics graphs

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **ISC License**.

---

## 👤 Author

**iamsinchana** — [hssinchana04@gmail.com](mailto:hssinchana04@gmail.com)

> GitHub: [@hssinchana04-svg](https://github.com/hssinchana04-svg)
