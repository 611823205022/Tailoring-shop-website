import sqlite3
import os
import pandas as pd
import numpy as np
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'ecommerce.db')


def load_data():
    conn = sqlite3.connect(DB_PATH)

    customers = pd.read_sql("SELECT * FROM customers", conn)
    products = pd.read_sql("SELECT * FROM products", conn)
    orders = pd.read_sql("SELECT * FROM orders", conn)
    order_items = pd.read_sql("SELECT * FROM order_items", conn)
    delivery = pd.read_sql("SELECT * FROM delivery", conn)
    returns = pd.read_sql("SELECT * FROM returns", conn)

    conn.close()
    return customers, products, orders, order_items, delivery, returns


def clean_data(customers, products, orders, order_items, delivery, returns):
    orders['order_date'] = pd.to_datetime(orders['order_date'])
    delivery['shipping_date'] = pd.to_datetime(delivery['shipping_date'])
    delivery['delivery_date'] = pd.to_datetime(delivery['delivery_date'])
    returns['return_date'] = pd.to_datetime(returns['return_date'])

    orders = orders.dropna(subset=['customer_id', 'order_date'])
    order_items = order_items.dropna(subset=['order_id', 'product_id', 'quantity'])

    order_items['quantity'] = order_items['quantity'].astype(int)
    order_items['discount'] = order_items['discount'].fillna(0)

    products['price'] = products['price'].fillna(products['price'].median())
    products['cost'] = products['cost'].fillna(products['cost'].median())

    orders = orders[(orders['status'] == 'Delivered') | (orders['status'] == 'Returned') | (orders['status'] == 'Cancelled')]

    return customers, products, orders, order_items, delivery, returns


def build_master_df(customers, products, orders, order_items, delivery, returns):
    merged = order_items.merge(orders, on='order_id', how='left')
    merged = merged.merge(products, on='product_id', how='left')
    merged = merged.merge(customers, on='customer_id', how='left')
    merged = merged.merge(delivery, on='order_id', how='left')

    merged['gross_revenue'] = merged['price'] * merged['quantity']
    merged['discount_amount'] = merged['gross_revenue'] * merged['discount']
    merged['net_revenue'] = merged['gross_revenue'] - merged['discount_amount']
    merged['total_cost'] = merged['cost'] * merged['quantity']
    merged['profit'] = merged['net_revenue'] - merged['total_cost'] - merged['shipping_cost'] - merged['other_costs']
    merged['profit_margin'] = (merged['profit'] / merged['net_revenue'] * 100).round(2)

    merged['delivery_days'] = (merged['delivery_date'] - merged['shipping_date']).dt.days

    return merged
