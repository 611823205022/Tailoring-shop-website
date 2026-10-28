import sqlite3
import random
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'ecommerce.db')

FIRST_NAMES = [
    'Aarav', 'Vivaan', 'Aditya', 'Arjun', 'Sai', 'Rohan', 'Vihaan', 'Krishna',
    'Diya', 'Ananya', 'Ishita', 'Priya', 'Neha', 'Kavya', 'Aisha', 'Riya',
    'Rahul', 'Amit', 'Suresh', 'Vikram', 'Deepak', 'Manoj', 'Pooja', 'Sunita',
    'Rajesh', 'Sanjay', 'Meera', 'Pari', 'Tanvi', 'Shruti', 'Anjali', 'Komal',
    'Arun', 'Sachin', 'Deepa', 'Nitin', 'Varun', 'Tarun', 'Geeta', 'Sapna',
    'Gokul', 'Hari', 'Ganesh', 'Murugan', 'Lakshmi', 'Parvathi', 'Saranya', 'Divya',
    'Karthik', 'Prasad', 'Akhil', 'Naveen', 'Ravi', 'Srinivas', 'Chandrika', 'Usha'
]

LAST_NAMES = [
    'Sharma', 'Verma', 'Patel', 'Kumar', 'Singh', 'Reddy', 'Nair', 'Iyer',
    'Gupta', 'Joshi', 'Mishra', 'Tiwari', 'Rao', 'Menon', 'Das', 'Banerjee',
    'Mukherjee', 'Chatterjee', 'Ghosh', 'Sen', 'Kapoor', 'Malhotra', 'Chauhan',
    'Mehta', 'Shah', 'Thakur', 'Pandey', 'Srivastava', 'Chandra', 'Pillai'
]

LOCATIONS = [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune',
    'Ahmedabad', 'Jaipur', 'Lucknow', 'Bhopal', 'Indore', 'Nagpur', 'Surat',
    'Visakhapatnam', 'Coimbatore', 'Kochi', 'Thiruvananthapuram', 'Mysore', 'Chandigarh'
]

PRODUCTS = [
    ('Wireless Bluetooth Earbuds', 'Electronics', 'Audio', 1299, 650, 'boAt', 4.2),
    ('Smartphone Case - Silicone', 'Electronics', 'Accessories', 399, 80, 'Generic', 4.0),
    ('USB-C Fast Charging Cable', 'Electronics', 'Accessories', 299, 60, 'Ambrane', 4.1),
    ('Power Bank 10000mAh', 'Electronics', 'Power', 899, 420, 'Mi', 4.3),
    ('LED Desk Lamp', 'Electronics', 'Lighting', 1199, 500, 'Philips', 4.4),
    ('Portable Bluetooth Speaker', 'Electronics', 'Audio', 1999, 900, 'JBL', 4.5),
    ('Laptop Stand - Aluminum', 'Electronics', 'Accessories', 1499, 550, 'Zoook', 4.2),
    ('Webcam HD 1080p', 'Electronics', 'Accessories', 2499, 1100, 'Logitech', 4.6),
    ('Wireless Mouse', 'Electronics', 'Accessories', 799, 280, 'HP', 4.1),
    ('Mechanical Keyboard', 'Electronics', 'Accessories', 3499, 1500, 'Redgear', 4.4),

    ('Cotton Round Neck T-Shirt', 'Fashion', 'Men', 599, 180, 'Allen Solly', 4.0),
    ('Slim Fit Denim Jeans', 'Fashion', 'Men', 1499, 550, 'Levis', 4.3),
    ('Floral Print Kurti', 'Fashion', 'Women', 899, 280, 'FabIndia', 4.2),
    ('Ethnic Embroidered Suit Set', 'Fashion', 'Women', 2499, 900, 'Biba', 4.5),
    ('Running Sports Shoes', 'Fashion', 'Footwear', 2999, 1200, 'Nike', 4.6),
    ('Formal Leather Shoes', 'Fashion', 'Footwear', 3499, 1400, 'Clarks', 4.4),
    ('Casual Sneakers', 'Fashion', 'Footwear', 1999, 700, 'Puma', 4.3),
    ('Cotton Saree - Printed', 'Fashion', 'Women', 1799, 650, 'W', 4.1),
    ('Men\'s Polo T-Shirt', 'Fashion', 'Men', 799, 250, 'US Polo', 4.0),
    ('Women\'s Palazzo Pants', 'Fashion', 'Women', 699, 220, 'Zara', 4.2),

    ('Non-Stick Cookware Set', 'Home & Kitchen', 'Kitchen', 2499, 1000, 'Prestige', 4.3),
    ('Stainless Steel Water Bottle', 'Home & Kitchen', 'Kitchen', 449, 120, 'Milton', 4.1),
    ('Ceramic Coffee Mug Set (4)', 'Home & Kitchen', 'Kitchen', 699, 220, 'Borosil', 4.4),
    ('Cotton Bedsheet King Size', 'Home & Kitchen', 'Bedroom', 1299, 450, 'Bombay Dyeing', 4.5),
    ('Memory Foam Pillow (2-Pack)', 'Home & Kitchen', 'Bedroom', 1599, 550, 'Wakefit', 4.6),
    ('Robot Vacuum Cleaner', 'Home & Kitchen', 'Cleaning', 14999, 7500, 'iRobot', 4.7),
    ('Air Purifier with HEPA Filter', 'Home & Kitchen', 'Appliances', 8999, 4200, 'Dyson', 4.5),
    ('Table Fan - Rechargeable', 'Home & Kitchen', 'Applperiences', 1999, 750, 'Orient', 4.2),
    ('Mixer Grinder 750W', 'Home & Kitchen', 'Kitchen', 3499, 1500, 'Bajaj', 4.4),
    ('Electric Kettle 1.5L', 'Home & Kitchen', 'Kitchen', 799, 300, 'Prestige', 4.3),

    ('Vitamin C Face Serum', 'Beauty', 'Skincare', 599, 120, 'Mamaearth', 4.3),
    ('Natural Hair Oil - Coconut', 'Beauty', 'Haircare', 349, 80, 'Parachute', 4.1),
    ('Charcoal Face Mask (Pack of 5)', 'Beauty', 'Skincare', 449, 100, 'Everyuth', 4.0),
    ('Perfume for Men - 100ml', 'Beauty', 'Fragrance', 1299, 400, 'Park Avenue', 4.2),
    ('Makeup Kit - 12 Colors', 'Beauty', 'Makeup', 899, 250, 'Lakme', 4.4),
    ('Sunscreen SPF 50', 'Beauty', 'Skincare', 499, 110, 'Neutrogena', 4.5),
    ('Shampoo - Anti Dandruff', 'Beauty', 'Haircare', 299, 70, 'Head & Shoulders', 4.0),
    ('Body Lotion - Moisturizing', 'Beauty', 'Skincare', 399, 90, 'Nivea', 4.3),

    ('Yoga Mat - 6mm', 'Sports', 'Fitness', 799, 280, 'Boldfit', 4.2),
    ('Resistance Bands Set', 'Sports', 'Fitness', 499, 120, 'Kobo', 4.1),
    ('Cricket Bat - Kashmir Willow', 'Sports', 'Cricket', 1499, 600, 'SS', 4.4),
    ('Football Size 5', 'Sports', 'Football', 699, 250, 'Nivia', 4.3),
    ('Dumbbells Pair 5kg', 'Sports', 'Fitness', 999, 400, 'Cosco', 4.2),
    ('Skipping Rope - Speed', 'Sports', 'Fitness', 299, 70, 'Boldfit', 4.0),
    ('Badminton Racket Set', 'Sports', 'Badminton', 1299, 500, 'Yonex', 4.5),
    ('Protein Powder 1kg', 'Sports', 'Nutrition', 2499, 1200, 'Optimum Nutrition', 4.6),
]

COURIERS = ['BlueDart', 'Delhivery', 'DTDC', 'FedEx', 'India Post', 'Ecom Express', 'Shadowfax']
PAYMENT_METHODS = ['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'COD', 'Wallets']
RETURN_REASONS = [
    'Wrong size', 'Defective product', 'Not as described', 'Damaged in transit',
    'Changed mind', 'Late delivery', 'Poor quality', 'Color mismatch'
]
SEGMENTS = ['Regular', 'Premium', 'VIP', 'New']
AGE_GROUPS = ['18-24', '25-34', '35-44', '45-54', '55+']
STATUSES = ['Delivered', 'Delivered', 'Delivered', 'Delivered', 'Delivered',
            'Delivered', 'Delivered', 'Delivered', 'Returned', 'Cancelled']

random.seed(42)


def create_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def create_tables(conn):
    schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
    with open(schema_path, 'r') as f:
        conn.executescript(f.read())


def generate_customers(conn, n=500):
    customers = []
    for i in range(1, n + 1):
        fname = random.choice(FIRST_NAMES)
        lname = random.choice(LAST_NAMES)
        name = f"{fname} {lname}"
        email = f"{fname.lower()}.{lname.lower()}{i}@email.com"
        location = random.choice(LOCATIONS)
        segment = random.choices(SEGMENTS, weights=[50, 25, 10, 15])[0]
        reg_date = datetime(2023, 1, 1) + timedelta(days=random.randint(0, 730))
        gender = random.choice(['M', 'F'])
        age_group = random.choice(AGE_GROUPS)
        customers.append((i, name, email, location, segment, reg_date.strftime('%Y-%m-%d'), gender, age_group))

    conn.executemany(
        "INSERT OR IGNORE INTO customers VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        customers
    )
    conn.commit()
    print(f"  Generated {len(customers)} customers")


def generate_products(conn):
    for i, prod in enumerate(PRODUCTS, 1):
        conn.execute(
            "INSERT OR IGNORE INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (i, prod[0], prod[1], prod[2], prod[3], prod[4], prod[5], prod[6])
        )
    conn.commit()
    print(f"  Generated {len(PRODUCTS)} products")


def generate_orders(conn, n=12500):
    orders = []
    order_items = []
    deliveries = []
    returns_list = []

    order_id = 1
    start_date = datetime(2024, 1, 1)
    end_date = datetime(2025, 12, 31)

    for _ in range(n):
        customer_id = random.randint(1, 500)
        order_date = start_date + timedelta(days=random.randint(0, (end_date - start_date).days))

        status = random.choices(
            STATUSES,
            weights=[85, 0, 0, 0, 0, 0, 0, 0, 10, 5]
        )[0]

        payment = random.choice(PAYMENT_METHODS)
        shipping_cost = round(random.choice([0, 40, 60, 80, 99, 149]), 2)
        other_costs = round(random.choice([0, 0, 0, 10, 25, 50]), 2)

        orders.append((order_id, customer_id, order_date.strftime('%Y-%m-%d'),
                        status, payment, shipping_cost, other_costs))

        num_items = random.choices([1, 2, 3, 4, 5], weights=[45, 30, 15, 7, 3])[0]
        used_products = set()

        for _ in range(num_items):
            product_id = random.randint(1, len(PRODUCTS))
            while product_id in used_products:
                product_id = random.randint(1, len(PRODUCTS))
            used_products.add(product_id)

            quantity = random.choices([1, 2, 3, 4, 5], weights=[50, 25, 15, 7, 3])[0]
            discount = random.choices(
                [0, 5, 10, 15, 20, 25, 30, 40],
                weights=[25, 15, 20, 15, 12, 6, 4, 3]
            )[0] / 100.0

            order_items.append((order_id, product_id, quantity, discount))

        days_to_ship = random.randint(0, 2)
        shipping_date = order_date + timedelta(days=days_to_ship)

        if status == 'Cancelled':
            delivery_status = 'Cancelled'
            delivery_date = None
            shipping_date = None
        elif status == 'Returned':
            delivery_status = random.choice(['On-Time', 'Late'])
            delivery_date = shipping_date + timedelta(days=random.randint(2, 7))
        else:
            is_late = random.random() < 0.09
            delivery_status = 'Late' if is_late else 'On-Time'
            delivery_days = random.randint(3, 8) if is_late else random.randint(1, 4)
            delivery_date = shipping_date + timedelta(days=delivery_days)

        courier = random.choice(COURIERS)
        row = conn.execute(
            "SELECT location FROM customers WHERE customer_id = ?", (customer_id,)
        ).fetchone()
        customer_location = row[0] if row else random.choice(LOCATIONS)

        deliveries.append((
            order_id, shipping_date.strftime('%Y-%m-%d') if shipping_date else None,
            delivery_date.strftime('%Y-%m-%d') if delivery_date else None,
            delivery_status, courier, customer_location
        ))

        if status == 'Returned':
            prod_id = random.choice([item[1] for item in order_items if item[0] == order_id])
            prod = PRODUCTS[prod_id - 1]
            refund = round(prod[4] * random.choice([item[2] for item in order_items if item[0] == order_id and item[1] == prod_id]), 2)
            returns_list.append((
                len(returns_list) + 1, order_id, prod_id,
                random.choice(RETURN_REASONS),
                (delivery_date + timedelta(days=random.randint(1, 14))).strftime('%Y-%m-%d') if delivery_date else order_date.strftime('%Y-%m-%d'),
                refund
            ))

        order_id += 1

    conn.executemany(
        "INSERT OR IGNORE INTO orders VALUES (?, ?, ?, ?, ?, ?, ?)",
        orders
    )
    conn.executemany(
        "INSERT INTO order_items (order_id, product_id, quantity, discount) VALUES (?, ?, ?, ?)",
        order_items
    )
    conn.executemany(
        "INSERT OR IGNORE INTO delivery (order_id, shipping_date, delivery_date, delivery_status, courier, region) VALUES (?, ?, ?, ?, ?, ?)",
        deliveries
    )
    if returns_list:
        conn.executemany(
            "INSERT OR IGNORE INTO returns VALUES (?, ?, ?, ?, ?, ?)",
            returns_list
        )

    conn.commit()
    print(f"  Generated {len(orders)} orders, {len(order_items)} items, {len(deliveries)} deliveries, {len(returns_list)} returns")


def main():
    print("=" * 50)
    print("  E-Commerce Sample Data Generator")
    print("=" * 50)

    conn = create_connection()

    print("\n[1/4] Creating tables...")
    create_tables(conn)

    print("[2/4] Generating customers...")
    generate_customers(conn)

    print("[3/4] Generating products...")
    generate_products(conn)

    print("[4/4] Generating orders & related data...")
    generate_orders(conn)

    total_orders = conn.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
    total_items = conn.execute("SELECT COUNT(*) FROM order_items").fetchone()[0]
    total_customers = conn.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
    total_products = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    total_deliveries = conn.execute("SELECT COUNT(*) FROM delivery").fetchone()[0]
    total_returns = conn.execute("SELECT COUNT(*) FROM returns").fetchone()[0]

    print(f"\n{'=' * 50}")
    print(f"  Database: {DB_PATH}")
    print(f"  Customers: {total_customers}")
    print(f"  Products: {total_products}")
    print(f"  Orders: {total_orders}")
    print(f"  Order Items: {total_items}")
    print(f"  Deliveries: {total_deliveries}")
    print(f"  Returns: {total_returns}")
    print(f"{'=' * 50}")

    conn.close()


if __name__ == '__main__':
    main()
