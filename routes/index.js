const express=require("express");
const router=express.Router();

const isLoggedIn = require("../middlewares/isLoggedIn");
const productModel=require("../models/product-model");
const userModel=require("../models/user-model");
const orderModel=require("../models/order-model");

router.get("/", (req, res) => {
  const success = req.flash("success");
  const error = req.flash("error");


  res.render("index", { success, error, loggedin: false });
});



router.get("/shop", isLoggedIn, async (req, res) => {
  const { filter, sort } = req.query;
  const success = req.flash("success");
  const error = req.flash("error");

  let query = {};

  // Apply filter
  if (filter === "discounted") {
    query.discount = { $gt: 0 };
  } else if (filter === "available") {
    query.available = true;
  }

  let productsQuery = productModel.find(query);

  // Optional: Apply sorting
  if (sort === "priceLowHigh") {
    productsQuery = productsQuery.sort({ price: 1 });
  } else if (sort === "priceHighLow") {
    productsQuery = productsQuery.sort({ price: -1 });
  } else if (sort === "new") {
    productsQuery = productsQuery.sort({ createdAt: -1 });
  }

  const products = await productsQuery;

  res.render("shop", {
    products,
    success,
    error,
    filter,sort // Pass filter for highlighting
  });
});



router.get("/cart", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id).populate("cart.product");

    let subtotal = 0;

    const cartItems = user.cart
      .filter(item => item.product !== null)
      .map(item => {
        const product = item.product;
        const quantity = item.quantity;
        const price = Number(product.price);
        const discount = Number(product.discount || 0);

        const totalMRP = price * quantity;
        const discountAmount = totalMRP * (discount / 100);
        const netTotal = totalMRP - discountAmount;

        subtotal += netTotal;

        return {
          _id: product._id,
          name: product.name,
          image: product.image,
          bgcolor: product.bgcolor,
          panelcolor: product.panelcolor,
          textcolor: product.textcolor,
          price,
          discount,
          quantity,
          totalMRP,
          discountAmount,
          netTotal
        };
      });

    const cartIsEmpty = cartItems.length === 0;
    const bill = cartIsEmpty ? 0 : subtotal;

    res.render("cart", { cartItems, bill, cartIsEmpty });
  } catch (err) {
    console.error("Error loading cart:", err);
    req.flash("error", "Could not load cart.");
    res.redirect("/shop");
  }
});




router.get("/addtocart/:productid", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);

    const existingItem = user.cart.find(
      item => item.product && item.product.toString() === req.params.productid
    );

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      user.cart.push({
        product: req.params.productid,
        quantity: 1
      });
    }

    await user.save();
    req.flash("success", "Added to cart");
    res.redirect("/shop");
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong while adding to cart.");
    res.redirect("/shop");
  }
});

// Increase quantity
router.post("/cart/increase/:productid", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);
    const item = user.cart.find(i => i.product && i.product.toString() === req.params.productid);
    if (item) item.quantity++;
    await user.save();
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// Decrease quantity or remove
router.post("/cart/decrease/:productid", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);
    const item = user.cart.find(i => i.product && i.product.toString() === req.params.productid);
    if (item && item.quantity > 1) {
      item.quantity--;
    } else {
      user.cart = user.cart.filter(i => i.product.toString() !== req.params.productid);
    }
    await user.save();
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

router.get("/clearcart", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);
    user.cart = [];
    await user.save();
    req.flash("success", "Cart cleared successfully!");
    res.redirect("/cart");
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to clear cart.");
    res.redirect("/cart");
  }
});

router.get("/checkout", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id).populate("cart.product");

    const addresses = user.addresses || [];
    const defaultAddress = addresses.find(addr => addr.isDefault) || addresses[0];
    const defaultAddressId = defaultAddress?._id?.toString();

    const platformFee = 20;
    const shippingFee = 49;

    const cartItems = user.cart
      .filter(item => item.product)
      .map(item => {
        const price = Number(item.product.price);
        const discount = Number(item.product.discount || 0);
        const quantity = item.quantity;

        const totalMRP = price * quantity;
        const discountAmount = +(totalMRP * (discount / 100)).toFixed(2);
        const netTotal = +(totalMRP - discountAmount).toFixed(2);

        return {
          ...item,
          product: item.product,
          quantity,
          discountAmount,
          netTotal
        };
      });

    const subtotal = +cartItems.reduce((sum, item) => sum + item.netTotal, 0).toFixed(2);
    const totalAmount = cartItems.length === 0 ? 0 : +(subtotal + platformFee + shippingFee).toFixed(2);

    res.render("checkout", {
      user,
      addresses,
      defaultAddressId,  
      cartItems,
      totalAmount,
      platformFee,
      shippingFee,
      success: req.flash("success"),
      error: req.flash("error"),
    });
  } catch (err) {
    console.error("Checkout error:", err);
    req.flash("error", "Something went wrong.");
    res.redirect("/cart");
  }
});


router.post("/confirm-cart-order", isLoggedIn, async (req, res) => {
  try {
    const { addressId } = req.body;
    const user = await userModel.findById(req.user._id).populate("cart.product");
    const address = user.addresses.id(addressId);
    if (!address) return res.redirect("/checkout");

    const arrivalDate = new Date();
    arrivalDate.setDate(arrivalDate.getDate() + 5);

    const platformFee = 20;
    const shippingFee = 49;
    let subtotal = 0;

    const cartItems = user.cart.map(item => {
      const product = item.product;
      const quantity = item.quantity;

      const price = product.price;
      const discount = product.discount || 0;

      const discountAmount = price * (discount / 100);
      const netPrice = (price - discountAmount) * quantity;

      subtotal += netPrice;

      return {
        name: product.name,
        image: product.image,
        quantity,
        price,
        discount,
        discountAmount,
        itemTotal: netPrice
      };
    });

    const finalTotal = subtotal + platformFee + shippingFee;

    res.render("cart-confirm", {
      cartItems,
      address,
      arrivalDate,
      finalTotal,
      platformFee,
      shippingFee,
      subtotal
    });

  } catch (err) {
    console.error("Confirm cart order error:", err);
    res.redirect("/checkout");
  }
});




router.post("/place-cart-order", isLoggedIn, async (req, res) => {
  try {
    const { addressId, paymentMethod } = req.body;
    const user = await userModel.findById(req.user._id).populate("cart.product");
    const address = user.addresses.id(addressId);

    const platformFee = 20;
    const shippingFee = 49;

    const validItems = user.cart.filter(item => item.product);

    // Calculate subtotal with discount
    let subtotal = validItems.reduce((sum, item) => {
      const price = item.product.price;
      const discount = item.product.discount || 0;
      const discountAmount = price * (discount / 100);
      const finalPrice = price - discountAmount;
      return sum + finalPrice * item.quantity;
    }, 0);

    // ✅ Round subtotal and totalAmount to 2 decimal places
    subtotal = +subtotal.toFixed(2);
    const totalAmount = +(subtotal + platformFee + shippingFee).toFixed(2);

    const order = await orderModel.create({
      user: req.user._id,
      products: validItems.map(item => ({
        product: item.product._id,
        quantity: item.quantity
      })),
      totalAmount,
       platformFee,        
  shippingFee,
      address: {
        fullname: user.fullname,
        address: address.line1,
        city: address.city,
        pincode: address.pincode,
        state: address.state
      },
      paymentMethod
    });

      user.orders.push(order._id);
    // Clear cart
    user.cart = [];
    await user.save();

    // Estimated delivery date
    const arrivalDate = new Date();
    arrivalDate.setDate(arrivalDate.getDate() + 5);

    // Render order success page
    res.render("order-success", {
      fromOrderId: false, // came from cart
      user,
      address: order.address,
      deliveryDate: arrivalDate,
      products: validItems.map(item => ({
        image: item.product.image,
        name: item.product.name,
        quantity: item.quantity,
        products: validItems.map(item => ({
    image: item.product.image,
    name: item.product.name,
    quantity: item.quantity
  })),
      })),
      totalAmount
    });
  } catch (err) {
    console.error("Place Cart Order Error:", err);
    req.flash("error", "Failed to place order.");
    res.redirect("/checkout");
  }
});




router.get("/logout",isLoggedIn,(req,res)=>{
res.render("shop");
});


router.get('/myaccount', isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);
    res.render('myaccount', { user, success: req.flash('success'), error: req.flash('error') });
  } catch (err) {
    req.flash('error', 'Something went wrong.');
    res.redirect('/');
  }
});

module.exports=router;