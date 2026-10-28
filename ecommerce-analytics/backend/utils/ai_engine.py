import sqlite3
import os
import re
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'ecommerce.db')


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


KEYWORDS = {
    'revenue': ['revenue', 'sales', 'income', 'earning', 'total sales', 'total revenue', 'how much did we sell', 'how much revenue'],
    'profit': ['profit', 'profitability', 'margin', 'how much profit', 'net profit', 'earnings after cost'],
    'orders': ['orders', 'total orders', 'number of orders', 'how many orders', 'order count', 'count of orders'],
    'customers': ['customers', 'total customers', 'how many customers', 'customer count', 'buyer', 'buyers'],
    'products': ['product', 'products', 'item', 'items', 'which product', 'best product', 'top product'],
    'category': ['category', 'categories', 'which category', 'top category', 'best category'],
    'return': ['return', 'returns', 'return rate', 'returned', 'refund'],
    'delivery': ['delivery', 'shipping', 'delivered', 'on-time', 'late delivery', 'delivery time', 'courier'],
    'discount': ['discount', 'discounts', 'offers', 'coupon', 'price reduction'],
    'customer_segment': ['vip', 'loyal', 'at risk', 'lost', 'potential', 'segment', 'customer segment', 'customer type'],
    'aov': ['aov', 'average order value', 'average order', 'order value'],
    'top': ['top', 'best', 'highest', 'most', 'maximum', 'leading'],
    'worst': ['worst', 'lowest', 'least', 'minimum', 'poor'],
    'trend': ['trend', 'trend over', 'over time', 'monthly', 'yearly', 'growth', 'decline', 'increase', 'decrease', 'change'],
    'recommendation': ['recommend', 'suggest', 'advice', 'improve', 'how to increase', 'how to boost', 'what should'],
    'why': ['why', 'reason', 'cause', 'explain', 'what happened'],
    'compare': ['compare', 'vs', 'versus', 'difference', 'better', 'worse'],
    'region': ['region', 'location', 'city', 'state', 'area', 'zone', 'which city'],
    'payment': ['payment', 'upi', 'cod', 'credit card', 'debit card', 'payment method'],
    'highest_profit': ['highest profit', 'most profitable', 'which product made the most profit', 'top profit'],
    'highest_sales': ['highest sales', 'most sales', 'top selling', 'best selling', 'most sold'],
}


def detect_intent(question):
    q = question.lower().strip()
    detected = []
    for intent, keywords in KEYWORDS.items():
        for kw in keywords:
            if kw in q:
                detected.append(intent)
                break
    return detected


def extract_time_period(question):
    q = question.lower()

    try:
        conn = sqlite3.connect(DB_PATH)
        latest = conn.execute(
            "SELECT MAX(order_date) FROM orders WHERE status != 'Cancelled'"
        ).fetchone()[0]
        conn.close()
        now = datetime.strptime(latest, '%Y-%m-%d') if latest else datetime.now()
    except Exception:
        now = datetime.now()

    if 'this month' in q or 'current month' in q:
        return f"strftime('%Y-%m', order_date) = '{now.strftime('%Y-%m')}'"
    elif 'last month' in q:
        last_month = now.month - 1 if now.month > 1 else 12
        last_year = now.year if now.month > 1 else now.year - 1
        return f"strftime('%Y-%m', order_date) = '{last_year}-{last_month:02d}'"
    elif 'this year' in q or 'current year' in q:
        return f"strftime('%Y', order_date) = '{now.year}'"
    elif 'last year' in q:
        return f"strftime('%Y', order_date) = '{now.year - 1}'"
    elif 'last 3 months' in q or 'last three months' in q:
        three_months_ago = now.month - 3
        y = now.year if three_months_ago > 0 else now.year - 1
        m = three_months_ago if three_months_ago > 0 else 12 + three_months_ago
        return f"order_date >= '{y}-{m:02d}-01'"
    elif 'last 6 months' in q or 'last six months' in q:
        six_months_ago = now.month - 6
        y = now.year if six_months_ago > 0 else now.year - 1
        m = six_months_ago if six_months_ago > 0 else 12 + six_months_ago
        return f"order_date >= '{y}-{m:02d}-01'"
    elif 'last 12 months' in q or 'last year' in q or 'past year' in q:
        return f"order_date >= '{now.year - 1}-{now.month:02d}-01'"

    return "1=1"


def generate_sql(question):
    intents = detect_intent(question)
    time_filter = extract_time_period(question)
    q = question.lower()

    if 'recommendation' in intents or 'suggest' in intents:
        return generate_recommendation_sql(question, time_filter)

    if 'low profit' in q and ('high sales' in q or 'low margin' in q or 'high revenue' in q):
        return {
            "sql": f"""
                SELECT p.product_name, p.category,
                       SUM(oi.quantity) as units_sold,
                       SUM(oi.quantity * p.price * (1 - oi.discount)) as revenue,
                       SUM(oi.quantity * p.price * (1 - oi.discount) - oi.quantity * p.cost) as profit,
                       ROUND(SUM(oi.quantity * p.price * (1 - oi.discount) - oi.quantity * p.cost) / SUM(oi.quantity * p.price * (1 - oi.discount)) * 100, 2) as margin
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                JOIN products p ON oi.product_id = p.product_id
                WHERE o.status = 'Delivered' AND {time_filter}
                GROUP BY p.product_id
                HAVING revenue > (SELECT AVG(product_revenue) FROM (
                    SELECT SUM(oi.quantity * p.price * (1 - oi.discount)) as product_revenue
                    FROM order_items oi
                    JOIN orders o ON oi.order_id = o.order_id
                    JOIN products p ON oi.product_id = p.product_id
                    WHERE o.status = 'Delivered' AND {time_filter}
                    GROUP BY p.product_id
                ))
                ORDER BY margin ASC
                LIMIT 8
            """,
            "type": "high_sales_low_profit"
        }

    if ('highest_profit' in intents or ('profit' in intents and 'top' in intents)) and 'category' not in intents:
        return {
            "sql": f"""
                SELECT p.product_name, p.category,
                       SUM(oi.quantity * p.price * (1 - oi.discount)) as revenue,
                       SUM(oi.quantity * p.price * (1 - oi.discount) - oi.quantity * p.cost) as profit,
                       ROUND(SUM(oi.quantity * p.price * (1 - oi.discount) - oi.quantity * p.cost) / SUM(oi.quantity * p.price * (1 - oi.discount)) * 100, 2) as margin
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                JOIN products p ON oi.product_id = p.product_id
                WHERE o.status = 'Delivered' AND {time_filter}
                GROUP BY p.product_id
                ORDER BY profit DESC
                LIMIT 5
            """,
            "type": "product_profit_ranking"
        }

    if ('highest_sales' in intents or 'highest_revenue' in intents) and 'category' not in intents:
        return {
            "sql": f"""
                SELECT p.product_name, p.category,
                       SUM(oi.quantity) as units_sold,
                       SUM(oi.quantity * p.price * (1 - oi.discount)) as revenue
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                JOIN products p ON oi.product_id = p.product_id
                WHERE o.status = 'Delivered' AND {time_filter}
                GROUP BY p.product_id
                ORDER BY revenue DESC
                LIMIT 5
            """,
            "type": "product_sales_ranking"
        }

    if 'category' in intents and 'profit' in intents:
        return {
            "sql": f"""
                SELECT p.category,
                       SUM(oi.quantity * p.price * (1 - oi.discount)) as revenue,
                       SUM(oi.quantity * p.price * (1 - oi.discount) - oi.quantity * p.cost) as profit,
                       ROUND(SUM(oi.quantity * p.price * (1 - oi.discount) - oi.quantity * p.cost) / SUM(oi.quantity * p.price * (1 - oi.discount)) * 100, 2) as margin,
                       COUNT(DISTINCT o.order_id) as orders
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                JOIN products p ON oi.product_id = p.product_id
                WHERE o.status = 'Delivered' AND {time_filter}
                GROUP BY p.category
                ORDER BY profit DESC
            """,
            "type": "category_profit"
        }

    if 'category' in intents and ('return' in intents or 'return rate' in intents):
        return {
            "sql": f"""
                SELECT p.category,
                       COUNT(DISTINCT r.order_id) as returns,
                       COUNT(DISTINCT o.order_id) as total_orders,
                       ROUND(CAST(COUNT(DISTINCT r.order_id) AS FLOAT) / COUNT(DISTINCT o.order_id) * 100, 2) as return_rate
                FROM orders o
                JOIN order_items oi ON o.order_id = oi.order_id
                JOIN products p ON oi.product_id = p.product_id
                LEFT JOIN returns r ON o.order_id = r.order_id
                WHERE {time_filter}
                GROUP BY p.category
                ORDER BY return_rate DESC
            """,
            "type": "category_returns"
        }

    if 'revenue' in intents and 'category' in intents:
        return {
            "sql": f"""
                SELECT p.category,
                       SUM(oi.quantity * p.price * (1 - oi.discount)) as revenue,
                       COUNT(DISTINCT o.order_id) as orders
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                JOIN products p ON oi.product_id = p.product_id
                WHERE o.status = 'Delivered' AND {time_filter}
                GROUP BY p.category
                ORDER BY revenue DESC
            """,
            "type": "category_revenue"
        }

    if 'return' in intents:
        return {
            "sql": f"""
                SELECT p.product_name, p.category,
                       COUNT(DISTINCT r.order_id) as returns,
                       SUM(oi.quantity) as total_sold,
                       ROUND(CAST(COUNT(DISTINCT r.order_id) AS FLOAT) / SUM(oi.quantity) * 100, 2) as return_rate
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                JOIN products p ON oi.product_id = p.product_id
                LEFT JOIN returns r ON o.order_id = r.order_id AND oi.product_id = r.product_id
                WHERE {time_filter}
                GROUP BY p.product_id
                HAVING returns > 0
                ORDER BY return_rate DESC
                LIMIT 5
            """,
            "type": "product_returns"
        }

    if 'delivery' in intents:
        return {
            "sql": f"""
                SELECT delivery_status,
                       COUNT(*) as count,
                       ROUND(CAST(COUNT(*) AS FLOAT) / (SELECT COUNT(*) FROM delivery WHERE delivery_status != 'Cancelled') * 100, 2) as percentage,
                       ROUND(AVG(julianday(delivery_date) - julianday(shipping_date)), 1) as avg_days
                FROM delivery
                WHERE delivery_status != 'Cancelled'
                GROUP BY delivery_status
            """,
            "type": "delivery_summary"
        }

    if 'discount' in intents:
        return {
            "sql": f"""
                SELECT CAST(oi.discount * 100 AS INTEGER) as discount_pct,
                       COUNT(DISTINCT o.order_id) as orders,
                       SUM(oi.quantity * p.price * (1 - oi.discount)) as revenue,
                       SUM(oi.quantity * p.price * (1 - oi.discount) - oi.quantity * p.cost) as profit,
                       ROUND(SUM(oi.quantity * p.price * (1 - oi.discount) - oi.quantity * p.cost) / SUM(oi.quantity * p.price * (1 - oi.discount)) * 100, 2) as margin
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                JOIN products p ON oi.product_id = p.product_id
                WHERE o.status = 'Delivered' AND {time_filter}
                GROUP BY CAST(oi.discount * 100 AS INTEGER)
                ORDER BY discount_pct
            """,
            "type": "discount_analysis"
        }

    if 'customer_segment' in intents or 'vip' in intents or 'loyal' in intents:
        return {
            "sql": f"""
                SELECT c.segment,
                       COUNT(DISTINCT c.customer_id) as customers,
                       SUM(o2.total_spent) as total_revenue,
                       ROUND(o2.total_spent / COUNT(DISTINCT c.customer_id), 2) as avg_spent
                FROM customers c
                JOIN (
                    SELECT customer_id, SUM(oi.quantity * p.price * (1 - oi.discount)) as total_spent
                    FROM order_items oi
                    JOIN orders o ON oi.order_id = o.order_id
                    JOIN products p ON oi.product_id = p.product_id
                    WHERE o.status = 'Delivered' AND {time_filter}
                    GROUP BY customer_id
                ) o2 ON c.customer_id = o2.customer_id
                GROUP BY c.segment
                ORDER BY total_revenue DESC
            """,
            "type": "customer_segments"
        }

    if 'region' in intents or 'city' in intents:
        return {
            "sql": f"""
                SELECT c.location,
                       COUNT(DISTINCT o.order_id) as orders,
                       SUM(oi.quantity * p.price * (1 - oi.discount)) as revenue
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                JOIN customers c ON o.customer_id = c.customer_id
                JOIN products p ON oi.product_id = p.product_id
                WHERE o.status = 'Delivered' AND {time_filter}
                GROUP BY c.location
                ORDER BY revenue DESC
                LIMIT 10
            """,
            "type": "region_analysis"
        }

    if 'payment' in intents:
        return {
            "sql": f"""
                SELECT o.payment_method,
                       COUNT(*) as orders,
                       SUM(oi.quantity * p.price * (1 - oi.discount)) as revenue
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                JOIN products p ON oi.product_id = p.product_id
                WHERE o.status = 'Delivered' AND {time_filter}
                GROUP BY o.payment_method
                ORDER BY orders DESC
            """,
            "type": "payment_analysis"
        }

    if 'revenue' in intents and 'trend' not in intents:
        return {
            "sql": f"""
                SELECT
                    SUM(oi.quantity * p.price * (1 - oi.discount)) as total_revenue,
                    SUM(oi.quantity * p.cost) as total_cost,
                    SUM(oi.quantity * p.price * (1 - oi.discount) - oi.quantity * p.cost) as total_profit,
                    COUNT(DISTINCT o.order_id) as total_orders,
                    COUNT(DISTINCT o.customer_id) as total_customers,
                    ROUND(SUM(oi.quantity * p.price * (1 - oi.discount)) / COUNT(DISTINCT o.order_id), 2) as aov,
                    ROUND(SUM(oi.quantity * p.price * (1 - oi.discount) - oi.quantity * p.cost) / SUM(oi.quantity * p.price * (1 - oi.discount)) * 100, 2) as margin
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                JOIN products p ON oi.product_id = p.product_id
                WHERE o.status = 'Delivered' AND {time_filter}
            """,
            "type": "revenue_summary"
        }

    if 'profit' in intents:
        return {
            "sql": f"""
                SELECT
                    SUM(oi.quantity * p.price * (1 - oi.discount) - oi.quantity * p.cost) as total_profit,
                    ROUND(SUM(oi.quantity * p.price * (1 - oi.discount) - oi.quantity * p.cost) / SUM(oi.quantity * p.price * (1 - oi.discount)) * 100, 2) as margin,
                    p.category,
                    SUM(oi.quantity * p.price * (1 - oi.discount) - oi.quantity * p.cost) as cat_profit
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                JOIN products p ON oi.product_id = p.product_id
                WHERE o.status = 'Delivered' AND {time_filter}
                GROUP BY p.category
                ORDER BY cat_profit DESC
            """,
            "type": "profit_analysis"
        }

    if 'orders' in intents:
        return {
            "sql": f"""
                SELECT
                    COUNT(*) as total_orders,
                    COUNT(DISTINCT customer_id) as unique_customers,
                    SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) as delivered,
                    SUM(CASE WHEN status = 'Returned' THEN 1 ELSE 0 END) as returned,
                    SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled
                FROM orders
                WHERE {time_filter}
            """,
            "type": "orders_summary"
        }

    if 'customers' in intents:
        return {
            "sql": f"""
                SELECT
                    COUNT(DISTINCT c.customer_id) as total_customers,
                    COUNT(DISTINCT o.order_id) as total_orders,
                    SUM(oi.quantity * p.price * (1 - oi.discount)) as total_revenue,
                    ROUND(SUM(oi.quantity * p.price * (1 - oi.discount)) / COUNT(DISTINCT o.customer_id), 2) as revenue_per_customer
                FROM customers c
                JOIN orders o ON c.customer_id = o.customer_id
                JOIN order_items oi ON o.order_id = oi.order_id
                JOIN products p ON oi.product_id = p.product_id
                WHERE o.status = 'Delivered' AND {time_filter}
            """,
            "type": "customers_summary"
        }

    if 'aov' in intents:
        return {
            "sql": f"""
                SELECT
                    ROUND(SUM(oi.quantity * p.price * (1 - oi.discount)) / COUNT(DISTINCT o.order_id), 2) as aov,
                    COUNT(DISTINCT o.order_id) as total_orders,
                    SUM(oi.quantity * p.price * (1 - oi.discount)) as total_revenue
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                JOIN products p ON oi.product_id = p.product_id
                WHERE o.status = 'Delivered' AND {time_filter}
            """,
            "type": "aov"
        }

    if 'trend' in intents:
        return {
            "sql": f"""
                SELECT strftime('%Y-%m', o.order_date) as month,
                       SUM(oi.quantity * p.price * (1 - oi.discount)) as revenue,
                       COUNT(DISTINCT o.order_id) as orders,
                       SUM(oi.quantity * p.price * (1 - oi.discount) - oi.quantity * p.cost) as profit
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                JOIN products p ON oi.product_id = p.product_id
                WHERE o.status = 'Delivered' AND {time_filter}
                GROUP BY strftime('%Y-%m', o.order_date)
                ORDER BY month
            """,
            "type": "trend"
        }

    if 'top' in intents and 'product' in intents:
        return {
            "sql": f"""
                SELECT p.product_name, p.category,
                       SUM(oi.quantity) as units_sold,
                       SUM(oi.quantity * p.price * (1 - oi.discount)) as revenue
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                JOIN products p ON oi.product_id = p.product_id
                WHERE o.status = 'Delivered' AND {time_filter}
                GROUP BY p.product_id
                ORDER BY revenue DESC
                LIMIT 5
            """,
            "type": "top_products"
        }

    return {
        "sql": f"""
            SELECT
                SUM(oi.quantity * p.price * (1 - oi.discount)) as total_revenue,
                COUNT(DISTINCT o.order_id) as total_orders,
                COUNT(DISTINCT o.customer_id) as total_customers
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            JOIN products p ON oi.product_id = p.product_id
            WHERE o.status = 'Delivered' AND {time_filter}
        """,
        "type": "general_summary"
    }


def generate_recommendation_sql(question, time_filter):
    return {
        "sql": f"""
            SELECT 'revenue' as metric, SUM(oi.quantity * p.price * (1 - oi.discount)) as value
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            JOIN products p ON oi.product_id = p.product_id
            WHERE o.status = 'Delivered' AND {time_filter}
            UNION ALL
            SELECT 'profit_margin', ROUND(
                SUM(oi.quantity * p.price * (1 - oi.discount) - oi.quantity * p.cost) /
                NULLIF(SUM(oi.quantity * p.price * (1 - oi.discount)), 0) * 100, 2)
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            JOIN products p ON oi.product_id = p.product_id
            WHERE o.status = 'Delivered' AND {time_filter}
            UNION ALL
            SELECT 'return_rate', ROUND(CAST((SELECT COUNT(*) FROM returns) AS FLOAT) /
                NULLIF((SELECT COUNT(*) FROM orders WHERE status != 'Cancelled'), 0) * 100, 2)
            UNION ALL
            SELECT 'avg_delivery_days', ROUND(AVG(julianday(delivery_date) - julianday(shipping_date)), 1)
            FROM delivery WHERE delivery_status != 'Cancelled'
        """,
        "type": "recommendations"
    }


def execute_query(sql):
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        result = conn.execute(sql).fetchall()
        conn.close()
        return [dict(row) for row in result]
    except Exception as e:
        return [{"error": str(e)}]


def format_currency(value):
    try:
        v = float(value)
        if v >= 100000:
            return f"Rs.{v/100000:.2f} Lakhs"
        elif v >= 1000:
            return f"Rs.{v:,.0f}"
        else:
            return f"Rs.{v:.2f}"
    except (ValueError, TypeError):
        return str(value)


def generate_response(question, results, query_type):
    if not results:
        return ("I couldn't find any data for the period you asked about. "
                "The dataset currently covers Jan 2024 to Dec 2025.")
    if len(results) == 1 and (('error' in results[0]) or all(v is None for v in results[0].values())):
        if 'error' in results[0]:
            error = results[0].get('error', 'Unknown error')
            return f"I encountered an issue processing your question: {error}. Please try rephrasing."
        return ("I couldn't find any data for the period you asked about. "
                "The dataset currently covers Jan 2024 to Dec 2025.")

    if query_type == 'revenue_summary':
        row = results[0]
        return f"""Here's the revenue summary:

**Total Revenue:** {format_currency(row['total_revenue'])}
**Total Profit:** {format_currency(row['total_profit'])}
**Total Orders:** {row['total_orders']:,}
**Average Order Value:** {format_currency(row['aov'])}
**Profit Margin:** {row['margin']}%

The business is generating a {'healthy' if float(row['margin']) > 15 else 'moderate' if float(row['margin']) > 8 else 'low'} profit margin of {row['margin']}%."""

    elif query_type == 'product_profit_ranking':
        response = "Here are the **Top 5 Most Profitable Products**:\n\n"
        for i, row in enumerate(results, 1):
            response += f"{i}. **{row['product_name']}** ({row['category']})\n"
            response += f"   Revenue: {format_currency(row['revenue'])} | Profit: {format_currency(row['profit'])} | Margin: {row['margin']}%\n\n"
        return response

    elif query_type == 'product_sales_ranking':
        response = "Here are the **Top 5 Best-Selling Products**:\n\n"
        for i, row in enumerate(results, 1):
            response += f"{i}. **{row['product_name']}** ({row['category']})\n"
            response += f"   Units Sold: {row['units_sold']:,} | Revenue: {format_currency(row['revenue'])}\n\n"
        return response

    elif query_type == 'high_sales_low_profit':
        response = "**High Sales / Low Profit Products** (these sell well but make little profit):\n\n"
        for i, row in enumerate(results[:5], 1):
            response += f"{i}. **{row['product_name']}** ({row['category']})\n"
            response += f"   {row['units_sold']:,} units sold | Revenue: {format_currency(row['revenue'])} | Margin: {row['margin']}%\n\n"
        response += "Recommendation: These products generate volume but squeeze margins. Consider renegotiating costs, reducing discount depth, or raising prices slightly."
        return response

    elif query_type == 'category_profit':
        response = "**Category-wise Profit Analysis:**\n\n"
        for row in results:
            response += f"- **{row['category']}**: Profit {format_currency(row['profit'])} | Margin {row['margin']}% | {row['orders']:,} orders\n"
        return response

    elif query_type == 'category_returns':
        response = "**Category-wise Return Rates:**\n\n"
        for row in results:
            emoji = "High" if float(row['return_rate']) > 10 else "Moderate" if float(row['return_rate']) > 5 else "Low"
            response += f"- **{row['category']}**: {row['return_rate']}% return rate ({row['returns']} returns out of {row['total_orders']} orders) - {emoji}\n"
        return response

    elif query_type == 'product_returns':
        response = "**Products with Highest Return Rates:**\n\n"
        for i, row in enumerate(results, 1):
            response += f"{i}. **{row['product_name']}**: {row['return_rate']}% return rate ({row['returns']} returns)\n"
        return response

    elif query_type == 'delivery_summary':
        response = "**Delivery Performance Summary:**\n\n"
        for row in results:
            response += f"- **{row['delivery_status']}**: {row['count']:,} orders ({row['percentage']}%)\n"
            if row['avg_days']:
                response += f"  Average delivery time: {row['avg_days']} days\n"
        return response

    elif query_type == 'discount_analysis':
        response = "**Discount Impact Analysis:**\n\n"
        response += "| Discount | Orders | Revenue | Profit | Margin |\n"
        response += "|----------|--------|---------|--------|--------|\n"
        for row in results:
            response += f"| {row['discount_pct']}% | {row['orders']:,} | {format_currency(row['revenue'])} | {format_currency(row['profit'])} | {row['margin']}% |\n"
        return response

    elif query_type == 'customer_segments':
        response = "**Customer Segment Analysis:**\n\n"
        for row in results:
            response += f"- **{row['segment']}**: {row['customers']} customers | Revenue: {format_currency(row['total_revenue'])} | Avg: {format_currency(row['avg_spent'])}\n"
        return response

    elif query_type == 'region_analysis':
        response = "**Top Regions by Revenue:**\n\n"
        for i, row in enumerate(results, 1):
            response += f"{i}. **{row['location']}**: {row['orders']:,} orders | Revenue: {format_currency(row['revenue'])}\n"
        return response

    elif query_type == 'payment_analysis':
        response = "**Payment Method Distribution:**\n\n"
        for row in results:
            response += f"- **{row['payment_method']}**: {row['orders']:,} orders | Revenue: {format_currency(row['revenue'])}\n"
        return response

    elif query_type == 'orders_summary':
        row = results[0]
        return f"""**Order Summary:**

- **Total Orders:** {row['total_orders']:,}
- **Delivered:** {row['delivered']:,}
- **Returned:** {row['returned']:,}
- **Cancelled:** {row['cancelled']:,}
- **Unique Customers:** {row['unique_customers']:,}"""

    elif query_type == 'customers_summary':
        row = results[0]
        return f"""**Customer Summary:**

- **Total Customers:** {row['total_customers']:,}
- **Total Orders:** {row['total_orders']:,}
- **Total Revenue:** {format_currency(row['total_revenue'])}
- **Revenue per Customer:** {format_currency(row['revenue_per_customer'])}"""

    elif query_type == 'trend':
        response = "**Monthly Trend:**\n\n"
        for row in results[-6:]:
            response += f"- **{row['month']}**: Revenue {format_currency(row['revenue'])} | Orders {row['orders']:,} | Profit {format_currency(row['profit'])}\n"
        return response

    elif query_type == 'top_products':
        response = "**Top Products:**\n\n"
        for i, row in enumerate(results, 1):
            response += f"{i}. **{row['product_name']}**: {row['units_sold']:,} units | {format_currency(row['revenue'])}\n"
        return response

    elif query_type == 'recommendations':
        return generate_business_recommendations(results)

    else:
        response = "**Analysis Results:**\n\n"
        for row in results:
            response += str(row) + "\n"
        return response


def generate_business_recommendations(results):
    metrics = {}
    for row in results:
        metrics[row['metric']] = row['value']

    recommendations = []
    revenue = float(metrics.get('revenue', 0))
    margin = float(metrics.get('profit_margin', 0))
    return_rate = float(metrics.get('return_rate', 0))
    avg_delivery = float(metrics.get('avg_delivery_days', 0))

    if margin < 15:
        recommendations.append("Increase profit margins by renegotiating supplier costs or optimizing pricing strategy.")
    if return_rate > 8:
        recommendations.append("High return rate detected. Improve product descriptions, images, and quality checks to reduce returns.")
    if avg_delivery > 4:
        recommendations.append("Delivery times are above average. Consider switching to faster courier partners.")
    recommendations.append("Focus marketing spend on high-margin product categories for better ROI.")
    recommendations.append("Implement a loyalty program to increase customer retention and repeat purchases.")
    recommendations.append("Use targeted discounts for high-value customers instead of blanket discounts.")
    recommendations.append("Analyze low-performing products and consider discontinuing or repricing them.")
    recommendations.append("Leverage seasonal trends by planning inventory and promotions ahead of peak periods.")

    response = f"**Business Recommendations** (Revenue: {format_currency(revenue)}, Margin: {margin}%)\n\n"
    for i, rec in enumerate(recommendations[:5], 1):
        response += f"{i}. {rec}\n"
    return response


def analyze_question(question):
    query_info = generate_sql(question)
    results = execute_query(query_info['sql'])
    response = generate_response(question, results, query_info['type'])

    return {
        "question": question,
        "query_type": query_info['type'],
        "sql": query_info['sql'],
        "results": results,
        "response": response
    }
