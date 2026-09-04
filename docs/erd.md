# Database Entity Relationship Diagram (ERD)

The **Water Distribution Management System** database is designed for high performance, transactional consistency, and audit integrity.

## Entity Relationship Overview (Mermaid Diagram)

```mermaid
erDiagram
    users ||--o{ user_roles : "assigned"
    roles ||--o{ user_roles : "contains"
    users ||--o{ water_prices : "creates"
    villages ||--o{ customers : "contains"
    customers ||--o{ water_distributions : "receives"
    users ||--o{ water_distributions : "collects"
    water_distributions ||--o1 payments : "has"
    users ||--o{ payments : "processes"
    payments ||--o1 receipts : "generates"

    users {
        bigint id PK
        string username UK
        string email UK
        string password
        string full_name
        string phone_number
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    roles {
        bigint id PK
        string name UK
    }

    villages {
        bigint id PK
        string name UK
        string code UK
        text description
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    water_prices {
        bigint id PK
        decimal price_per_litre
        datetime effective_from
        boolean is_active
        string notes
        bigint created_by FK
        datetime created_at
        datetime updated_at
    }

    customers {
        bigint id PK
        string customer_code UK
        string full_name
        string phone_number
        string address
        bigint village_id FK
        string status
        datetime created_at
        datetime updated_at
    }

    water_distributions {
        bigint id PK
        string distribution_code UK
        bigint customer_id FK
        bigint collector_id FK
        decimal quantity_litres
        decimal price_per_litre
        decimal total_amount
        datetime distribution_date
        string payment_status
        datetime created_at
        datetime updated_at
    }

    payments {
        bigint id PK
        bigint distribution_id FK,UK
        decimal amount
        string payment_method
        string payment_status
        bigint collector_id FK
        datetime payment_date
        string reference_number
        datetime created_at
        datetime updated_at
    }

    receipts {
        bigint id PK
        string receipt_number UK
        bigint payment_id FK,UK
        datetime issued_at
        datetime created_at
    }
```

## Key Business Rule Enforcements

1. **Fixed Price & Total Amount Rule**:
   - `total_amount = quantity_litres * price_per_litre`
   - Stored directly on `water_distributions` record to lock historical cost at transaction moment.
2. **Payment & Distribution 1:1 Mapping**:
   - Each distribution record connects to at most 1 payment record (`distribution_id UNIQUE`).
3. **Receipt & Payment 1:1 Mapping**:
   - Each completed payment generates exactly 1 receipt (`payment_id UNIQUE`) formatted as `WTR-YYYY-XXXXXX`.
