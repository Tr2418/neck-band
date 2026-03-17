# notifications/notify.py
# -----------------------------------------------------------
# CervicalSentinel – Push Notification Handler
#
# When an alert is triggered the system needs to notify the
# user's mobile device.  This module supports two methods:
#
#   1. Console notification  – always available, prints to
#      the server terminal (great for development / testing).
#
#   2. Firebase Cloud Messaging (FCM) – sends a real push
#      notification to an Android / iOS app.
#      Requires FCM_SERVER_KEY to be set in config.py.
#
# To use FCM:
#   a. Create a Firebase project at https://console.firebase.google.com
#   b. Add your Android / iOS app to the project.
#   c. Copy the Server Key from Project Settings → Cloud Messaging.
#   d. Set FCM_SERVER_KEY in config.py (or as an environment variable).
# -----------------------------------------------------------

import sys
import os
import json
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from config import FCM_SERVER_KEY, FCM_API_URL

try:
    import requests
    _requests_available = True
except ImportError:
    _requests_available = False


def _console_notify(title, body, severity):
    """Print a formatted notification to the terminal."""
    icon = "🔴" if severity == "Alert" else "🟡"
    line = "=" * 60
    print(f"\n{line}")
    print(f"  {icon}  CERVICAL SENTINEL NOTIFICATION")
    print(f"  Time    : {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC")
    print(f"  Title   : {title}")
    print(f"  Message : {body}")
    print(f"  Level   : {severity}")
    print(f"{line}\n")


def _fcm_notify(fcm_tokens, title, body):
    """
    Send a push notification via Firebase Cloud Messaging.

    Parameters
    ----------
    fcm_tokens : list[str]  device registration tokens
    title      : str        notification title
    body       : str        notification body text

    Returns
    -------
    bool  True if the request succeeded, False otherwise
    """
    if not _requests_available:
        print("[Notify] 'requests' library not installed – skipping FCM.")
        return False

    if not FCM_SERVER_KEY:
        print("[Notify] FCM_SERVER_KEY not configured – skipping FCM push.")
        return False

    if not fcm_tokens:
        print("[Notify] No registered devices – skipping FCM push.")
        return False

    headers = {
        "Content-Type":  "application/json",
        "Authorization": f"key={FCM_SERVER_KEY}",
    }
    payload = {
        "registration_ids": fcm_tokens,
        "notification": {
            "title": title,
            "body":  body,
            "sound": "default",
        },
        "data": {
            "title": title,
            "body":  body,
        },
    }

    try:
        response = requests.post(FCM_API_URL, headers=headers,
                                 data=json.dumps(payload), timeout=5)
        if response.status_code == 200:
            print(f"[Notify] FCM push sent to {len(fcm_tokens)} device(s).")
            return True
        else:
            print(f"[Notify] FCM error {response.status_code}: {response.text}")
            return False
    except Exception as exc:
        print(f"[Notify] FCM request failed: {exc}")
        return False


def send_alert(severity, message, fcm_tokens=None):
    """
    Send a posture / muscle alert notification.

    Parameters
    ----------
    severity   : str        'Warning' or 'Alert'
    message    : str        human-readable description
    fcm_tokens : list[str]  optional FCM device tokens

    Returns
    -------
    dict  {"console": True, "fcm": bool}
    """
    title = (
        "⚠️ CervicalSentinel Warning"
        if severity == "Warning"
        else "🚨 CervicalSentinel Alert – Action Required!"
    )

    # Always print to console
    _console_notify(title, message, severity)

    # Attempt FCM push notification
    fcm_success = False
    if fcm_tokens:
        fcm_success = _fcm_notify(fcm_tokens, title, message)

    return {"console": True, "fcm": fcm_success}
