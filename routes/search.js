const { Product } = require("../models/products.js");
const { Post } = require("../models/post.js");
const { User } = require("../models/user.js");
const { Orders } = require("../models/orders.js");
const { PromotionCode } = require("../models/promotionCode.js");
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

router.get("/", async (req, res) => {
  try {
    const query = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 10; 
    let totalPosts = 0;
    let totalPages = 0;

    if (!query) {
      return res.status(400).json({ msg: "Query is required" });
    }

    const searchConditions = {
      $or: [
        { name: { $regex: query, $options: "i" } },
        { brand: { $regex: query, $options: "i" } },
        { catName: { $regex: query, $options: "i" } },
      ],
    };

    // Đếm tổng số kết quả
    totalPosts = await Product.countDocuments(searchConditions);
    totalPages = Math.ceil(totalPosts / perPage);

    // Lấy dữ liệu phân trang
    const items = await Product.find(searchConditions)
      .populate("category")
      .skip((page - 1) * perPage)
      .limit(perPage);

    return res.status(200).json({
      products: items,
      totalPages: totalPages,
      page: page,
      totalPosts: totalPosts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
})
router.get("/product", async (req, res) => {
  try {
    const query = req.query.q;

    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage);
    var totalPosts = [];
    var totalPages = 0;

    if (!query) {
      return res.status(400).json({ msg: "Query is required" });
    }

    if (req.query.page !== ""  && req.query.page !== undefined && req.query.perPage !== "" && req.query.perPage !== undefined) {
      const items = await Product.find({
        $or: [
          { name: { $regex: query, $options: "i" } },
          { brand: { $regex: query, $options: "i" } },
          { catName: { $regex: query, $options: "i" } },
        ],
      })
        .populate("category")
       

        totalPosts = await items.length;
        totalPages = Math.ceil(totalPosts / perPage);

        return res.status(200).json({
            products: items,
            totalPages: totalPages,
            page: page,
          });

    } else {
      const items = await Product.find({
        $or: [
          { name: { $regex: query, $options: "i" } },
          { brand: { $regex: query, $options: "i" } },
          { catName: { $regex: query, $options: "i" } },
        ],
      });

      res.json(items);
    }
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});


// Tìm kiếm bài viết
router.get("/post", async (req, res) => {
  try {
    const query = req.query.q;

    // Lấy tham số page và perPage từ query params
    const page = parseInt(req.query.page) || 1; // Default to 1 if not provided
    const perPage = parseInt(req.query.perPage) || 10; // Default to 10 if not provided
    let totalPosts = 0;
    let totalPages = 0;

    // Kiểm tra xem query có tồn tại hay không
    if (!query) {
      return res.status(400).json({ msg: "Query is required" });
    }

    // Tìm kiếm bài viết với các tiêu chí
    const searchConditions = {
      $or: [
        { title: { $regex: query, $options: "i" } },
        { content: { $regex: query, $options: "i" } },
        { author: { $regex: query, $options: "i" } },
        { tags: { $regex: query, $options: "i" } },
      ],
    };

    // Nếu có tham số page và perPage, thực hiện phân trang
    if (page && perPage) {
      // Tìm các bài viết với phân trang
      const items = await Post.find(searchConditions)
        .skip((page - 1) * perPage)  // Bỏ qua các bài viết đã qua
        .limit(perPage)  // Giới hạn số lượng bài viết trả về
        .populate("title");

      // Tính tổng số bài viết
      totalPosts = await Post.countDocuments(searchConditions);

      // Tính tổng số trang
      totalPages = Math.ceil(totalPosts / perPage);

      return res.status(200).json({
        data: items,
        totalPages: totalPages,
        page: page,
        totalPosts: totalPosts,
      });
    } else {
      // Nếu không có phân trang, trả về tất cả bài viết khớp với query
      const items = await Post.find(searchConditions).populate("title");

      return res.json({data: items});
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});


// Tìm kiếm người dùng
router.get("/user", async (req, res) => {
  try {
    const query = req.query.q;

    // Lấy tham số page và perPage từ query params
    const page = parseInt(req.query.page) || 1; // Default to 1 if not provided
    const perPage = parseInt(req.query.perPage) || 10; // Default to 10 if not provided
    let totalUsers = 0;
    let totalPages = 0;

    // Kiểm tra xem query có tồn tại hay không
    if (!query) {
      return res.status(400).json({ msg: "Query is required" });
    }

    // Tìm kiếm bài viết với các tiêu chí
    const searchConditions = {
      $or: [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { phone: { $regex: query, $options: "i" } },
      ],
    };

    // Nếu có tham số page và perPage, thực hiện phân trang
    if (page && perPage) {
      // Tìm các bài viết với phân trang
      const items = await User.find(searchConditions)
        .skip((page - 1) * perPage)  // Bỏ qua các bài viết đã qua
        .limit(perPage)  // Giới hạn số lượng bài viết trả về
        .populate("name");

      // Tính tổng số bài viết
      totalUsers = await User.countDocuments(searchConditions);

      // Tính tổng số trang
      totalPages = Math.ceil(totalUsers / perPage);
      console.log(items);

      return res.status(200).json({
        data: items,
        totalPages: totalPages,
        page: page,
        totalUsers: totalUsers,
      });
    } else {
      // Nếu không có phân trang, trả về tất cả bài viết khớp với query
      const items = await User.find(searchConditions).populate("name");

      return res.json({data: items});
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.get("/order", async (req, res) => {
  try {
    const query = req.query.q;

    // Kiểm tra xem query có tồn tại hay không
    if (!query) {
      return res.status(400).json({ msg: "Query is required" });
    }

    // Tìm kiếm đơn hàng với các tiêu chí
    const searchConditions = {
      $or: [
        { name: { $regex: query, $options: "i" } },
        { phoneNumber: { $regex: query, $options: "i" } },
        { address: { $regex: query, $options: "i" } },
        { pincode: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { status: { $regex: query, $options: "i" } },
      ],
    };

    // Tìm tất cả đơn hàng khớp với query
    const orders = await Orders.find(searchConditions);
    console.log(orders);
    // Trả về danh sách đơn hàng
    return res.status(200).json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});
router.get("/promotionCode", async (req, res) => {
  try {
    const query = req.query.q;

    // Kiểm tra xem query có tồn tại hay không
    if (!query) {
      return res.status(400).json({ msg: "Query is required" });
    }

    // Tìm kiếm đơn hàng với các tiêu chí
    const searchConditions = {
      $or: [
        { code: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ],
    };

    // Tìm tất cả đơn hàng khớp với query
    const promotionCodes = await PromotionCode.find(searchConditions);
    console.log(promotionCodes);
    // Trả về danh sách đơn hàng
    return res.status(200).json({data: promotionCodes});
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
