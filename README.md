# SmartSCM 📦🚚

A modern, fully functional Supply Chain Management (SCM) system designed to streamline inventory tracking, manage suppliers, and monitor logistics efficiently. Built using a robust full-stack architecture.

---

## 🚀 Features

* **Role-Based Access Control (RBAC):** Distinct dashboards and permissions for Admins, Warehouse Managers, and Suppliers.
* **Inventory Management:** Real-time CRUD operations for tracking products, stock levels, and warehouse locations.
* **Supplier Management:** Maintain a directory of vendors, track purchase orders, and manage deliveries.
* **Order Tracking & Logistics:** Monitor shipment statuses from dispatch to delivery (e.g., Pending, Shipped, In-Transit, Delivered).
* **Interactive Dashboard:** Visual analytics for stock levels, pending orders, and overall supply chain health.
* **Secure Authentication:** JWT-based secure login and registration.

---

## 🛠️ Tech Stack

| Technology | Usage |
| :--- | :--- |
| **React.js / Vite** | Frontend User Interface |
| **Node.js & Express.js**| Backend API & Server |
| **MongoDB & Mongoose** | Database & Object Data Modeling |
| **Tailwind CSS** | Styling and Responsive Design |
| **JSON Web Token (JWT)**| Secure User Authentication |

---

## ⚙️ Prerequisites

Before you begin, ensure you have the following installed:
* **Node.js** (v16 or higher)
* **MongoDB** (Local instance or a MongoDB Atlas URI)
* **Git**

---

## 💻 Local Setup & Installation

**1. Clone the repository**
```bash
git clone [https://github.com/Kundankrp03/SmaerSCM.git](https://github.com/Kundankrp03/SmaerSCM.git)
cd SmaerSCM
```

**2. Setup the Backend**
```bash
cd backend
npm install
```
* Create a `.env` file in the `backend` directory and configure your environment variables:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_key
```
* Start the backend development server:
```bash
npm run dev
```

**3. Setup the Frontend**
```bash
cd ../frontend
npm install
```
* Start the frontend development server:
```bash
npm run dev
```

---

## 📡 API Endpoints Reference (Example)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Authenticate user and return JWT |
| `GET` | `/api/inventory` | Fetch all inventory items (Protected) |
| `POST` | `/api/inventory` | Add a new item to inventory (Protected) |
| `GET` | `/api/orders` | Fetch supply chain orders |
| `PUT` | `/api/orders/:id` | Update order shipment status |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! 
Feel free to check the [issues page](https://github.com/Kundankrp03/SmaerSCM/issues).

---

## 📄 License

This project is open-source and available under the MIT License.
