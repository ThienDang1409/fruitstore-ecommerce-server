const { Orders } = require('../models/orders');


const express = require('express');
const router = express.Router();
const paypal = require('@paypal/checkout-server-sdk');
const  client  = require('../helper/paypal/paypal.config');
const { User } = require('../models/user');

router.get(`/user`, async (req, res) => {

    try {
    

        const ordersList = await Orders.find(req.query)


        if (!ordersList) {
            res.status(500).json({ success: false })
        }

        return res.status(200).json(ordersList);

    } catch (error) {
        res.status(500).json({ success: false })
    }
});
router.get(`/`, async (req, res) => {

    try {
        const { page = 1, limit = 10, q } = req.query;

        // Chuyển đổi sang số nguyên
        const pageInt = parseInt(page);
        const limitInt = parseInt(limit);

        const searchQuery = q
            ? {
                $or: [
                    { name: { $regex: q, $options: "i" } }, // Tìm theo tên
                    { email: { $regex: q, $options: "i" } }, // Tìm theo email
                    { phoneNumber: { $regex: q, $options: "i" } }, // Tìm theo số điện thoại
                ],
            }
            : {};

        // Lấy danh sách hóa đơn, phân trang và sắp xếp
        const ordersList = await Orders.find(searchQuery)
            .sort({ date: -1 }) // Sắp xếp theo ngày mới nhất
            .skip(limitInt ? (pageInt - 1) * limitInt : 0) // Bỏ qua các hóa đơn trước trang hiện tại
            .limit(limitInt || 0); // Lấy số lượng hóa đơn theo limit
        
        console.log(("orde : ", ordersList))
        const totalOrders = await Orders.countDocuments(searchQuery); // Tổng số hóa đơn

        return res.status(200).json({
            orders: ordersList,
            currentPage: pageInt,
            totalPages: Math.ceil(totalOrders / limitInt),
            totalOrders,
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

router.get('/:id', async (req, res) => {

    const order = await Orders.findById(req.params.id);

    if (!order) {
        res.status(500).json({ message: 'The order with the given ID was not found.' })
    }
    return res.status(200).send(order);
})

router.get(`/get/count`, async (req, res) =>{
    const orderCount = await Orders.countDocuments()

    if(!orderCount) {
        res.status(500).json({success: false})
    } else{
        res.send({
            orderCount: orderCount
        });
    }
})

router.post('/create', async (req, res) => {

    try{
        const { name, phoneNumber, address, pincode, amount, payment, email, userid, products, date, orderDiscount } = req.body;

        if (!['Cash on Delivery', 'Paypal'].includes(payment)) {
            return res.status(400).json({ success: false, message: 'Invalid payment method.'});
        }

        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount.' });
          }

        const newOrder = new Orders({
            name,
            phoneNumber,
            address,
            pincode,
            amount,
            payment, 
            email,
            userid,
            products,
            date,
            orderDiscount,
            status: 'pending' 
        });

        const savedOrder = await newOrder.save();
        return res.status(201).json(savedOrder);
    }catch(error){
        console.error('Error while creating order:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});


router.delete('/:id', async (req, res) => {

    const deletedOrder = await Orders.findByIdAndDelete(req.params.id);

    if (!deletedOrder) {
        res.status(404).json({
            message: 'Order not found!',
            success: false
        })
    }

    res.status(200).json({
        success: true,
        message: 'Order Deleted!'
    })
});


router.put('/:id', async (req, res) => {

    try {
        const { name, phoneNumber, address, pincode, amount, payment, email, userid, products, status, date } = req.body;

        // Nếu cập nhật phương thức thanh toán, kiểm tra giá trị
        if (payment && !['Cash on Delivery', 'Paypal'].includes(payment)) {
            return res.status(400).json({ success: false, message: 'Invalid payment method.' });
        }

        // Tìm đơn hàng cần cập nhật
        const order = await Orders.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        // Cập nhật các trường thông tin
        order.name = name || order.name;
        order.phoneNumber = phoneNumber || order.phoneNumber;
        order.address = address || order.address;
        order.pincode = pincode || order.pincode;
        order.amount = amount || order.amount;
        order.payment = payment || order.payment;
        order.email = email || order.email;
        order.userid = userid || order.userid;
        order.products = products || order.products;
        order.status = status || order.status;
        order.date = date || order.date;

        const updatedOrder = await order.save();
        return res.status(200).json(updatedOrder);
    } catch (error) {
        console.error('Order cannot be updated!', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }

})

router.post('/create-paypal-order', async(req, res) => {

    try{
        const { orderId } = req.body;

        const order = await Orders.findById(orderId);
        if(!order){
            return res.status(404).json({ success: false, message: 'Order not found.'})
        }

        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer("return=representation");
        request.requestBody({
            intent: 'CAPTURE',
            purchase_units: [
                {
                    reference_id: orderId, // Tham chiếu đến ID đơn hàng của bạn
                    amount: {
                        currency_code: 'USD', // Đổi thành 'INR' nếu cần
                        value: order.amount.toFixed(2), // Tổng tiền đơn hàng
                    },
                    description: `Order ID: ${orderId}`,
                },
            ],
        });

        const paypalOrder = await client.execute(request);
        return res.status(201).json({
            id: paypalOrder.result.id, // ID của giao dịch PayPal
            status: paypalOrder.result.status,
            links: paypalOrder.result.links
        });
    }catch(error){
        console.error('Error when creating PayPal application!', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
})

router.post('/capture-paypal-order', async (req, res) => {
    try {
        const { paypalOrderId, orderId } = req.body;

        const order = await Orders.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        // Capture đơn PayPal
        const request = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
        request.requestBody({});

        const capture = await client.execute(request);

        if (capture.result.status === 'COMPLETED') {
            // Cập nhật trạng thái đơn hàng
            order.status = 'paid';
            order.payment = 'Paypal';
            await order.save();

            return res.status(200).json({
                success: true,
                message: 'Payment successful!',
                order,
                paypalResponse: capture.result,
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Payment has not been completed!',
                status: capture.result.status,
            });
        }
    } catch (error) {
        console.error('Error capture PayPal:', error);
        return res.status(500).json({ success: false, message: 'Sever error.' });
    }
});
// Đếm số lượng đơn hàng theo trạng thái
router.get('/get/data/status-summary', async (req, res) => {
    try {
      const statusSummary = await Orders.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }, // Đếm số lượng các trạng thái
          },
        },
      ]);
  
      console.log("Status Summary:", statusSummary);
  
      const formattedData = statusSummary.map((item) => ({
        name: item._id, // Tên trạng thái (Pending, Shipped, Delivered)
        value: item.count, // Tổng số lượng
      }));
  
      console.log("Formatted Data:", formattedData);
  
      res.status(200).json(formattedData);
    } catch (error) {
      console.error("Error fetching order status summary:", error.message);
      res.status(500).json({ success: false, message: "Internal Server Error." });
    }
  });
  
  router.get('/get/data/most-sold-products', async (req, res) => {
    try {
        const mostSoldProducts = await Orders.aggregate([
            { 
                $unwind: "$products"  // Mở rộng mảng products để xử lý từng sản phẩm
            },
            {
                $group: {
                    _id: "$products.productId",  // Nhóm theo productId
                    totalQuantity: { $sum: "$products.quantity" },  // Tính tổng số lượng của mỗi sản phẩm
                    productTitle: { $first: "$products.productTitle" },  // Lấy tên sản phẩm đầu tiên (cùng productId)
                    image: { $first: "$products.image" },  // Lấy ảnh sản phẩm đầu tiên
                    price: { $first: "$products.price" },  // Lấy giá sản phẩm đầu tiên
                }
            },
            {
                $sort: { totalQuantity: -1 }  // Sắp xếp theo số lượng bán được, từ cao xuống thấp
            },
            {
                $limit: 10  // Giới hạn số lượng sản phẩm bán nhiều nhất (ví dụ: 10 sản phẩm bán chạy nhất)
            }
        ]);

        // Trả về kết quả danh sách sản phẩm bán chạy
        res.status(200).json(mostSoldProducts);
    } catch (error) {
        res.status(500).json({ message: "Error fetching most sold products", error });
    }
});

// API để lấy tổng doanh thu theo năm
// router.get('/get/data/stats/sales', async (req, res) => {
//     try {
//       // Tính toán tổng doanh thu theo từng năm
//       const salesData = await Orders.aggregate([
//         {
//           $project: {
//             year: { $year: "$date" }, // Lấy năm từ trường "date"
//             amount: { $toDouble: "$amount" } // Chuyển "amount" thành số để tính toán
//           }
//         },
//         {
//           $group: {
//             _id: "$year", // Nhóm theo năm
//             totalSales: { $sum: "$amount" } // Tính tổng doanh thu theo năm
//           }
//         },
//         {
//           $sort: { _id: 1 } // Sắp xếp theo năm
//         }
//       ]);
  
//       // Định dạng lại dữ liệu cho phù hợp với biểu đồ
//       const formattedSalesData = salesData.map(item => ({
//         year: item._id.toString(),
//         sales: item.totalSales
//       }));
  
//       res.status(200).json(formattedSalesData);
//     } catch (error) {
//       res.status(500).json({ message: "Error fetching sales data", error });
//     }
//   });



router.get("/get/data/stats/sales", async (req, res) => {
    const { fromDate, toDate, groupBy } = req.query;
  
    if (!fromDate || !toDate || !groupBy) {
      return res.status(400).json({ message: "Missing required parameters." });
    }
  
    try {
      const match = {
        date: {
          $gte: new Date(fromDate),
          $lte: new Date(toDate),
        },
      };
  
      let groupStage = {};
      switch (groupBy) {
        case "day":
          groupStage = {
            _id: { day: { $dayOfMonth: "$date" }, month: { $month: "$date" }, year: { $year: "$date" } },
            totalSales: { $sum: { $toDouble: "$amount" } },
          };
          break;
        case "month":
          groupStage = {
            _id: { month: { $month: "$date" }, year: { $year: "$date" } },
            totalSales: { $sum: { $toDouble: "$amount" } },
          };
          break;
        case "quarter":
          groupStage = {
            _id: { quarter: { $ceil: { $divide: [{ $month: "$date" }, 3] } }, year: { $year: "$date" } },
            totalSales: { $sum: { $toDouble: "$amount" } },
          };
          break;
        case "year":
          groupStage = {
            _id: { year: { $year: "$date" } },
            totalSales: { $sum: { $toDouble: "$amount" } },
          };
          break;
        default:
          return res.status(400).json({ message: "Invalid groupBy value." });
      }
  
      const salesData = await Orders.aggregate([
        { $match: match },
        { $group: groupStage },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
      ]);
  
      res.json(salesData.map(item => ({
        label: groupBy === "day" 
          ? `${item._id.year}-${item._id.month}-${item._id.day}`
          : groupBy === "month"
          ? `${item._id.year}-${item._id.month}`
          : groupBy === "quarter"
          ? `Q${item._id.quarter} ${item._id.year}`
          : `${item._id.year}`,
        sales: item.totalSales,
      })));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching sales data", error });
    }
  });

  router.put('/client-update/:id', async (req, res) => {
    try {
        const { status } = req.body; // Client chỉ cập nhật status
        const order = await Orders.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        // Kiểm tra logic trạng thái từ phía client
        // pending -> cancel (nếu payment=COD)
        if (order.status === 'pending' && order.payment === 'Cash on Delivery' && status === 'cancel') {
            order.status = 'cancel';
            await order.save();
            return res.status(200).json(order);
        }

        // verify -> paid
        if (order.status === 'verify' && status === 'paid') {
            order.status = 'paid';
            await order.save();
            // Cập nhật totalSpent khi order chuyển sang paid
            const updatedUser = await User.findByIdAndUpdate(
                order.userid,
                { $inc: { totalSpent: order.amount } },
                { new: true }
            );
            
            return res.status(200).json({
                success: true,
                message: 'Order paid successfully!',
                order,
                updatedUser
            });
            // return res.status(200).json(order);
        }

        // Nếu đã là cancel hoặc paid thì không cập nhật được nữa
        if (order.status === 'cancel' || order.status === 'paid') {
            return res.status(400).json({ success: false, message: 'Cannot update a cancelled or paid order.' });
        }
        
        // Nếu request cập nhật status không phù hợp logic
        return res.status(400).json({ success: false, message: 'Invalid status transition.' });

    } catch (error) {
        console.error('Order cannot be updated by client!', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.put('/admin-update/:id', async (req, res) => {
  try {
      const { status } = req.body; // Admin chỉ cập nhật status
      const order = await Orders.findById(req.params.id);

      if (!order) {
          return res.status(404).json({ success: false, message: 'Order not found.' });
      }

      // pending -> verify
      if (order.status === 'pending' && status === 'verify') {
          order.status = 'verify';
          await order.save();
          return res.status(200).json(order);
      }

      // Nếu order đã là verify, cancel, paid => admin không cập nhật nữa
      if (['verify', 'cancel', 'paid'].includes(order.status)) {
          return res.status(400).json({ success: false, message: 'Cannot update order after it has been verified/cancelled/paid.' });
      }

      return res.status(400).json({ success: false, message: 'Invalid status transition.' });

  } catch (error) {
      console.error('Order cannot be updated by admin!', error);
      return res.status(500).json({ success: false, message: 'Server error.' });
  }
});
module.exports = router;

