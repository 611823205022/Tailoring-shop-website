import os
import sys
import json
import pandas as pd
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

sys.path.insert(0, os.path.dirname(__file__))

from utils.db import query_db, get_db
from utils.data_cleaning import load_data, clean_data, build_master_df
from utils.rfm_analysis import compute_rfm, get_customer_analytics
from utils.ai_engine import analyze_question

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)


def get_master_df():
    customers, products, orders, order_items, delivery, returns = load_data()
    customers, products, orders, order_items, delivery, returns = clean_data(
        customers, products, orders, order_items, delivery, returns
    )
    return build_master_df(customers, products, orders, order_items, delivery, returns)


@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)


@app.route('/api/executive')
def executive_dashboard():
    try:
        master = get_master_df()
        delivered = master[master['status'] == 'Delivered']

        total_revenue = float(delivered['net_revenue'].sum())
        total_cost = float(delivered['total_cost'].sum())
        total_profit = float(delivered['profit'].sum())
        total_orders = int(delivered['order_id'].nunique())
        total_customers = int(delivered['customer_id'].nunique())
        aov = total_revenue / total_orders if total_orders > 0 else 0
        profit_margin = (total_profit / total_revenue * 100) if total_revenue > 0 else 0

        returns_count = int(master[master['status'] == 'Returned']['order_id'].nunique())
        return_rate = (returns_count / total_orders * 100) if total_orders > 0 else 0

        monthly = delivered.copy()
        monthly['month'] = monthly['order_date'].dt.to_period('M').astype(str)
        monthly_trend = monthly.groupby('month').agg(
            revenue=('net_revenue', 'sum'),
            orders=('order_id', 'nunique'),
            profit=('profit', 'sum')
        ).reset_index()

        top_products = delivered.groupby('product_name').agg(
            revenue=('net_revenue', 'sum'),
            units=('quantity', 'sum')
        ).sort_values('revenue', ascending=False).head(5).reset_index()

        top_categories = delivered.groupby('category').agg(
            revenue=('net_revenue', 'sum'),
            profit=('profit', 'sum')
        ).sort_values('revenue', ascending=False).head(5).reset_index()

        return jsonify({
            'kpi': {
                'total_revenue': round(total_revenue, 2),
                'total_profit': round(total_profit, 2),
                'total_orders': total_orders,
                'total_customers': total_customers,
                'aov': round(aov, 2),
                'profit_margin': round(profit_margin, 2),
                'return_rate': round(return_rate, 2)
            },
            'monthly_trend': monthly_trend.to_dict('records'),
            'top_products': top_products.to_dict('records'),
            'top_categories': top_categories.to_dict('records')
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/products')
def product_analytics():
    try:
        master = get_master_df()
        delivered = master[master['status'] == 'Delivered']

        products = delivered.groupby(['product_id', 'product_name', 'category', 'subcategory', 'price', 'cost', 'brand', 'rating']).agg(
            units_sold=('quantity', 'sum'),
            revenue=('net_revenue', 'sum'),
            total_cost=('total_cost', 'sum'),
            profit=('profit', 'sum'),
            avg_discount=('discount', 'mean'),
            orders=('order_id', 'nunique')
        ).reset_index()

        products['profit_margin'] = (products['profit'] / products['revenue'] * 100).round(2)

        returns_data = master[master['status'] == 'Returned'].groupby('product_id').agg(
            returns=('order_id', 'nunique')
        ).reset_index()

        products = products.merge(returns_data, on='product_id', how='left')
        products['returns'] = products['returns'].fillna(0).astype(int)
        products['return_rate'] = (products['returns'] / products['units_sold'] * 100).round(2)

        def categorize(row):
            if row['units_sold'] > products['units_sold'].median() and row['profit_margin'] > products['profit_margin'].median():
                return 'Best Seller'
            elif row['profit_margin'] > products['profit_margin'].quantile(0.75):
                return 'Most Profitable'
            elif row['units_sold'] > products['units_sold'].quantile(0.75) and row['profit_margin'] < products['profit_margin'].median():
                return 'High Sales / Low Profit'
            else:
                return 'Regular'

        products['performance'] = products.apply(categorize, axis=1)

        products = products.sort_values('revenue', ascending=False)

        cols = ['product_id', 'product_name', 'category', 'subcategory', 'brand', 'rating',
                'units_sold', 'revenue', 'total_cost', 'profit', 'profit_margin',
                'avg_discount', 'orders', 'returns', 'return_rate', 'performance']
        products = products[cols]

        return jsonify({
            'products': products.to_dict('records'),
            'summary': {
                'total_products': len(products),
                'best_sellers': int((products['performance'] == 'Best Seller').sum()),
                'most_profitable': int((products['performance'] == 'Most Profitable').sum()),
                'high_sales_low_profit': int((products['performance'] == 'High Sales / Low Profit').sum()),
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/customers')
def customer_analytics():
    try:
        master = get_master_df()
        analytics = get_customer_analytics(master)

        segment_summary = analytics.groupby('segment').agg(
            count=('customer_id', 'count'),
            avg_spending=('total_spending', 'mean'),
            avg_orders=('total_orders', 'mean'),
            avg_aov=('avg_order_value', 'mean')
        ).reset_index()

        top_customers = analytics.head(20).to_dict('records')

        return jsonify({
            'customers': analytics.head(100).to_dict('records'),
            'segment_summary': segment_summary.to_dict('records'),
            'top_customers': top_customers,
            'total_customers': len(analytics)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/profit')
def profit_analytics():
    try:
        master = get_master_df()
        delivered = master[master['status'] == 'Delivered']

        overall = {
            'gross_revenue': float(delivered['gross_revenue'].sum()),
            'total_discount': float(delivered['discount_amount'].sum()),
            'total_cost': float(delivered['total_cost'].sum()),
            'total_shipping': float(delivered['shipping_cost'].sum()),
            'total_other': float(delivered['other_costs'].sum()),
            'net_revenue': float(delivered['net_revenue'].sum()),
            'profit': float(delivered['profit'].sum()),
        }

        by_category = delivered.groupby('category').agg(
            revenue=('net_revenue', 'sum'),
            cost=('total_cost', 'sum'),
            profit=('profit', 'sum'),
            orders=('order_id', 'nunique')
        ).reset_index()
        by_category['margin'] = (by_category['profit'] / by_category['revenue'] * 100).round(2)

        by_category = by_category.sort_values('profit', ascending=False)

        high_rev_high_profit = by_category[
            (by_category['revenue'] > by_category['revenue'].median()) &
            (by_category['profit'] > by_category['profit'].median())
        ].to_dict('records')

        high_rev_low_profit = by_category[
            (by_category['revenue'] > by_category['revenue'].median()) &
            (by_category['profit'] <= by_category['profit'].median())
        ].to_dict('records')

        monthly = delivered.copy()
        monthly['month'] = monthly['order_date'].dt.to_period('M').astype(str)
        monthly_profit = monthly.groupby('month').agg(
            revenue=('net_revenue', 'sum'),
            cost=('total_cost', 'sum'),
            profit=('profit', 'sum')
        ).reset_index()

        return jsonify({
            'overall': overall,
            'by_category': by_category.to_dict('records'),
            'high_rev_high_profit': high_rev_high_profit,
            'high_rev_low_profit': high_rev_low_profit,
            'monthly_trend': monthly_profit.to_dict('records')
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/delivery')
def delivery_analytics():
    try:
        master = get_master_df()

        delivery = master[~master['delivery_status'].isin(['Cancelled', None])]
        delivery = delivery.dropna(subset=['delivery_days'])

        days = delivery['delivery_days']
        statuses = delivery['delivery_status']
        total = int(len(delivery))
        overall = {
            'avg_days': round(float(days.mean()), 1),
            'median_days': float(days.median()),
            'total': total,
            'on_time': int((statuses == 'On-Time').sum()),
            'late': int((statuses == 'Late').sum()),
        }
        overall['on_time_pct'] = round(overall['on_time'] / total * 100, 2)
        overall['late_pct'] = round(overall['late'] / total * 100, 2)

        cancelled = master[master['delivery_status'] == 'Cancelled']
        total_all = len(master)
        overall['cancel_pct'] = round(float(len(cancelled)) / total_all * 100, 2) if total_all > 0 else 0

        by_courier = delivery.groupby('courier').agg(
            orders=('order_id', 'count'),
            avg_days=('delivery_days', 'mean'),
            on_time=('delivery_status', lambda x: (x == 'On-Time').sum()),
            late=('delivery_status', lambda x: (x == 'Late').sum())
        ).reset_index()
        by_courier['on_time_pct'] = (by_courier['on_time'] / by_courier['orders'] * 100).round(2)
        by_courier = by_courier.sort_values('on_time_pct', ascending=False)
        by_courier['avg_days'] = by_courier['avg_days'].round(1)
        by_courier['orders'] = by_courier['orders'].astype(int)
        by_courier['on_time'] = by_courier['on_time'].astype(int)
        by_courier['late'] = by_courier['late'].astype(int)

        region_data = []
        for region, grp in delivery.groupby('region'):
            on_time = int((grp['delivery_status'] == 'On-Time').sum())
            region_data.append({
                'region': region,
                'orders': int(len(grp)),
                'avg_days': round(float(grp['delivery_days'].mean()), 1),
                'on_time_pct': round(on_time / len(grp) * 100, 2)
            })
        by_region = pd.DataFrame(region_data).sort_values('orders', ascending=False).reset_index(drop=True)

        return jsonify({
            'overall': overall,
            'by_courier': by_courier.to_dict('records'),
            'by_region': by_region.to_dict('records')
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/discounts')
def discount_analytics():
    try:
        master = get_master_df()
        delivered = master[master['status'] == 'Delivered'].copy()

        delivered['discount_pct'] = (delivered['discount'] * 100).astype(int)

        by_discount = delivered.groupby('discount_pct').agg(
            orders=('order_id', 'nunique'),
            revenue=('net_revenue', 'sum'),
            profit=('profit', 'sum'),
            units=('quantity', 'sum')
        ).reset_index()
        by_discount['margin'] = (by_discount['profit'] / by_discount['revenue'] * 100).round(2)
        by_discount = by_discount.sort_values('discount_pct')

        return jsonify({
            'by_discount': by_discount.to_dict('records')
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/ai/chat', methods=['POST'])
def ai_chat():
    try:
        data = request.get_json()
        question = data.get('question', '')
        if not question:
            return jsonify({'error': 'No question provided'}), 400

        result = analyze_question(question)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/ai/suggestions')
def ai_suggestions():
    suggestions = [
        "What was our total revenue this month?",
        "Which product generated the highest profit?",
        "Which category has the highest return rate?",
        "Who are our most valuable customers?",
        "Which products have high sales but low profit?",
        "Give me recommendations to improve revenue",
        "What is the delivery performance?",
        "How do discounts affect our profit?",
        "Which region generates the most revenue?",
        "What are the monthly sales trends?",
        "Compare payment methods by revenue",
        "Which customers are at risk of churning?"
    ]
    return jsonify({'suggestions': suggestions})


if __name__ == '__main__':
    print("=" * 50)
    print("  E-Commerce Analytics - Starting Server")
    print("=" * 50)
    print("  Dashboard: http://localhost:5000")
    print("  API Docs:  http://localhost:5000/api/executive")
    print("=" * 50)
    app.run(debug=True, port=5000, host='0.0.0.0')
