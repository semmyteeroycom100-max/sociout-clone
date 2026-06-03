import os
import resend
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.getenv("re_VVaXHvHb_Fh46dKjhzdPsNorrfzqAiw5E")
FROM_EMAIL = os.getenv("sociout_clone")  # Must be verified in Resend

def send_campaign_completion_email(to_email, campaign_name, status, successful_actions, total_actions):
    if not resend.api_key:
        print("RESEND_API_KEY not set")
        return
    if not FROM_EMAIL:
        print("FROM_EMAIL not set")
        return
    if not to_email or '@' not in to_email:
        print(f"Invalid recipient: {to_email}")
        return

    subject = f"Campaign '{campaign_name}' – {status}"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
        <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 8px; padding: 20px;">
            <h2 style="color: #333;">Your campaign has {status}</h2>
            <p><strong>Campaign:</strong> {campaign_name}</p>
            <p><strong>Status:</strong> {status.upper()}</p>
            <p><strong>Actions succeeded:</strong> {successful_actions} / {total_actions}</p>
            <hr>
            <p><a href="https://sociout-clone.vercel.app/dashboard" style="background: #3b82f6; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">View Dashboard</a></p>
            <p style="color: #666; font-size: 12px;">Sent from your Sociout Clone</p>
        </div>
    </body>
    </html>
    """
    try:
        resend.Emails.send(
            from_=FROM_EMAIL,
            to=to_email,
            subject=subject,
            html=html
        )
        print(f"Email sent to {to_email} for {campaign_name}")
    except Exception as e:
        print(f"Failed to send email: {e}")