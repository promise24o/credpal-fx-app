# FX Trading App Backend

A robust backend system for FX trading where users can trade currencies including Naira (NGN) and other international currencies. Built with NestJS, TypeORM, and PostgreSQL.

## Current Status

### ✅ Completed Features
- User registration and email verification with OTP
- Multi-currency wallet system (NGN, USD, EUR, GBP, etc.)
- Real-time FX rate integration with ExchangeRate-API
- Currency conversion and trading functionality
- Transaction history and audit system
- JWT-based authentication
- Brevo SMTP email integration
- Comprehensive API documentation (Swagger)

### ⚠️ Known Issues
- Database connection may fail with provided credentials - ensure PostgreSQL is accessible

### 🔧 Configuration Notes
- The application is configured to use Brevo SMTP for email sending
- FX rates are fetched from ExchangeRate-API and cached every hour
- JWT secret has been generated with cryptographically secure random string

## Features

- **User Registration & Email Verification**: Users can register with email and receive OTP for verification
- **Multi-Currency Wallet**: Support for NGN, USD, EUR, GBP, and other major currencies
- **Real-time FX Rates**: Integrated with external FX API for real-time exchange rates
- **Currency Trading**: Convert between currencies using real-time rates
- **Transaction History**: Complete audit trail of all transactions
- **Security**: JWT authentication, input validation, and atomic transactions

## Tech Stack

- **Framework**: NestJS
- **ORM**: TypeORM
- **Database**: PostgreSQL
- **Authentication**: JWT with Passport
- **API Documentation**: Swagger/OpenAPI
- **Validation**: class-validator and class-transformer
- **External APIs**: ExchangeRate-API for FX rates

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- Brevo account for email sending (or any SMTP server)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd backend-assessment
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
# Database Configuration
DB_HOST=your-db-host
DB_PORT=5432
DB_USERNAME=your-db-username
DB_PASSWORD=your-db-password
DB_NAME=your-db-name

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Email Configuration (Brevo SMTP)
MAIL_HOST=smtp-relay.brevo.com
MAIL_PORT=587
MAIL_USERNAME=your-brevo-username@smtp-brevo.com
MAIL_PASSWORD=your-brevo-password
MAIL_FROM_ADDRESS=no-reply@yourdomain.com
MAIL_FROM_NAME="Your App Name"
BREVO_API_KEY=your-brevo-api-key

# FX API Configuration
FX_API_KEY=your-fx-api-key
FX_API_URL=https://v6.exchangerate-api.com/v6

# Application Configuration
PORT=3000
NODE_ENV=development
```

4. Run the application:
```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## API Documentation

Once the server is running, visit `http://localhost:3000/api` to view the interactive Swagger documentation.

### Key API Endpoints

#### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/verify` - Verify email with OTP
- `POST /auth/login` - Login user
- `POST /auth/resend-otp` - Resend OTP to email
- `GET /auth/verify-email-config` - Verify email configuration (development only)
- `GET /auth/me` - Get current user profile

#### Wallet Management
- `GET /wallet` - Get user wallet balances
- `POST /wallet/fund` - Fund wallet with specified currency
- `POST /wallet/convert` - Convert between currencies
- `POST /wallet/trade` - Trade currencies (similar to convert but with rate validation)

#### FX Rates
- `GET /fx/rates` - Get all FX rates (with optional base currency)
- `GET /fx/rate` - Get specific currency pair rate

#### Transactions
- `GET /transactions` - Get user transaction history
- `GET /transactions/:transactionId` - Get transaction details
- `GET /transactions/stats/summary` - Get transaction statistics

## Architecture Decisions

### Multi-Currency Wallet Design
- Each user has separate wallet entries for each currency
- This approach provides:
  - Clear separation of balances
  - Easy auditing and tracking
  - Scalability for adding new currencies
  - Atomic operations within each currency

### Transaction Management
- All financial operations are wrapped in database transactions
- Frozen balance mechanism prevents double-spending
- Comprehensive transaction history with status tracking

### FX Rate Handling
- In-memory caching with 5-minute TTL
- Hourly batch updates from external API
- Fallback to database if API fails
- Both direct and inverse rates stored for efficiency

### Security Measures
- Password hashing with bcrypt
- JWT-based authentication
- Input validation with class-validator
- SQL injection prevention via TypeORM
- Request logging and monitoring

## Database Schema

### Users Table
- Stores user information and verification status
- OTP fields for email verification
- Role-based access control

### Wallets Table
- Multi-currency support with one row per currency
- Balance and frozen balance fields
- Unique constraint on (userId, currency)

### Transactions Table
- Complete audit trail
- Support for multiple transaction types
- Status tracking (pending, completed, failed, cancelled)
- Reference generation for easy tracking

### FX Rates Table
- Cached exchange rates
- Both direct and inverse rates
- Timestamp tracking for rate freshness

## Testing

Run unit tests:
```bash
npm run test
```

Run e2e tests:
```bash
npm run test:e2e
```

Test coverage:
```bash
npm run test:cov
```

## Example Use Cases

### 1. User Registration and Verification
```bash
# Register user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Verify with OTP
curl -X POST http://localhost:3000/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "otp": "123456"
  }'
```

### 2. Wallet Funding and Trading
```bash
# Fund NGN wallet
curl -X POST http://localhost:3000/wallet/fund \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "NGN",
    "amount": 10000,
    "description": "Initial funding"
  }'

# Convert NGN to USD
curl -X POST http://localhost:3000/wallet/convert \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fromCurrency": "NGN",
    "toCurrency": "USD",
    "amount": 1000
  }'
```

## Scalability Considerations

### For Millions of Users
1. **Database Optimization**:
   - Implement database sharding by user ID
   - Add read replicas for reporting queries
   - Use connection pooling

2. **Caching Strategy**:
   - Redis for distributed caching
   - Cache user balances and FX rates
   - Implement cache invalidation strategy

3. **Microservices**:
   - Split into separate services (Auth, Wallet, FX, Transactions)
   - Use message queues for async processing
   - Implement circuit breakers for external APIs

4. **Monitoring**:
   - Add metrics and alerting
   - Implement rate limiting
   - Use distributed tracing

## Assumptions

1. **FX Rates**: Using ExchangeRate-API as the primary source
2. **Email Service**: Brevo SMTP configured for production email sending
3. **Initial Balance**: Users start with zero balance in all currencies
4. **Transaction Fees**: Not implemented (can be added as a future feature)
5. **Withdrawals**: Not implemented (requires payment gateway integration)
6. **Database**: PostgreSQL hosted on Aiven cloud platform

## Future Enhancements

1. **Role-based Access**: Admin vs regular users
2. **Transaction Fees**: Implement trading fees
3. **Payment Gateway**: Add withdrawal and deposit options
4. **Analytics Dashboard**: Track trading volumes and trends
5. **WebSocket Integration**: Real-time rate updates
6. **Mobile API**: Optimized endpoints for mobile apps
7. **Kafka Integration**: Event-driven architecture for scalability

## License

This project is licensed under the ISC License.
