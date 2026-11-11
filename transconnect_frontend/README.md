# TRANS-CONNECT 🚍
### An Integrated Transport Information and Booking System in Kenya

Trans-Connect is a web-based integrated transport information and booking system designed to simplify access to public transport information across Kenya. The platform brings together information from different transport operators, allowing passengers to explore available routes, compare journey details, view fares and schedules, reserve seats, and initiate payments through M-Pesa.

The system aims to improve accessibility, convenience, and efficiency in the process of planning and booking intercity journeys.

---

## 📌 Project Overview

Finding reliable transport information in Kenya can be challenging because different transport companies maintain separate platforms for their routes, schedules, fares, and booking services.

Trans-Connect addresses this challenge by providing a centralized platform where passengers can access integrated transport information from multiple operators.

Passengers can search for journeys, select available schedules, reserve seats, and initiate M-Pesa payments through the platform.

## ✨ Key Features

### 👤 Passenger Features
- User registration and authentication.
- Search for journeys by origin and destination.
- View available transport operators.
- Browse routes and journey schedules.
- View transport fares.
- View available and occupied seats.
- Select and reserve seats.
- Initiate M-Pesa payments.
- Monitor payment status.
- Access booking information and verified tickets.

### 🚌 Transport Information
- Integrated transport operator information.
- Operator profiles and logos.
- Route information.
- Departure and arrival schedules.
- Fare information.
- Centralized journey search.

### 🔐 Administrator Features
- Secure administrator authentication.
- Dashboard overview and statistics.
- Manage transport operators.
- Add and modify routes.
- Manage journey schedules.
- Manage transport fares.
- View and manage passenger bookings.
- Monitor M-Pesa transactions.
- Monitor Safaricom payment verification.
- Update booking statuses.

### 💳 M-Pesa Integration
Trans-Connect integrates Safaricom's Daraja API to support M-Pesa STK Push payments.

The payment process includes:
1. Passenger selects a booking.
2. Passenger initiates an M-Pesa payment.
3. The system sends an STK Push request.
4. Safaricom processes the payment.
5. The system receives the payment callback.
6. Payment verification is performed through Safaricom.
7. Successful verified payments allow booking confirmation and ticket retrieval.

**Security note:** A payment is only considered successful after verification. An accepted STK Push request alone does not confirm payment.

---

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| React.js | Frontend development |
| JavaScript | Frontend functionality |
| CSS | User interface styling |
| Python | Backend development |
| Django | Backend framework |
| Django REST Framework | REST API development |
| PostgreSQL | Database management |
| JWT | Authentication |
| Safaricom Daraja API | M-Pesa integration |
| Git & GitHub | Version control |

---

## 🏗️ System Architecture

Trans-Connect follows a client-server architecture.

```text
          PASSENGER / ADMIN
                  |
                  v
           REACT FRONTEND
                  |
                  v
          DJANGO REST API
                  |
          +-------+-------+
          |               |
          v               v
      POSTGRESQL      SAFARICOM
       DATABASE       DARAJA API
          |               |
          v               v
   Transport Data     M-Pesa Payments
   Bookings
   Schedules
   Fares
   Operators
```

### Backend Modules
- Accounts
- Operators
- Routes
- Schedules
- Fares
- Search Engine
- Bookings
- Payments

---

## 📂 Project Structure

```text
Trans-Connect/
│
├── accounts/
├── bookings/
├── fares/
├── operators/
├── payments/
├── routes/
├── schedules/
├── search_engine/
│
├── transconnect_backend/
│   ├── settings.py
│   ├── urls.py
│   └── ...
│
├── transconnect_frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── ...
│
├── manage.py
├── requirements.txt
├── .env
└── README.md
```

---

## ⚙️ Installation and Setup

### Prerequisites

Ensure the following are installed:

- Python
- Node.js and npm
- PostgreSQL
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR-USERNAME/Trans-Connect.git
```

Navigate into the project:

```bash
cd Trans-Connect
```

### 2. Backend Setup

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env` file in the project root.

Configure the required database and application settings:

```env
SECRET_KEY=your-django-secret-key
DEBUG=True

DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_HOST=localhost
DB_PORT=5432
```

Add the Safaricom Daraja credentials and callback configuration required by your M-Pesa integration.

**Never commit your actual `.env` file or API credentials to GitHub.**

### 4. Database Setup

Create a PostgreSQL database and configure its credentials in `.env`.

Run migrations:

```bash
python manage.py makemigrations
python manage.py migrate
```

Create an administrator account:

```bash
python manage.py createsuperuser
```

### 5. Start the Backend

```bash
python manage.py runserver
```

The Django development server will be available at:

```text
http://127.0.0.1:8000/
```

### 6. Frontend Setup

Open another terminal:

```bash
cd transconnect_frontend
```

Install dependencies:

```bash
npm install
```

Start the React application:

```bash
npm start
```

The frontend will normally be available at:

```text
http://localhost:3000/
```

---

## 🔑 API Modules

| Endpoint | Description |
|---|---|
| `/api/auth/` | Authentication |
| `/api/operators/` | Transport operators |
| `/api/routes/` | Transport routes |
| `/api/schedules/` | Journey schedules |
| `/api/fares/` | Transport fares |
| `/api/search/` | Journey search |
| `/api/bookings/` | Passenger bookings |
| `/api/payments/` | M-Pesa payments |

---

## 🔒 Security Considerations

- JWT-based authentication.
- Role-based administrator permissions.
- Protected booking and payment endpoints.
- Passenger-specific booking access.
- Safaricom payment verification.
- Environment variables for sensitive credentials.
- Server-side validation of seat reservations and payment information.

---

## 🚀 Future Improvements

Potential future enhancements include:

- Integration with additional Kenyan transport operators.
- Improved real-time schedule updates.
- Automated operator information synchronization.
- Enhanced booking notifications.
- Improved reporting and analytics.
- Additional payment and booking integrations.

---

## 🎓 Project Information

**Project Name:** Trans-Connect

**Project Title:** TRANS-CONNECT: AN INTEGRATED TRANSPORT INFORMATION AND BOOKING SYSTEM IN KENYA

**Project Type:** Academic Software Development Project

**Field:** Information Technology / Computer Science

---

## 👨‍💻 Developer

Developed as a Computer Science project focused on improving access to integrated transport information and digital booking services in Kenya.

---

## 📄 License

This project is currently developed for academic and demonstration purposes. Licensing and production deployment arrangements can be defined separately.