const { ProductReviews } = require('../models/productReviews');
const { Product } = require('../models/products');
const express = require('express');
const router = express.Router();


router.get(`/`, async (req, res) => {

    let  reviews=[];

    try {

        if(req.query.productId!==undefined && req.query.productId!==null && req.query.productId!=="" ){
            reviews = await ProductReviews.find({ productId: req.query.productId });
        }else{
            reviews = await ProductReviews.find();
        }


        if (!reviews) {
            res.status(500).json({ success: false })
        }

        return res.status(200).json(reviews);

    } catch (error) {
        res.status(500).json({ success: false })
    }


});

router.get(`/get/count`, async (req, res) =>{
    const productsReviews = await ProductReviews.countDocuments()

    if(!productsReviews) {
        res.status(500).json({success: false})
    } else{
        res.send({
            productsReviews: productsReviews
        });
    }
   
})



router.get('/:id', async (req, res) => {

    const review = await ProductReviews.findById(req.params.id);

    if (!review) {
        res.status(500).json({ message: 'The review with the given ID was not found.' })
    }
    return res.status(200).send(review);
})




router.post('/add', async (req, res) => {
    
    // let review = new ProductReviews({
    //     customerId: req.body.customerId,
    //     customerName: req.body.customerName,
    //     review:req.body.review,
    //     customerRating: req.body.customerRating,
    //     productId: req.body.productId
    // });



    // if (!review) {
    //     res.status(500).json({
    //         error: err,
    //         success: false
    //     })
    // }


    // review = await review.save();
    

    // res.status(201).json(review);

    //AVERAGE RATING
    // try {
    //     // Extract the review data from the request body
    //     const { customerId, customerName, review, customerRating, productId } = req.body;

    //     // Create a new review object
    //     let newReview = new ProductReviews({
    //         customerId,
    //         customerName,
    //         review,
    //         customerRating,
    //         productId
    //     });

    //     // Save the review
    //     newReview = await newReview.save();

    //     // Fetch all reviews for the product
    //     const allReviews = await ProductReviews.find({ productId });

    //     // Calculate the new average rating
    //     const totalRating = allReviews.reduce((acc, cur) => acc + cur.customerRating, 0);
    //     const averageRating = totalRating / allReviews.length;

    //     // Update the product's rating with the new average
    //     await Product.findByIdAndUpdate(productId, { rating: averageRating });

    //     // Send back the response with the review and updated rating
    //     res.status(201).json({
    //         success: true,
    //         review: newReview,
    //         updatedRating: averageRating
    //     });
    // } catch (err) {
    //     // Handle errors and send a response
    //     res.status(500).json({
    //         error: err.message,
    //         success: false
    //     });
    // }
    //AVERAGE AND LIMITED REVIEW IN A DAY
    try {
        const { customerId, customerName, review, customerRating, productId } = req.body;

        // Lấy thời gian bắt đầu và kết thúc của ngày hôm nay
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);  // Lấy giờ bắt đầu ngày hôm nay
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);  // Lấy giờ kết thúc ngày hôm nay

        // Kiểm tra xem người dùng đã đánh giá sản phẩm này trong ngày hôm nay chưa
        const existingReview = await ProductReviews.findOne({
            customerId: customerId,
            productId: productId,
            dateCreated: { $gte: todayStart, $lt: todayEnd }
        });

        // Nếu đã đánh giá trong ngày hôm nay, trả về lỗi
        if (existingReview) {
            return res.status(400).json({
                success: false,
                error: 'You have already reviewed this product today.'
            });
        }

        // Tạo mới một review
        let newReview = new ProductReviews({
            customerId,
            customerName,
            review,
            customerRating,
            productId
        });

        // Lưu review vào cơ sở dữ liệu
        newReview = await newReview.save();

        // Lấy tất cả review của sản phẩm này
        const allReviews = await ProductReviews.find({ productId });

        // Tính toán điểm trung bình của tất cả các review
        const totalRating = allReviews.reduce((acc, cur) => acc + cur.customerRating, 0);
        const averageRating = totalRating / allReviews.length;

        // Cập nhật rating mới cho sản phẩm
        await Product.findByIdAndUpdate(productId, { rating: averageRating });

        // Trả về phản hồi với review mới và rating đã cập nhật
        res.status(201).json({
            success: true,
            review: newReview,
            updatedRating: averageRating
        });
    } catch (err) {
        // Xử lý lỗi và trả về phản hồi lỗi
        res.status(500).json({
            error: err.message,
            success: false
        });
    }

});

// API để thống kê số bình luận theo số sao từ 1 đến 5
router.get('/get/reviews/stats', async (req, res) => {
    try {
      // Sử dụng aggregation pipeline để đếm số lượng đánh giá theo mỗi mức sao từ 1 đến 5
      const statistics = await ProductReviews.aggregate([
        {
          $group: {
            _id: "$customerRating",  // Group by customerRating (số sao)
            count: { $sum: 1 }  // Tính tổng số bình luận cho mỗi mức sao
          }
        },
        {
          $match: { _id: { $gte: 1, $lte: 5 } }  // Lọc số sao trong khoảng từ 1 đến 5
        },
        {
          $sort: { _id: 1 }  // Sắp xếp kết quả theo số sao từ thấp đến cao
        }
      ]);
  
      // Nếu không có đánh giá nào, gán giá trị mặc định
      const result = [];
      for (let i = 1; i <= 5; i++) {
        const stat = statistics.find(item => item._id === i);
        result.push({
          rating: i,
          count: stat ? stat.count : 0  // Nếu không có bình luận, gán là 0
        });
      }
  
      res.status(200).json(result);  // Trả về kết quả thống kê
    } catch (error) {
      res.status(500).json({ message: "Error fetching statistics", error });
    }
  });

module.exports = router;

