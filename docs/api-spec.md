# REST API Specification

All API endpoints return standard JSON responses with HTTP status codes.

## Base URL
`/api/v1`

## Standard Envelope Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2026-08-14T07:50:00"
}
```

### Paged Response
```json
{
  "success": true,
  "data": {
    "content": [ ... ],
    "pageNo": 0,
    "pageSize": 10,
    "totalElements": 45,
    "totalPages": 5,
    "last": false
  },
  "timestamp": "2026-08-14T07:50:00"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Validation failed / Resource not found",
  "errors": ["field: error details"],
  "timestamp": "2026-08-14T07:50:00"
}
```

---

## 1. Authentication Endpoints (`/api/v1/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Public | Authenticate user & get JWT token |
| `GET` | `/api/v1/auth/me` | Authenticated | Get current authenticated user details |

---

## 2. Customer Endpoints (`/api/v1/customers`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/customers` | Admin/Collector | Get paginated customers list (Search by `code`, `name`, `phone`, `village`) |
| `GET` | `/api/v1/customers/{id}` | Admin/Collector | Get customer by ID |
| `POST` | `/api/v1/customers` | Admin/Collector | Register new customer |
| `PUT` | `/api/v1/customers/{id}` | Admin | Update customer details |
| `DELETE` | `/api/v1/customers/{id}` | Admin | Deactivate/delete customer |

---

## 3. Village Endpoints (`/api/v1/villages`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/villages` | Admin/Collector | List all active villages/areas |
| `POST` | `/api/v1/villages` | Admin | Create village/area |
| `PUT` | `/api/v1/villages/{id}` | Admin | Update village/area |

---

## 4. Water Price Endpoints (`/api/v1/water-prices`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/water-prices/active` | Admin/Collector | Get current active price per litre |
| `GET` | `/api/v1/water-prices/history` | Admin | Get history of all price rates |
| `POST` | `/api/v1/water-prices` | Admin | Set new active price per litre |

---

## 5. Water Distribution Endpoints (`/api/v1/distributions`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/distributions` | Collector/Admin | Record new water distribution |
| `GET` | `/api/v1/distributions` | Admin | Paginated list of distributions |
| `GET` | `/api/v1/distributions/my-history` | Collector | Collector's own recorded distributions |
| `GET` | `/api/v1/distributions/{id}` | Admin/Collector | Distribution details |

---

## 6. Payment & Receipt Endpoints (`/api/v1/payments`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/payments` | Collector/Admin | Record payment for a distribution (Generates Receipt) |
| `GET` | `/api/v1/payments` | Admin | List all payments |
| `GET` | `/api/v1/payments/today` | Collector | Today's collection summary for logged-in collector |
| `GET` | `/api/v1/receipts/{receiptNumber}` | Admin/Collector | View/print receipt details |

---

## 7. Dashboard & Analytics (`/api/v1/dashboard`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/dashboard/admin` | Admin | Dynamic DB metrics: total customers, today's litres, today's revenue, monthly stats, chart series |
| `GET` | `/api/v1/dashboard/collector` | Collector | Dynamic DB metrics for active collector home screen |
