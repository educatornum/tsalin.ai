# Salary Posts API Testing Guide

## View Created Salary Posts

### 1. Get All Salary Posts
```bash
curl http://localhost:5000/api/salary-posts
```

### 2. Get Salary Posts with Filters
```bash
# Filter by professional level
curl "http://localhost:5000/api/salary-posts?level=4"

# Filter by verified posts only
curl "http://localhost:5000/api/salary-posts?is_verified=true"

# Filter by salary range
curl "http://localhost:5000/api/salary-posts?min_salary=2500000&max_salary=4000000"

# Pagination
curl "http://localhost:5000/api/salary-posts?page=1&limit=10"
```

## Create a New Salary Post via API

You need:
- `industry_id` - Get from industries
- `position_id` - Get from positions

### Get Industries (to find industry_id):
```bash
curl http://localhost:5000/api/industries
```

### Get Positions for an Industry:
```bash
# Replace INDUSTRY_ID with actual ID from previous call
curl http://localhost:5000/api/industries/INDUSTRY_ID/positions
```

### Create Salary Post:
```bash
curl -X POST http://localhost:5000/api/salary-posts \
  -H "Content-Type: application/json" \
  -d '{
    "industry_id": "YOUR_INDUSTRY_ID",
    "position_id": "YOUR_POSITION_ID",
    "source": "user_submission",
    "salary": 2800000,
    "level": 4,
    "experience_years": 3,
    "is_verified": false
  }'
```

## Get Salary Statistics

```bash
# Get statistics for specific industry and position
curl http://localhost:5000/api/salary-posts/stats/INDUSTRY_ID/POSITION_ID
```

This returns:
- Average, min, max salary overall
- Average, min, max salary by professional level

## Professional Levels Reference

| Level | Name (MN) | Name (EN) |
|-------|-----------|-----------|
| 1 | Дадлагажигч, оюутан | Intern, Student |
| 2 | Ажилтан | Employee |
| 3 | Ахлах ажилтан | Senior Employee |
| 4 | Мэргэжилтэн | Specialist |
| 5 | Ахлах мэргэжилтэн | Senior Specialist |
| 6 | Менежер | Manager |
| 7 | Ахлах менежер | Senior Manager |
| 8 | Нэгжийн дарга | Department Head |
| 9 | Нэгжийн захирал | Division Director |
| 10 | Гүйцэтгэх удирдлага | Executive Management |

## Source Types

- `user_submission` - User submitted data
- `company_data` - Company provided data
- `survey` - Survey results
- `public_data` - Public data sources
- `other` - Other sources

## Example: Complete Workflow

```bash
# 1. Get all industries
curl http://localhost:5000/api/industries

# 2. Get positions for IT industry (id from step 1)
curl http://localhost:5000/api/industries/67000abc123def456/positions

# 3. Create salary post for Software Engineer
curl -X POST http://localhost:5000/api/salary-posts \
  -H "Content-Type: application/json" \
  -d '{
    "industry_id": "67000abc123def456",
    "position_id": "67000xyz789abc123",
    "source": "user_submission",
    "salary": 3200000,
    "level": 5,
    "experience_years": 4,
    "is_verified": false
  }'

# 4. Get statistics for this position
curl http://localhost:5000/api/salary-posts/stats/67000abc123def456/67000xyz789abc123

# 5. Get all salary posts for this position
curl "http://localhost:5000/api/salary-posts?position_id=67000xyz789abc123"
```

