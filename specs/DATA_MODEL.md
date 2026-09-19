# Karti — Data Model Specification

## Principles

Keep the model relational and simple:

```text
Client
 ├── Profile
 │    └── Profile Links
 └── Cards
      └── Current Destination
```

Use UUIDs for internal primary keys, a human-friendly `card_number`, and a random public `short_code`.

## `clients`

```text
id uuid primary key
name text not null
company text null
phone text null
email text null
notes text null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Rules:

- may exist without a profile;
- may exist without a card;
- email/phone are not necessarily unique.

## `profiles`

```text
id uuid primary key
client_id uuid not null references clients(id)
profile_type text not null
slug text not null unique

display_name text not null
job_title text null
company_name text null
bio text null

avatar_path text null
cover_path text null

phone text null
whatsapp text null
email text null
website text null
address text null
maps_url text null

accent_color text null
theme text not null default 'light'
status text not null default 'DRAFT'

created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Canonical values:

```text
profile_type: PERSON | BUSINESS
status: DRAFT | ACTIVE | INACTIVE
```

Index `client_id`.

## `profile_links`

```text
id uuid primary key
profile_id uuid not null references profiles(id) on delete cascade
type text not null
label text not null
url text not null
icon text null
sort_order integer not null default 0
enabled boolean not null default true
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Indexes:

```text
(profile_id)
(profile_id, sort_order)
```

Suggested link types:

```text
instagram
facebook
linkedin
tiktok
youtube
x
snapchat
whatsapp
website
google_review
booking
maps
custom
```

## `cards`

```text
id uuid primary key
card_number text not null unique
short_code text not null unique

client_id uuid null references clients(id)

destination_type text null
destination_profile_id uuid null references profiles(id)
destination_url text null

status text not null default 'UNASSIGNED'

created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Canonical statuses:

```text
UNASSIGNED
ASSIGNED
ACTIVE
DISABLED
LOST
REPLACED
```

Destination types:

```text
PROFILE
EXTERNAL_URL
```

Enforce destination consistency:

PROFILE:
```text
destination_profile_id IS NOT NULL
destination_url IS NULL
```

EXTERNAL_URL:
```text
destination_profile_id IS NULL
destination_url IS NOT NULL
```

Unassigned cards may have no destination.

## Optional `card_events`

Defer unless analytics is moved into MVP.

Possible fields:

```text
id
card_id
event_type
occurred_at
device_type
referrer
country_code
```

Do not store unnecessary precise location or personal data.

## Admin identity

Use Supabase Auth as the identity source.

If app-specific admin metadata is needed:

```text
admin_profiles
- user_id uuid primary key references auth.users(id)
- display_name text null
- created_at timestamptz
```

Do not store duplicate passwords/auth secrets.

## Slugs

Rules:

1. lowercase;
2. trim;
3. spaces → hyphens;
4. remove unsupported chars;
5. collapse repeated hyphens;
6. reject empty value;
7. reject reserved routes;
8. enforce uniqueness.

Reserved examples:

```text
admin api auth cards clients dashboard login logout new profiles settings t
```

## Card short codes

Requirements:

- random;
- URL safe;
- case policy consistent;
- non-sequential;
- unique;
- collision-safe generation.

Example:

```text
K7DX29P4
```

Do not use predictable `card-12`.

## Delete behavior

Cards should normally be disabled/replaced rather than deleted.

Do not accidentally cascade-delete physical-card history when a client is removed.

## Database integrity

Protect important rules with DB constraints, not TypeScript alone:

- unique slug;
- unique card number;
- unique short code;
- foreign keys;
- valid status/type values;
- valid destination combinations.

## Generated types

If Supabase type generation is used, regenerate types after every schema migration. Never hand-edit generated DB type files.
