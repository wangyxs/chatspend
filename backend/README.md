# ChatSpend Backend

FastAPI-based backend for ChatSpend - Natural Language Accounting Agent

## Features

- 🚀 FastAPI async framework
- 🤖 Recording Agent for natural language parsing
- 🗄️ SQLAlchemy async ORM
- 📱 SQLite (dev) / PostgreSQL (prod) support
- 🎯 DDD + Multi-Agent architecture

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your OpenAI API key
```

### 3. Run Development Server

```bash
python main.py
```

Or using uvicorn:

```bash
uvicorn main:app --reload
```

### 4. Access API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
backend/
├── app/
│   ├── agents/              # Agent implementations
│   │   ├── recording_agent.py
│   │   └── __init__.py
│   ├── api/                 # API layer
│   │   ├── routes/
│   │   │   ├── transactions.py
│   │   │   └── __init__.py
│   │   ├── schemas.py
│   │   └── __init__.py
│   ├── core/                # Core utilities
│   │   ├── database.py
│   │   └── __init__.py
│   ├── models/              # Database models
│   │   ├── database.py
│   │   └── __init__.py
│   └── config/              # Configuration
│       ├── settings.py
│       └── __init__.py
├── main.py                  # Application entry
├── requirements.txt         # Dependencies
└── .env.example            # Environment template
```

## API Endpoints

### Transactions

- `POST /api/v1/transactions/parse` - Parse natural language to transaction
- `POST /api/v1/transactions` - Create transaction(s)
- `GET /api/v1/transactions` - List transactions
- `GET /api/v1/transactions/{id}` - Get transaction
- `DELETE /api/v1/transactions/{id}` - Delete transaction

### Example Usage

```bash
# Parse transaction
curl -X POST "http://localhost:8000/api/v1/transactions/parse" \
  -H "Content-Type: application/json" \
  -d '{"input": "今天午饭花了35块"}'

# Create transaction
curl -X POST "http://localhost:8000/api/v1/transactions" \
  -H "Content-Type: application/json" \
  -d '{"input": "今天午饭花了35块，打车回来花了28"}'

# List transactions
curl "http://localhost:8000/api/v1/transactions?start_date=2026-03-01&end_date=2026-03-31"
```

## Development

### Database Migrations

```bash
# Create migration
alembic revision --autogenerate -m "Initial migration"

# Apply migrations
alembic upgrade head
```

### Testing

```bash
pytest
```

### Code Formatting

```bash
black app/
flake8 app/
mypy app/
```

## Architecture

### Recording Agent

The Recording Agent is responsible for:
1. Parsing natural language into structured transaction data
2. Extracting amount, category, date, time
3. Handling fuzzy time expressions
4. Intelligent categorization

### Rule-based + LLM Hybrid Approach

- **Rule-based**: Fast, deterministic parsing for common patterns
- **LLM-based**: Accurate parsing for complex/ambiguous inputs
- **Confidence scoring**: Use LLM when rule-based confidence < 0.8

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| APP_NAME | Application name | ChatSpend |
| DEBUG | Debug mode | True |
| DATABASE_URL | Database connection string | sqlite+aiosqlite:///./chatspend.db |
| OPENAI_API_KEY | OpenAI API key | - |
| OPENAI_MODEL | OpenAI model | gpt-4-turbo-preview |
| SECRET_KEY | Secret key for JWT | - |

## License

MIT
