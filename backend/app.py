# File: app.py
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime, timedelta
import logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///subscriptions.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

class Subscription(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    service_name = db.Column(db.String(80), nullable=False)
    cost = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=True)
    canceled = db.Column(db.Boolean, nullable=False, default=False)

class Reminder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    subscription_id = db.Column(db.Integer, db.ForeignKey('subscription.id'), nullable=False)
    send_date = db.Column(db.Date, nullable=False)
    sent = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Optional: message, type, etc.
    
    subscription = db.relationship('Subscription', backref=db.backref('reminders', lazy=True))

class SubscriptionInstance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    subscription_id = db.Column(db.Integer, db.ForeignKey('subscription.id'), nullable=False)
    period_start = db.Column(db.Date, nullable=False)
    period_end = db.Column(db.Date, nullable=False)
    payment_status = db.Column(db.String(20), nullable=False, default='pending')
    paid_at = db.Column(db.DateTime, nullable=True)
    subscription = db.relationship('Subscription', backref=db.backref('instances', lazy=True))

@app.route('/subscriptions', methods=['GET'])
def get_subscriptions():
    days = request.args.get('days', type=int)
    today = datetime.today().date()
    query = Subscription.query
    if days:
        query = query.filter(Subscription.renewal_date <= today + timedelta(days=days))
    subscriptions = query.all()
    result = []
    for sub in subscriptions:
        # Find the newest (current) instance for this subscription
        current_instance = None
        if sub.instances:
            # Sort by period_start descending, pick the latest whose period includes today or is the most recent
            current_instance = max(sub.instances, key=lambda inst: inst.period_start)
        if current_instance:
            current_instance_id = current_instance.id
            current_instance_payment_status = current_instance.payment_status
            current_period_start = current_instance.period_start.isoformat()
            current_period_end = current_instance.period_end.isoformat()
        else:
            current_instance_id = None
            current_instance_payment_status = None
            current_period_start = None
            current_period_end = None
        result.append({
            "id": sub.id,
            "service_name": sub.service_name,
            "cost": sub.cost,
            "renewal_date": current_period_end,
            "payment_status": current_instance_payment_status,
            "category": sub.category,
            "canceled": sub.canceled,
            "current_instance_id": current_instance_id,
            "current_period_start": current_period_start,
            "current_period_end": current_period_end
        })
    return jsonify(result)

@app.route('/subscriptions', methods=['POST'])
def add_subscription():
    data = request.json
    try:
        new_subscription = Subscription(
            service_name=data['service_name'],
            cost=data['cost'],
            category=data.get('category'),
            canceled=data.get('canceled', False)
        )
        db.session.add(new_subscription)
        db.session.commit()
        # Use the provided renewal_date as period_end, and period_start as one month before
        period_end = datetime.strptime(data['renewal_date'], '%Y-%m-%d').date()
        # Calculate period_start as one month before period_end
        if period_end.month == 1:
            prev_month = 12
            year = period_end.year - 1
        else:
            prev_month = period_end.month - 1
            year = period_end.year
        from calendar import monthrange
        last_day = monthrange(year, prev_month)[1]
        new_day = min(period_end.day, last_day)
        period_start = period_end.replace(year=year, month=prev_month, day=new_day)
        # Set payment_status to 'overdue' if period_end is in the past
        today = datetime.today().date()
        instance_status = 'overdue' if period_end < today else 'pending'
        instance = SubscriptionInstance(
            subscription_id=new_subscription.id,
            period_start=period_start,
            period_end=period_end,
            payment_status=instance_status
        )
        db.session.add(instance)
        db.session.commit()
        # Add a reminder for this subscription, send_date = 1 day before renewal_date, only if renewal_date is today or in the future
        reminder_send_date = period_end - timedelta(days=1)
        if reminder_send_date >= today:
            reminder = Reminder(
                subscription_id=new_subscription.id,
                send_date=reminder_send_date,
                sent=False
            )
            db.session.add(reminder)
            db.session.commit()
        app.logger.info("Subscription, instance, and reminder added successfully")
        return jsonify({
            "id": new_subscription.id,
            "service_name": new_subscription.service_name,
            "cost": new_subscription.cost,
            "renewal_date": period_end.isoformat(),
            "payment_status": instance.payment_status,
            "category": new_subscription.category,
            "canceled": new_subscription.canceled,
            "current_instance_id": instance.id,
            "current_period_start": period_start.isoformat(),
            "current_period_end": period_end.isoformat()
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/subscriptions/status', methods=['GET'])
def get_subscriptions_by_status():
    status = request.args.get('payment_status')
    if not status:
        return jsonify({'error': 'Missing payment_status parameter'}), 400
    subscriptions = Subscription.query.filter_by(payment_status=status).all()
    result = []
    for sub in subscriptions:
        current_instance = max(sub.instances, key=lambda inst: inst.period_start) if sub.instances else None
        renewal_date = current_instance.period_end.isoformat() if current_instance else None
        result.append({
            "id": sub.id,
            "service_name": sub.service_name,
            "cost": sub.cost,
            "renewal_date": renewal_date,
            "payment_status": sub.payment_status,
            "category": sub.category,
            "canceled": sub.canceled
        })
    return jsonify(result)

@app.route('/category/<category>', methods=['GET'])
def get_subscriptions_by_category(category):
    subscriptions = Subscription.query.filter_by(category=category).all()
    result = []
    for sub in subscriptions:
        current_instance = max(sub.instances, key=lambda inst: inst.period_start) if sub.instances else None
        renewal_date = current_instance.period_end.isoformat() if current_instance else None
        result.append({
            "id": sub.id,
            "service_name": sub.service_name,
            "cost": sub.cost,
            "renewal_date": renewal_date,
            "payment_status": sub.payment_status,
            "category": sub.category,
            "canceled": sub.canceled
        })
    return jsonify(result)

@app.route('/reminders', methods=['GET'])
def get_pending_reminders():
    reminders = Reminder.query.filter_by(sent=False).all()
    result = []
    for reminder in reminders:
        sub = reminder.subscription
        if sub.canceled:
            continue  # Skip reminders for canceled subscriptions
        # Find the newest instance to get the correct renewal date
        current_instance = max(sub.instances, key=lambda inst: inst.period_start)
        result.append({
            "reminder_id": reminder.id,
            "send_date": reminder.send_date.isoformat(),
            "sent": reminder.sent,
            "subscription_id": sub.id,
            "service_name": sub.service_name,
            "cost": sub.cost,
            "renewal_date": current_instance.period_end.isoformat(),
            "category": sub.category,
            "canceled": sub.canceled
        })
    return jsonify(result)

@app.route('/summary', methods=['GET'])
def get_summary():
    subscriptions = Subscription.query.filter_by(canceled=False).all()
    total_monthly = sum(sub.cost for sub in subscriptions)
    total_annual = total_monthly * 12
    # Cost breakdown by category (normalize by stripping and lowercasing, but use original for display)
    category_breakdown = {}
    for sub in subscriptions:
        cat = sub.category.strip() if sub.category else 'Uncategorized'
        if not cat:
            cat = 'Uncategorized'
        category_breakdown[cat] = category_breakdown.get(cat, 0) + sub.cost
    return jsonify({
        'total_monthly_cost': total_monthly,
        'total_annual_cost': total_annual,
        'cost_by_category': category_breakdown
    })

@app.route('/subscriptions/<int:sub_id>/cancel', methods=['PATCH'])
def cancel_subscription(sub_id):
    sub = Subscription.query.get(sub_id)
    if not sub:
        return jsonify({'error': 'Subscription not found'}), 404
    sub.canceled = True
    # Delete all reminders for this subscription
    Reminder.query.filter_by(subscription_id=sub.id).delete()
    db.session.commit()
    return jsonify({'message': 'Subscription canceled', 'id': sub.id, 'canceled': sub.canceled})

@app.route('/subscriptions/<int:sub_id>', methods=['PATCH'])
def update_subscription(sub_id):
    sub = Subscription.query.get(sub_id)
    if not sub:
        return jsonify({'error': 'Subscription not found'}), 404
    data = request.json
    try:
        # Only allow editing service_name, cost, and category
        allowed_fields = ['service_name', 'cost', 'category']
        updated = False
        if 'service_name' in data:
            sub.service_name = data['service_name']
            updated = True
        if 'cost' in data:
            sub.cost = data['cost']
            updated = True
        if 'category' in data:
            sub.category = data['category']
            updated = True
        if not updated:
            return jsonify({'error': 'No editable fields provided. Only service_name, cost, and category can be updated.'}), 400
        db.session.commit()
        current_instance = max(sub.instances, key=lambda inst: inst.period_start) if sub.instances else None
        renewal_date = current_instance.period_end.isoformat() if current_instance else None
        return jsonify({
            'id': sub.id,
            'service_name': sub.service_name,
            'cost': sub.cost,
            'renewal_date': renewal_date,
            'payment_status': sub.payment_status,
            'category': sub.category,
            'canceled': sub.canceled
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/subscriptions/<int:sub_id>/pay', methods=['PATCH'])
def mark_subscription_paid(sub_id):
    sub = Subscription.query.get(sub_id)
    if not sub:
        return jsonify({'error': 'Subscription not found'}), 404
    current_instance = max(sub.instances, key=lambda inst: inst.period_start) if sub.instances else None
    today = datetime.today().date()
    if not current_instance or current_instance.period_end != today:
        return jsonify({'error': 'Subscription can only be marked as paid on its renewal date.'}), 400
    try:
        # Move period forward for the current instance
        old_end = current_instance.period_end
        # Handle month rollover
        if old_end.month == 12:
            new_end = old_end.replace(year=old_end.year + 1, month=1)
        else:
            from calendar import monthrange
            next_month = old_end.month + 1
            year = old_end.year
            if next_month > 12:
                next_month = 1
                year += 1
            last_day = monthrange(year, next_month)[1]
            new_day = min(old_end.day, last_day)
            new_end = old_end.replace(year=year, month=next_month, day=new_day)
        # Mark current instance as paid and create next instance
        current_instance.payment_status = 'paid'
        current_instance.paid_at = datetime.utcnow()
        new_instance = SubscriptionInstance(
            subscription_id=sub.id,
            period_start=old_end,
            period_end=new_end,
            payment_status='pending'
        )
        db.session.add(new_instance)
        db.session.commit()
        return jsonify({
            'id': sub.id,
            'service_name': sub.service_name,
            'cost': sub.cost,
            'renewal_date': new_end.isoformat(),
            'payment_status': 'paid',
            'category': sub.category,
            'canceled': sub.canceled
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/subscriptions/<int:sub_id>/instances/<int:instance_id>/pay', methods=['PATCH'])
def pay_subscription_instance(sub_id, instance_id):
    instance = SubscriptionInstance.query.get(instance_id)
    if not instance:
        return jsonify({'error': 'Subscription instance not found'}), 404
    if instance.subscription_id != sub_id:
        return jsonify({'error': 'Instance does not belong to the given subscription'}), 400
    if instance.payment_status == 'paid':
        return jsonify({'error': 'Already paid'}), 400
    today = datetime.today().date()
    # Only block payment if the renewal date (period_end) is in the future
    if instance.period_end > today:
        return jsonify({'error': 'Cannot pay for a future renewal date.'}), 400
    try:
        instance.payment_status = 'paid'
        instance.paid_at = datetime.utcnow()
        db.session.commit()
        # Create the next instance for the next period
        next_start = instance.period_end
        if next_start.month == 12:
            next_end = next_start.replace(year=next_start.year + 1, month=1)
        else:
            from calendar import monthrange
            next_month = next_start.month + 1
            year = next_start.year
            if next_month > 12:
                next_month = 1
                year += 1
            last_day = monthrange(year, next_month)[1]
            new_day = min(next_start.day, last_day)
            next_end = next_start.replace(year=year, month=next_month, day=new_day)
        new_instance = SubscriptionInstance(
            subscription_id=instance.subscription_id,
            period_start=next_start,
            period_end=next_end,
            payment_status='pending'
        )
        db.session.add(new_instance)
        db.session.commit()
        return jsonify({
            'id': instance.id,
            'subscription_id': instance.subscription_id,
            'period_start': instance.period_start.isoformat(),
            'period_end': instance.period_end.isoformat(),
            'payment_status': instance.payment_status,
            'paid_at': instance.paid_at.isoformat() if instance.paid_at else None
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__': 
    app.logger.info('Starting the web server...')
    db.create_all()
    app.run(host="0.0.0.0", port=5000, debug=True,)
