const express = require("express");
const dotenv =require("dotenv")
dotenv.config(); 
const Stripe = require("stripe");
const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

dotenv.config();

router.post("/create-checkout-session", async (req, res) => {
  const { name, email, webinar, price } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: webinar,
              description: `Webinar registration by ${name}`,
            },
            unit_amount: price * 100, // convert ₹ to paise
          },
          quantity: 1,
        },
      ],
      success_url: "http://localhost:5500/frontend/success.html",
      cancel_url: "http://localhost:5500/frontend/cancel.html",
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Payment session creation failed" });
  }
});

module.exports = router;
