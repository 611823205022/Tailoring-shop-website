"""
E-Commerce Data Analysis - Standalone Python Script
Performs full EDA pipeline: load -> clean -> analyze -> visualize

Run: python python_analysis/analysis.py
Outputs charts to: python_analysis/output/
"""

import os
import sys
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib

matplotlib.use('Agg')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from backend.utils.data_cleaning import load_data, clean_data, build_master_df
from backend.utils.rfm_analysis import compute_rfm

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'output')
os.makedirs(OUTPUT_DIR, exist_ok=True)

plt.style.use('seaborn-v0_8-whitegrid')
plt.rcParams['figure.figsize'] = (10, 6)
plt.rcParams['font.size'] = 11


def save_plot(fig, name):
    path = os.path.join(OUTPUT_DIR, name)
    fig.savefig(path, bbox_inches='tight', dpi=120)
    plt.close(fig)
    print(f"  Saved: {path}")


def analyze_overview(df):
    print("\n" + "=" * 60)
    print("  1. BUSINESS OVERVIEW")
    print("=" * 60)

    delivered = df[df['status'] == 'Delivered']
    revenue = delivered['net_revenue'].sum()
    profit = delivered['profit'].sum()
    orders = delivered['order_id'].nunique()
    customers = delivered['customer_id'].nunique()

    print(f"  Total Revenue:   Rs.{revenue:,.2f}")
    print(f"  Total Profit:    Rs.{profit:,.2f}")
    print(f"  Profit Margin:   {profit / revenue * 100:.2f}%")
    print(f"  Total Orders:    {orders:,}")
    print(f"  Total Customers: {customers:,}")
    print(f"  AOV:             Rs.{revenue / orders:,.2f}")

    fig, ax = plt.subplots(figsize=(12, 5))
    monthly = delivered.groupby(delivered['order_date'].dt.to_period('M')).agg(
        revenue=('net_revenue', 'sum'),
        profit=('profit', 'sum')
    )
    x = np.arange(len(monthly))
    ax.bar(x, monthly['revenue'], label='Revenue', color='#4f46e5', alpha=.85, width=.6)
    ax.plot(x, monthly['profit'], label='Profit', color='#10b981', marker='o', linewidth=2)
    ax.set_xticks(x)
    ax.set_xticklabels(monthly.index.astype(str), rotation=45, ha='right')
    ax.set_ylabel('Amount (Rs.)')
    ax.set_title('Monthly Revenue vs Profit')
    ax.legend()
    ax.get_yaxis().set_major_formatter(
        matplotlib.ticker.FuncFormatter(lambda v, _: f'Rs.{v/1e5:.1f}L')
    )
    save_plot(fig, '01_overview_trend.png')


def analyze_products(df):
    print("\n" + "=" * 60)
    print("  2. PRODUCT ANALYSIS")
    print("=" * 60)

    delivered = df[df['status'] == 'Delivered']

    by_product = delivered.groupby(['product_name', 'category']).agg(
        units=('quantity', 'sum'),
        revenue=('net_revenue', 'sum'),
        profit=('profit', 'sum'),
        avg_discount=('discount', 'mean')
    ).reset_index()
    by_product['margin'] = (by_product['profit'] / by_product['revenue'] * 100).round(2)
    by_product = by_product.sort_values('profit', ascending=False)

    print("\n  Top 5 Products by Profit:")
    for i, row in by_product.head(5).iterrows():
        print(f"    {row['product_name']:<35} Profit: Rs.{row['profit']:>12,.0f}  Margin: {row['margin']:.1f}%")

    print("\n  Bottom 5 Products by Profit:")
    for i, row in by_product.tail(5).iterrows():
        print(f"    {row['product_name']:<35} Profit: Rs.{row['profit']:>12,.0f}  Margin: {row['margin']:.1f}%")

    # High sales / low profit detection
    med_units = by_product['units'].median()
    med_margin = by_product['margin'].median()
    hslp = by_product[(by_product['units'] > by_product['units'].quantile(.75)) & (by_product['margin'] < med_margin)]

    print(f"\n  High Sales / Low Profit Products ({len(hslp)} detected):")
    for i, row in hslp.iterrows():
        print(f"    {row['product_name']:<35} Units: {row['units']:>6,}  Margin: {row['margin']:.1f}%")

    fig, axes = plt.subplots(1, 2, figsize=(14, 6))

    cat_summary = delivered.groupby('category').agg(
        revenue=('net_revenue', 'sum'),
        profit=('profit', 'sum')
    ).sort_values('revenue')

    axes[0].barh(cat_summary.index, cat_summary['revenue'], color='#6366f1', label='Revenue')
    axes[0].barh(cat_summary.index, cat_summary['profit'], color='#10b981', alpha=.9, label='Profit')
    axes[0].set_title('Revenue & Profit by Category')
    axes[0].legend()

    cats = ['Electronics', 'Fashion', 'Home & Kitchen', 'Beauty', 'Sports']
    colors = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6']
    sizes = cat_summary.reindex(cats).revenue.fillna(0) if all(c in cat_summary.index for c in cats) else cat_summary['revenue']
    colors_map = dict(zip(cat_summary.index, colors[:len(cat_summary)]))
    axes[1].pie(cat_summary['revenue'], labels=cat_summary.index, autopct='%1.1f%%',
                colors=[colors_map[c] for c in cat_summary.index],
                startangle=90, wedgeprops={'edgecolor': 'white', 'linewidth': 1})
    axes[1].set_title('Revenue Share by Category')

    save_plot(fig, '02_product_category.png')


def analyze_customers(df):
    print("\n" + "=" * 60)
    print("  3. CUSTOMER ANALYSIS (RFM)")
    print("=" * 60)

    rfm = compute_rfm(df)
    seg_counts = rfm['segment'].value_counts()

    print("\n  Customer Segments:")
    for seg, cnt in seg_counts.items():
        revenue = rfm[rfm['segment'] == seg]['monetary'].sum()
        print(f"    {seg:<12} {cnt:>4} customers  Revenue: Rs.{revenue:>14,.2f}  Avg: Rs.{revenue/cnt:>10,.0f}")

    fig, ax = plt.subplots(1, 2, figsize=(14, 6))

    colors = ['#f59e0b', '#3b82f6', '#6366f1', '#ef4444', '#94a3b8']
    seg_order = ['VIP', 'Loyal', 'Potential', 'At Risk', 'Lost']
    counts = [seg_counts.get(s, 0) for s in seg_order]
    ax[0].bar(seg_order, counts, color=colors)
    ax[0].set_title('Customer Segmentation')
    ax[0].set_ylabel('Number of Customers')
    for i, v in enumerate(counts):
        ax[0].text(i, v + 1, str(v), ha='center', fontweight='bold')

    seg_rev = [rfm[rfm['segment'] == s]['monetary'].sum() for s in seg_order]
    ax[1].bar(seg_order, [r / 1e5 for r in seg_rev], color=colors, alpha=.85)
    ax[1].set_title('Revenue by Segment (Lakhs)')
    ax[1].set_ylabel('Revenue (Rs. Lakhs)')
    for i, v in enumerate(seg_rev):
        ax[1].text(i, v / 1e5 + .05, f'{v/1e5:.1f}', ha='center', fontweight='bold')

    save_plot(fig, '03_rfm_segments.png')


def analyze_delivery(df):
    print("\n" + "=" * 60)
    print("  4. DELIVERY ANALYSIS")
    print("=" * 60)

    delivery = df.dropna(subset=['delivery_days'])
    delivery = delivery[~delivery['delivery_status'].isin(['Cancelled', None])]

    avg_days = delivery['delivery_days'].mean()
    on_time = (delivery['delivery_status'] == 'On-Time').sum()
    late = (delivery['delivery_status'] == 'Late').sum()
    total = len(delivery)

    print(f"  Average Delivery: {avg_days:.1f} days")
    print(f"  On-Time:   {on_time} ({on_time/total*100:.1f}%)")
    print(f"  Late:      {late} ({late/total*100:.1f}%)")

    fig, ax = plt.subplots(1, 2, figsize=(14, 5))

    courier = delivery.groupby('courier').agg(
        avg_days=('delivery_days', 'mean'),
        on_time_pct=('delivery_status', lambda x: (x == 'On-Time').mean() * 100)
    ).sort_values('on_time_pct', ascending=False)

    ax[0].barh(courier.index, courier['on_time_pct'], color=['#10b981' if v >= 85 else ('#f59e0b' if v >= 75 else '#ef4444') for v in courier['on_time_pct']])
    ax[0].set_title('On-Time Delivery % by Courier')
    ax[0].set_xlim(0, 100)

    region = delivery.groupby('region').agg(
        orders=('order_id', 'count'),
        avg_days=('delivery_days', 'mean')
    ).sort_values('orders', ascending=False).head(10)

    ax[1].bar(region.index, region['orders'], color='#6366f1')
    ax[1].set_title('Orders by Region (Top 10)')
    ax[1].tick_params(axis='x', rotation=45)

    save_plot(fig, '04_delivery.png')


def analyze_discounts(df):
    print("\n" + "=" * 60)
    print("  5. DISCOUNT ANALYSIS")
    print("=" * 60)

    delivered = df[df['status'] == 'Delivered']
    delivered['discount_pct'] = (delivered['discount'] * 100).astype(int)

    by_disc = delivered.groupby('discount_pct').agg(
        orders=('order_id', 'nunique'),
        revenue=('net_revenue', 'sum'),
        profit=('profit', 'sum')
    ).reset_index()
    by_disc['margin'] = (by_disc['profit'] / by_disc['revenue'] * 100).round(1)

    print("\n  Discount Tier     Orders  Revenue      Profit    Margin")
    print("  " + "-" * 55)
    for _, row in by_disc.iterrows():
        print(f"    {row['discount_pct']:>3}%         {row['orders']:>5,}  {row['revenue']:>12,.0f}  {row['profit']:>11,.0f}  {row['margin']:>6.1f}%")

    fig, ax = plt.subplots(figsize=(10, 6))
    x = np.arange(len(by_disc))
    width = .3
    ax.bar(x - width, by_disc['revenue'], width, label='Revenue', color='#6366f1')
    ax.bar(x, by_disc['profit'], width, label='Profit', color='#10b981')
    ax.bar(x + width, by_disc['orders'], width, label='Orders (scaled)', color='#f59e0b', alpha=.8)
    ax.set_xticks(x)
    ax.set_xticklabels([f"{d}%" for d in by_disc['discount_pct']])
    ax.legend()
    ax.set_title('Impact of Discount Tiers')
    ax.get_yaxis().set_major_formatter(
        matplotlib.ticker.FuncFormatter(lambda v, _: f'{v/1e3:.0f}K')
    )
    save_plot(fig, '05_discounts.png')


def main():
    print("=" * 60)
    print("  E-COMMERCE ANALYTICS - EXPLORATORY ANALYSIS")
    print("=" * 60)

    print("\n[1] Loading data...")
    customers, products, orders, order_items, delivery, returns = load_data()
    df = build_master_df(*clean_data(customers, products, orders, order_items, delivery, returns))
    print(f"    Master table: {len(df):,} rows")

    analyze_overview(df)
    analyze_products(df)
    analyze_customers(df)
    analyze_delivery(df)
    analyze_discounts(df)

    print("\n" + "=" * 60)
    print(f"  Analysis complete. Charts saved to: {OUTPUT_DIR}")
    print("=" * 60)


if __name__ == '__main__':
    main()