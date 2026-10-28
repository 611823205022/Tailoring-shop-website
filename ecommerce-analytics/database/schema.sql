-- E-Commerce Analytics Database Schema
-- SQLite (for local dev). For PostgreSQL:
--   - replace AUTOINCREMENT with GENERATED ALWAYS AS IDENTITY
--   - replace TEXT types for dates with DATE where appropriate

CREATE TABLE IF NOT EXISTS customers (
    customer_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    location TEXT,
    segment TEXT DEFAULT 'Regular',
    registration_date DATE,
    gender TEXT,
    age_group TEXT
);

CREATE TABLE IF NOT EXISTS products (
    product_id INTEGER PRIMARY KEY,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    price REAL NOT NULL,
    cost REAL NOT NULL,
    brand TEXT,
    rating REAL DEFAULT 4.0
);

CREATE TABLE IF NOT EXISTS orders (
    order_id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    order_date DATE NOT NULL,
    status TEXT DEFAULT 'Delivered',
    payment_method TEXT DEFAULT 'UPI',
    shipping_cost REAL DEFAULT 0,
    other_costs REAL DEFAULT 0,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE TABLE IF NOT EXISTS order_items (
    item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    discount REAL DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

CREATE TABLE IF NOT EXISTS delivery (
    delivery_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL UNIQUE,
    shipping_date DATE,
    delivery_date DATE,
    delivery_status TEXT DEFAULT 'On-Time',
    courier TEXT,
    region TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

CREATE TABLE IF NOT EXISTS returns (
    return_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    reason TEXT,
    return_date DATE,
    refund_amount REAL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_delivery_order ON delivery(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_order ON returns(order_id);
