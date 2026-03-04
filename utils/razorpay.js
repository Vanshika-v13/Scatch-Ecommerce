const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay order
const createRazorpayOrder = async (amount, orderId) => {
  try {
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: "INR",
      receipt: `receipt_${orderId}`,
      notes: {
        orderId: orderId,
      },
    };

    const order = await razorpayInstance.orders.create(options);
    return order;
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    throw error;
  }
};

// Verify Razorpay payment signature
const verifyRazorpaySignature = (orderId, paymentId, signature) => {
  try {
    const message = `${orderId}|${paymentId}`;
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(message);
    const computed_signature = hmac.digest("hex");

    return computed_signature === signature;
  } catch (error) {
    console.error("Error verifying Razorpay signature:", error);
    return false;
  }
};

module.exports = {
  razorpayInstance,
  createRazorpayOrder,
  verifyRazorpaySignature,
};
