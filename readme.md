# Team Board Backend

This is the backend service for the Team Board application, a collaborative task management platform. It is built using Node.js and Express, utilizes MongoDB for data persistence, and implements real-time communication using Socket.IO.

## 🌟 Features

* **User Authentication:** Secure user registration and login.
* **Board Management:** Create, retrieve, update, and delete collaborative task boards.
* **Task Management:** Full CRUD operations for tasks within specific lists/boards.
* **Real-time Updates:** Socket.IO for instant updates to tasks and notifications across connected users.
* **User Roles & Permissions:** Role-based access control (Admin, Member) for board actions.
* **Email Notifications:** Nodemailer integration for user invitations.
* **Scheduled Jobs:** Cron job utility for handling deadlines or periodic tasks.

## 🛠️ Technology Stack

* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB (via Mongoose ORM - *inferred*)
* **Real-time:** Socket.IO
* **Email:** Nodemailer (using Gmail/SMTP)
* **Scheduling:** Node-cron (*inferred from `deadlineCron`*)
* **Middleware:** `cors`, `body-parser`, custom authentication (`protect`) and authorization (`requireBoardRole`) middleware.

## 🚀 Getting Started

### Prerequisites

* Node.js (LTS version)
* MongoDB Instance (local or cloud-hosted)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd team-board-backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create a `.env` file** in the root directory and add your environment variables.

### Environment Variables

| Variable | Description |
| :--- | :--- |
| `PORT` | The port the server will run on (e.g., `3000`) |
| `MONGO_URI` | Connection string for your MongoDB database |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `SMTP_MAIL` | Email address for sending emails (e.g., your Gmail) |
| `SMTP_PASSWORD` | App-specific password for the email (OAuth is recommended) |
| `CLIENT_URL` | The URL of the frontend application |

### Running the Server

Start the server in development mode:

```bash
npm start
# or if using nodemon
npm run dev