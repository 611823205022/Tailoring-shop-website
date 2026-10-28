# E-Commerce Analytics with AI Assistant
### Full-Stack Analytics Application | Data + AI Portfolio Project

![Status](https://img.shields.io/badge/status-complete-brightgreen)

## What This Project Does

This is a complete e-commerce analytics application that turns raw sales data into business insights. It combines **dashboards** with an **AI analytics assistant** that answers plain-English business questions.

```
E-Commerce Data -> SQL Database -> Data Cleaning -> Analytics Engine -> Dashboards + AI Assistant
```

## Features

| Module | What You Get |
|--------|--------------|
| 📊 **Executive Dashboard** | Revenue, profit, orders, AOV, sales trends, top products/categories |
| 🛍️ **Product Analytics** | Units sold, margins, return rates, best-sellers, high-sales-low-profit detection |
| 👥 **Customer Analytics** | RFM segmentation: VIP / Loyal / Potential / At Risk / Lost + lifetime value |
| 💰 **Profit Analytics** | Revenue minus cost/discount/shipping breakdown, high-rev-high-profit vs high-rev-low-profit |
| 🚚 **Delivery Analytics** | On-time %, average delivery days, courier performance, region analysis |
| 🏷️ **Discount Analysis** | Impact of 0-40% discount tiers on orders, revenue, and profit |
| 🤖 **AI Analyst** | Ask questions in plain English - "Which product made the highest profit?" |

## Technologies

```
Backend:  Python, Flask, SQLite, Pandas, NumPy, Scikit-learn
Frontend: HTML5, CSS3, JavaScript, Chart.js
Database: SQLite (schema designed for easy PostgreSQL/MySQL migration)
Visual:   Power BI (DAX measures included)
```

## Project Structure

```
ecommerce-analytics/
├── database/
│   ├── schema.sql              # 6-table relational schema
│   ├── seed_data.py            # Generates 12,500+ realistic orders
│   └── export_csv.py           # Exports tables to CSV for Power BI
├── backend/
│   ├── app.py                  # Flask server + REST API
│   ├── utils/
│   │   ├── db.py               # SQL database helper
│   │   ├── data_cleaning.py    # Data cleaning + master table builder
│   │   ├── rfm_analysis.py     # RFM customer segmentation
│   │   └── ai_engine.py        # AI assistant (question -> SQL -> insight)
├── frontend/
│   ├── index.html              # Single-page dashboard
│   ├── css/style.css
│   └── js/                     # Page modules + chat interface
├── python_analysis/
│   └── analysis.py             # Standalone EDA script (generates charts)
├── powerbi/
│   └── DAX_Measures.txt        # Complete DAX measure library
├── data/                       # Auto-created: SQLite DB + CSV exports
└── requirements.txt
```

## Quick Start

### 1. Install Dependencies
```bash
cd ecommerce-analytics
pip install -r requirements.txt
```

### 2. Generate Sample Data
```bash
python database/seed_data.py
```
This creates a SQLite database with:
- 500 customers
- 47 products across 5 categories
- ~12,500 orders with items, discounts, deliveries, and returns

### 3. Run the Dashboard
```bash
python backend/app.py
```
Open **http://localhost:5000** in your browser.

### 4. Run the Standalone EDA Script
```bash
python python_analysis/analysis.py
```
Generates 5 analytical charts in `python_analysis/output/`.

### 5. Export for Power BI
```bash
python database/export_csv.py
```
Creates CSV files in `data/csv/` for import into Power BI Desktop.

## Using the AI Analyst

The AI assistant does **not** dump your database into an LLM. Instead it:

1. **Understands** your question (intent detection)
2. **Generates** an appropriate SQL query
3. **Executes** it against the database
4. **Validates** the result
5. **Explains** it in plain business language
6. **Recommends** next actions

Example questions to try:
- "What was our total revenue this month?"
- "Which product generated the highest profit?"
- "Why did sales decrease last month?"
- "Which category has the highest return rate?"
- "Who are our most valuable customers?"
- "Which products have high sales but low profit?"
- "Give me 5 recommendations to improve revenue"

## Customizing for Your Real Data

1. Replace the sample data in `database/seed_data.py` with your own data loader
2. Point `backend/utils/db.py` `DB_PATH` to your database
3. Adjust `schema.sql` if your data model differs
4. Add more question patterns in `backend/utils/ai_engine.py` `KEYWORDS`

## Power BI Setup

1. Export data: `python database/export_csv.py`
2. In Power BI Desktop: **Get Data -> Text/CSV** -> select the 6 CSVs
3. Build relationships:
   - `customers[customer_id]` → `orders[customer_id]`
   - `products[product_id]` → `order_items[product_id]`
   - `orders[order_id]` → `order_items[order_id]`
   - `orders[order_id]` ⇄ `delivery[order_id]`, `returns[order_id]`
4. Add the DAX measures from `powerbi/DAX_Measures.txt`
5. Build the 5 pages described in the DAX file

## Portfolio Talking Points

- **End-to-end pipeline**: raw data → cleaned → analyzed → visualized → actionable insight
- **AI + Analytics integration**: NLU-style intent detection, dynamic SQL generation, business recommendations
- **Database design**: normalized 6-table relational schema with indexes, foreign keys
- **Data science**: RFM segmentation using Recency/Frequency/Monetary scoring (Pandas + qcuts)
- **Business sensibility**: not just revenue — profit, margin, return rate, and discount efficiency

## License

Free to use and adapt for your portfolio.