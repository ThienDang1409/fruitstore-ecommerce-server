const { Cart } = require('../models/cart');
const express = require('express');
const router = express.Router();


router.get(`/`, async (req, res) => {

    try {

        const cartList = await Cart.find(req.query);

        if (!cartList) {
            res.status(500).json({ success: false })
        }

        return res.status(200).json(cartList);

    } catch (error) {
        res.status(500).json({ success: false })
    }
});



router.post('/add', async (req, res) => {
    try{
        const {
            productTitle,
            image,
            rating,
            price,
            quantity,
            subTotal, // Mặc định là 1 nếu không có quantity
            countInStock,
            productId,
            userId
        } = req.body;
        
        console.log('Product ID received in backend', productId);
        console.log('User ID sent from backtend:', userId);
        const cartItem = await Cart.findOne({ productId, userId });
        if (cartItem) {
            // Nếu đã tồn tại, tăng số lượng
            cartItem.quantity += quantity || 1; // Mặc định tăng thêm 1 nếu không có quantity
            cartItem.subTotal = cartItem.price * cartItem.quantity; // Cập nhật subTotal
            await cartItem.save();
            return res.status(200).json({ success: true, message: "Product quantity updated in cart.", cartItem });
        } else {
            let cartList = new Cart({
                productTitle,
                image,
                rating,
                price,
                quantity,
                subTotal,
                productId,
                userId,
                countInStock,
            });
            cartList = await cartList.save();
            if (!cartList) {
                return res.status(500).json({ success: false, message: "Failed to add product to cart." });
            }
            return res.status(201).json({ success: true, message: "Product added to cart.", cartItem: cartList});
        }
    }catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error.", error: error.message });
    }
    

    // if(cartItem.length===0){
    //     let cartList = new Cart({
    //         productTitle: req.body.productTitle,
    //         image: req.body.image,
    //         rating: req.body.rating,
    //         price: req.body.price,
    //         quantity: req.body.quantity,
    //         subTotal: req.body.subTotal,
    //         productId: req.body.productId,
    //         userId: req.body.userId,
    //         countInStock:req.body.countInStock,
    //     });
    
    
    
    //     if (!cartList) {
    //         res.status(500).json({
    //             error: err,
    //             success: false
    //         })
    //     }
    
    
    //     cartList = await cartList.save();
    
    //     res.status(201).json(cartList);
    // }else{
    //     res.status(401).json({status:false,msg:"Product already added in the cart"})
    // }

   

});


router.delete('/:id', async (req, res) => {

    const cartItem = await Cart.findById(req.params.id);

    if (!cartItem) {
        res.status(404).json({ msg: "The cart item given id is not found!" })
    }

    const deletedItem = await Cart.findByIdAndDelete(req.params.id);

    if (!deletedItem) {
        res.status(404).json({
            message: 'Cart item not found!',
            success: false
        })
    }

    res.status(200).json({
        success: true,
        message: 'Cart Item Deleted!'
    })
});



router.get('/:id', async (req, res) => {

    const catrItem = await Cart.findById(req.params.id);

    if (!catrItem) {
        res.status(500).json({ message: 'The cart item with the given ID was not found.' })
    }
    return res.status(200).send(catrItem);
})


router.put('/:id', async (req, res) => {

    const updateData = {
        productTitle: req.body.productTitle,
        image: req.body.image,
        rating: req.body.rating,
        price: req.body.price,
        quantity: req.body.quantity,
        subTotal: req.body.subTotal,
        // countInStock: req.body.countInStock
    };

    const cartList = await Cart.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
    )

    if (!cartList) {
        return res.status(500).json({
            message: 'Cart item cannot be updated!',
            success: false
        })
    }

    res.send(cartList);

})


module.exports = router;

