const express = require('express');
const { PromotionCode } = require('../models/promotionCode');
const router = express.Router();

// Create a new promotion code
router.post('/create', async (req, res) => {
  try {
    const { code, description, discountPercent, maxUsage, status, users } = req.body;

    if (!code || !discountPercent || !maxUsage) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const newPromotionCode = new PromotionCode({
      code,
      description,
      discountPercent,
      maxUsage,
      status: status || 'active', // Set default status to 'active' if not provided
      users: users || [], // Handle users if provided
    });

    const savedPromotionCode = await newPromotionCode.save();
    res.status(201).json({ success: true, data: savedPromotionCode });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all promotion codes
router.get('/', async (req, res) => {
  try {
    const promotionCodes = await PromotionCode.find();
    res.status(200).json({ success: true, data: promotionCodes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get a promotion code by ID
router.get('/:id', async (req, res) => {
  try {
    const promotionCode = await PromotionCode.findById(req.params.id);

    if (!promotionCode) {
      return res.status(404).json({ success: false, message: 'Promotion code not found' });
    }

    res.status(200).json({ success: true, data: promotionCode });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
router.put('/:id', async (req, res) => {
  try {
      const promotionCode = await PromotionCode.findById(req.params.id);

      if (!promotionCode) {
          return res.status(404).json({
              success: false,
              message: 'Promotion code not found!',
          });
      }
      const updatedPromotionCode = await PromotionCode.findByIdAndUpdate(
        req.params.id,
        {
            code: req.body.code || promotionCode.code,
            description: req.body.description || promotionCode.description,
            discountPercent: req.body.discountPercent ?? promotionCode.discountPercent,
            maxUsage: req.body.maxUsage ?? promotionCode.maxUsage,
            usedCount: req.body.usedCount ?? promotionCode.usedCount,
            users: req.body.users || promotionCode.users,
            status: req.body.status ?? promotionCode.status,
        },
        { new: true }
    );

    if (!updatedPromotionCode) {
        return res.status(500).json({
            success: false,
            message: 'Promotion code could not be updated!',
        });
    }

    res.status(200).json({
        success: true,
        data: updatedPromotionCode,
    });
} catch (error) {
    res.status(500).json({
        success: false,
        message: error.message,
    });
}
});

// Get promotion code count (excluding child posts if needed)
router.get('/get/count', async (req, res) => {
    try {
      const promotionCodeCount = await PromotionCode.countDocuments();
      return res.status(200).json({ success: true, promotionCodeCount });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Delete a promotion code by ID
  router.delete('/:id', async (req, res) => {
    try {
      const deletedPromotionCode = await PromotionCode.findByIdAndDelete(req.params.id);
  
      if (!deletedPromotionCode) {
        return res.status(404).json({ success: false, message: 'Promotion code not found' });
      }
  
      res.status(200).json({ success: true, message: 'Promotion code deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  module.exports = router;