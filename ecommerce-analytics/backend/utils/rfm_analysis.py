import pandas as pd
import numpy as np


def compute_rfm(master_df, reference_date=None):
    if reference_date is None:
        reference_date = master_df['order_date'].max() + pd.Timedelta(days=1)

    delivered = master_df[master_df['status'] == 'Delivered'].copy()

    rfm = delivered.groupby('customer_id').agg(
        recency=('order_date', lambda x: (reference_date - x.max()).days),
        frequency=('order_id', 'nunique'),
        monetary=('net_revenue', 'sum'),
        last_purchase=('order_date', 'max'),
        total_orders=('order_id', 'nunique'),
        avg_order_value=('net_revenue', 'mean'),
        total_spending=('net_revenue', 'sum')
    ).reset_index()

    rfm['recency_score'] = pd.qcut(rfm['recency'], q=4, labels=[4, 3, 2, 1], duplicates='drop').astype(int)
    rfm['frequency_score'] = pd.qcut(rfm['frequency'].rank(method='first'), q=4, labels=[1, 2, 3, 4], duplicates='drop').astype(int)
    rfm['monetary_score'] = pd.qcut(rfm['monetary'].rank(method='first'), q=4, labels=[1, 2, 3, 4], duplicates='drop').astype(int)

    rfm['rfm_score'] = rfm['recency_score'] + rfm['frequency_score'] + rfm['monetary_score']

    def segment(row):
        score = row['rfm_score']
        if score >= 10:
            return 'VIP'
        elif score >= 8:
            return 'Loyal'
        elif score >= 6:
            return 'Potential'
        elif score >= 4:
            return 'At Risk'
        else:
            return 'Lost'

    rfm['segment'] = rfm.apply(segment, axis=1)

    return rfm


def get_customer_analytics(master_df):
    rfm = compute_rfm(master_df)

    customer_stats = master_df.groupby('customer_id').agg(
        name=('name', 'first'),
        location=('location', 'first'),
        segment=('segment', 'first'),
        total_orders=('order_id', 'nunique'),
        total_spending=('net_revenue', 'sum'),
        avg_order_value=('net_revenue', 'mean'),
        first_purchase=('order_date', 'min'),
        last_purchase=('order_date', 'max'),
        total_products_bought=('product_id', 'nunique')
    ).reset_index()

    customer_stats['days_since_last'] = (master_df['order_date'].max() - customer_stats['last_purchase']).dt.days

    result = customer_stats.merge(rfm[['customer_id', 'rfm_score', 'segment']], on='customer_id', how='left')
    result = result.rename(columns={'segment_x': 'cohort_segment'})
    result = result.rename(columns={'segment_y': 'segment'})
    result['segment'] = result['segment'].fillna('Lost')
    result = result.sort_values('total_spending', ascending=False)

    return result
