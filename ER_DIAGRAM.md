# PaveSafe AI - Database ER Diagram

The following Entity-Relationship (ER) diagram visualizes the PostgreSQL database schema for the PaveSafe AI platform based on the backend source code migrations and queries.

```mermaid
erDiagram
    users ||--o{ hazards : "reports"
    users ||--o{ hazard_upvotes : "casts"
    users ||--o{ notifications : "receives"
    hazards ||--o{ hazard_upvotes : "receives"

    users {
        int id PK
        string username UK "UNIQUE"
        string password_hash
        string email
        int points "DEFAULT 0"
        timestamp banned_until
        jsonb recent_reports "DEFAULT '[]'"
    }

    hazards {
        int id PK
        geography location "PostGIS GEOGRAPHY(Point)"
        string severity
        string status "DEFAULT 'Reported'"
        int reporter_id FK "References users(id)"
        string image_url
        string image_public_id
        int confirmation_count "DEFAULT 0"
        timestamp reported_at
        timestamp updated_at
    }

    hazard_upvotes {
        int hazard_id PK, FK "ON DELETE CASCADE"
        int user_id PK, FK "ON DELETE CASCADE"
    }

    notifications {
        int id PK
        int user_id FK "References users(id)"
        text message
        timestamp created_at "DEFAULT CURRENT_TIMESTAMP"
    }
```
