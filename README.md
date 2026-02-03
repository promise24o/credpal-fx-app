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
- **Role-based access control** (Admin vs regular users)
- **Redis caching** for FX rates with fallback mechanisms
- **Transaction verification** with idempotency and double-funding protection
- **Analytics dashboard** with comprehensive reporting
- **Admin panel** for user and system management
- **Service layer architecture** with clean separation of concerns

### ⚠️ Known Issues
- Database connection may fail with provided credentials - ensure PostgreSQL is accessible

### 🔧 Configuration Notes
- The application is configured to use Brevo SMTP for email sending
- FX rates are fetched from ExchangeRate-API and cached with Redis
- JWT secret has been generated with cryptographically secure random string
- Rate limiting implemented to prevent abuse (5 requests/minute for funding)

## Features

- **User Registration & Email Verification**: Users can register with email and receive OTP for verification
- **Multi-Currency Wallet**: Support for NGN, USD, EUR, GBP, and other major currencies
- **Real-time FX Rates**: Integrated with external FX API for real-time exchange rates
- **Currency Trading**: Convert between currencies using real-time rates with double-funding protection
- **Transaction History**: Complete audit trail of all transactions with idempotency
- **Security**: JWT authentication, input validation, atomic transactions, and rate limiting
- **Admin Panel**: Comprehensive admin dashboard for user management and system monitoring
- **Analytics**: Track trading volumes, user activity, and FX trends
- **Caching**: Redis-based caching with in-memory fallback
- **Role-Based Access**: Admin and user roles with proper access control

## Tech Stack

- **Framework**: NestJS
- **ORM**: TypeORM
- **Database**: PostgreSQL
- **Authentication**: JWT with Passport
- **API Documentation**: Swagger/OpenAPI
- **Validation**: class-validator and class-transformer
- **External APIs**: ExchangeRate-API for FX rates
- **Caching**: Redis with in-memory fallback
- **Rate Limiting**: @nestjs/throttler
- **Email**: Brevo SMTP integration

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- Redis server (optional, falls back to in-memory cache)
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

# Redis Configuration (Optional)
REDIS_URL=redis://localhost:6379

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
- `POST /wallet/fund` - Fund wallet with specified currency (with idempotency protection)
- `POST /wallet/convert` - Convert between currencies
- `POST /wallet/trade` - Trade currencies (similar to convert but with rate validation)

#### FX Rates
- `GET /fx/rates` - Get all FX rates (with optional base currency)
- `GET /fx/rate` - Get specific currency pair rate

#### Transactions
- `GET /transactions` - Get user transaction history
- `GET /transactions/:transactionId` - Get transaction details
- `GET /transactions/stats/summary` - Get transaction statistics

#### Admin Panel (Admin Only)
- `GET /admin/users` - Get all users
- `GET /admin/users/:id` - Get user by ID
- `PUT /admin/users/:id/suspend` - Suspend user
- `PUT /admin/users/:id/activate` - Activate user
- `GET /admin/users/:id/wallets` - Get user wallets
- `POST /admin/users/:id/fund` - Fund user wallet (admin)
- `GET /admin/transactions` - Get all transactions
- `GET /admin/transactions/:id` - Get transaction by ID
- `POST /admin/fx/rates/update` - Update FX rates
- `GET /admin/system/health` - Get system health

#### Analytics (Admin Only)
- `GET /analytics/dashboard` - Get dashboard overview
- `GET /analytics/transactions/stats` - Get transaction statistics
- `GET /analytics/currencies/stats` - Get currency statistics
- `GET /analytics/traders/top` - Get top traders
- `GET /analytics/volume/daily` - Get daily volume
- `GET /analytics/transactions/failed` - Get failed transactions

## Architecture Decisions

### Service Layer Pattern
- Clean separation between controllers, operations services, and base services
- Controllers handle HTTP concerns only
- Operations services contain business logic
- Base services handle data access

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
- Idempotency protection with unique keys
- Database locking to prevent race conditions

### FX Rate Handling
- Redis caching with 5-minute TTL
- In-memory fallback if Redis unavailable
- Hourly batch updates from external API
- Fallback to database if API fails
- Both direct and inverse rates stored for efficiency

### Security Measures
- Password hashing with bcrypt
- JWT-based authentication with role verification
- Input validation with class-validator
- SQL injection prevention via TypeORM
- Rate limiting to prevent abuse
- Request logging and monitoring
- Idempotency protection for financial operations

## Database Schema

### Users Table
- Stores user information and verification status
- OTP fields for email verification
- Role-based access control (USER/ADMIN)
- User status tracking (ACTIVE/SUSPENDED)

### Wallets Table
- Multi-currency support with one row per currency
- Balance and frozen balance fields
- Unique constraint on (userId, currency)

### Transactions Table
- Complete audit trail
- Support for multiple transaction types (FUNDING, CONVERSION, TRADE)
- Status tracking (pending, completed, failed, cancelled)
- Reference generation for easy tracking
- Metadata field for idempotency keys

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

### 2. Wallet Funding with Idempotency Protection
```bash
# Fund NGN wallet with idempotency key
curl -X POST http://localhost:3000/wallet/fund \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "NGN",
    "amount": 10000,
    "description": "Initial funding",
    "idempotencyKey": "unique-uuid-for-this-request"
  }'
```

### 3. Currency Conversion
```bash
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

### 4. Admin Operations
```bash
# Get all users (Admin only)
curl -X GET http://localhost:3000/admin/users \
  -H "Authorization: Bearer <admin-jwt-token>"

# Get system health (Admin only)
curl -X GET http://localhost:3000/admin/system/health \
  -H "Authorization: Bearer <admin-jwt-token>"
```

## Scalability Considerations

### For Millions of Users
1. **Database Optimization**:
   - Implement database sharding by user ID
   - Add read replicas for reporting queries
   - Use connection pooling

2. **Caching Strategy**:
   - Redis for distributed caching (already implemented)
   - Cache user balances and FX rates
   - Implement cache invalidation strategy

3. **Microservices**:
   - Split into separate services (Auth, Wallet, FX, Transactions, Analytics)
   - Use message queues for async processing
   - Implement circuit breakers for external APIs

4. **Monitoring**:
   - Add metrics and alerting
   - Rate limiting already implemented
   - Use distributed tracing

## Assumptions

1. **FX Rates**: Using ExchangeRate-API as the primary source
2. **Email Service**: Brevo SMTP configured for production email sending
3. **Initial Balance**: Users start with zero balance in all currencies
4. **Transaction Fees**: Not implemented (can be added as a future feature)
5. **Withdrawals**: Not implemented (requires payment gateway integration)
6. **Database**: PostgreSQL hosted on Aiven cloud platform
7. **Redis**: Optional, falls back to in-memory cache if not available

## Future Enhancements

1. **Transaction Fees**: Implement trading fees
2. **Payment Gateway**: Add withdrawal and deposit options
3. **WebSocket Integration**: Real-time rate updates
4. **Mobile API**: Optimized endpoints for mobile apps
5. **Kafka Integration**: Event-driven architecture for scalability
6. **Multi-tenant Support**: Support for multiple organizations
7. **Advanced Analytics**: Machine learning for fraud detection
8. **Compliance**: AML and KYC integration

## Production Deployment

### Environment Variables
- Use strong, unique secrets for JWT and database
- Configure Redis for production caching
- Set up proper email service credentials
- Enable SSL/TLS for database connections

### Security Considerations
- Enable rate limiting in production
- Use environment-specific configurations
- Implement proper logging and monitoring
- Regular security audits and updates

### Performance Optimization
- Enable database connection pooling
- Configure Redis clustering for high availability
- Use CDN for static assets
- Implement proper indexing strategies

## License

This project is licensed under the ISC License.
