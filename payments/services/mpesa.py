import base64
import logging
import os
import time
from datetime import datetime
from zoneinfo import ZoneInfo

import requests

logger = logging.getLogger(__name__)

NAIROBI_TZ = ZoneInfo("Africa/Nairobi")

# In-memory token cache (per process). Daraja tokens last ~3600 seconds.
_token_cache = {"token": None, "expires_at": 0}


def _base_url():
    environment = os.getenv("MPESA_ENV", "sandbox")
    return (
        "https://sandbox.safaricom.co.ke"
        if environment == "sandbox"
        else "https://api.safaricom.co.ke"
    )


def _timestamp():
    # Daraja expects Nairobi time, regardless of Django's TIME_ZONE setting.
    return datetime.now(NAIROBI_TZ).strftime("%Y%m%d%H%M%S")


def _password(shortcode, passkey, timestamp):
    raw = f"{shortcode}{passkey}{timestamp}"
    return base64.b64encode(raw.encode("utf-8")).decode("utf-8")


def get_mpesa_access_token(force_refresh=False):
    """Return a cached Daraja OAuth token, fetching a new one only when needed."""

    now = time.time()
    if (
        not force_refresh
        and _token_cache["token"]
        and now < _token_cache["expires_at"]
    ):
        return _token_cache["token"]

    consumer_key = os.getenv("MPESA_CONSUMER_KEY")
    consumer_secret = os.getenv("MPESA_CONSUMER_SECRET")

    if not consumer_key or not consumer_secret:
        raise ValueError("M-Pesa consumer credentials are missing.")

    response = requests.get(
        f"{_base_url()}/oauth/v1/generate",
        params={"grant_type": "client_credentials"},
        auth=(consumer_key, consumer_secret),
        timeout=30,
    )

    if response.status_code == 429:
        raise ValueError("Safaricom rate limit reached. Wait a minute and retry.")

    response.raise_for_status()
    data = response.json()

    _token_cache["token"] = data["access_token"]
    # Refresh 5 minutes early to be safe.
    _token_cache["expires_at"] = now + int(data.get("expires_in", 3599)) - 300

    return _token_cache["token"]


def normalize_phone_number(phone):
    """Convert Kenyan phone numbers to 254XXXXXXXXX format."""

    phone = "".join(filter(str.isdigit, str(phone)))

    if phone.startswith("0") and len(phone) == 10:
        phone = "254" + phone[1:]
    elif (phone.startswith("7") or phone.startswith("1")) and len(phone) == 9:
        phone = "254" + phone

    if len(phone) != 12 or not phone.startswith("254"):
        raise ValueError("Enter a valid Kenyan phone number, e.g. 0712345678.")

    return phone


def initiate_stk_push(phone_number, amount, account_reference):
    """Send an M-Pesa STK Push request to Safaricom."""

    shortcode = os.getenv("MPESA_SHORTCODE")
    passkey = os.getenv("MPESA_PASSKEY")
    callback_url = os.getenv("MPESA_CALLBACK_URL")

    if not shortcode or not passkey:
        raise ValueError("M-Pesa shortcode or passkey is missing.")

    if not callback_url or not callback_url.startswith("https://"):
        raise ValueError("A publicly accessible HTTPS callback URL is required.")

    phone_number = normalize_phone_number(phone_number)

    amount = int(amount)
    if amount < 1:
        raise ValueError("Payment amount must be at least KSh 1.")

    timestamp = _timestamp()

    payload = {
        "BusinessShortCode": shortcode,
        "Password": _password(shortcode, passkey, timestamp),
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": amount,
        "PartyA": phone_number,
        "PartyB": shortcode,
        "PhoneNumber": phone_number,
        "CallBackURL": callback_url,
        "AccountReference": str(account_reference)[:12],
        "TransactionDesc": "Trans-Connect Booking",
    }

    response = requests.post(
        f"{_base_url()}/mpesa/stkpush/v1/processrequest",
        json=payload,
        headers={
            "Authorization": f"Bearer {get_mpesa_access_token()}",
            "Content-Type": "application/json",
        },
        timeout=30,
    )

    if response.status_code == 429:
        raise ValueError("Safaricom rate limit reached. Wait a minute and retry.")

    # Log the body even on errors; Daraja explains the problem there.
    try:
        result = response.json()
    except ValueError:
        result = {}
    logger.info("STK push response (%s): %s", response.status_code, result)

    if not response.ok or result.get("ResponseCode") != "0":
        raise ValueError(
            result.get("errorMessage")
            or result.get("ResponseDescription")
            or "Safaricom did not accept the STK Push request."
        )

    return result


def query_stk_push(checkout_request_id):
    """Query the status of an STK Push request.

    Returns the Daraja JSON. If the transaction is still being processed
    (Daraja returns an error body for that), returns {"pending": True}
    instead of raising, so callers can simply try again later.
    """

    shortcode = os.getenv("MPESA_SHORTCODE")
    passkey = os.getenv("MPESA_PASSKEY")

    if not shortcode or not passkey:
        raise ValueError("M-Pesa shortcode or passkey is missing.")

    timestamp = _timestamp()

    payload = {
        "BusinessShortCode": shortcode,
        "Password": _password(shortcode, passkey, timestamp),
        "Timestamp": timestamp,
        "CheckoutRequestID": checkout_request_id,
    }

    response = requests.post(
        f"{_base_url()}/mpesa/stkpushquery/v1/query",
        json=payload,
        headers={
            "Authorization": f"Bearer {get_mpesa_access_token()}",
            "Content-Type": "application/json",
        },
        timeout=30,
    )

    if response.status_code == 429:
        raise ValueError(
            "Safaricom sandbox rate limit reached. Wait before verifying again."
        )

    try:
        data = response.json()
    except ValueError:
        data = {}

    logger.info("STK query response (%s): %s", response.status_code, data)

    if response.ok:
        return data

    # Daraja answers "still processing" with an error status and errorMessage.
    message = (data.get("errorMessage") or "").lower()
    if "being processed" in message:
        return {"pending": True, "detail": data.get("errorMessage")}

    response.raise_for_status()
    return data