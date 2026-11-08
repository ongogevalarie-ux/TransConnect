
from django.utils import timezone
from django.db import transaction

from payments.services.mpesa import query_stk_push


def verify_payment_with_safaricom(payment):
    if not payment.checkout_request_id:
        return False, "No CheckoutRequestID is stored."

    if payment.safaricom_verified:
        return (
            payment.status == "SUCCESS",
            "This payment has already been verified."
        )

    result = query_stk_push(payment.checkout_request_id)

    if result.get("CheckoutRequestID") != payment.checkout_request_id:
        return False, "CheckoutRequestID does not match."

    if (
        payment.merchant_request_id
        and result.get("MerchantRequestID") != payment.merchant_request_id
    ):
        return False, "MerchantRequestID does not match."

    result_code = result.get("ResultCode")

    if result_code is None:
        return False, "Safaricom has not returned a final result."

    result_code = str(result_code)

    with transaction.atomic():
        locked = type(payment).objects.select_for_update().get(
            pk=payment.pk
        )

        if locked.safaricom_verified:
            return locked.status == "SUCCESS", (
                "This payment has already been verified."
            )

        # A successful query alone is insufficient:
        # require a matching callback and receipt.
        if result_code == "0":
            if (
                str(locked.result_code) == "0"
                and locked.mpesa_receipt_number
            ):
                locked.status = "SUCCESS"
                locked.safaricom_verified = True
                locked.verified_at = timezone.now()
                locked.result_description = result.get(
                    "ResultDesc",
                    "Payment verified by Safaricom."
                )
                locked.save()

                return True, "Payment successfully verified."

            return False, (
                "Safaricom reports success, but matching callback "
                "receipt details are not available. Payment remains pending."
            )

        # Only mark failure when the callback also confirms
        # the same result code.
        if (
            locked.result_code is not None
            and str(locked.result_code) == result_code
        ):
            locked.status = "FAILED"
            locked.safaricom_verified = True
            locked.verified_at = timezone.now()
            locked.result_description = result.get(
                "ResultDesc",
                "Safaricom confirmed payment failure."
            )
            locked.save()

            return False, "Safaricom confirmed that the payment failed."

        return False, (
            f"Safaricom returned result code {result_code}: "
            f"{result.get('ResultDesc', 'Unknown result')}. "
            "Payment remains pending for review."
        )
