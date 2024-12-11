
const { Post } = require('../models/post');
const express = require('express');
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const { ImageUpload } = require("../models/imageUpload.js");
const mongoose = require("mongoose");

const cloudinary = require("cloudinary").v2;


cloudinary.config({
    cloud_name: process.env.cloudinary_Config_Cloud_Name,
    api_key: process.env.cloudinary_Config_api_key,
    api_secret: process.env.cloudinary_Config_api_secret,
    secure: true,
  });
  
  var imagesArr = [];
  
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "uploads");
    },
    filename: function (req, file, cb) {
      cb(null, `${Date.now()}_${file.originalname}`);
    },
  });
  
  const upload = multer({ storage: storage });
  
  router.post(`/upload`, upload.array("images"), async (req, res) => {
    imagesArr = [];
  
    try {
      for (let i = 0; i < req.files?.length; i++) {
        const options = {
          use_filename: true,
          unique_filename: false,
          overwrite: false,
        };
  
        const img = await cloudinary.uploader.upload(
          req.files[i].path,
          options,
          function (error, result) {
            imagesArr.push(result.secure_url);
            fs.unlinkSync(`uploads/${req.files[i].filename}`);
          }
        );
      }
  
      let imagesUploaded = new ImageUpload({
        images: imagesArr,
      });
  
      imagesUploaded = await imagesUploaded.save();
      return res.status(200).json(imagesArr);
    } catch (error) {
      console.log(error);
    }
  });


// Get all posts with catgory filter
  router.get(`/catId`, async (req, res) => {
    let postList = [];
  
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage);
    const totalPosts = await Post.countDocuments();
    const totalPages = Math.ceil(totalPosts / perPage);
  
    if (page > totalPages) {
      return res.status(404).json({ message: "Page not found" });
    }
  
    if (req.query.page !== undefined && req.query.perPage !== undefined) {
      const postListArr = await Post.find({ catId: req.query.catId })
        .populate("category")
        .skip((page - 1) * perPage)
        .limit(perPage)
        .exec();
  
      return res.status(200).json({
        data: postListArr,
        totalPages: totalPages,
        page: page,
      });
    } else {
      const postListArr = await Post.find({ catId: req.query.catId });
  
      for (let i = 0; i < postListArr.length; i++) {
        //console.log(productList[i].location)
        for (let j = 0; j < postListArr[i].location.length; j++) {
          if (postListArr[i].location[j].value === req.query.location) {
            postList.push(postListArr[i]);
          }
        }
      }
  
      if (req.query.location !== "All") {
        return res.status(200).json({
          data: postList,
          totalPages: totalPages,
          page: page,
        });
      } else {
        return res.status(200).json({
          data: postListArr,
          totalPages: totalPages,
          page: page,
        });
      }
    }
  });
  

// Get all posts with pagination and optional location filter
router.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 10;
    const locationFilter = req.query.location;

    try {
        const totalPosts = await Post.countDocuments();
        const totalPages = Math.ceil(totalPosts / perPage);

        if (page > totalPages) {
            return res.status(404).json({ success: false, message: "Page not found" });
        }

        let posts = [];

        if (locationFilter) {
            const allPosts = await Post.find()
                .populate("category")
                .exec();

            posts = allPosts.filter(post =>
                post.location && post.location.some(loc => loc.value === locationFilter)
            ).slice((page - 1) * perPage, page * perPage);
        } else {
            posts = await Post.find()
                .populate("category")
                .skip((page - 1) * perPage)
                .limit(perPage)
                .exec();
        }

        return res.status(200).json({
            success: true,
            data: posts,
            totalPages,
            currentPage: page,
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Get post count (excluding child posts if needed)
router.get('/get/count', async (req, res) => {
    try {
        const postCount = await Post.countDocuments({ parentId: undefined });
        return res.status(200).json({ success: true, postCount });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Add a new post
router.post('/create', async (req, res) => {
    try {
        const { title, content, author, images, tags, category, status, catId } = req.body;
        const images_Array = [];
        const uploadedImages = await ImageUpload.find();
        const images_Arr = uploadedImages?.map((item) => {
            item.images?.map((image) => {
              images_Array.push(image);
              console.log(images_Array);
            });
          });
        // Kiểm tra trường bắt buộc
        if (!title || !content || !author || !category) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        let post = new Post({
            title,
            content,
            author,
            images: images_Array,
            tags: Array.isArray(tags) ? tags : [],
            category,
            catId,
            status,
            commentsCount: 0
        });

        post = await post.save();
        imagesArr = [];
        res.status(201).json({ success: true, data: post });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Delete a post by ID
router.delete('/:id', async (req, res) => {
    try {
        const deletedPost = await Post.findByIdAndDelete(req.params.id);
        if (!deletedPost) {
            return res.status(404).json({ success: false, message: 'Post not found!' });
        }
        return res.status(200).json({ success: true, message: 'Post Deleted!' });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Get a post by ID
router.get('/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'The post with the given ID was not found.' });
        }
        return res.status(200).json({ success: true, data: post });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.delete("/deleteImage", async (req, res) => {
    const imgUrl = req.query.img;
  
    // console.log(imgUrl)
  
    const urlArr = imgUrl.split("/");
    const image = urlArr[urlArr.length - 1];
  
    const imageName = image.split(".")[0];
  
    const response = await cloudinary.uploader.destroy(
      imageName,
      (error, result) => {
        // console.log(error, res)
      }
    );
  
    if (response) {
      res.status(200).send(response);
    }
  });


  router.put("/:id", async (req, res) => {
  
    
    const category = await Post.findByIdAndUpdate(
      req.params.id,
      {
        title: req.body.title,
        content: req.body.content,
        author: req.body.author,
        images: req.body.images,
        tags: req.body.tags,
        category: req.body.category,
        catId: req.body.catId,
        status: req.body.status,
        commentsCount: req.body.commentsCount
      },
      { new: true }
    );
  
    if (!category) {
      return res.status(500).json({
        message: "Post cannot be updated!",
        success: false,
      });
    }
  
    imagesArr = [];
  
    res.send(category);
  });

// API để lấy số lượng bài viết theo category
router.get('/get/data/category-stats', async (req, res) => {
  try {
    // Sử dụng aggregate để nhóm các bài viết theo category và đếm số lượng
    const result = await Post.aggregate([
      {
        $group: {
          _id: "$category",  // Nhóm theo category
          count: { $sum: 1 }, // Đếm số lượng bài viết trong mỗi category
        },
      },
      {
        $sort: { count: -1 }  // Sắp xếp theo số lượng bài viết, giảm dần
      }
    ]);

    const formattedData = result.map((item) => ({
      name: item._id, // Tên trạng thái (Pending, Shipped, Delivered)
      amount: item.count, // Tổng số lượng
    }));

    res.status(200).json(formattedData);
  } catch (error) {
    res.status(500).json({ message: "Error fetching category stats", error });
  }
});

  
module.exports = router;

