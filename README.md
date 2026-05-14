# RestoAI
**AI-Driven Sales Prediction and Inventory Tracking Web Application**

## About The Project
Small and medium-sized enterprises (SMEs) in the hospitality industry frequently experience operational inefficiencies due to manual sales forecasting and disconnected inventory management. **RestoAI** was developed to bridge the gap between front-of-house sales transactions and back-of-house procurement. 

By integrating machine learning for time-series demand forecasting and a dynamic NoSQL database for automated recipe deduction, this platform transitions hospitality operations from reactive stock management to proactive, data-driven decision-making.

---

## mportant Notice: Running the Application Locally
> **To run this application, please refer to the Final Project Report.**
> 
> For security purposes and academic grading guidelines, all required environment variable configurations (including the `.env` and `.env.local` files), API keys (Google Gemini, MongoDB URI), and comprehensive step-by-step execution instructions are located exclusively in **Appendix of the Final Project Report**. 

---

## Key Features
* **Predictive Analytics:** Integrates the Facebook Prophet ML library to process historical sales data and accurately forecast future demand trends.
* **Automated Inventory Deduction:** Dynamically deduces raw physical ingredient quantities from a centralized database immediately upon the ingestion of daily sales data (Excel/CSV uploads).
* **Conversational AI Assistant:** Features a natural-language chatbot powered by the Google Gemini API, allowing non-technical staff to extract immediate, context-aware operational summaries.
* **Interactive Dashboards:** Real-time data visualization of stock levels, predicted sales charts, and automated restocking alerts.
* **Enterprise-Grade Security:** Implements rigorous Role-Based Access Control (RBAC) utilizing JSON Web Tokens (JWT) and `flask_bcrypt` password hashing.

---

## Technology Stack
This project utilizes a modern, decoupled client-server architecture:

**Frontend (Client-Side)**
* [Next.js](https://nextjs.org/) (React Framework)
* [Shadcn UI](https://ui.shadcn.com/) (Interactive charting libraries for data visualization)

**Backend (Server-Side)**
* [Python 3](https://www.python.org/) & [Flask](https://flask.palletsprojects.com/) (Micro-framework)
* [Pandas](https://pandas.pydata.org/) & [NumPy](https://numpy.org/) (Data sanitization and preprocessing)
* [Flask-SocketIO](https://flask-socketio.readthedocs.io/) (Real-time WebSocket updates)

**Machine Learning & Artificial Intelligence**
* [Facebook Prophet](https://facebook.github.io/prophet/) (Time-series forecasting)
* [Google Gemini API](https://ai.google.dev/) (LLM Conversational Agent)

**Database**
* [MongoDB Atlas](https://www.mongodb.com/atlas) (NoSQL Document Database)

---

## Academic Context
This software prototype was engineered by **Sudheera Dilum Jayawardana** as the final computing project for the BSc (Hons) Software Engineering degree program affiliated with Plymouth University at NSBM Green University.

* **Module:** PUSL3190 Computing Project
* **Supervisor:** Mr. Krishantha Ranaweera
