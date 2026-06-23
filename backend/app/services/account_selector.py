from sqlalchemy.orm import Session
from app.models.pool_account import PoolAccount
from datetime import datetime, date
import random

class AccountSelector:
    def __init__(self, db: Session):
        self.db = db

    def select_account(self, action_type: str):
        """
        Select the best available account for the given action type.
        Uses round‑robin with quota and cooldown awareness.
        """
        now = datetime.utcnow()
        today = date.today()

        # Build query for active accounts
        query = self.db.query(PoolAccount).filter(
            PoolAccount.status == 'active',
            PoolAccount.cooldown_until <= now
        )

        # Apply daily quota limits based on action type
        if action_type == 'subscribe':
            query = query.filter(
                (PoolAccount.last_reset_date < today) | (PoolAccount.daily_subscribe_count < 75)
            )
        elif action_type == 'like':
            query = query.filter(
                (PoolAccount.last_reset_date < today) | (PoolAccount.daily_like_count < 200)
            )
        elif action_type == 'comment':
            query = query.filter(
                (PoolAccount.last_reset_date < today) | (PoolAccount.daily_comment_count < 100)
            )

        # Order by last_used_at (round‑robin) and limit to 1
        account = query.order_by(PoolAccount.last_used_at.asc()).first()

        if account:
            # Reset daily counts if new day
            if account.last_reset_date < today:
                account.daily_subscribe_count = 0
                account.daily_like_count = 0
                account.daily_comment_count = 0
                account.last_reset_date = now
                self.db.commit()

        return account

    def mark_used(self, account_id, action_type: str):
        """Update account usage counters after a successful action."""
        account = self.db.query(PoolAccount).filter(PoolAccount.id == account_id).first()
        if account:
            if action_type == 'subscribe':
                account.daily_subscribe_count += 1
            elif action_type == 'like':
                account.daily_like_count += 1
            elif action_type == 'comment':
                account.daily_comment_count += 1
            account.last_used_at = datetime.utcnow()
            self.db.commit()

    def mark_rate_limited(self, account_id, cooldown_minutes: int = 60):
        """Mark account as rate‑limited with a cooldown."""
        account = self.db.query(PoolAccount).filter(PoolAccount.id == account_id).first()
        if account:
            account.status = 'rate_limited'
            account.cooldown_until = datetime.utcnow() + timedelta(minutes=cooldown_minutes)
            self.db.commit()

    def mark_suspended(self, account_id):
        """Permanently suspend an account."""
        account = self.db.query(PoolAccount).filter(PoolAccount.id == account_id).first()
        if account:
            account.status = 'suspended'
            self.db.commit()