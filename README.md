Library Management System
A comprehensive Library Management System built with React frontend and Node.js/Express backend, using SQLite for data storage.

Features
Book Management: Add, edit, delete, and search books
Member Management: Manage member accounts and view borrowing history
Issue & Return: Handle book borrowing and returns
Search: Universal search across books, members, and transactions
Reports & Analytics: Dashboard with statistics and trends
No Authentication: Static system for easy testing and development
Tech Stack
Frontend: React, React Router, Axios, Recharts
Backend: Node.js, Express
Database: SQLite
Styling: CSS3 with modern design
Installation
Install root dependencies:
npm install
Install backend dependencies:
cd backend
npm install
Install frontend dependencies:
cd frontend
npm install
Running the Application
Option 1: Run both servers together (recommended)
From the root directory:

npm run dev
Option 2: Run servers separately
Backend (from backend directory):

npm run dev
Frontend (from frontend directory):

npm start
The backend will run on http://localhost:5000 The frontend will run on http://localhost:3000

Database
The SQLite database is automatically created in backend/database/library.db when you first run the server.

Populating Books
To populate the database with books from the Open Library API, run:

cd backend
npm run populate-books
This will fetch up to 100 books from various genres (fiction, science fiction, mystery, romance, fantasy, biography, history, philosophy) and add them to your database. The script will skip if books already exist.

API Endpoints
Books
GET /api/books - Get all books
GET /api/books/:id - Get book by ID
POST /api/books - Add new book
PUT /api/books/:id - Update book
DELETE /api/books/:id - Delete book
Members
GET /api/members - Get all members
GET /api/members/:id - Get member by ID
POST /api/members - Add new member
PUT /api/members/:id - Update member
POST /api/members/:id/deactivate - Deactivate member
Loans
GET /api/loans - Get all loans
POST /api/loans/issue - Issue a book
POST /api/loans/return/:loanID - Return a book
POST /api/loans/renew/:loanID - Renew a loan
Search
GET /api/search?q=query&type=books|members|transactions - Universal search
Reports
GET /api/reports/dashboard - Get dashboard statistics
GET /api/reports/borrowing-trends - Get borrowing trends
GET /api/reports/popular-books - Get popular books
GET /api/reports/active-members - Get active members
Project Structure
library-management-system/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── routes/
│   │   ├── books.js
│   │   ├── members.js
│   │   ├── loans.js
│   │   ├── search.js
│   │   └── reports.js
│   ├── database/
│   │   └── library.db (auto-generated)
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.js
│   └── package.json
└── package.json
Notes
This is a static system without authentication for easy testing
The database is SQLite, perfect for development and small deployments
All sample data is automatically created on first run
The system follows the requirements and design specifications provided
