
import os
import base64
import requests

from datetime import datetime
from django.utils import timezone


def get_mpesa_access_token():
    """Generate a Safaricom Daraja OAuth access token."""

    consumer_key = os.getenv("MPESA_CONSUMER_KEY")
    consumer_secret = os.getenv("MPESA_CONSUMER_SECRET")

    if not consumer_key or not consumer_secret:
        raise ValueError("M-Pesa consumer credentials are missing.")

    environment = os.getenv("MPESA_ENV", "sandbox")

    if environment == "sandbox":
        base_url = "https://sandbox.safaricom.co.ke"
    else:
        base_url = "https://api.safaricom.co.ke"

    url = f"{base_url}/oauth/v1/generate"

    response = requests.get(
        url,
        params={"grant_type": "client_credentials"},
        auth=(consumer_key, consumer_secret),
        timeout=30,
    )

    response.raise_for_status()

    return response.json()["access_token"]


def normalize_phone_number(phone):
    """Convert Kenyan phone numbers to 254XXXXXXXXX format."""

    phone = "".join(filter(str.isdigit, str(phone)))

    if phone.startswith("0") and len(phone) == 10:
        phone = "254" + phone[1:]

    elif phone.startswith("7") or phone.startswith("1"):
        if len(phone) == 9:
            phone = "254" + phone

    if len(phone) != 12 or not phone.startswith("254"):
        raise ValueError(
            "Enter a valid Kenyan phone number, e.g. 0712345678."
        )

    return phone


def initiate_stk_push(phone_number, amount, account_reference):
    """Send an M-Pesa STK Push request to Safaricom."""

    shortcode = os.getenv("MPESA_SHORTCODE")
    passkey = os.getenv("MPESA_PASSKEY")
    callback_url = os.getenv("MPESA_CALLBACK_URL")

    if not shortcode or not passkey:
        raise ValueError("M-Pesa shortcode or passkey is missing.")

    if not callback_url or not callback_url.startswith("https://"):
        raise ValueError(
            "A publicly accessible HTTPS callback URL is required."
        )

    phone_number = normalize_phone_number(phone_number)

    amount = int(amount)

    if amount < 1:
        raise ValueError("Payment amount must be at least KSh 1.")

    environment = os.getenv("MPESA_ENV", "sandbox")

    base_url = (
        "https://sandbox.safaricom.co.ke"
        if environment == "sandbox"
        else "https://api.safaricom.co.ke"
    )

    access_token = get_mpesa_access_token()

    timestamp = timezone.localtime().strftime("%Y%m%d%H%M%S")

    password_string = f"{shortcode}{passkey}{timestamp}"

    password = base64.b64encode(
        password_string.encode("utf-8")
    ).decode("utf-8")

    url = f"{base_url}/mpesa/stkpush/v1/processrequest"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    payload = {
        "BusinessShortCode": shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": amount,
        "PartyA": phone_number,
        "PartyB": shortcode,
        "PhoneNumber": phone_number,
        "CallBackURL": callback_url,
        "AccountReference": str(account_reference)[:12],
        "TransactionDesc": "Trans-Connect Booking Payment",
    }

    response = requests.post(
        url,
        json=payload,
        headers=headers,
        timeout=30,
    )

    response.raise_for_status()

    return response.json()
