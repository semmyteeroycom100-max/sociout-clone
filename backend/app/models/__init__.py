from app.models.user import User
from app.models.thumbnail import ThumbnailTest
from app.models.oauth import OAuthToken
from app.models.campaign import Campaign, CampaignAction, CampaignTemplate, CampaignStatus, CampaignActionType
from app.models.subscriptions import SubscriptionPlan, UserSubscription
from app.models.action_job import ActionJob
from app.models.action_log import ActionLog
from app.models.pool_account import PoolAccount
from app.models.activity import ActivityLog
from app.models.ad import Ad, AdSlotPrice
from app.models.article import Article
from app.models.feedback import Feedback
from app.models.support import SupportContribution
from app.models.admin_action import AdminAction
from app.models.referral import Referral  # <-- ADDED

__all__ = [
    'User',
    'ThumbnailTest',
    'OAuthToken',
    'Campaign',
    'CampaignAction',
    'CampaignTemplate',
    'CampaignStatus',
    'CampaignActionType',
    'SubscriptionPlan',
    'UserSubscription',
    'ActionJob',
    'ActionLog',
    'PoolAccount',
    'ActivityLog',
    'Ad',
    'AdSlotPrice',
    'Article',
    'Feedback',
    'SupportContribution',
    'AdminAction',
    'Referral',          # <-- ADDED
]