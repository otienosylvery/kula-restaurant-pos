import axios from 'axios';

const MPESA_BASE_URL = 'https://sandbox.safaricom.co.ke';

export async function getAccessToken() {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    const res = await axios.get(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
            Authorization: `Basic ${auth}`,
        },
    }
    );
    return res.data.access_token;
}

export async function initiateSTKPush(phoneNumber, amount, orderId) {
    const accessToken = await getAccessToken();
    const timestamp = new Date()
        .toISOString()
        .replace(/[^0-9]/g, "")
        .slice(0, -3);

    const password = Buffer.from(
        `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64');

    returnaxios.post(
        `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
        {
            BusinessShortCode: process.env.MPESA_SHORTCODE,
            password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: amount,
            PartyA: phone,
            PartyB: process.env.MPESA_SHORTCODE,
            PhoneNumber: phone,
            CallBackURL: `${process.env.CALLBACK_URL}/api/mpesa/callback`,
            AccountReference: orderId,
            TransactionDesc: `Payment for order ${orderId}`,
        },
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

}