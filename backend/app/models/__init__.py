# backend/app/models/__init__.py

# Simple import approach - import everything
# The order matters for relationship resolution

from app.models.user import User
from app.models.oauth import OAuthToken
from app.models.activity import ActivityLog
from app.models.campaign import Campaign, CampaignAction, CampaignTemplate
from app.models.action_job import ActionJob
from app.models.action_log import ActionLog
from app.models.pool_account import PoolAccount
from app.models.ad import Ad, AdSlotPrice
from app.models.subscriptions import SubscriptionPlan, UserSubscription

__all__ = [
    'User',
    'Campaign',
    'CampaignAction',
    'CampaignTemplate',
    'ActivityLog',
    'OAuthToken',
    'ActionJob',
    'ActionLog',
    'PoolAccount',
    'Ad',
    'AdSlotPrice',
    'SubscriptionPlan',
    'UserSubscription',
]