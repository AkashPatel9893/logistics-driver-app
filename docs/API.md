# RYNO Partner (driver app) — API & data flow

Everything the driver app exchanges with the backend: transports, conventions,
every endpoint and every realtime event, with request/response shapes.

This file covers **only the driver app**. The customer app has its own
`Logistics-app/docs/API.md`; the shared contract (order state machine, common
models), the system design and the end-to-end flows between both apps are in
`../GlobalApi.md`, `../Architecture.md` and `../Flow.md` at the workspace root.

The app currently runs against an **in-app mock server** (`src/mocks`) that
implements exactly these contracts. Types for every model live in
`src/lib/api/models.ts`; endpoint functions in `src/lib/api/*.ts`; React Query
hooks in `src/hooks/use-*.ts`.

## Contents

- [1. Transports](#1-transports)
- [2. Conventions](#2-conventions)
- [3. Endpoint index](#3-endpoint-index)
- [4. Auth & account](#4-auth--account)
- [5. Driver profile & onboarding](#5-driver-profile--onboarding)
- [6. Availability & location](#6-availability--location)
- [7. Offers](#7-offers)
- [8. Jobs (the trip state machine)](#8-jobs-the-trip-state-machine)
- [9. Payment collection](#9-payment-collection)
- [10. Chat](#10-chat)
- [11. Earnings, wallet & trips](#11-earnings-wallet--trips)
- [12. Uploads](#12-uploads)
- [13. Realtime channel](#13-realtime-channel)
- [14. Error codes](#14-error-codes)
- [15. Mock mode](#15-mock-mode)

---

## 1. Transports

| Data                                              | Transport                                   | Why                                                                            |
| ------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------ |
| Everything the driver reads or changes on request | **REST over HTTPS** (JSON)                  | Cacheable, retryable, easy to debug                                            |
| Photos (parcel, documents, selfie)                | **HTTPS multipart** `POST /uploads`         | Binary upload; returns a hosted URL the JSON APIs reference                    |
| Offers, job changes, chat, payment confirmations  | **WebSocket** `driver:<userId>`             | Server-initiated and time-critical (an offer lives 30 s)                       |
| GPS position while online                         | **REST** `POST /driver/location` every 15 s | Survives flaky networks; the server fans it out to customers over their socket |
| Offers while the app is backgrounded              | **Push** (FCM/APNs, high priority)          | Sockets close in the background; push rings the phone                          |

## 2. Conventions

- Base URL `https://api.ryno.app/v1` (`EXPO_PUBLIC_API_URL`); socket `wss://api.ryno.app/v1/ws` (`EXPO_PUBLIC_WS_URL`).
- `Authorization: Bearer <accessToken>` on every call except `/auth/*` and `/config/*`.
- Success envelope:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "OK",
  "data": {},
  "timestamp": "2026-09-26T12:30:00.000Z"
}
```

- Error envelope (the app shows `message`; logic branches on `error`):

```json
{
  "success": false,
  "statusCode": 422,
  "error": "INVALID_OTP",
  "message": "That code doesn't match. Ask the sender to check it.",
  "timestamp": "…"
}
```

- Money is in rupees (number, up to 2 decimals). Times are ISO-8601 UTC strings. IDs are opaque strings.
- `401` anywhere signs the driver out (`setUnauthorizedHandler` in `src/lib/api/client.ts`).

## 3. Endpoint index

| Method | Path                             | Section |
| ------ | -------------------------------- | ------- |
| POST   | `/auth/otp/send`                 | 4       |
| POST   | `/auth/otp/verify`               | 4       |
| GET    | `/me`                            | 4       |
| PATCH  | `/me`                            | 4       |
| GET    | `/config/languages`              | 4       |
| GET    | `/driver/profile`                | 5       |
| GET    | `/driver/vehicle-types`          | 5       |
| PUT    | `/driver/vehicle`                | 5       |
| PUT    | `/driver/kyc`                    | 5       |
| PUT    | `/driver/bank`                   | 5       |
| POST   | `/driver/daily-check`            | 5       |
| POST   | `/driver/welcome-bonus/seen`     | 5       |
| PUT    | `/driver/status`                 | 6       |
| POST   | `/driver/location`               | 6       |
| GET    | `/driver/offers`                 | 7       |
| POST   | `/driver/offers/:id/accept`      | 7       |
| POST   | `/driver/offers/:id/reject`      | 7       |
| GET    | `/driver/jobs/active`            | 8       |
| GET    | `/driver/jobs/:id`               | 8       |
| POST   | `/driver/jobs/:id/arrive-pickup` | 8       |
| POST   | `/driver/jobs/:id/verify-pickup` | 8       |
| POST   | `/driver/jobs/:id/arrive-drop`   | 8       |
| POST   | `/driver/jobs/:id/verify-drop`   | 8       |
| POST   | `/driver/jobs/:id/cancel`        | 8       |
| POST   | `/driver/jobs/:id/payment/qr`    | 9       |
| POST   | `/driver/jobs/:id/payment/cash`  | 9       |
| GET    | `/driver/jobs/:id/messages`      | 10      |
| POST   | `/driver/jobs/:id/messages`      | 10      |
| POST   | `/driver/jobs/:id/messages/read` | 10      |
| GET    | `/driver/earnings?period=`       | 11      |
| GET    | `/driver/wallet`                 | 11      |
| POST   | `/driver/wallet/payouts`         | 11      |
| GET    | `/driver/trips`                  | 11      |
| GET    | `/driver/support`                | 11      |
| POST   | `/uploads`                       | 12      |

---

## 4. Auth & account

Same OTP flow as the customer app, but a **separate user pool** (driver accounts are not customer accounts).

### POST /auth/otp/send

```json
// request
{ "email": "ravi.driver@ryno.in" }
// data
{ "otpLength": 4, "resendInSeconds": 24, "expiresInSeconds": 300 }
```

### POST /auth/otp/verify

```json
// request
{ "email": "ravi.driver@ryno.in", "otp": "1234" }
// data
{
  "accessToken": "at_…",
  "refreshToken": "rt_…",
  "user": { "id": "drv_…", "email": "ravi.driver@ryno.in", "name": "", "phone": null, "dob": null, "city": null, "isOnboarded": false }
}
```

### GET /me · PATCH /me

`PATCH` body (all optional): `{ "name": "Ravi Chauhan", "phone": "+919876012345", "dob": "14 / 08 / 1992", "city": "Delhi NCR" }`.
Returns the `User`. `isOnboarded` becomes `true` once name, phone and city are set. Errors: `INVALID_NAME`, `INVALID_PHONE`.

### GET /config/languages

`[{ "code": "en", "label": "English", "nativeLabel": "English" }, …]`

---

## 5. Driver profile & onboarding

### GET /driver/profile → `DriverProfile`

```json
{
  "id": "drv_…",
  "name": "Ravi Chauhan",
  "phone": "+919876012345",
  "email": "ravi.driver@ryno.in",
  "city": "Delhi NCR",
  "dob": "14 / 08 / 1992",
  "joinedAt": "2026-09-26T12:22:55.000Z",
  "rating": 4.8,
  "ratingCount": 5,
  "isOnline": true,
  "onlineSince": "2026-09-26T12:29:40.000Z",
  "vehicle": {
    "vehicleTypeId": "mini-truck",
    "vehicleTypeName": "Mini Truck",
    "model": "Tata Ace Gold",
    "plateNumber": "DL 1L AB 4521",
    "rcPhotoUrl": "https://cdn.ryno.app/u/…",
    "frontPhotoUrl": "https://cdn.ryno.app/u/…",
    "status": "verified",
    "submittedAt": "2026-09-26T12:26:21.000Z"
  },
  "kyc": {
    "panNumber": "BQRPC4821K",
    "dlNumber": "DL-0420190034127",
    "dlPhotoUrl": "…",
    "aadhaarPhotoUrl": "…",
    "status": "verified",
    "submittedAt": "…"
  },
  "bank": {
    "holderName": "Ravi Chauhan",
    "accountLast4": "5849",
    "ifscCode": "ICIC0001102",
    "bankName": "ICICI Bank",
    "chequePhotoUrl": "…",
    "status": "verified",
    "submittedAt": "…"
  },
  "pendingSteps": [],
  "canGoOnline": true,
  "dailyCheck": { "completedToday": true, "photoUrl": "…", "reward": 50 },
  "welcomeBonus": {
    "amount": 1000,
    "targetTrips": 15,
    "completedTrips": 1,
    "expiresAt": "2026-10-03T12:22:55.000Z",
    "status": "active",
    "seen": true
  },
  "walletBalance": 362,
  "lifetimeTrips": 1
}
```

- `vehicle`, `kyc`, `bank` are `null` until submitted. `status` is `under_review → verified | rejected` (back-office review).
- `pendingSteps` lists steps not yet **verified**; `canGoOnline = pendingSteps.length === 0`.
- `rating` is `null` until the first customer rating.
- The full bank account number is never returned.

### GET /driver/vehicle-types

```json
[{ "id": "mini-truck", "name": "Mini Truck", "capacityKg": 600, "imageKey": "mini-truck" }, …]
```

Same ids as the customer app's vehicle catalogue, so offers match the driver's vehicle.

### PUT /driver/vehicle → `DriverProfile`

```json
{
  "vehicleTypeId": "mini-truck",
  "model": "Tata Ace Gold",
  "plateNumber": "DL 1L AB 4521",
  "rcPhotoUrl": "…",
  "frontPhotoUrl": "…"
}
```

Errors: `INVALID_VEHICLE_TYPE`, `INVALID_PLATE` (Indian format, e.g. `DL 1L AB 1234`, `KA 03 MX 2814`), `INVALID_MODEL`, `PHOTO_REQUIRED`, `ONLINE` (go offline first).

### PUT /driver/kyc → `DriverProfile`

```json
{
  "panNumber": "BQRPC4821K",
  "dlNumber": "DL-0420190034127",
  "dlPhotoUrl": "…",
  "aadhaarPhotoUrl": "…"
}
```

Errors: `INVALID_PAN` (`ABCDE1234F`), `INVALID_DL` (15 characters), `PHOTO_REQUIRED`.

### PUT /driver/bank → `DriverProfile`

```json
{
  "holderName": "Ravi Chauhan",
  "accountNumber": "50100482915849",
  "ifscCode": "ICIC0001102",
  "chequePhotoUrl": "…"
}
```

The server derives `bankName` from the IFSC prefix and keeps only `accountLast4` in responses. Errors: `INVALID_HOLDER`, `INVALID_ACCOUNT` (9–18 digits), `INVALID_IFSC`, `PHOTO_REQUIRED`.

### POST /driver/daily-check → `DailyCheck`

`{ "photoUrl": "…" }` — once per local day; credits `reward` (₹50) to the wallet as an `incentive` transaction. Error: `ALREADY_DONE`.

### POST /driver/welcome-bonus/seen → `DriverProfile`

Marks the intro sheet as shown. The bonus itself is credited automatically (`bonus` transaction) when `completedTrips` reaches `targetTrips` before `expiresAt`.

---

## 6. Availability & location

### PUT /driver/status → `DriverProfile`

`{ "isOnline": true }`. Going online opens an online session (used for "online time") and makes the driver eligible for dispatch. Going offline withdraws any pending offer.
Errors: `SETUP_INCOMPLETE` (409) when `canGoOnline` is false; `ACTIVE_JOB` (409) when going offline mid-trip.

### POST /driver/location

Sent every ~15 s while online (`src/hooks/use-location-reporter.ts`, `expo-location` foreground watch).

```json
// request
{ "latitude": 28.6304, "longitude": 77.2177, "heading": 182, "speedKmph": 23, "recordedAt": "2026-09-26T12:31:05.000Z" }
// data
{ "receivedAt": "2026-09-26T12:31:05.210Z" }
```

The server uses the latest fix for dispatch (`pickupDistanceKm`) and pushes it to the customer's `order:<id>` channel as `driver.location`.

---

## 7. Offers

An offer is one customer order proposed to this driver. It expires at `expiresAt` (30 s) and then goes to the next driver.

### GET /driver/offers → `JobOffer[]`

```json
[
  {
    "id": "ofr_…",
    "orderId": "ord_…",
    "orderNumber": "RYDFUWN",
    "createdAt": "2026-09-26T12:34:02.000Z",
    "expiresAt": "2026-09-26T12:34:32.000Z",
    "vehicle": { "id": "mini-truck", "name": "Mini Truck", "imageKey": "mini-truck" },
    "pickup": {
      "label": "Select Citywalk, Saket District Centre, New Delhi",
      "location": { "latitude": 28.5287, "longitude": 77.2193 },
      "houseNumber": "House 56, Block C",
      "contact": { "name": "Rohit Mehra", "phone": "+919811245678" }
    },
    "drop": {
      "label": "Cyber Hub, DLF Cyber City, Gurugram",
      "location": { "latitude": 28.4955, "longitude": 77.0891 },
      "houseNumber": "Plot 88, Service road",
      "contact": { "name": "Arjun Kapoor", "phone": "+919958842210" }
    },
    "tripDistanceKm": 17.2,
    "pickupDistanceKm": 6.4,
    "estimatedMinutes": 57,
    "fare": 577,
    "driverEarning": 462,
    "paymentMode": "cash",
    "paymentTiming": "on-pickup"
  }
]
```

`pickup`/`drop` are the customer's `OrderStop`s unchanged. `fare` is what the customer pays; `driverEarning = fare − 20 % commission`. Offers normally arrive over the socket (`offer.new`); this endpoint is the fallback/poll (every 20 s).

### POST /driver/offers/:id/accept → `DriverJob`

Errors: `OFFER_NOT_FOUND` (404), `OFFER_EXPIRED` (410 — expired or taken), `ACTIVE_JOB` (409).

### POST /driver/offers/:id/reject

`{ "reason": "Too far from me" }` → `null`. Reasons feed dispatch quality.

---

## 8. Jobs (the trip state machine)

A job is the driver-side view of the customer's order; `DriverJob.id` **is** the `orderId`, and `status` uses the shared `OrderStatus`.

```
heading_to_pickup ──arrive-pickup──▶ arrived_at_pickup ──verify-pickup──▶ pickup_complete
        │                                   │                                   │
        └──────────── cancel ───────────────┘                          arrive-drop
                                                                                ▼
                               delivered ◀──verify-drop── arrived_at_drop
```

### `DriverJob`

```json
{
  "id": "ord_…",
  "number": "RYDAHKW",
  "status": "arrived_at_pickup",
  "acceptedAt": "…",
  "vehicle": { "id": "mini-truck", "name": "Mini Truck", "imageKey": "mini-truck" },
  "pickup": {
    "label": "…",
    "location": { "latitude": 28.628, "longitude": 77.2405 },
    "houseNumber": "Gate 3, Warehouse 7",
    "contact": { "name": "Sunita Rao", "phone": "+919876011223" }
  },
  "drop": {
    "label": "…",
    "location": { "latitude": 28.5677, "longitude": 77.2433 },
    "houseNumber": "House 56, Block C",
    "contact": { "name": "Ananya Gupta", "phone": "+919899104532" }
  },
  "sender": { "name": "Sunita Rao", "phone": "+919876011223" },
  "route": [
    { "latitude": 28.628, "longitude": 77.2405 },
    { "latitude": 28.5677, "longitude": 77.2433 }
  ],
  "tripDistanceKm": 8.7,
  "estimatedMinutes": 34,
  "fare": 390,
  "driverEarning": 312,
  "commission": 78,
  "payment": {
    "mode": "prepaid",
    "timing": "on-delivery",
    "amount": 390,
    "methodLabel": "Card",
    "status": "collected",
    "collectedVia": "online",
    "collectedAt": "…"
  },
  "pickupPhotoUrl": null,
  "dropPhotoUrl": null,
  "arrivedAtPickupAt": "…",
  "pickedUpAt": null,
  "arrivedAtDropAt": null,
  "deliveredAt": null,
  "cancelledAt": null,
  "cancelReason": null,
  "unreadMessages": 1
}
```

The OTPs are **never** sent to the driver app — the driver must get them from the sender/receiver.

| Endpoint                              | Body                                     | From → to                                           | Errors                                             |
| ------------------------------------- | ---------------------------------------- | --------------------------------------------------- | -------------------------------------------------- |
| `GET /driver/jobs/active`             | —                                        | returns the in-progress job or `null`               | —                                                  |
| `GET /driver/jobs/:id`                | —                                        | any job of this driver (trip summary)               | `JOB_NOT_FOUND`                                    |
| `POST /driver/jobs/:id/arrive-pickup` | —                                        | `heading_to_pickup → arrived_at_pickup`             | `INVALID_STATE`, `ORDER_CANCELLED`                 |
| `POST /driver/jobs/:id/verify-pickup` | `{ "otp": "3124", "photoUrl": "…" }`     | `arrived_at_pickup → pickup_complete`               | `INVALID_OTP`, `PHOTO_REQUIRED`, `PAYMENT_PENDING` |
| `POST /driver/jobs/:id/arrive-drop`   | —                                        | `pickup_complete → arrived_at_drop`                 | `INVALID_STATE`                                    |
| `POST /driver/jobs/:id/verify-drop`   | `{ "otp": "5270", "photoUrl": "…" }`     | `arrived_at_drop → delivered`                       | `INVALID_OTP`, `PHOTO_REQUIRED`, `PAYMENT_PENDING` |
| `POST /driver/jobs/:id/cancel`        | `{ "reason": "Customer not reachable" }` | `heading_to_pickup / arrived_at_pickup → cancelled` | `REASON_REQUIRED`, `INVALID_STATE`                 |

Every call returns the updated `DriverJob`. On `delivered` the server writes the ledger (§11), records the customer rating and schedules the next offer.

---

## 9. Payment collection

Only for `payment.mode === "cash"`. The stop that matches `payment.timing` (`on-pickup` → pickup, `on-delivery` → drop) cannot be verified until `payment.status === "collected"` (`PAYMENT_PENDING`).

### POST /driver/jobs/:id/payment/qr → `PaymentQr`

```json
{
  "upiUri": "upi://pay?pa=rynologistics@icici&pn=RYNO%20Logistics&am=577.00&cu=INR&tr=RYDFUWN&tn=RYNO%20order%20RYDFUWN",
  "payeeVpa": "rynologistics@icici",
  "payeeName": "RYNO Logistics",
  "amount": 577,
  "reference": "RYDFUWN",
  "expiresAt": "2026-09-26T12:45:00.000Z"
}
```

The app renders `upiUri` as a QR (`react-native-qrcode-svg`) — any UPI app can scan it. Calling again returns the same open QR. When the payment gateway's webhook confirms the payment, the server marks it `collectedVia: "upi"` and pushes `payment.received` + `job.updated`. Error: `NOTHING_TO_COLLECT`.

### POST /driver/jobs/:id/payment/cash → `DriverJob`

Driver confirms the cash is in hand. Sets `collectedVia: "cash"`.

---

## 10. Chat

Masked chat between the driver and the sender, per order.

| Endpoint                              | Body                                      | Returns         |
| ------------------------------------- | ----------------------------------------- | --------------- |
| `GET /driver/jobs/:id/messages`       | —                                         | `ChatMessage[]` |
| `POST /driver/jobs/:id/messages`      | `{ "text": "5 mins away" }` (≤ 500 chars) | `ChatMessage`   |
| `POST /driver/jobs/:id/messages/read` | —                                         | `null`          |

```json
{
  "id": "msg_…",
  "orderId": "ord_…",
  "sender": "customer",
  "text": "Okay, no problem. I will be ready.",
  "createdAt": "…",
  "readAt": null
}
```

New customer messages arrive as `chat.message` over the socket. Sending is only allowed while the job is active.

---

## 11. Earnings, wallet & trips

### Wallet accounting (ledger)

| Event                           | Transaction `kind` | Amount                                |
| ------------------------------- | ------------------ | ------------------------------------- |
| Delivered, paid online / UPI QR | `trip_earning`     | `+driverEarning`                      |
| Delivered, paid in cash         | `cash_commission`  | `−commission` (driver keeps the cash) |
| Daily vehicle check             | `incentive`        | `+50`                                 |
| Welcome bonus unlocked          | `bonus`            | `+1000`                               |
| Withdrawal to bank              | `payout`           | `−amount`                             |

Balance = sum of the ledger (can go negative after cash trips).

### GET /driver/wallet → `DriverWallet`

```json
{
  "balance": 362,
  "minPayout": 100,
  "bankLabel": "ICICI Bank •• 5849",
  "transactions": [
    {
      "id": "txn_…",
      "kind": "trip_earning",
      "title": "Trip RYDAHKW",
      "amount": 312,
      "createdAt": "…",
      "orderNumber": "RYDAHKW"
    },
    {
      "id": "txn_…",
      "kind": "incentive",
      "title": "Daily vehicle check",
      "amount": 50,
      "createdAt": "…",
      "orderNumber": null
    }
  ]
}
```

### POST /driver/wallet/payouts → `DriverWallet`

`{ "amount": 362 }`. Errors: `BANK_NOT_VERIFIED`, `BELOW_MINIMUM`, `INSUFFICIENT_BALANCE`.

### GET /driver/earnings?period=today|week|month → `EarningsSummary`

```json
{
  "period": "week",
  "from": "…", "to": "…",
  "trips": 1,
  "totalEarnings": 362,
  "tripEarnings": 312,
  "incentives": 50,
  "cashCollected": 0,
  "onlineMinutes": 14,
  "buckets": [{ "label": "Sun", "amount": 0 }, …, { "label": "Sat", "amount": 362 }]
}
```

`buckets` are the last 7 days for `today`/`week`, one per week for `month`.

### GET /driver/trips → `TripSummary[]`

Delivered and cancelled jobs, newest first:

```json
[{ "id": "ord_…", "number": "RYDAHKW", "status": "delivered", "pickupLabel": "…", "dropLabel": "…", "vehicle": { … }, "tripDistanceKm": 8.7, "fare": 390, "driverEarning": 312, "paymentMode": "prepaid", "endedAt": "…" }]
```

### GET /driver/support → `SupportInfo`

`{ "phone": "+911800120120", "email": "partners@ryno.in", "faqs": [{ "id": "…", "question": "…", "answer": "…" }] }`

---

## 12. Uploads

### POST /uploads → `UploadedFile`

Real backend: `multipart/form-data` with `kind` and `file` (JPEG). `kind` ∈ `pickup_photo | drop_photo | daily_check | vehicle_rc | vehicle_front | kyc_dl | kyc_aadhaar | bank_cheque`.

```json
{ "id": "upl_…", "url": "https://cdn.ryno.app/u/…", "kind": "pickup_photo", "createdAt": "…" }
```

The JSON APIs take the returned `url`. In mock mode the photo is copied into the app's document directory and that `file://` URI is registered instead (`src/lib/api/uploads.ts`). Recommended production variant: pre-signed S3 URLs (see `../Architecture.md`).

---

## 13. Realtime channel

Connect `wss://api.ryno.app/v1/ws?token=<accessToken>`, then:

```json
{ "type": "subscribe", "channel": "driver:drv_123" }
```

Frames are `{ "channel": "driver:drv_123", "event": { … } }`. Events (`src/lib/realtime/driver-events.ts`):

| `event.type`       | Payload                                       | App reaction                                          |
| ------------------ | --------------------------------------------- | ----------------------------------------------------- |
| `offer.new`        | `{ offer: JobOffer }`                         | Adds to offers cache; home opens the request screen   |
| `offer.expired`    | `{ offerId }`                                 | Removes the offer                                     |
| `job.updated`      | `{ job: DriverJob }`                          | Replaces the job in cache (e.g. customer cancelled)   |
| `chat.message`     | `{ message: ChatMessage }`                    | Appends to the chat                                   |
| `payment.received` | `{ orderId, amount, via: "upi" \| "online" }` | Refetches the job; QR screen shows "Payment received" |
| `profile.updated`  | `{}`                                          | Refetches profile + wallet (verification done, bonus) |

The client reconnects with exponential backoff (1 s → 30 s) and resubscribes (`src/lib/realtime/driver-socket.ts`). REST polling remains the fallback.

---

## 14. Error codes

| Code                                                                                                                                              | HTTP    | Meaning                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------------------------- |
| `UNAUTHORIZED`                                                                                                                                    | 401     | Missing/expired token — app signs out    |
| `SETUP_INCOMPLETE`                                                                                                                                | 409     | Vehicle/KYC/bank not verified            |
| `ACTIVE_JOB`                                                                                                                                      | 409     | Action needs no job in progress          |
| `ONLINE`                                                                                                                                          | 409     | Go offline before changing the vehicle   |
| `OFFER_NOT_FOUND`                                                                                                                                 | 404     | Unknown offer                            |
| `OFFER_EXPIRED`                                                                                                                                   | 410     | Offer expired or taken by another driver |
| `JOB_NOT_FOUND`                                                                                                                                   | 404     | Not this driver's job                    |
| `INVALID_STATE`                                                                                                                                   | 409     | Step already done / out of order         |
| `ORDER_CANCELLED`                                                                                                                                 | 409     | Customer cancelled                       |
| `INVALID_OTP`                                                                                                                                     | 422     | Wrong or malformed OTP                   |
| `PHOTO_REQUIRED`                                                                                                                                  | 422     | Proof photo missing                      |
| `PAYMENT_PENDING`                                                                                                                                 | 409     | Cash not collected for this stop         |
| `NOTHING_TO_COLLECT`                                                                                                                              | 409     | Order already paid                       |
| `REASON_REQUIRED`                                                                                                                                 | 422     | Cancel without a reason                  |
| `INVALID_PLATE` / `INVALID_PAN` / `INVALID_DL` / `INVALID_IFSC` / `INVALID_ACCOUNT` / `INVALID_HOLDER` / `INVALID_MODEL` / `INVALID_VEHICLE_TYPE` | 422     | Onboarding validation                    |
| `ALREADY_DONE`                                                                                                                                    | 409     | Daily check already submitted today      |
| `BANK_NOT_VERIFIED` / `BELOW_MINIMUM` / `INSUFFICIENT_BALANCE`                                                                                    | 409/422 | Payout rules                             |

---

## 15. Mock mode

With `EXPO_PUBLIC_API_URL` unset, `src/lib/api/client.ts` uses the axios mock adapter (`src/mocks/adapter.ts`, 250–650 ms latency) and `src/lib/realtime/driver-socket.ts` uses `src/mocks/realtime.ts`. Data persists in MMKV under `mock_driver_db_v1:*`.

The mock plays the roles the real backend and the customer app would:

- **Back office**: submitted documents move `under_review → verified` after ~12 s.
- **Dispatch**: while online and idle, a new offer arrives 5–20 s after the last one, built from real Delhi NCR places near the driver's GPS and priced with the customer app's rate card (`src/mocks/seed.ts`, `src/mocks/pricing.ts`).
- **Customer**: the sender greets the driver after acceptance and replies to messages; rates the trip after delivery.
- **Payment gateway**: a UPI QR is "paid" 12–18 s after it is shown.

Only one mock-only endpoint exists — `GET /dev/jobs/:id/otps` — used for the "Demo mode · sender's code is …" hint on the verification screens, because no second app is connected to read the OTP from. It is disabled when a real API URL is set and is not part of the real API.
