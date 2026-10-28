"""
Export SQL database tables to CSV for Power BI import.

Run: python database/export_csv.py
Outputs to: data/csv/
"""

import sqlite3
import pandas as pd
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'ecommerce.db')
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'csv')

TABLES = ['customers', 'products', 'orders', 'order_items', 'delivery', 'returns']


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)

    for table in TABLES:
        df = pd.read_sql(f"SELECT * FROM {table}", conn)
        out_path = os.path.join(OUT_DIR, f"{table}.csv")
        df.to_csv(out_path, index=False)
        print(f"  Exported {table}: {len(df):,} rows -> {out_path}")

    conn.close()
    print(f"\n  All tables exported to: {OUT_DIR}")


if __name__ == '__main__':
    main()