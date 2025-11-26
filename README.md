# QTip - PII Detection and Tokenization System

A real-time personally identifiable information (PII) detection and tokenization system built as a technical test. Features AI-powered health data detection using Azure OpenAI GPT-4o-mini and comprehensive unit testing.

<img width="780" height="721" alt="image" src="https://github.com/user-attachments/assets/6f970034-2a9c-46e8-8ccc-f4531574cdb5" />

## Table of Contents

- [Features](#features)
- [Project Context](#project-context)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [Architectural Decisions](#architectural-decisions)
- [Assumptions & Trade-offs](#assumptions--trade-offs)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Future Extensions](#future-extensions)
- [Troubleshooting](#troubleshooting)
- [Known Bugs](#known-bugs)

## Features

- **Real-time PII Detection**: Live highlighting of email addresses and health data
- **AI-Powered Health Detection**: Azure OpenAI GPT-4o-mini for fuzzy health information detection
- **Dual Detection Modes**: Regex-based email detection + AI-powered health analysis
- **Secure Tokenization**: Replace sensitive data with unique tokens for safe storage
- **Data Separation**: Clear separation between tokenized content and sensitive values
- **Comprehensive Testing**: 57 unit tests covering frontend and backend functionality
- **Modern Tech Stack**: .NET 10 Minimal APIs, Next.js 16, PostgreSQL, Tailwind CSS

## Project Context

Beyond the original scope of live email detection and separate storage of token values, an additional AI Health PII detection system has been implemented to highlight and store fuzzy health information without the use of keyword matching, and a full unit testing suite has been added, covering both frontend and backend.

Complex integration testing was intentionally left out to contain project scope, though some API integration testing was included.

## Quick Start

### Prerequisites
- Docker and Docker Compose
- At least 2GB RAM available

### Running the Application

1. **Clone the repository**
   ```bash
   git clone <this-repository-url>
   cd QTip
   ```

2. **Start all services**
   ```bash
   # Run from the project root directory (where docker-compose.yml is located)
   docker compose up
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080
   - Swagger UI: http://localhost:8080/swagger

## Usage

1. **Configure AI (Optional)**: Click "Azure OpenAI Configuration" to enable health PII detection using AI
2. **Enter Text**: Type or paste text containing email addresses or health information into the main textarea
3. **Real-time Detection**:
   - Email addresses highlighted with wavy blue underlines
   - Health data highlighted with wavy green underlines (when AI configured)
4. **Hover for Details**: Hover over highlighted content to see tooltips:
   - "PII – Email Address" for emails
   - "PHI - Health Data" for health information
5. **Submit**: Click the submit button to process and tokenize the text
6. **View Statistics**: The stats panel shows total counts of PII emails and health data detected across all submissions

### Shutting Down the Application

**Important:** Run these commands from the same directory where you ran `docker compose up` (the project root directory containing `docker-compose.yml`).

To stop all services:
```bash
# Navigate to the project directory first
cd /path/to/your/qtip/project

# Then stop the services
docker compose down
```

To completely stop all services **and clear all data** (including the PostgreSQL database):
```bash
# Navigate to the project directory first
cd /path/to/your/qtip/project

# Stop and remove containers
docker compose down

# Remove the PostgreSQL data volume (WARNING: This deletes all stored data!)
docker volume rm qtip_postgres_data
```

**Note:** The PostgreSQL data volume persists between container restarts by default. Remove it only if you want to start with a fresh database.

## Architectural Decisions

### Technology Choices
Note: Many of these were chosen in order to align with the existing stack as presented in the job spec and inferred from the website.
- **.NET Minimal APIs**: Simple, fast, and focused on API endpoints
- **PostgreSQL**: Robust relational database with EF Core support
- **Next.js**: Modern React framework with excellent developer experience
- **Zustand**: Lightweight state management
- **Azure OpenAI**: GPT-4o-mini for AI-powered health data detection for cost-effectiveness and accuracy
- **xUnit + Jest**: Comprehensive unit testing for both backend and frontend

### AI Integration Decisions
- **GPT-4o-mini**: Cost-effective and sufficiently accurate model suitable for PII detection tasks
- **Graceful Degradation**: System works without AI (email-only detection) if AI service fails or is not provided
- **Test Credentials**: Requested within the UI so no advanced configuration is required
- **Fuzzy Detection**: AI enables detection of health terms that regex cannot identify

### Tokenization Strategy
- **Unique Tokens**: Each PII gets an industry-standard unique GUID-based token to prevent correlation attacks and minimize chance of overlap
- **Text Preservation**: Tokenization maintains text structure
- **Data Separation**: Tokenized content stored separately from sensitive values

### Real-time Detection
- **Frontend Display**: Detection presented client-side via wiggly underlines for instant feedback while typing
- **Backend Processing**: Server-side detection of PII as required by specification
- **Debounced Requests**: 300ms debounce prevents excessive API calls and cost from model calls

### Security Considerations

- **Data Separation**: Sensitive values are stored tokenized, and their actual values are stored separately.
- **CORS Configuration**: Configured liberally for testing purposes since this is not a production system.
- **Environment Variables**: Sensitive configuration (Azure OpenAI credentials) delegated to the user in the UI.

### Performance

- **Debounced Detection**: Prevents excessive API calls during typing
- **Compiled Regex**: Email detection uses compiled regex for speed

### Testing Strategy
- **Primarily Unit Tests**: With a small amount of API integration testing
- **Backend Coverage**: Service layer, API endpoints, and data models
- **Frontend Coverage**: React components, state management, and utilities
- **Complex Integration Testing**: Excluded to maintain focused scope (database relationships, end-to-end flows)

#### Backend Testing
- **Framework**: xUnit with Moq for mocking
- **Coverage**: Service layer, API endpoints, data models, and utilities
- **Database**: In-memory databases for isolated testing
- **Run Tests**: `cd QTip && dotnet test`

#### Frontend Testing
- **Framework**: Jest with React Testing Library
- **Coverage**: React components, Zustand stores, and utilities
- **Run Tests**: `cd frontend && npm test`

#### Test Results
- **Backend**: 11 unit tests, all passing
- **Frontend**: 46 test cases across 3 test files, all passing
- **Total**: 57 comprehensive unit tests

## Assumptions & Trade-offs

### Implementation Assumptions
- **AI Credentials**: The intended user already has or can obtain their own Azure OpenAI credentials for health PII detection.
- **Network Connectivity**: AI features require internet access to Azure OpenAI services

### Trade-offs Made
- **Complex Integration Testing**: Excluded to contain project scope (database relationships, end-to-end flows)
- **Production Readiness**: Error handling optimized for development/demo rather than production
- **UI Polish**: A couple of parts prioritized as functional over beautiful given the purpose of the assessment
- **AI Cost**: Using GPT-4o-mini for cost-effectiveness over more expensive models, since for this use case its accuracy is very high.

### Scope Decisions
- **Unit Testing**: Comprehensive unit tests implemented for both frontend and backend
- **AI Integration**: Limited only to health data detection

## Architecture

### Backend (.NET 10.0 Minimal API)
- **Framework**: ASP.NET Core Minimal APIs
- **Database**: PostgreSQL with Entity Framework Core
- **Detection**: Regex-based email detection + AI-powered health data detection
- **AI Integration**: Azure OpenAI GPT-4o-mini for fuzzy health information detection
- **Endpoints**:
  - `POST /api/submit` - Process and tokenize text (supports both email and health PII)
  - `POST /api/detect-pii` - Real-time PII detection for frontend highlighting
  - `GET /api/stats` - Get total PII email and health data counts

### Frontend (Next.js 16 + TypeScript)
- **Framework**: Next.js with App Router
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Features**: Real-time highlighting (email + health PII), character counter, loading spinner, Azure OpenAI configuration

### Data Architecture
- **Tokenized Submissions**: Store processed text with tokens replacing sensitive data
- **Classification Vault**: Store metadata about detected PII (token, original value, classification tag)
- **Separation**: Clear separation between tokenized content and sensitive values for compliance

### Database Schema

#### Submissions Table
- `Id` (int, PK)
- `TokenizedText` (string)
- `SubmittedAt` (datetime)

#### Classifications Table
- `Id` (int, PK)
- `Token` (string)
- `OriginalValue` (string)
- `Tag` (string)
- `SubmissionId` (int, FK)

## API Documentation

### Submit Text for Processing
```http
POST /api/submit
Content-Type: application/json

{
  "text": "Contact john@example.com for more info",
  "azureOpenAI": {
    "endpoint": "https://your-resource.openai.azure.com",
    "apiKey": "your-api-key",
    "deployment": "gpt-4o-mini"
  }
}
```

**Response:**
```json
{
  "tokenizedText": "Contact {{EMAIL_TOKEN_abc123}} for more info"
}
```

### Real-time PII Detection
```http
POST /api/detect-pii
Content-Type: application/json

{
  "text": "Patient has diabetes, contact john@example.com",
  "azureOpenAI": {
    "endpoint": "https://your-resource.openai.azure.com",
    "apiKey": "your-api-key",
    "deployment": "gpt-4o-mini"
  }
}
```

**Response:**
```json
[
  {
    "type": "pii.email",
    "originalValue": "john@example.com",
    "startIndex": 28,
    "endIndex": 43,
    "tooltip": "PII – Email Address"
  },
  {
    "type": "pii.health",
    "originalValue": "diabetes",
    "startIndex": 11,
    "endIndex": 19,
    "tooltip": "PHI - Health Data"
  }
]
```

### Get Statistics
```http
GET /api/stats
```

**Response:**
```json
{
  "totalPiiEmails": 42,
  "totalPiiHealthData": 15
}
```

## Future Extensions

### Multiple PII Types
The system is designed to be extensible for additional PII types:
- Add new constants to `PiiTypes.cs`
- Extend detection logic in `PiiService.cs`
- Highlight these in the frontend

### Extended AI Detection
The system currently supports AI-powered health data detection. Future extensions could include:
- Additional PII types (names, addresses, financial data)
- Potentially use of a smarter model for more complex cases involving whole sentences rather than just terms.

### Advanced Analytics
- PII type distribution
- Submission trends
- Compliance reporting

### More Advanced Testing
- Full integration testing
- AI model accuracy testing to determine the most cost-effective and accurate model from all relevant choices

## Troubleshooting

### Common Issues

**Build Failures**
```bash
# Clean and rebuild
docker compose down
docker system prune -f
docker compose up --build
```

### Testing Tips

- Use the Swagger UI for testing API endpoints
- Use the included `QTip.http` file for API testing in IDEs
- Run unit tests: `dotnet test` (backend) or `npm test` (frontend)

### Testing the AI Features

**Without AI Configuration:**
- Only email detection
- Health PII detection is disabled

**With AI Configuration:**
- Both email and health PII detection work
- Test with terms like "diabetes", "cancer", "hypertension"
- Health data appears with green underlines and "PHI - Health Data" tooltips

## Known Bugs

**None currently known.** All issues have been resolved.
