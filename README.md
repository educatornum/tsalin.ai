# Tsalin API

A RESTful API built with Node.js, Express, and MongoDB Atlas.

## Features

- 🚀 Express.js REST API
- 🗄️ MongoDB Atlas integration with Mongoose
- ✅ Input validation with express-validator
- 🔒 Security headers with Helmet
- 🌐 CORS enabled
- 📝 Request logging with Morgan
- ♻️ Hot reload with Nodemon (development)
- 📁 Organized folder structure (MVC pattern)

## Project Structure

```
tsalin.ai/
├── config/
│   └── database.js       # MongoDB connection configuration
├── controllers/
│   └── userController.js # User business logic
├── middleware/
│   ├── validators.js     # Request validation rules
│   └── errorHandler.js   # Global error handler
├── models/
│   └── User.js           # User schema/model
├── routes/
│   └── userRoutes.js     # User API routes
├── .env                  # Environment variables
├── .env.example          # Environment variables template
├── .gitignore
├── package.json
├── server.js             # Application entry point
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file and configure your MongoDB connection:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tsalinai-dev?retryWrites=true&w=majority
ALLOWED_ORIGINS=http://localhost:3000
```

**To get your MongoDB URI:**
- Go to [MongoDB Atlas](https://cloud.mongodb.com/)
- Click "Connect" on your cluster
- Choose "Connect your application"
- Copy the connection string and replace username, password, and database name

### Running the Application

Development mode (with hot reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:5000` (or the PORT you specified).

## API Endpoints

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | Get all users |
| GET | `/api/users/:id` | Get user by ID |
| POST | `/api/users` | Create new user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

### Industries

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/industries` | Get all industries (sorted by sort_order) |
| GET | `/api/industries?is_active=true` | Get only active industries |
| GET | `/api/industries/:id` | Get industry by ID |
| GET | `/api/industries/:id/positions` | Get all positions for a specific industry |
| POST | `/api/industries` | Create new industry |
| PUT | `/api/industries/:id` | Update industry |
| DELETE | `/api/industries/:id` | Delete industry |
| POST | `/api/industries/bulk` | Bulk insert industries |

### Positions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/positions` | Get all positions |
| GET | `/api/positions?industry_id=ID` | Get positions by industry ID |
| GET | `/api/positions?industry_sort_order=1` | Get positions by industry sort order |
| GET | `/api/positions/by-industry/:industry_id` | Get positions for specific industry |
| GET | `/api/positions/:id` | Get position by ID |
| POST | `/api/positions` | Create new position |
| PUT | `/api/positions/:id` | Update position |
| DELETE | `/api/positions/:id` | Delete position |
| POST | `/api/positions/bulk` | Bulk insert positions |

### Professional Levels

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pro-levels` | Get all professional levels (1-10) |
| GET | `/api/pro-levels/:id` | Get professional level by ID |
| GET | `/api/pro-levels/level/:level` | Get professional level by level number (1-10) |
| POST | `/api/pro-levels/bulk` | Bulk insert professional levels |

### Salary Posts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/salary-posts` | Get all salary posts (paginated, default 100 per page) |
| GET | `/api/salary-posts?industry_id=ID` | Filter by industry |
| GET | `/api/salary-posts?position_id=ID` | Filter by position |
| GET | `/api/salary-posts?level=5` | Filter by professional level |
| GET | `/api/salary-posts?is_verified=true` | Get only verified posts |
| GET | `/api/salary-posts?min_salary=2000000` | Filter by minimum salary |
| GET | `/api/salary-posts?max_salary=5000000` | Filter by maximum salary |
| GET | `/api/salary-posts/stats/:industry_id/:position_id` | Get salary statistics |
| GET | `/api/salary-posts/:id` | Get salary post by ID |
| POST | `/api/salary-posts` | Create new salary post |
| PUT | `/api/salary-posts/:id` | Update salary post |
| DELETE | `/api/salary-posts/:id` | Delete salary post |
| POST | `/api/salary-posts/bulk` | Bulk insert salary posts |

### Example Requests

**Create a new user:**
```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "age": 25
  }'
```

**Get all users:**
```bash
curl http://localhost:5000/api/users
```

**Get user by ID:**
```bash
curl http://localhost:5000/api/users/YOUR_USER_ID
```

**Update user:**
```bash
curl -X PUT http://localhost:5000/api/users/YOUR_USER_ID \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Updated",
    "age": 26
  }'
```

**Delete user:**
```bash
curl -X DELETE http://localhost:5000/api/users/YOUR_USER_ID
```

**Get positions for a specific industry:**
```bash
# Get all positions for industry with ID 67000d1234567890abcdef12
curl http://localhost:5000/api/industries/67000d1234567890abcdef12/positions
```

**Response:**
```json
{
  "success": true,
  "industry": {
    "_id": "67000d1234567890abcdef12",
    "name_mn": "Авто засвар, механик",
    "name_en": "Auto Repair & Mechanics",
    "average_salary": "2.7М - 3.1М₮"
  },
  "count": 4,
  "positions": [
    {
      "_id": "67000d9999999999abcdef01",
      "name_mn": "Автын засварчин",
      "name_en": "Auto Mechanic",
      "sort_order": 1
    },
    {
      "_id": "67000d9999999999abcdef02",
      "name_mn": "Авто цахилгаанчин",
      "name_en": "Auto Electrician",
      "sort_order": 2
    }
  ]
}
```

## User Model Schema

```javascript
{
  name: {
    type: String,
    required: true,
    minLength: 2,
    maxLength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    format: email
  },
  age: {
    type: Number,
    min: 0,
    max: 120,
    optional: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  timestamps: true  // adds createdAt and updatedAt
}
```

## Database Configuration

### Database Name
The database name is defined in your `.env` file in the MongoDB connection string:

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/tsalinai-dev?retryWrites=true&w=majority
                                                              ^^^^^^^^^^^^
                                                           DATABASE NAME
```

### Collections
- **users** - Stores user information
- **industries** - Stores 25 industry/job categories with salary information
- **positions** - Stores 124 job positions (linked to industries)
- **pro_levels** - Stores 10 professional levels (Intern to Executive)
- **salary_posts** - Stores actual salary data submissions (linked to industries, positions, and levels)

Collection names are defined in the model files:
```javascript
// models/User.js
const userSchema = new mongoose.Schema(
  { /* fields */ },
  { 
    timestamps: true,
    collection: 'users'  // Collection name defined here
  }
);
```

## Seeding Data

### Seed Industries
To populate the database with 25 predefined industries (Mongolian job categories with average salaries):

```bash
npm run seed:industries
```

This will:
- Connect to your MongoDB database
- Clear existing industries
- Insert 25 industries with Mongolian and English names
- Include average salary ranges for each industry

### Seed Positions
To populate the database with 124 job positions linked to industries:

```bash
npm run seed:positions
```

**Note:** You must seed industries first before seeding positions!

This will:
- Connect to your MongoDB database
- Map positions to their respective industries
- Clear existing positions
- Insert 124 positions with Mongolian and English names

### Seed Professional Levels
To populate the database with 10 professional levels:

```bash
npm run seed:prolevels
```

This will insert 10 levels from "Intern, Student" to "Executive Management".

### Seed Everything
To seed industries, positions, and professional levels in one command:

```bash
npm run seed:all
```

**Note:** This will seed in order: industries → positions → professional levels

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "error": "Error message here",
  "message": "Detailed error message"
}
```

## Security

- Helmet.js for security headers
- CORS configuration
- Input validation and sanitization
- MongoDB injection protection via Mongoose

## Development

To add new resources:

1. Create a model in `models/`
2. Create a controller in `controllers/`
3. Create routes in `routes/`
4. Add validation rules in `middleware/validators.js`
5. Register routes in `server.js`

## Troubleshooting

### Port Already in Use
If you see `EADDRINUSE` error:
```bash
# Find process using port 5000
lsof -ti:5000

# Kill the process
kill -9 PROCESS_ID

# Or change the PORT in your .env file
PORT=3000
```

## License

ISC

